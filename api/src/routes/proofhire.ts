import { Router } from "express";
import type { CreateProofChallengeInput, ProofChallenge, ProofHireConfig } from "../../../packages/shared/src/index.js";
import { deriveProofApplicantStatus, evaluateProofSubmission } from "../proofhire.js";
import { db } from "../repos.js";
import { param } from "../http.js";
import { buildProofSubmission, DEFAULT_PROOF_CHALLENGE_TEMPLATES } from "../repositories.js";
import { normalizeProofHireConfig, ownsJob } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { requireApplicant, requireRecruiter } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { createChallengeSchema, proofHireConfigSchema, submissionSchema, updateChallengeSchema } from "../schemas/index.js";

export const proofhireRouter = Router();

proofhireRouter.get("/templates", (_req, res) => {
  res.status(200).json({ templates: DEFAULT_PROOF_CHALLENGE_TEMPLATES });
});

proofhireRouter.get("/challenges", requireAuth, requireRecruiter, async (req, res) => {
  res.status(200).json({ challenges: await db.proofChallenge.listByRecruiter(req.user!.id) });
});

proofhireRouter.post("/challenges", requireAuth, requireRecruiter, validateBody(createChallengeSchema), async (req, res) => {
  try {
    const { buildProofChallenge } = await import("../repositories.js");
    const challenge = buildProofChallenge(req.body as CreateProofChallengeInput, req.user!.id);
    await db.proofChallenge.create(challenge);
    res.status(201).json({ challenge });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid ProofHire challenge body" });
  }
});

proofhireRouter.get("/my-submissions", requireAuth, requireApplicant, async (req, res) => {
  const submissions = await db.proofSubmission.listByApplicant(req.user!.id);
  const enriched = await Promise.all(submissions.map(async (sub) => ({
    ...sub,
    challengeTitle: (await db.proofChallenge.findById(sub.challengeId))?.title || "Unknown Challenge",
    jobTitle: (await db.job.findById(sub.jobId))?.title || "Unknown Job",
    challengeInstructions: (await db.proofChallenge.findById(sub.challengeId))?.instructions || "",
    challengePrompt: (await db.proofChallenge.findById(sub.challengeId))?.prompt || "",
  })));
  res.status(200).json({ submissions: enriched });
});

proofhireRouter.get("/challenges/:challengeId", requireAuth, async (req, res) => {
  const challenge = await db.proofChallenge.findById(param(req, "challengeId"));
  if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
  // Applicants may read a challenge only via the job-scoped endpoint; direct
  // reads stay recruiter-scoped to avoid leaking other recruiters' banks.
  if (req.user!.role !== "recruiter") { res.status(403).json({ error: "Only recruiters can access this challenge directly" }); return; }
  res.status(200).json({ challenge });
});

proofhireRouter.put("/challenges/:challengeId", requireAuth, requireRecruiter, validateBody(updateChallengeSchema), async (req, res) => {
  const challenge = await db.proofChallenge.findById(param(req, "challengeId"));
  if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
  if (challenge.recruiterId !== req.user!.id) { res.status(403).json({ error: "Only the owning recruiter can update this challenge" }); return; }
  await db.proofChallenge.update(param(req, "challengeId"), req.body as Partial<ProofChallenge>);
  res.status(200).json({ challenge: await db.proofChallenge.findById(param(req, "challengeId")) });
});

proofhireRouter.put("/jobs/:jobId/config", requireAuth, requireRecruiter, validateBody(proofHireConfigSchema), async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await ownsJob(req.user!.id, jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const config = normalizeProofHireConfig((req.body as { proofHire: ProofHireConfig }).proofHire);
  if (config.enabled && config.challengeId) {
    const challenge = await db.proofChallenge.findById(config.challengeId);
    if (!challenge || challenge.recruiterId !== req.user!.id) {
      res.status(400).json({ error: "Challenge must exist and belong to the recruiter" });
      return;
    }
  }
  await db.job.update(jobId, { proofHire: config });
  res.status(200).json({ job: await db.job.findById(jobId) });
});

