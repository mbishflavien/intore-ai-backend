import { Router } from "express";
import { parseApplicantsCsv } from "../csv.js";
import { parseResumeUpload } from "../resume.js";
import { createRunRecord } from "../helpers.js";
import { db } from "../repos.js";
import { param } from "../http.js";
import { buildReviewRecord } from "../repositories.js";
import { ingestLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { csvIngestSchema, resumeIngestSchema, reviewSchema, screeningRequestSchema } from "../schemas/index.js";

export const screeningRouter = Router();

screeningRouter.post("/screen", validateBody(screeningRequestSchema), async (req, res) => {
  try {
    res.status(200).json(await createRunRecord(req.body));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request body" });
  }
});

screeningRouter.get("/screenings", async (_req, res) => {
  res.status(200).json(await db.screening.listRuns());
});

screeningRouter.get("/screenings/:id", async (req, res) => {
  const run = await db.screening.getRun(param(req, "id"));
  if (!run) { res.status(404).json({ error: "Screening run not found" }); return; }
  res.status(200).json({ run, reviews: await db.screening.listReviews(param(req, "id")) });
});

screeningRouter.post("/reviews", validateBody(reviewSchema), async (req, res) => {
  try {
    const review = buildReviewRecord(req.body);
    await db.screening.saveReview(review);
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid review body" });
  }
});

screeningRouter.post("/ingest/csv", ingestLimiter, validateBody(csvIngestSchema), async (req, res) => {
  try {
    res.status(200).json({ applicants: parseApplicantsCsv((req.body as { csvText: string }).csvText) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid CSV body" });
  }
});

screeningRouter.post("/ingest/resume", ingestLimiter, validateBody(resumeIngestSchema), async (req, res) => {
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
