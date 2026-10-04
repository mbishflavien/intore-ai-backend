import { z } from "zod";

// ---------- shared primitives (tight but backwards-compatible) ----------
const nonEmpty = (label: string, max = 500) => z.string().trim().min(1, `${label} is required`).max(max);
const email = z.string().trim().email("Valid email is required").max(254);
const objectId = z.string().trim().min(1).max(128);
const isoDate = z.string().trim().min(1, "scheduledAt is required");

// ---------- auth ----------
export const registerSchema = z.object({
  username: z.string().trim().min(3, "Username must be 3-20 characters").max(20).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  firstName: nonEmpty("firstName", 100),
  lastName: nonEmpty("lastName", 100),
  email,
  password: z.string().min(6, "Password must be at least 6 characters").max(256),
  role: z.enum(["applicant", "recruiter"], { message: "Role must be 'applicant' or 'recruiter'" }),
});

export const loginSchema = z.object({
  emailOrUsername: nonEmpty("Email/Username", 254),
  password: z.string().min(1, "Password is required").max(256),
});

// ---------- screening ----------
export const screeningRequestSchema = z.object({
  job: z.record(z.string(), z.unknown()),
  applicants: z.array(z.record(z.string(), z.unknown())).min(1),
  shortlistSize: z.number().int().min(1).max(100).optional(),
  proofSignals: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const reviewSchema = z.object({
  runId: nonEmpty("runId", 128),
  reviewerId: nonEmpty("reviewerId", 128).optional(),
  applicantId: nonEmpty("applicantId", 128).optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),
  decision: z.string().max(100).optional(),
}).passthrough();

// ---------- ingest ----------
export const csvIngestSchema = z.object({ csvText: z.string().min(1, "csvText is required").max(2_000_000) });
export const resumeIngestSchema = z.object({
  mimeType: nonEmpty("mimeType", 128),
  base64: z.string().min(1, "base64 is required").max(15_000_000),
});

// ---------- proofhire ----------
const testCaseSchema = z.object({
  id: z.string().max(128).optional(),
  title: nonEmpty("Test case title", 300),
  description: z.string().max(5000).optional(),
  expectedPatterns: z.array(z.string().max(2000)).min(1, "Each test case needs at least one expected pattern"),
  weight: z.number().min(0).max(100).optional(),
}).passthrough();

export const createChallengeSchema = z.object({
  title: nonEmpty("Title", 200),
  instructions: nonEmpty("Instructions", 20000),
  prompt: nonEmpty("Prompt", 20000),
  testCases: z.array(testCaseSchema).min(1, "At least one test case is required"),
  type: z.string().max(100).optional(),
  requiredSkills: z.array(z.string().max(100)).optional(),
  timeLimit: z.number().int().positive().max(86400).optional(),
}).passthrough();

export const updateChallengeSchema = z.object({}).passthrough();

export const proofHireConfigSchema = z.object({
  proofHire: z.object({
    enabled: z.boolean().optional(),
    mode: z.enum(["required", "optional"]).optional(),
    challengeId: z.string().max(128).optional(),
    proofWeight: z.number().min(0).max(100).optional(),
  }).passthrough(),
}).passthrough();

export const submissionSchema = z.object({
  code: z.string().min(1, "code is required").max(500_000),
  language: z.string().max(50).optional(),
});

// ---------- jobs ----------
export const createJobSchema = z.object({
  title: nonEmpty("Title", 200),
  summary: nonEmpty("Summary", 20000),
  requiredSkills: z.array(z.string().trim().min(1).max(100)).min(1, "At least one required skill"),
  preferredSkills: z.array(z.string().max(100)).optional(),
  minimumYearsExperience: z.number().min(0).max(60).optional(),
  educationLevel: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  dealbreakers: z.array(z.string().max(500)).optional(),
  screeningWeights: z.record(z.string(), z.number()).optional(),
  proofHire: z.object({
    enabled: z.boolean().optional(),
    mode: z.enum(["required", "optional"]).optional(),
    challengeId: z.string().max(128).optional(),
    proofWeight: z.number().min(0).max(100).optional(),
  }).passthrough().optional(),
}).passthrough();

export const updateJobSchema = z.object({}).passthrough();

// ---------- applications ----------
export const createApplicationSchema = z.object({
  jobId: objectId,
  profile: z.record(z.string(), z.unknown()),
  coverLetter: z.string().max(20000).optional(),
}).passthrough();

export const updateApplicationSchema = z.object({
  status: z.enum(["submitted", "under_review", "shortlisted", "rejected", "accepted"], { message: "Invalid status" }),
});

// ---------- interviews ----------
export const createInterviewSchema = z.object({
  applicationId: objectId,
  jobId: objectId,
  candidateId: objectId,
  scheduledAt: isoDate,
  duration: z.number().int().positive().max(1440),
  type: z.enum(["video", "phone", "in-person", "technical", "behavioral", "panel"], { message: "Invalid interview type" }),
  meetingLink: z.string().max(2048).optional(),
  notes: z.string().max(10000).optional(),
});

// ---------- profiles ----------
export const saveProfileSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
});

// ---------- training / mentor ----------
export const trainingProgressSchema = z.object({ unitId: nonEmpty("unitId", 128) });
export const practiceEvaluateSchema = z.object({
  challengeId: objectId,
  code: z.string().min(1, "code is required").max(500_000),
  language: z.string().max(50).optional(),
});
export const mentorChatSchema = z.object({
  skill: z.string().max(200).optional(),
  message: z.string().min(1, "message is required").max(20000),
  sessionId: z.string().max(128).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
