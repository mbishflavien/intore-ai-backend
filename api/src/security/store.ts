import { MongoClient, type Collection, type Document } from "mongodb";

/**
 * Persistence for auth state that must survive restarts and be revocable server-side:
 * sessions, pending MFA challenges, per-identifier login attempts, and the auth event log.
 * Records carry `expiresAt`; Mongo deletes them via TTL indexes, memory mode on read.
 */
export interface ExpiringRecord {
  id: string;
  expiresAt: Date;
}

export interface SessionRecord extends ExpiringRecord {
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  ip: string;
  userAgent: string;
}

export interface MfaChallengeRecord extends ExpiringRecord {
  userId: string;
  attempts: number;
}

export interface LoginAttemptRecord extends ExpiringRecord {
  failures: number;
  lastFailureAt: Date | null;
  lockedUntil: Date | null;
  lockouts: number;
}

export interface AuthEvent {
  type: string;
  at: Date;
  ip: string;
  userId?: string;
  identifier?: string;
  userAgent?: string;
  detail?: string;
}

export interface KeyedStore<T extends ExpiringRecord> {
  get(id: string): Promise<T | null>;
  put(record: T): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByUser(userId: string): Promise<void>;
}

class MemoryStore<T extends ExpiringRecord & { userId?: string }> implements KeyedStore<T> {
  private readonly records = new Map<string, T>();

  async get(id: string): Promise<T | null> {
    const record = this.records.get(id);
    if (!record) return null;
    if (record.expiresAt.getTime() <= Date.now()) {
      this.records.delete(id);
      return null;
    }
    return record;
  }

  async put(record: T): Promise<void> {
    this.records.set(record.id, record);
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async deleteByUser(userId: string): Promise<void> {
    for (const [id, record] of this.records) {
      if (record.userId === userId) this.records.delete(id);
    }
  }
}

class MongoStore<T extends ExpiringRecord> implements KeyedStore<T> {
  constructor(private readonly collection: Collection<Document>) {}

  async get(id: string): Promise<T | null> {
    // TTL sweeps run about once a minute, so also filter on expiry here.
    const doc = await this.collection.findOne({ _id: id as never, expiresAt: { $gt: new Date() } });
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: String(_id), ...rest } as unknown as T;
  }

  async put(record: T): Promise<void> {
    const { id, ...rest } = record;
    await this.collection.replaceOne({ _id: id as never }, rest, { upsert: true });
  }

  async delete(id: string): Promise<void> {
    await this.collection.deleteOne({ _id: id as never });
  }

  async deleteByUser(userId: string): Promise<void> {
    await this.collection.deleteMany({ userId });
  }
}

export interface AuthEventLog {
  append(event: AuthEvent): Promise<void>;
}

export const securityStore: {
  sessions: KeyedStore<SessionRecord>;
  mfaChallenges: KeyedStore<MfaChallengeRecord>;
  loginAttempts: KeyedStore<LoginAttemptRecord>;
  events: AuthEventLog;
} = {
  sessions: new MemoryStore<SessionRecord>(),
  mfaChallenges: new MemoryStore<MfaChallengeRecord>(),
  loginAttempts: new MemoryStore<LoginAttemptRecord>(),
  events: { append: async () => undefined },
};

const EVENT_RETENTION_DAYS = 90;

export async function initSecurityStore(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    console.warn("[security] In-memory auth store: sessions and lockouts reset on restart.");
    return;
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "umurava_ai");
  const sessions = db.collection("sessions");
  const mfaChallenges = db.collection("mfa_challenges");
  const loginAttempts = db.collection("login_attempts");
  const events = db.collection("auth_events");

  await Promise.all([
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
    mfaChallenges.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    loginAttempts.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    events.createIndex({ at: 1 }, { expireAfterSeconds: EVENT_RETENTION_DAYS * 86_400 }),
    events.createIndex({ userId: 1, at: -1 }),
  ]);

  securityStore.sessions = new MongoStore<SessionRecord>(sessions);
  securityStore.mfaChallenges = new MongoStore<MfaChallengeRecord>(mfaChallenges);
  securityStore.loginAttempts = new MongoStore<LoginAttemptRecord>(loginAttempts);
  securityStore.events = {
    append: async (event) => {
      await events.insertOne({ ...event });
    },
  };
}
