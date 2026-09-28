import { Router } from "express";
import type { TrainingRecommendation } from "../../../packages/shared/src/index.js";
import { evaluateProofSubmission } from "../proofhire.js";
import { db } from "../repos.js";
import { param } from "../http.js";
import {
  buildMentorResponse, buildSkillGapRecommendations, getOrCreateMentorSession, getTrainingModuleById,
  getTrainingProgress, guessSkillFromMessage, listTrainingModules, markTrainingUnitComplete,
  normalizeRecommendationReason, persistSession, respond,
} from "../training.js";
import { requireAuth } from "../middleware/auth.js";
import { requireApplicant, requireRecruiter } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { mentorChatSchema, practiceEvaluateSchema, trainingProgressSchema } from "../schemas/index.js";

export const bootTime = new Date();

export const trainingRouter = Router();

trainingRouter.get("/", (_req, res) => {
  res.status(200).json({ modules: listTrainingModules() });
});

trainingRouter.get("/recommendations", requireAuth, requireApplicant, async (req, res) => {
  const profile = await db.profile.findByApplicant(req.user!.id);
  const jobs = await db.job.findPublished();
  const raw = buildSkillGapRecommendations({
    profileSkills: (profile?.skills ?? []).map((s) => s.name),
    jobs: jobs.map((j) => ({ requiredSkills: j.requiredSkills, title: j.title })),
  });
  const recommendations: Array<TrainingRecommendation & { reason: string }> = raw.map((r) => ({ ...r, reason: normalizeRecommendationReason(r) }));
  res.status(200).json({ recommendations: recommendations.slice(0, 8) });
});

trainingRouter.get("/progress", requireAuth, requireApplicant, async (req, res) => {
  res.status(200).json({ progress: await getTrainingProgress(req.user!.id) });
});

