import { Router } from "express";
import type { User, UserRole } from "../../../packages/shared/src/index.js";
import { generateToken, hashPassword, isLegacyPasswordHash, verifyPassword } from "../auth.js";
import { db } from "../repos.js";
import { toPublicUser } from "../repositories.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimit.js";
import { loginSchema, registerSchema } from "../schemas/index.js";

export const authRouter = Router();

authRouter.post("/register", registerLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const body = req.body as { username: string; firstName: string; lastName: string; email: string; password: string; role: UserRole };
    const existingUsername = await db.user.findByUsername(body.username);
    if (existingUsername) { res.status(409).json({ error: "Username already taken" }); return; }
    const existingEmail = await db.user.findByEmail(body.email);
    if (existingEmail) { res.status(409).json({ error: "Email already registered" }); return; }

    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      username: body.username,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role: body.role,
      createdAt: now,
      updatedAt: now,
    };
    await db.user.create(user);
    const token = await generateToken(user);
    res.status(201).json({ user: toPublicUser(user), token });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Registration failed" });
  }
});

authRouter.post("/login", loginLimiter, validateBody(loginSchema), async (req, res) => {
  try {
    const body = req.body as { emailOrUsername: string; password: string };
    const user = await db.user.findByEmailOrUsername(body.emailOrUsername);
    // Generic message: never reveal whether the identifier exists (prevents enumeration).
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email/username or password" });
      return;
    }
    if (isLegacyPasswordHash(user.passwordHash)) {
      try {
        await db.user.updatePasswordHash(user.id, await hashPassword(body.password));
      } catch (error) {
        console.error("Failed to migrate password hash for user", user.id, error);
      }
    }
    const token = await generateToken(user);
    res.status(200).json({ user: toPublicUser(user), token });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Login failed" });
  }
});

authRouter.delete("/delete", requireAuth, async (req, res) => {
  try {
    await db.user.delete(req.user!.id);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Delete failed" });
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});
