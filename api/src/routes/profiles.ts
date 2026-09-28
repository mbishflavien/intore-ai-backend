import { Router } from "express";
import { checkProfileCompleteness } from "../../../packages/shared/src/index.js";
import type { TalentProfile } from "../../../packages/shared/src/index.js";
import { parseResumeUpload } from "../resume.js";
import { db } from "../repos.js";
import { buildStarterProfile } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { requireApplicant } from "../middleware/rbac.js";
import { validateBody } from "../middleware/validate.js";
import { ingestLimiter } from "../middleware/rateLimit.js";
import { resumeIngestSchema, saveProfileSchema } from "../schemas/index.js";

export const profilesRouter = Router();

profilesRouter.post("/parse", requireAuth, requireApplicant, ingestLimiter, validateBody(resumeIngestSchema), async (req, res) => {
  try {
    const profile = await parseResumeUpload(req.body as { mimeType: string; base64: string });
    res.status(200).json({ profile });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to parse resume" });
  }
});

profilesRouter.get("/", requireAuth, requireApplicant, async (req, res) => {
  const profile = await db.profile.findByApplicant(req.user!.id);
  if (!profile) {
    const starter = buildStarterProfile(req.user!);
    await db.profile.save(req.user!.id, starter);
    res.status(200).json({ profile: starter });
    return;
  }
  res.status(200).json({ profile });
});

profilesRouter.post("/", requireAuth, requireApplicant, validateBody(saveProfileSchema), async (req, res) => {
  try {
    const profile = (req.body as { profile: TalentProfile }).profile;
    await db.profile.save(req.user!.id, profile);
    res.status(201).json({ message: "Profile saved successfully", profile, completeness: checkProfileCompleteness(profile) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save profile" });
  }
});

profilesRouter.put("/", requireAuth, requireApplicant, validateBody(saveProfileSchema), async (req, res) => {
  try {
    const profile = (req.body as { profile: TalentProfile }).profile;
    await db.profile.save(req.user!.id, profile);
    res.status(200).json({ message: "Profile updated successfully", profile, completeness: checkProfileCompleteness(profile) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update profile" });
  }
});