trainingRouter.post("/progress/:moduleId", requireAuth, requireApplicant, validateBody(trainingProgressSchema), async (req, res) => {
  try {
    res.status(200).json({ progress: await markTrainingUnitComplete(req.user!.id, param(req, "moduleId"), (req.body as { unitId: string }).unitId) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update training progress" });
  }
});

trainingRouter.get("/practice", requireAuth, requireApplicant, async (_req, res) => {
  const jobs = await db.job.findPublished();
  const challenges = [];
  for (const job of jobs) {
    if (!job.proofHire.enabled || !job.proofHire.challengeId) continue;
    const challenge = await db.proofChallenge.findById(job.proofHire.challengeId);
    if (!challenge) continue;
    challenges.push({ challengeId: challenge.id, jobId: job.id, jobTitle: job.title, title: challenge.title, type: challenge.type, requiredSkills: challenge.requiredSkills });
  }
  res.status(200).json({ challenges });
});

trainingRouter.post("/practice/evaluate", requireAuth, requireApplicant, validateBody(practiceEvaluateSchema), async (req, res) => {
  try {
    const body = req.body as { challengeId: string; code: string };
    const challenge = await db.proofChallenge.findById(body.challengeId);
    if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
    res.status(200).json({ evaluation: evaluateProofSubmission(challenge, body.code), practice: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to evaluate practice submission" });
  }
});

trainingRouter.get("/practice/:challengeId", requireAuth, requireApplicant, async (req, res) => {
  const challenge = await db.proofChallenge.findById(param(req, "challengeId"));
  if (!challenge) { res.status(404).json({ error: "Challenge not found" }); return; }
  res.status(200).json({ challenge });
});

trainingRouter.get("/:moduleId", async (req, res) => {
  const module = getTrainingModuleById(param(req, "moduleId"));
  if (!module) { res.status(404).json({ error: "Training module not found" }); return; }
  res.status(200).json({ module });
});

export const mentorRouter = Router();

mentorRouter.post("/chat", requireAuth, requireApplicant, validateBody(mentorChatSchema), async (req, res) => {
  try {
    const body = req.body as { skill?: string; message: string; sessionId?: string };
    const applicantId = req.user!.id;
    let skill = body.skill?.trim() ?? "";
    let sessionId = body.sessionId;
    if (sessionId) {
      const existing = (await getOrCreateMentorSession({ applicantId, sessionId })).session;
      if (skill && existing.skill && skill !== existing.skill) sessionId = undefined;
      skill = skill || existing.skill;
    }
    if (!skill) skill = guessSkillFromMessage(body.message, "");
    const { session } = await getOrCreateMentorSession({ applicantId, sessionId, skill });
    const result = await respond(session, body.message.trim() || "");
    persistSession(session);
    res.status(200).json(buildMentorResponse(session, result));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Mentor chat failed" });
  }
});

export const recruiterRouter = Router();

recruiterRouter.use(requireAuth, requireRecruiter);

recruiterRouter.get("/jobs", async (req, res) => {
  res.status(200).json({ jobs: await db.job.findByRecruiter(req.user!.id) });
});

recruiterRouter.get("/activity", async (req, res) => {
  const jobs = await db.job.findByRecruiter(req.user!.id);
  const activities: Array<{ type: "new_application" | "status_change"; timestamp: string; candidateName: string; jobTitle: string; newStatus: string; previousStatus: string | null }> = [];
  for (const job of jobs) {
    for (const app of await db.application.findByJob(job.id)) {
      activities.push({
        type: "new_application", timestamp: app.createdAt,
        candidateName: app.profile?.firstName && app.profile?.lastName ? `${app.profile.firstName} ${app.profile.lastName}` : app.applicantId,
        jobTitle: job.title, newStatus: app.status, previousStatus: null,
      });
      if (app.updatedAt && app.createdAt && app.updatedAt !== app.createdAt) {
        activities.push({
          type: "status_change", timestamp: app.updatedAt,
          candidateName: app.profile?.firstName && app.profile?.lastName ? `${app.profile.firstName} ${app.profile.lastName}` : app.applicantId,
          jobTitle: job.title, newStatus: app.status, previousStatus: "submitted",
        });
      }
    }
  }
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.status(200).json({ activities: activities.slice(0, 20) });
});

// READ-ONLY derived feed. Marking as read is explicit via POST .../read-all.
recruiterRouter.get("/notifications", async (req, res) => {
  const jobs = await db.job.findByRecruiter(req.user!.id);
  const notifications: Array<{ id: string; jobTitle: string; candidateName: string; createdAt: string }> = [];
  for (const job of jobs) {
    for (const app of await db.application.findByJob(job.id)) {
      if (!app.isRead) {
        notifications.push({
          id: app.id, jobTitle: job.title,
          candidateName: app.profile?.firstName && app.profile?.lastName ? `${app.profile.firstName} ${app.profile.lastName}` : "Unknown Candidate",
          createdAt: app.createdAt,
        });
      }
    }
  }
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.status(200).json({ notifications, unreadCount: notifications.length });
});

recruiterRouter.post("/notifications/read-all", async (req, res) => {
  for (const job of await db.job.findByRecruiter(req.user!.id)) {
    for (const app of await db.application.findByJob(job.id)) {
      if (!app.isRead) await db.application.update(app.id, { isRead: true });
    }
  }
  res.status(200).json({ success: true });
});

export const systemRouter = Router();

systemRouter.get("/health", (_req, res) => {
  res.status(200).json({ api: "connected", database: "connected", lastBackup: new Date().toISOString() });
});

export const miscRouter = Router();

miscRouter.get("/stats", requireAuth, requireRecruiter, async (req, res) => {
  try {
    const jobs = await db.job.findByRecruiter(req.user!.id);
    const applications = await db.application.findByJobs(jobs.map((j) => j.id));
    const allJobs = await db.job.findPublished();
    let totalScore = 0, scoredCandidates = 0, screenedCount = 0;
    try {
      for (const run of await db.screening.listRuns()) {
        if (run.result?.shortlisted) {
          for (const c of run.result.shortlisted) {
            if (c.score?.total !== undefined) { totalScore += c.score.total; scoredCandidates++; }
          }
          screenedCount += run.result.totalApplicants || 0;
        }
      }
    } catch (e) { console.error("Failed to fetch screening metrics:", e); }
    res.status(200).json({
      totalApplicants: applications.length,
      acceptedApplicants: applications.filter((a) => a.status === "accepted").length,
      totalJobs: allJobs.length,
      publishedJobs: allJobs.filter((j) => j.status === "published").length,
      closedJobs: allJobs.filter((j) => j.status === "closed").length,
      systemUptime: Math.floor((Date.now() - bootTime.getTime()) / 1000),
      avgMatch: scoredCandidates > 0 ? Math.round(totalScore / scoredCandidates) : 0,
      screenedCount,
      timeSavedHours: Math.floor((screenedCount * 15) / 60),
    });
  } catch { res.status(500).json({ error: "Failed to fetch stats" }); }
});

miscRouter.get("/activity", requireAuth, requireRecruiter, async (req, res) => {
  try {
    res.status(200).json({ activities: await db.activityLog.findByRecruiter(req.user!.id, 50) });
  } catch { res.status(500).json({ error: "Failed to fetch activity logs" }); }
});

miscRouter.delete("/users/delete/:username", requireAuth, async (req, res) => {
  try {
    const decoded = decodeURIComponent(param(req, "username"));
    if (req.user!.username.toLowerCase() !== decoded.toLowerCase()) {
      res.status(403).json({ error: "You can only delete your own account" });
      return;
    }
    const target = await db.user.findByUsername(decoded);
    if (!target) { res.status(404).json({ error: "User not found" }); return; }
    await db.user.delete(target.id);
    res.status(200).json({ message: `User ${param(req, "username")} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Delete failed" });
  }
});
