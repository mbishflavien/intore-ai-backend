import { Router } from "express";
import type { InterviewType } from "../../../packages/shared/src/index.js";
import { db } from "../repos.js";
import { buildActivityLog, buildInterview, buildNotification } from "../repositories.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRecruiter } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { createInterviewSchema } from "../schemas/index.js";

export const interviewsRouter = Router();

interviewsRouter.post("/", requireAuth, requireRecruiter, validateBody(createInterviewSchema), async (req, res) => {
  try {
    const body = req.body as {
      applicationId: string; jobId: string; candidateId: string; scheduledAt: string;
      duration: number; type: InterviewType; meetingLink?: string; notes?: string;
    };
    const application = await db.application.findById(body.applicationId);
    if (!application) { res.status(404).json({ error: "Application not found" }); return; }
    const job = await db.job.findById(body.jobId);
    if (!job || job.recruiterId !== req.user!.id) { res.status(403).json({ error: "You do not own this job" }); return; }
    // The application must belong to that job and candidate, or a recruiter could
    // schedule (and notify) another recruiter's applicant.
    if (application.jobId !== job.id || application.applicantId !== body.candidateId) {
      res.status(400).json({ error: "Application does not match this job and candidate" });
      return;
    }

    const interview = buildInterview({
      applicationId: body.applicationId, jobId: body.jobId, candidateId: body.candidateId,
      recruiterId: req.user!.id, scheduledAt: body.scheduledAt, duration: body.duration,
      type: body.type, meetingLink: body.meetingLink, notes: body.notes,
    });
    await db.interview.create(interview);
    const notification = buildNotification({
      userId: body.candidateId, type: "interview_scheduled", title: "Interview Scheduled",
      message: `You have been invited for an interview for ${job.title}. Scheduled for ${new Date(body.scheduledAt).toLocaleString()}.`,
      data: { interviewId: interview.id, jobId: body.jobId },
    });
    await db.notification.create(notification);
    await db.activityLog.create(buildActivityLog({
      recruiterId: req.user!.id, event: "interview_scheduled", jobId: body.jobId, jobTitle: job.title,
      candidateName: `${application.profile?.firstName ?? ""} ${application.profile?.lastName ?? ""}`.trim() || "Unknown",
    }));
    res.status(201).json({ interview, notification });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to schedule interview" });
  }
});

interviewsRouter.get("/", requireAuth, requireRecruiter, async (req, res) => {
  res.status(200).json({ interviews: await db.interview.findByRecruiter(req.user!.id) });
});
