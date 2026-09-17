import { MongoClient } from "mongodb";

import type {
  ActivityLog,
  Application,
  ApplicationStatus,
  CreateApplicationInput,
  CreateJobInput,
  CreateProofChallengeInput,
  Interview,
  InterviewType,
  Job,
  JobStatus,
  Notification,
  NotificationType,
  ProofApplicantStatus,
  ProofChallenge,
  ProofChallengeTemplate,
  ProofEvaluation,
  ProofSubmission,
  PublicUser,
  RecruiterReviewInput,
  RecruiterReviewRecord,
  ScreeningRunRecord,
  TalentProfile,
  User,
  UserRole,
} from "../../packages/shared/src/index.js";

export interface ScreeningRepository {
  saveRun(run: ScreeningRunRecord): Promise<void>;
  listRuns(): Promise<ScreeningRunRecord[]>;
  getRun(id: string): Promise<ScreeningRunRecord | null>;
  saveReview(review: RecruiterReviewRecord): Promise<void>;
  listReviews(screeningRunId: string): Promise<RecruiterReviewRecord[]>;
}

export interface UserRepository {
  create(user: User): Promise<void>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmailOrUsername(emailOrUsername: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  listByRole(role: UserRole): Promise<User[]>;
  delete(id: string): Promise<void>;
}

export interface JobRepository {
  create(job: Job): Promise<void>;
  findById(id: string): Promise<Job | null>;
  findByRecruiter(recruiterId: string): Promise<Job[]>;
  findPublished(): Promise<Job[]>;
  update(id: string, updates: Partial<Job>): Promise<void>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ApplicationRepository {
  create(application: Application): Promise<void>;
  findById(id: string): Promise<Application | null>;
  findByApplicant(applicantId: string): Promise<Application[]>;
  findByJob(jobId: string): Promise<Application[]>;
  findByJobs(jobIds: string[]): Promise<Application[]>;
  findByJobAndApplicant(jobId: string, applicantId: string): Promise<Application | null>;
  update(id: string, updates: Partial<Application>): Promise<void>;
  updateStatus(id: string, status: ApplicationStatus): Promise<void>;
  updateScreeningResult(id: string, result: Application["screeningResult"]): Promise<void>;
}

export interface ProfileRepository {
  save(applicantId: string, profile: TalentProfile): Promise<void>;
  findByApplicant(applicantId: string): Promise<TalentProfile | null>;
}

export interface ProofChallengeRepository {
  create(challenge: ProofChallenge): Promise<void>;
  findById(id: string): Promise<ProofChallenge | null>;
  listByRecruiter(recruiterId: string): Promise<ProofChallenge[]>;
  update(id: string, updates: Partial<ProofChallenge>): Promise<void>;
}

export interface ProofSubmissionRepository {
  create(submission: ProofSubmission): Promise<void>;
  findById(id: string): Promise<ProofSubmission | null>;
  findByJobAndApplicant(jobId: string, applicantId: string): Promise<ProofSubmission | null>;
  listByJob(jobId: string): Promise<ProofSubmission[]>;
  listByApplicant(applicantId: string): Promise<ProofSubmission[]>;
  update(id: string, updates: Partial<ProofSubmission>): Promise<void>;
}

export interface InterviewRepository {
  create(interview: Interview): Promise<void>;
  findById(id: string): Promise<Interview | null>;
  findByApplication(applicationId: string): Promise<Interview | null>;
  findByRecruiter(recruiterId: string): Promise<Interview[]>;
  update(id: string, updates: Partial<Interview>): Promise<void>;
}

export interface NotificationRepository {
  create(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  findByUser(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}

export interface ActivityLogRepository {
  create(log: ActivityLog): Promise<void>;
  findByRecruiter(recruiterId: string, limit?: number): Promise<ActivityLog[]>;
  findAll(limit?: number): Promise<ActivityLog[]>;
  deleteOldLogs(daysOld: number): Promise<number>;
}

interface StoredProfile {
  applicantId: string;
  profile: TalentProfile;
  updatedAt: string;
}

class InMemoryScreeningRepository implements ScreeningRepository {
  private readonly runs = new Map<string, ScreeningRunRecord>();
  private readonly reviews = new Map<string, RecruiterReviewRecord[]>();

  async saveRun(run: ScreeningRunRecord): Promise<void> {
    this.runs.set(run.id, run);
  }

  async listRuns(): Promise<ScreeningRunRecord[]> {
    return [...this.runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRun(id: string): Promise<ScreeningRunRecord | null> {
    return this.runs.get(id) ?? null;
  }

  async saveReview(review: RecruiterReviewRecord): Promise<void> {
    const existing = this.reviews.get(review.screeningRunId) ?? [];
    existing.push(review);
    this.reviews.set(review.screeningRunId, existing);
  }

  async listReviews(screeningRunId: string): Promise<RecruiterReviewRecord[]> {
    return this.reviews.get(screeningRunId) ?? [];
  }
}

class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async create(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null;
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    const normalized = emailOrUsername.toLowerCase();
    return [...this.users.values()].find(
      (user) => user.email.toLowerCase() === normalized || user.username.toLowerCase() === normalized,
    ) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async listByRole(role: UserRole): Promise<User[]> {
    return [...this.users.values()].filter((user) => user.role === role);
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id);
  }
}

class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, Job>();

  async create(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async findById(id: string): Promise<Job | null> {
    return this.jobs.get(id) ?? null;
  }

  async findByRecruiter(recruiterId: string): Promise<Job[]> {
    return [...this.jobs.values()].filter((job) => job.recruiterId === recruiterId);
  }

  async findPublished(): Promise<Job[]> {
    return [...this.jobs.values()].filter((job) => job.status === "published");
  }

  async update(id: string, updates: Partial<Job>): Promise<void> {
    const existing = this.jobs.get(id);
    if (!existing) {
      return;
    }

    this.jobs.set(id, {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateStatus(id: string, status: JobStatus): Promise<void> {
    await this.update(id, { status });
  }

  async delete(id: string): Promise<void> {
    this.jobs.delete(id);
  }
}

class InMemoryApplicationRepository implements ApplicationRepository {
  private readonly applications = new Map<string, Application>();

  async create(application: Application): Promise<void> {
    this.applications.set(application.id, application);
  }

  async findById(id: string): Promise<Application | null> {
    return this.applications.get(id) ?? null;
  }

  async findByApplicant(applicantId: string): Promise<Application[]> {
    return [...this.applications.values()].filter((application) => application.applicantId === applicantId);
  }

  async findByJob(jobId: string): Promise<Application[]> {
    return [...this.applications.values()].filter((application) => application.jobId === jobId);
  }

  async findByJobs(jobIds: string[]): Promise<Application[]> {
    if (!jobIds || jobIds.length === 0) return [];
    return [...this.applications.values()].filter((application) => jobIds.includes(application.jobId));
  }

  async findByJobAndApplicant(jobId: string, applicantId: string): Promise<Application | null> {
    return [...this.applications.values()].find(
      (application) => application.jobId === jobId && application.applicantId === applicantId,
    ) ?? null;
  }

  async update(id: string, updates: Partial<Application>): Promise<void> {
    const existing = this.applications.get(id);
    if (!existing) {
      console.log("[InMemory] Application not found:", id);
      return;
    }

    console.log("[InMemory] Updating application:", id, "with:", Object.keys(updates));
    this.applications.set(id, {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<void> {
    await this.update(id, { status });
  }

  async updateScreeningResult(id: string, result: Application["screeningResult"]): Promise<void> {
    await this.update(id, { screeningResult: result });
  }
}

class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, StoredProfile>();

  async save(applicantId: string, profile: TalentProfile): Promise<void> {
    this.profiles.set(applicantId, {
      applicantId,
      profile,
      updatedAt: new Date().toISOString(),
    });
  }

  async findByApplicant(applicantId: string): Promise<TalentProfile | null> {
    return this.profiles.get(applicantId)?.profile ?? null;
  }
}

class InMemoryProofChallengeRepository implements ProofChallengeRepository {
  private readonly challenges = new Map<string, ProofChallenge>();

  async create(challenge: ProofChallenge): Promise<void> {
    this.challenges.set(challenge.id, challenge);
  }

  async findById(id: string): Promise<ProofChallenge | null> {
    return this.challenges.get(id) ?? null;
  }

  async listByRecruiter(recruiterId: string): Promise<ProofChallenge[]> {
    return [...this.challenges.values()]
      .filter((challenge) => challenge.recruiterId === recruiterId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async update(id: string, updates: Partial<ProofChallenge>): Promise<void> {
    const existing = this.challenges.get(id);
    if (!existing) {
      return;
    }

    this.challenges.set(id, {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}

class InMemoryProofSubmissionRepository implements ProofSubmissionRepository {
  private readonly submissions = new Map<string, ProofSubmission>();

  async create(submission: ProofSubmission): Promise<void> {
    this.submissions.set(submission.id, submission);
  }

  async findById(id: string): Promise<ProofSubmission | null> {
    return this.submissions.get(id) ?? null;
  }

  async findByJobAndApplicant(jobId: string, applicantId: string): Promise<ProofSubmission | null> {
    return [...this.submissions.values()].find(
      (submission) => submission.jobId === jobId && submission.applicantId === applicantId,
    ) ?? null;
  }

  async listByJob(jobId: string): Promise<ProofSubmission[]> {
    return [...this.submissions.values()]
      .filter((submission) => submission.jobId === jobId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async listByApplicant(applicantId: string): Promise<ProofSubmission[]> {
    return [...this.submissions.values()]
      .filter((submission) => submission.applicantId === applicantId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async update(id: string, updates: Partial<ProofSubmission>): Promise<void> {
    const existing = this.submissions.get(id);
    if (!existing) {
      return;
    }

    this.submissions.set(id, {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}

class MongoProfileRepository implements ProfileRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async save(applicantId: string, profile: TalentProfile): Promise<void> {
    await this.db().collection<StoredProfile>("profiles").updateOne(
      { applicantId },
      {
        $set: {
          applicantId,
          profile,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
  }

  async findByApplicant(applicantId: string): Promise<TalentProfile | null> {
    const stored = await this.db().collection<StoredProfile>("profiles").findOne({ applicantId });
    return stored?.profile ?? null;
  }
}

class MongoScreeningRepository implements ScreeningRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async saveRun(run: ScreeningRunRecord): Promise<void> {
    await this.db().collection<ScreeningRunRecord>("screening_runs").updateOne(
      { id: run.id },
      { $set: run },
      { upsert: true },
    );
  }

  async listRuns(): Promise<ScreeningRunRecord[]> {
    return this.db()
      .collection<ScreeningRunRecord>("screening_runs")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getRun(id: string): Promise<ScreeningRunRecord | null> {
    return this.db().collection<ScreeningRunRecord>("screening_runs").findOne({ id });
  }

  async saveReview(review: RecruiterReviewRecord): Promise<void> {
    await this.db().collection<RecruiterReviewRecord>("recruiter_reviews").insertOne(review);
  }

  async listReviews(screeningRunId: string): Promise<RecruiterReviewRecord[]> {
    return this.db()
      .collection<RecruiterReviewRecord>("recruiter_reviews")
      .find({ screeningRunId })
      .sort({ createdAt: -1 })
      .toArray();
  }
}

class MongoUserRepository implements UserRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async create(user: User): Promise<void> {
    await this.db().collection<User>("users").insertOne(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db().collection<User>("users").findOne({ email });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.db().collection<User>("users").findOne({ username: new RegExp(`^${escapeRegex(username)}$`, "i") });
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return this.db().collection<User>("users").findOne({
      $or: [
        { email: new RegExp(`^${escapeRegex(emailOrUsername)}$`, "i") },
        { username: new RegExp(`^${escapeRegex(emailOrUsername)}$`, "i") },
      ],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.db().collection<User>("users").findOne({ id });
  }

  async listByRole(role: UserRole): Promise<User[]> {
    return this.db().collection<User>("users").find({ role }).toArray();
  }

  async delete(id: string): Promise<void> {
    await this.db().collection<User>("users").deleteOne({ id });
  }
}

class MongoJobRepository implements JobRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async create(job: Job): Promise<void> {
    await this.db().collection<Job>("jobs").insertOne(job);
  }

  async findById(id: string): Promise<Job | null> {
    return this.db().collection<Job>("jobs").findOne({ id });
  }

  async findByRecruiter(recruiterId: string): Promise<Job[]> {
    return this.db().collection<Job>("jobs").find({ recruiterId }).sort({ createdAt: -1 }).toArray();
  }

  async findPublished(): Promise<Job[]> {
    return this.db().collection<Job>("jobs").find({ status: "published" }).sort({ createdAt: -1 }).toArray();
  }

  async update(id: string, updates: Partial<Job>): Promise<void> {
    await this.db().collection<Job>("jobs").updateOne(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
    );
  }

  async updateStatus(id: string, status: JobStatus): Promise<void> {
    await this.update(id, { status });
  }

  async delete(id: string): Promise<void> {
    await this.db().collection<Job>("jobs").deleteOne({ id });
  }
}

class MongoApplicationRepository implements ApplicationRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async create(application: Application): Promise<void> {
    await this.db().collection<Application>("applications").insertOne(application);
  }

  async findById(id: string): Promise<Application | null> {
    return this.db().collection<Application>("applications").findOne({ id });
  }

  async findByApplicant(applicantId: string): Promise<Application[]> {
    return this.db().collection<Application>("applications").find({ applicantId }).sort({ appliedAt: -1 }).toArray();
  }

  async findByJob(jobId: string): Promise<Application[]> {
    return this.db().collection<Application>("applications").find({ jobId }).sort({ appliedAt: -1 }).toArray();
  }

  async findByJobs(jobIds: string[]): Promise<Application[]> {
    if (!jobIds || jobIds.length === 0) return [];
    return this.db().collection<Application>("applications")
      .find({ jobId: { $in: jobIds } })
      .sort({ appliedAt: -1 })
      .toArray();
  }

  async findByJobAndApplicant(jobId: string, applicantId: string): Promise<Application | null> {
    return this.db().collection<Application>("applications").findOne({ jobId, applicantId });
  }

  async update(id: string, updates: Partial<Application>): Promise<void> {
    await this.db().collection<Application>("applications").updateOne(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
    );
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<void> {
    await this.update(id, { status });
  }

  async updateScreeningResult(id: string, result: Application["screeningResult"]): Promise<void> {
    await this.update(id, { screeningResult: result });
  }
}

class MongoInterviewRepository implements InterviewRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async create(interview: Interview): Promise<void> {
    await this.db().collection<Interview>("interviews").insertOne(interview);
  }

  async findById(id: string): Promise<Interview | null> {
    return this.db().collection<Interview>("interviews").findOne({ id });
  }

  async findByApplication(applicationId: string): Promise<Interview | null> {
    return this.db().collection<Interview>("interviews").findOne({ applicationId });
  }

  async findByRecruiter(recruiterId: string): Promise<Interview[]> {
    return this.db().collection<Interview>("interviews").find({ recruiterId }).sort({ scheduledAt: -1 }).toArray();
  }

  async update(id: string, updates: Partial<Interview>): Promise<void> {
    await this.db().collection<Interview>("interviews").updateOne(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
    );
  }
}

class MongoNotificationRepository implements NotificationRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async create(notification: Notification): Promise<void> {
    await this.db().collection<Notification>("notifications").insertOne(notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.db().collection<Notification>("notifications").findOne({ id });
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.db().collection<Notification>("notifications").find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  async markAsRead(id: string): Promise<void> {
    await this.db().collection<Notification>("notifications").updateOne(
      { id },
      { $set: { isRead: true } },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db().collection<Notification>("notifications").updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.db().collection<Notification>("notifications").countDocuments({ userId, isRead: false });
  }
}

class MongoActivityLogRepository implements ActivityLogRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async create(log: ActivityLog): Promise<void> {
    await this.db().collection<ActivityLog>("activity_logs").insertOne(log);
  }

  async findByRecruiter(recruiterId: string, limit: number = 50): Promise<ActivityLog[]> {
    return this.db()
      .collection<ActivityLog>("activity_logs")
      .find({ recruiterId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async findAll(limit: number = 100): Promise<ActivityLog[]> {
    return this.db()
      .collection<ActivityLog>("activity_logs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async deleteOldLogs(daysOld: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const result = await this.db()
      .collection<ActivityLog>("activity_logs")
      .deleteMany({ createdAt: { $lt: cutoff.toISOString() } });
    return result.deletedCount;
  }
}

class MongoProofChallengeRepository implements ProofChallengeRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async create(challenge: ProofChallenge): Promise<void> {
    await this.db().collection<ProofChallenge>("proof_challenges").insertOne(challenge);
  }

  async findById(id: string): Promise<ProofChallenge | null> {
    return this.db().collection<ProofChallenge>("proof_challenges").findOne({ id });
  }

  async listByRecruiter(recruiterId: string): Promise<ProofChallenge[]> {
    return this.db()
      .collection<ProofChallenge>("proof_challenges")
      .find({ recruiterId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async update(id: string, updates: Partial<ProofChallenge>): Promise<void> {
    await this.db().collection<ProofChallenge>("proof_challenges").updateOne(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
    );
  }
}

class MongoProofSubmissionRepository implements ProofSubmissionRepository {
  constructor(private readonly client: MongoClient, private readonly dbName: string) {}

  private db() {
    return this.client.db(this.dbName);
  }

  async create(submission: ProofSubmission): Promise<void> {
    await this.db().collection<ProofSubmission>("proof_submissions").insertOne(submission);
  }

  async findById(id: string): Promise<ProofSubmission | null> {
    return this.db().collection<ProofSubmission>("proof_submissions").findOne({ id });
  }

  async findByJobAndApplicant(jobId: string, applicantId: string): Promise<ProofSubmission | null> {
    return this.db().collection<ProofSubmission>("proof_submissions").findOne({ jobId, applicantId });
  }

  async listByJob(jobId: string): Promise<ProofSubmission[]> {
    return this.db().collection<ProofSubmission>("proof_submissions").find({ jobId }).sort({ updatedAt: -1 }).toArray();
  }

  async listByApplicant(applicantId: string): Promise<ProofSubmission[]> {
    return this.db()
      .collection<ProofSubmission>("proof_submissions")
      .find({ applicantId })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async update(id: string, updates: Partial<ProofSubmission>): Promise<void> {
    await this.db().collection<ProofSubmission>("proof_submissions").updateOne(
      { id },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
    );
  }
}

async function createMongoClient(): Promise<MongoClient> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  return client;
}

function dbName(): string {
  return process.env.MONGODB_DB ?? "umurava_ai";
}

export async function createRepository(): Promise<ScreeningRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryScreeningRepository();
  }

  return new MongoScreeningRepository(await createMongoClient(), dbName());
}

export async function createUserRepository(): Promise<UserRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryUserRepository();
  }

  return new MongoUserRepository(await createMongoClient(), dbName());
}

export async function createJobRepository(): Promise<JobRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryJobRepository();
  }

  return new MongoJobRepository(await createMongoClient(), dbName());
}

export async function createApplicationRepository(): Promise<ApplicationRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryApplicationRepository();
  }

  return new MongoApplicationRepository(await createMongoClient(), dbName());
}

export async function createProfileRepository(): Promise<ProfileRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryProfileRepository();
  }

  return new MongoProfileRepository(await createMongoClient(), dbName());
}

export async function createProofChallengeRepository(): Promise<ProofChallengeRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryProofChallengeRepository();
  }

  return new MongoProofChallengeRepository(await createMongoClient(), dbName());
}

export async function createProofSubmissionRepository(): Promise<ProofSubmissionRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryProofSubmissionRepository();
  }

  return new MongoProofSubmissionRepository(await createMongoClient(), dbName());
}

export async function createInterviewRepository(): Promise<InterviewRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryInterviewRepository();
  }

  return new MongoInterviewRepository(await createMongoClient(), dbName());
}

export async function createNotificationRepository(): Promise<NotificationRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryNotificationRepository();
  }

  return new MongoNotificationRepository(await createMongoClient(), dbName());
}

export async function createActivityLogRepository(): Promise<ActivityLogRepository> {
  if (!process.env.MONGODB_URI) {
    return new InMemoryActivityLogRepository();
  }

  return new MongoActivityLogRepository(await createMongoClient(), dbName());
}

export function buildActivityLog(data: {
  recruiterId: string;
  event: ActivityLog['event'];
  jobId?: string;
  jobTitle?: string;
  candidateName?: string;
  metadata?: Record<string, unknown>;
}): ActivityLog {
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

export function buildInterview(data: {
  applicationId: string;
  jobId: string;
  candidateId: string;
  recruiterId: string;
  scheduledAt: string;
  duration: number;
  type: InterviewType;
  meetingLink?: string;
  notes?: string;
}): Interview {
  const now = new Date().toISOString();
  return {
    ...data,
    id: crypto.randomUUID(),
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };
}

export function buildNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}): Notification {
  return {
    ...data,
    id: crypto.randomUUID(),
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}

class InMemoryInterviewRepository implements InterviewRepository {
  private readonly interviews = new Map<string, Interview>();

  async create(interview: Interview): Promise<void> {
    this.interviews.set(interview.id, interview);
  }

  async findById(id: string): Promise<Interview | null> {
    return this.interviews.get(id) ?? null;
  }

  async findByApplication(applicationId: string): Promise<Interview | null> {
    return [...this.interviews.values()].find((i) => i.applicationId === applicationId) ?? null;
  }

  async findByRecruiter(recruiterId: string): Promise<Interview[]> {
    return [...this.interviews.values()].filter((i) => i.recruiterId === recruiterId);
  }

  async update(id: string, updates: Partial<Interview>): Promise<void> {
    const existing = this.interviews.get(id);
    if (!existing) return;
    this.interviews.set(id, { ...existing, ...updates, updatedAt: new Date().toISOString() });
  }
}

class InMemoryNotificationRepository implements NotificationRepository {
  private readonly notifications = new Map<string, Notification>();

  async create(notification: Notification): Promise<void> {
    this.notifications.set(notification.id, notification);
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) ?? null;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return [...this.notifications.values()].filter((n) => n.userId === userId);
  }

  async markAsRead(id: string): Promise<void> {
    const existing = this.notifications.get(id);
    if (existing) {
      this.notifications.set(id, { ...existing, isRead: true });
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId && !notification.isRead) {
        this.notifications.set(id, { ...notification, isRead: true });
      }
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return [...this.notifications.values()].filter((n) => n.userId === userId && !n.isRead).length;
  }
}

class InMemoryActivityLogRepository implements ActivityLogRepository {
  private readonly logs = new Map<string, ActivityLog>();

  async create(log: ActivityLog): Promise<void> {
    this.logs.set(log.id, log);
  }

  async findByRecruiter(recruiterId: string, limit: number = 50): Promise<ActivityLog[]> {
    return [...this.logs.values()]
      .filter((l) => l.recruiterId === recruiterId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async findAll(limit: number = 100): Promise<ActivityLog[]> {
    return [...this.logs.values()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async deleteOldLogs(daysOld: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    let deleted = 0;
    for (const [id, log] of this.logs.entries()) {
      if (new Date(log.createdAt) < cutoff) {
        this.logs.delete(id);
        deleted++;
      }
    }
    return deleted;
  }
}

export function buildReviewRecord(input: RecruiterReviewInput): RecruiterReviewRecord {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

export function buildDefaultJob(input: CreateJobInput, recruiterId: string): Job {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    recruiterId,
    title: input.title,
    summary: input.summary,
    requiredSkills: input.requiredSkills,
    preferredSkills: input.preferredSkills ?? [],
    minimumYearsExperience: input.minimumYearsExperience ?? 0,
    educationLevel: input.educationLevel,
    location: input.location,
    dealbreakers: input.dealbreakers ?? [],
    screeningWeights: input.screeningWeights ?? { skills: 35, experience: 20, education: 10, relevance: 15, proof: 20 },
    proofHire: {
      enabled: input.proofHire?.enabled ?? false,
      mode: input.proofHire?.mode ?? "optional",
      challengeId: input.proofHire?.challengeId,
      proofWeight: input.proofHire?.proofWeight ?? 20,
    },
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function buildApplication(input: CreateApplicationInput, applicantId: string): Application {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    jobId: input.jobId,
    applicantId,
    profile: input.profile,
    status: "submitted",
    proofHireStatus: "not_required",
    appliedAt: now,
    updatedAt: now,
    createdAt: now,
    isRead: false,
  };
}

export function buildProofChallenge(input: CreateProofChallengeInput, recruiterId: string): ProofChallenge {
  const now = new Date().toISOString();
  const title = input.title.trim();

  return {
    id: crypto.randomUUID(),
    recruiterId,
    title,
    slug: slugify(title),
    type: input.type ?? "coding",
    instructions: input.instructions.trim(),
    prompt: input.prompt.trim(),
    starterCode: input.starterCode,
    starterQuery: input.starterQuery,
    mockData: input.mockData,
    requiredSkills: input.requiredSkills ?? [],
    testCases: input.testCases.map((testCase) => ({
      id: crypto.randomUUID(),
      title: testCase.title.trim(),
      description: testCase.description.trim(),
      expectedPatterns: testCase.expectedPatterns.map((pattern) => pattern.trim()).filter(Boolean),
      weight: testCase.weight,
    })),
    rubric: {
      correctnessWeight: input.rubric?.correctnessWeight ?? 60,
      qualityWeight: input.rubric?.qualityWeight ?? 20,
      completenessWeight: input.rubric?.completenessWeight ?? 20,
      minimumPassingScore: input.rubric?.minimumPassingScore ?? 60,
    },
    hints: input.hints?.map((h) => ({ id: crypto.randomUUID(), ...h })) ?? [],
    references: input.references?.map((r) => ({ id: crypto.randomUUID(), ...r })) ?? [],
    documentConfig: input.documentConfig,
    sqlConfig: input.sqlConfig,
    apiConfig: input.apiConfig,
    dataConfig: input.dataConfig,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildProofSubmission(jobId: string, challengeId: string, applicantId: string, code: string, language = "typescript"): ProofSubmission {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    challengeId,
    jobId,
    applicantId,
    code,
    language,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function buildProofSignal(status: ProofApplicantStatus, evaluation?: ProofEvaluation, submissionId?: string) {
  return {
    status,
    score: evaluation?.score ?? 0,
    summary: evaluation?.summary,
    passed: evaluation?.passed ?? false,
    requiredSatisfied: status === "not_required" || status === "passed",
    submissionId,
  };
}

export const DEFAULT_PROOF_CHALLENGE_TEMPLATES: ProofChallengeTemplate[] = [
  {
    id: "proof-template-api-normalizer",
    title: "Build Applicant Normalization Endpoint",
    type: "coding",
    prompt: "Implement a function that normalizes applicant records into a consistent API response and validates required fields.",
    starterCode: "export function normalizeApplicants(rows) {\n  return rows;\n}\n",
    requiredSkills: ["TypeScript", "Node.js", "REST"],
    testCases: [
      {
        id: "template-case-1",
        title: "Validates required fields",
        description: "Solution should reject or handle rows missing required applicant fields.",
        expectedPatterns: ["required", "email", "throw", "return"],
        weight: 35,
      },
      {
        id: "template-case-2",
        title: "Normalizes casing and trimming",
        description: "Solution should trim input strings and normalize key fields before returning the payload.",
        expectedPatterns: ["trim", "toLowerCase", "map"],
        weight: 35,
      },
      {
        id: "template-case-3",
        title: "Produces structured output",
        description: "Solution should return a structured collection rather than mutating input only.",
        expectedPatterns: ["return", "skills", "experience"],
        weight: 30,
      },
    ],
    rubric: {
      correctnessWeight: 60,
      qualityWeight: 20,
      completenessWeight: 20,
      minimumPassingScore: 60,
    },
    hints: [
      { text: "Break down the problem into smaller functions.", source: "system" },
      { text: "Use console.log to debug intermediate values.", source: "system" },
    ],
    references: [
      { title: "MDN JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", type: "documentation" },
      { title: "freeCodeCamp JavaScript", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", type: "tutorial" },
    ],
  },
  {
    id: "proof-template-sql-aggregation",
    title: "SQL Candidate Ranking Query",
    type: "sql",
    prompt: "Write a SQL query that ranks candidates by their assessment scores. Return the top 10 candidates with their names and scores.",
    starterQuery: "SELECT \n  -- Your code here\nFROM candidates\n",
    requiredSkills: ["SQL", "PostgreSQL", "Aggregation"],
    testCases: [
      {
        id: "sql-case-1",
        title: "Uses ORDER BY",
        description: "Query should sort candidates by score.",
        expectedPatterns: ["order by", "desc"],
        weight: 30,
      },
      {
        id: "sql-case-2",
        title: "Uses LIMIT",
        description: "Query should limit results to top 10.",
        expectedPatterns: ["limit", "top"],
        weight: 30,
      },
      {
        id: "sql-case-3",
        title: "Selects relevant columns",
        description: "Query should return candidate names and scores.",
        expectedPatterns: ["select", "name", "score"],
        weight: 40,
      },
    ],
    rubric: {
      correctnessWeight: 70,
      qualityWeight: 15,
      completenessWeight: 15,
      minimumPassingScore: 60,
    },
    sqlConfig: {
      schema: { tables: ["candidates"], columns: ["name", "score", "email"] },
      validPatterns: ["select", "from", "order", "limit"],
      blockedKeywords: ["drop", "delete", "insert", "update", "truncate", "alter", "create"],
    },
    hints: [
      { text: "Start with SELECT to specify which columns you need.", source: "system" },
      { text: "Use ORDER BY with DESC for highest scores first.", source: "system" },
    ],
    references: [
      { title: "W3Schools SQL Tutorial", url: "https://www.w3schools.com/sql/", type: "tutorial" },
      { title: "PostgreSQL Documentation", url: "https://www.postgresql.org/docs/", type: "documentation" },
    ],
  },
  {
    id: "proof-template-cover-letter",
    title: "Cover Letter for Tech Role",
    type: "document",
    prompt: "Write a professional cover letter applying for a software engineering position. Highlight your relevant experience and explain why you're a good fit.",
    requiredSkills: ["Writing", "Professional Communication"],
    testCases: [
      {
        id: "doc-case-1",
        title: "Contains introduction",
        description: "Letter should have a proper greeting and introduction.",
        expectedPatterns: ["dear", "position", "role"],
        weight: 25,
      },
      {
        id: "doc-case-2",
        title: "Highlights experience",
        description: "Letter should mention relevant work experience.",
        expectedPatterns: ["experience", "years", "project"],
        weight: 35,
      },
      {
        id: "doc-case-3",
        title: "Contains closing",
        description: "Letter should have a proper closing.",
        expectedPatterns: ["thank", "regards", "sincerely"],
        weight: 20,
      },
      {
        id: "doc-case-4",
        title: "Mentions skills",
        description: "Letter should highlight technical skills.",
        expectedPatterns: ["skill", "technical", "engineer"],
        weight: 20,
      },
    ],
    rubric: {
      correctnessWeight: 50,
      qualityWeight: 30,
      completenessWeight: 20,
      minimumPassingScore: 60,
    },
    documentConfig: {
      requiredSections: ["introduction", "body", "closing"],
      requiredKeywords: ["experience", "skills", "position", "thank"],
      minLength: 100,
      maxLength: 800,
    },
    hints: [
      { text: "Include a brief introduction about yourself.", source: "system" },
      { text: "Highlight relevant experience for the role.", source: "system" },
    ],
    references: [
      { title: "Cover Letter Writing Guide", url: "https://www.indeed.com/career-advice/cover-letter-writing", type: "tutorial" },
      { title: "Resume Guide", url: "https://www.indeed.com/career-advice/resumes", type: "tutorial" },
    ],
  },
  {
    id: "proof-template-debug-fix",
    title: "Bug Fix: Null Pointer Issue",
    type: "debug",
    prompt: "Fix the bug in the provided function. The function should handle cases where the input array might contain null values.",
    starterCode: "export function processCandidates(candidates) {\n  return candidates.map(c => c.name.toUpperCase());\n}\n",
    requiredSkills: ["JavaScript", "Debugging"],
    testCases: [
      {
        id: "debug-case-1",
        title: "Handles null values",
        description: "Solution should not crash on null values.",
        expectedPatterns: ["null", "undefined", "if", "?"],
        weight: 50,
      },
      {
        id: "debug-case-2",
        title: "Filters or skips nulls",
        description: "Solution should filter out null values.",
        expectedPatterns: ["filter", "!=", "==="],
        weight: 50,
      },
    ],
    rubric: {
      correctnessWeight: 70,
      qualityWeight: 15,
      completenessWeight: 15,
      minimumPassingScore: 60,
    },
    hints: [
      { text: "Check for undefined or null values.", source: "system" },
      { text: "Use optional chaining (?.) or null checks.", source: "system" },
    ],
    references: [
      { title: "JavaScript Debugging", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules", type: "documentation" },
      { title: "Chrome DevTools", url: "https://developer.chrome.com/docs/devtools", type: "tutorial" },
    ],
  },
  {
    id: "proof-template-api-integration",
    title: "REST API Endpoint Integration",
    type: "api",
    prompt: "Write a fetch request to get candidate data from the HR API endpoint. Handle success and error responses properly.",
    requiredSkills: ["JavaScript", "REST API", "Fetch"],
    testCases: [
      {
        id: "api-case-1",
        title: "Uses fetch",
        description: "Solution should use fetch or similar HTTP method.",
        expectedPatterns: ["fetch", "axios", "request"],
        weight: 35,
      },
      {
        id: "api-case-2",
        title: "Handles errors",
        description: "Solution should handle error responses.",
        expectedPatterns: ["catch", "error", "throw"],
        weight: 35,
      },
      {
        id: "api-case-3",
        title: "Returns data",
        description: "Solution should return parsed JSON data.",
        expectedPatterns: ["return", "json", "data"],
        weight: 30,
      },
    ],
    rubric: {
      correctnessWeight: 60,
      qualityWeight: 20,
      completenessWeight: 20,
      minimumPassingScore: 60,
    },
    apiConfig: {
      expectedMethod: "GET",
      expectedEndpoint: "/api/candidates",
      expectedHeaders: ["Content-Type"],
      mockData: {},
    },
    hints: [
      { text: "Use the correct HTTP method for the operation.", source: "system" },
      { text: "Include required headers.", source: "system" },
    ],
    references: [
      { title: "REST API Guide", url: "https://www.redhat.com/en/topics/api", type: "documentation" },
      { title: "JSON Syntax", url: "https://www.json.org/", type: "documentation" },
    ],
  },
  {
    id: "proof-template-data-analysis",
    title: "JSON Data Transformation",
    type: "data",
    prompt: "Transform the candidate assessment data into a structured JSON format with only the required fields: name, score, and passed status.",
    requiredSkills: ["JavaScript", "Data Processing"],
    testCases: [
      {
        id: "data-case-1",
        title: "Returns JSON",
        description: "Output should be valid JSON format.",
        expectedPatterns: ["{", "}", ":", ","],
        weight: 40,
      },
      {
        id: "data-case-2",
        title: "Contains required fields",
        description: "Output should include name, score, and passed.",
        expectedPatterns: ["name", "score", "passed"],
        weight: 60,
      },
    ],
    rubric: {
      correctnessWeight: 60,
      qualityWeight: 20,
      completenessWeight: 20,
      minimumPassingScore: 60,
    },
    dataConfig: {
      expectedFormat: "json",
      expectedFields: ["name", "score", "passed"],
      validationType: "both",
    },
    hints: [
      { text: "Ensure the output is valid JSON.", source: "system" },
      { text: "Check that all required fields are present.", source: "system" },
    ],
    references: [
      { title: "JSON Format Guide", url: "https://www.json.org/", type: "documentation" },
    ],
  },
];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