// Public brief (title/instructions only via challenge record) — applicants need
// this to attempt; full bank stays behind /challenges above.
proofhireRouter.get("/jobs/:jobId/challenge", async (req, res) => {
  const job = await db.job.findById(param(req, "jobId"));
  if (!job || !job.proofHire.enabled || !job.proofHire.challengeId) {
    res.status(404).json({ error: "ProofHire challenge not configured for this job" });
    return;
  }
  const challenge = await db.proofChallenge.findById(job.proofHire.challengeId);
  if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
  res.status(200).json({ challenge, mode: job.proofHire.mode });
});

// SECURE: previously unauthenticated + leaked per-submission rows. Now the
// owning recruiter only, and only aggregate counts (no applicant code).
proofhireRouter.get("/jobs/:jobId/questions", requireAuth, requireRecruiter, async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await ownsJob(req.user!.id, jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const count = (await db.proofSubmission.listByJob(jobId)).length;
  res.status(200).json({ questions: [], submissionCount: count });
});

proofhireRouter.get("/jobs/:jobId/results", requireAuth, requireRecruiter, async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await ownsJob(req.user!.id, jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.status(200).json({ submissions: await db.proofSubmission.listByJob(jobId), proofHire: job.proofHire });
});

proofhireRouter.get("/jobs/:jobId/submission", requireAuth, requireApplicant, async (req, res) => {
  res.status(200).json({ submission: await db.proofSubmission.findByJobAndApplicant(param(req, "jobId"), req.user!.id) });
});

proofhireRouter.post("/jobs/:jobId/submission", requireAuth, requireApplicant, validateBody(submissionSchema), async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await db.job.findById(jobId);
  if (!job || !job.proofHire.enabled || !job.proofHire.challengeId) {
    res.status(404).json({ error: "ProofHire challenge not configured for this job" });
    return;
  }
  const challenge = await db.proofChallenge.findById(job.proofHire.challengeId);
  if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
  const body = req.body as { code: string; language?: string };
  const existing = await db.proofSubmission.findByJobAndApplicant(jobId, req.user!.id);
  if (existing) {
    await db.proofSubmission.update(existing.id, { code: body.code, language: body.language ?? existing.language, status: "draft" });
    res.status(200).json({ submission: await db.proofSubmission.findById(existing.id), challenge });
    return;
  }
  const submission = buildProofSubmission(jobId, challenge.id, req.user!.id, body.code, body.language ?? "typescript");
  await db.proofSubmission.create(submission);
  res.status(201).json({ submission, challenge });
});

proofhireRouter.post("/jobs/:jobId/submission/evaluate", requireAuth, requireApplicant, async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await db.job.findById(jobId);
  if (!job || !job.proofHire.enabled || !job.proofHire.challengeId) {
    res.status(404).json({ error: "ProofHire challenge not configured for this job" });
    return;
  }
  const challenge = await db.proofChallenge.findById(job.proofHire.challengeId);
  const submission = await db.proofSubmission.findByJobAndApplicant(jobId, req.user!.id);
  if (!challenge || !submission) { res.status(404).json({ error: "Submission or challenge not found" }); return; }

  const evaluation = evaluateProofSubmission(challenge, submission.code);
  const submittedAt = new Date().toISOString();
  await db.proofSubmission.update(submission.id, { status: "evaluated", evaluation, submittedAt });
  const updated = await db.proofSubmission.findById(submission.id);
  const proofStatus = deriveProofApplicantStatus(updated, job.proofHire.mode === "required");
  const existingApplication = await db.application.findByJobAndApplicant(jobId, req.user!.id);
  if (existingApplication) {
    await db.application.update(existingApplication.id, {
      proofHireStatus: proofStatus, proofSubmissionId: updated?.id,
      proofScore: evaluation.score, proofCompletedAt: submittedAt,
    });
  }
  res.status(200).json({ submission: updated, evaluation, proofStatus });
});
