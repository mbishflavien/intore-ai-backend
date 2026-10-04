import crypto from "node:crypto";
import { ScreeningOrchestrator } from "../../packages/engine/src/index.js";
import type {
  Job,
  ProofHireConfig,
  ScreeningRequest,
  ScreeningRunRecord,
  TalentProfile,
} from "../../packages/shared/src/index.js";
import { isTalentProfile } from "../../packages/shared/src/index.js";
import { db } from "./repos.js";
import { buildNotification, buildProofSignal } from "./repositories.js";

export const orchestrator = new ScreeningOrchestrator();

export async function createRunRecord(request: ScreeningRequest, ownerId?: string): Promise<ScreeningRunRecord> {
  const normalizedRequest: ScreeningRequest = {
    ...request,
    applicants: request.applicants.map((applicant) =>
      isTalentProfile(applicant) ? { ...applicant, id: applicant.id ?? crypto.randomUUID() } : applicant,
    ),
  };
  const result = await orchestrator.run(normalizedRequest);
  const run: ScreeningRunRecord = {
    id: crypto.randomUUID(),
    ...(ownerId ? { ownerId } : {}),
    request: normalizedRequest,
    result,
    createdAt: new Date().toISOString(),
    status: "completed",
  };
  await db.screening.saveRun(run);
  return run;
}

export async function ownsJob(userId: string, jobId: string): Promise<Job | null> {
  const job = await db.job.findById(jobId);
  if (!job || job.recruiterId !== userId) return null;
  return job;
}

export async function notifyApplicantsAboutPublishedJob(job: Job): Promise<void> {
  const applicants = await db.user.listByRole("applicant");
  await Promise.all(
    applicants.map((applicant) =>
      db.notification.create(
        buildNotification({
          userId: applicant.id,
          type: "job_published",
          title: "New Job Uploaded",
          message: `${job.title} is now open for applications.`,
          data: { jobId: job.id },
        }),
      ),
    ),
  );
}

export async function buildProofSignalsForJob(
  jobId: string,
  config: ProofHireConfig,
): Promise<Record<string, ReturnType<typeof buildProofSignal>>> {
  const signals: Record<string, ReturnType<typeof buildProofSignal>> = {};
  const submissions = await db.proofSubmission.listByJob(jobId);
  const { deriveProofApplicantStatus } = await import("./proofhire.js");
  for (const submission of submissions) {
    const required = config.enabled && config.mode === "required";
    const status = deriveProofApplicantStatus(submission, required);
    signals[submission.applicantId] = buildProofSignal(status, submission.evaluation, submission.id);
  }
  return signals;
}

export function normalizeProofHireConfig(input: ProofHireConfig | undefined): ProofHireConfig {
  return {
    enabled: input?.enabled ?? false,
    mode: input?.mode ?? "optional",
    challengeId: input?.challengeId,
    proofWeight: input?.proofWeight ?? 20,
  };
}

export function buildStarterProfile(user: { firstName: string; lastName: string; email: string }): TalentProfile {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    headline: "",
    location: "",
    skills: [],
    experience: [],
    education: [],
    projects: [],
    availability: { status: "Open to Opportunities", type: "Full-time" },
    source: "umurava_profile",
    resumeUploaded: false,
  };
}
