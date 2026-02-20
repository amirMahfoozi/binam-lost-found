// src/routes/comments.ts
import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthRequest, optionalAuth } from "../middleware/auth";

const router = Router();

// POST /items/:itemId/comments
// Body: { body }
router.post("/items/:itemId/comments", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const iid = Number(req.params.itemId);
    if (!Number.isFinite(iid)) {
      return res.status(400).json({ error: "Invalid itemId" });
    }

    const { body } = req.body as { body?: string };

    if (!body || typeof body !== "string" || body.trim() === "") {
      return res.status(400).json({ error: "body is required" });
    }

    const userId = Number(req.user!.userId);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: "Invalid auth user" });
    }

    const item = await prisma.items.findUnique({
      where: { iid: iid },
      select: { iid: true },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const comment = await prisma.comments.create({
      data: {
        iid: iid,
        uid: userId,
        comment_text: body.trim(),
      },
      include: {
        users: { select: { uid: true, username: true } },
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// DELETE /comments/:id
router.delete("/:commentId", requireAuth, async (req: AuthRequest, res, next) => {
    try {
      const cid = Number(req.params.commentId);
      if (!Number.isFinite(cid)) {
        return res.status(400).json({ error: "Invalid commentId" });
      }
      const userId = Number(req.user!.userId);
      if (!Number.isFinite(userId)) {
        return res.status(401).json({ error: "Invalid auth user" });
      }

      const existing = await prisma.comments.findUnique({
        where: { cid },
      });

      if (!existing) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (existing.uid !== userId) {
        return res
          .status(403)
          .json({ error: "Not allowed to delete this comment" });
      }

      await prisma.comments.delete({
        where: { cid },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// GET /items/:itemId/comments
router.get("/items/:itemId/comments", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const iid = Number(req.params.itemId);
    if (!Number.isFinite(iid)) {
      return res.status(400).json({ error: "Invalid itemId" });
    }

    // optional auth: user can be null
    const currentUserId = req.user ? Number(req.user.userId) : null;
    if (req.user && !Number.isFinite(currentUserId)) {
      return res.status(401).json({ error: "Invalid auth user" });
    }

    // Ensure item exists
    const item = await prisma.items.findUnique({
      where: { iid },
      select: { iid: true },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const comments = await prisma.comments.findMany({
      where: { iid },
      orderBy: { date_added: "asc" },
      include: {
        users: {
          select: { uid: true, username: true },
        },
      },
    });

    res.json({
      comments: comments.map((c) => ({
        cid: c.cid,
        iid: c.iid,
        uid: c.uid,
        comment_text: c.comment_text,
        date_added: c.date_added,
        user: c.users ? { uid: c.users.uid, username: c.users.username } : null,
        permissions: {
          canDelete: currentUserId !== null && c.uid !== null && c.uid === currentUserId,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
