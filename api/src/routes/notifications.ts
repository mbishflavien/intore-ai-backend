import { Router } from "express";
import { db } from "../repos.js";
import { param } from "../http.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  res.status(200).json({ notifications: await db.notification.findByUser(req.user!.id) });
});

// Exact route BEFORE /:id/read so Express never confuses "read-all" for an id.
notificationsRouter.post("/read-all", requireAuth, async (req, res) => {
  await db.notification.markAllAsRead(req.user!.id);
  res.status(200).json({ success: true });
});

notificationsRouter.post("/:id/read", requireAuth, async (req, res) => {
  const notification = await db.notification.findById(param(req, "id"));
  if (!notification) { res.status(404).json({ error: "Notification not found" }); return; }
  // Ownership enforced: users can only mark their own notifications.
  if (notification.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.notification.markAsRead(param(req, "id"));
  res.status(200).json({ success: true });
});
