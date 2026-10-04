import { Router } from "express";
import { parseApplicantsCsv } from "../csv.js";
import { parseResumeUpload } from "../resume.js";
import { createRunRecord } from "../helpers.js";
import { db } from "../repos.js";
import { param } from "../http.js";
import { buildReviewRecord } from "../repositories.js";
import { ingestLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRecruiter } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { csvIngestSchema, resumeIngestSchema, reviewSchema, screeningRequestSchema } from "../schemas/index.js";

export const screeningRouter = Router();

// Ad-hoc screening and candidate ingestion are recruiter tools; mounted at /api, so the
// guard is applied per route rather than with router.use (which would catch every /api path).
const recruiterOnly = [requireAuth, requireRecruiter];

async function ownedRun(runId: string, userId: string) {
  const run = await db.screening.getRun(runId);
  return run && run.ownerId === userId ? run : null;
}

screeningRouter.post("/screen", ...recruiterOnly, validateBody(screeningRequestSchema), async (req, res) => {
  try {
    res.status(200).json(await createRunRecord(req.body, req.user!.id));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request body" });
  }
});

screeningRouter.get("/screenings", ...recruiterOnly, async (req, res) => {
  res.status(200).json((await db.screening.listRuns()).filter((run) => run.ownerId === req.user!.id));
});

screeningRouter.get("/screenings/:id", ...recruiterOnly, async (req, res) => {
  // 404 (not 403) for other recruiters' runs, so run IDs can't be probed.
  const run = await ownedRun(param(req, "id"), req.user!.id);
  if (!run) { res.status(404).json({ error: "Screening run not found" }); return; }
  res.status(200).json({ run, reviews: await db.screening.listReviews(param(req, "id")) });
});

screeningRouter.post("/reviews", ...recruiterOnly, validateBody(reviewSchema), async (req, res) => {
  try {
    if (!(await ownedRun((req.body as { screeningRunId: string }).screeningRunId, req.user!.id))) {
      res.status(404).json({ error: "Screening run not found" });
      return;
    }
    const review = buildReviewRecord(req.body);
    await db.screening.saveReview(review);
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid review body" });
  }
});

screeningRouter.post("/ingest/csv", ...recruiterOnly, ingestLimiter, validateBody(csvIngestSchema), async (req, res) => {
  try {
    res.status(200).json({ applicants: parseApplicantsCsv((req.body as { csvText: string }).csvText) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid CSV body" });
  }
});

screeningRouter.post("/ingest/resume", ...recruiterOnly, ingestLimiter, validateBody(resumeIngestSchema), async (req, res) => {
  try {
    const profile = await parseResumeUpload(req.body as { mimeType: string; base64: string });
    res.status(200).json({
      applicant: {
        id: profile.id || `applicant-${crypto.randomUUID()}`,
        fullName: `${profile.firstName} ${profile.lastName}`.trim() || "Unknown",
        source: "resume_upload" as const,
        skills: profile.skills?.map((s) => s.name) || [],
        yearsExperience: profile.experience?.length
          ? Math.max(...profile.experience.map((e) => {
              const start = parseInt(e.startDate?.slice(0, 4) || "0");
              const end = e.endDate?.toLowerCase() === "present" || !e.endDate ? new Date().getFullYear() : parseInt(e.endDate?.slice(0, 4) || "0");
              return end - start;
            }))
          : undefined,
        educationLevel: profile.education?.[0]?.degree,
        location: profile.location,
        rawResumeText: undefined,
        profileSummary: profile.bio?.slice(0, 240),
        email: profile.email,
        phone: profile.phone,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid resume body" });
  }
});
