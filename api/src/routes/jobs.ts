import { Router } from "express";
import type { CreateJobInput, Job } from "../../../packages/shared/src/index.js";
import { db } from "../repos.js";
import { param } from "../http.js";
import { buildActivityLog } from "../repositories.js";
import { createRunRecord, ownsJob, buildProofSignalsForJob } from "../helpers.js";
import type { JobRequirementInput, RankedCandidate, ScreeningRequest } from "../../../packages/shared/src/index.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRecruiter } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { createJobSchema, updateJobSchema } from "../schemas/index.js";
import { buildDefaultJob } from "../repositories.js";

export const jobsRouter = Router();

// Public: published jobs with candidate counts
jobsRouter.get("/", async (_req, res) => {
  const jobs = await db.job.findPublished();
  const jobsWithCounts = await Promise.all(
    jobs.map(async (job) => ({ ...job, candidateCount: (await db.application.findByJob(job.id)).length })),
  );
  res.status(200).json({ jobs: jobsWithCounts });
});

jobsRouter.post("/", requireAuth, requireRecruiter, validateBody(createJobSchema), async (req, res) => {
  try {
    const body = req.body as CreateJobInput;
    if (body.proofHire?.enabled && body.proofHire.challengeId) {
      const challenge = await db.proofChallenge.findById(body.proofHire.challengeId);
      if (!challenge || challenge.recruiterId !== req.user!.id) {
        res.status(400).json({ error: "ProofHire challenge must belong to the recruiter" });
        return;
      }
    }
    const job = buildDefaultJob(body, req.user!.id);
    await db.job.create(job);
    await db.activityLog.create(buildActivityLog({ recruiterId: req.user!.id, event: "job_created", jobId: job.id, jobTitle: job.title }));
    res.status(201).json({ job });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request body" });
  }
});

jobsRouter.get("/:jobId", async (req, res) => {
  const job = await db.job.findById(param(req, "jobId"));
  // Drafts and closed jobs are visible only to the recruiter who owns them.
  if (!job || (job.status !== "published" && job.recruiterId !== req.user?.id)) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.status(200).json({ job });
});

jobsRouter.put("/:jobId", requireAuth, requireRecruiter, validateBody(updateJobSchema), async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await ownsJob(req.user!.id, jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  try {
    const body = req.body as Partial<Job>;
    if (body.proofHire?.enabled && body.proofHire.challengeId) {
      const challenge = await db.proofChallenge.findById(body.proofHire.challengeId);
      if (!challenge || challenge.recruiterId !== req.user!.id) {
        res.status(400).json({ error: "ProofHire challenge must belong to the recruiter" });
        return;
      }
    }
    await db.job.update(jobId, body);
    res.status(200).json({ job: await db.job.findById(jobId) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request body" });
  }
});

jobsRouter.delete("/:jobId", requireAuth, requireRecruiter, async (req, res) => {
  const job = await ownsJob(req.user!.id, param(req, "jobId"));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  await db.job.delete(param(req, "jobId"));
  res.status(204).send();
});

jobsRouter.post("/:jobId/publish", requireAuth, requireRecruiter, async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await ownsJob(req.user!.id, jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const wasPublished = job.status === "published";
  await db.job.updateStatus(jobId, "published");
  const publishedJob = await db.job.findById(jobId);
  if (publishedJob && !wasPublished) {
    const { notifyApplicantsAboutPublishedJob } = await import("../helpers.js");
    await notifyApplicantsAboutPublishedJob(publishedJob);
  }
  res.status(200).json({ job: publishedJob });
});

jobsRouter.post("/:jobId/close", requireAuth, requireRecruiter, async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await ownsJob(req.user!.id, jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  await db.job.updateStatus(jobId, "closed");
  await db.activityLog.create(buildActivityLog({ recruiterId: req.user!.id, event: "job_closed", jobId: job.id, jobTitle: job.title }));
  res.status(200).json({ job: await db.job.findById(jobId) });
});

jobsRouter.get("/:jobId/applications", requireAuth, requireRecruiter, async (req, res) => {
  const jobId = param(req, "jobId");
  const job = await ownsJob(req.user!.id, jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.status(200).json({ applications: await db.application.findByJob(jobId) });
});

// Recruiter-run screening: owner-only, updates each application with the result
jobsRouter.post("/:jobId/screen", requireAuth, requireRecruiter, async (req, res) => {
  const jobId = param(req, "jobId");
  try {
    const job = await db.job.findById(jobId);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    if (job.recruiterId !== req.user!.id) { res.status(403).json({ error: "You do not own this job" }); return; }
    const applications = await db.application.findByJob(jobId);
    if (applications.length === 0) { res.status(400).json({ error: "No applications to screen" }); return; }

    const jobInput: JobRequirementInput = {
      title: job.title, summary: job.summary, requiredSkills: job.requiredSkills,
      preferredSkills: job.preferredSkills, minimumYearsExperience: job.minimumYearsExperience,
      educationLevel: job.educationLevel, location: job.location, dealbreakers: job.dealbreakers,
      screeningWeights: job.screeningWeights, proofHire: job.proofHire,
    };
    const proofSignals = await buildProofSignalsForJob(jobId, job.proofHire);
    const screeningRequest: ScreeningRequest = {
      job: jobInput,
      applicants: applications.map((app) => ({ ...app.profile, id: app.applicantId })),
      shortlistSize: 10, proofSignals,
    };
    const run = await createRunRecord(screeningRequest, req.user!.id);
    const allCandidates = run.result.shortlisted?.length > 0
      ? run.result.shortlisted
      : applications.map<RankedCandidate>((app, idx) => ({
          applicantId: app.applicantId, rank: idx + 1,
          fullName: `${app.profile?.firstName || ""} ${app.profile?.lastName || ""}`.trim(),
          score: { skills: 0, experience: 0, education: 0, relevance: 0, proof: 0, total: 0 },
          matchedSkills: [], missingSkills: [], strengths: [], gaps: ["No strong match found"],
          recommendation: "Does not meet current requirements",
          source: app.profile?.source ?? "umurava_profile", dealbreakerHits: [],
          fraudRisk: { level: "low", signals: [] },
          proof: { status: "not_required", score: 0, passed: false, requiredSatisfied: true },
        }));
    for (const candidate of allCandidates) {
      const matchingApp = applications.find((app) => app.applicantId === candidate.applicantId);
      if (matchingApp) {
        await db.application.updateScreeningResult(matchingApp.id, {
          jobTitle: run.result.jobTitle, totalApplicants: run.result.totalApplicants,
          shortlisted: allCandidates, generatedAt: run.result.generatedAt, reasoningMode: run.result.reasoningMode,
        });
      }
    }
    res.status(200).json({ run });
  } catch (error) {
    console.error("[SCREEN] Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Screening failed" });
  }
});
