import { Router } from "express";
import type { ApplicationStatus, CreateApplicationInput } from "../../../packages/shared/src/index.js";
import { checkProfileCompleteness } from "../../../packages/shared/src/index.js";
import { deriveProofApplicantStatus } from "../proofhire.js";
import { db } from "../repos.js";
import { param } from "../http.js";
import { buildActivityLog, buildApplication, buildNotification } from "../repositories.js";
import { ownsJob } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { requireApplicant, requireRecruiter } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { createApplicationSchema, updateApplicationSchema } from "../schemas/index.js";

export const applicationsRouter = Router();

// Applicant: own applications. Recruiter: not allowed here (use /jobs/:id/applications).
applicationsRouter.get("/", requireAuth, async (req, res) => {
  res.status(200).json({ applications: await db.application.findByApplicant(req.user!.id) });
});

applicationsRouter.post("/", requireAuth, requireApplicant, validateBody(createApplicationSchema), async (req, res) => {
  try {
    const body = req.body as CreateApplicationInput;
    const job = await db.job.findById(body.jobId);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    if (job.status !== "published") { res.status(400).json({ error: "Job is not accepting applications" }); return; }

    const proofSubmission = await db.proofSubmission.findByJobAndApplicant(body.jobId, req.user!.id);
    const proofStatus = deriveProofApplicantStatus(proofSubmission, job.proofHire.enabled && job.proofHire.mode === "required");

    const completeness = checkProfileCompleteness(body.profile);
    if (!completeness.complete) {
      res.status(400).json({ error: "Profile is incomplete. Complete your profile before applying.", missing: completeness.missing });
      return;
    }
    if ((body.profile as { resumeUploaded?: boolean }).resumeUploaded !== true) {
      res.status(400).json({ error: "Resume upload is required. Upload and parse your resume before applying.", missing: ["Resume upload"] });
      return;
    }
    if (await db.application.findByJobAndApplicant(body.jobId, req.user!.id)) {
      res.status(409).json({ error: "You have already applied to this job" });
      return;
    }

    const application = buildApplication(body, req.user!.id);
    application.proofHireStatus = proofStatus;
    application.proofSubmissionId = proofSubmission?.id;
    application.proofScore = proofSubmission?.evaluation?.score;
    application.proofCompletedAt = proofSubmission?.evaluation?.generatedAt;
    await db.application.create(application);
    await db.activityLog.create(buildActivityLog({
      recruiterId: job.recruiterId, event: "application_submitted", jobId: job.id, jobTitle: job.title,
      candidateName: `${body.profile.firstName} ${body.profile.lastName}`.trim() || req.user!.username,
      metadata: { applicationId: application.id },
    }));
    res.status(201).json({ application });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request body" });
  }
});

applicationsRouter.put("/:applicationId", requireAuth, requireRecruiter, validateBody(updateApplicationSchema), async (req, res) => {
  try {
    const body = req.body as { status: ApplicationStatus };
    const application = await db.application.findById(param(req, "applicationId"));
    if (!application) { res.status(404).json({ error: "Application not found" }); return; }
    const job = await ownsJob(req.user!.id, application.jobId);
    if (!job) { res.status(403).json({ error: "You do not own the job for this application" }); return; }

    await db.application.updateStatus(param(req, "applicationId"), body.status);
    const updated = await db.application.findById(param(req, "applicationId"));
    if (updated && ["accepted", "rejected"].includes(body.status)) {
      await db.notification.create(buildNotification({
        userId: updated.applicantId, type: "status_update",
        title: body.status === "accepted" ? "Application Accepted" : "Application Rejected",
        message: body.status === "accepted" ? `Your application for ${job.title} was accepted.` : `Your application for ${job.title} was rejected.`,
        data: { applicationId: updated.id, jobId: updated.jobId, status: body.status },
      }));
    }
    res.status(200).json({ application: updated });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request body" });
  }
});
