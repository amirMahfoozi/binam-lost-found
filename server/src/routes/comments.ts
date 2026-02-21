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
      // if comment has more than 5 reports hide comment (soft delete)
      where: { 
        iid, 
        OR: [
          { report_count: { lt: 5 } },
          { report_count: null }
        ] 
      },
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
        report_count: c.report_count,
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

// POST /comments/:commentId/report
router.post("/:commentId/report", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const commentId = Number(req.params.commentId);
    if (!Number.isFinite(commentId)) {
      return res.status(400).json({ error: "Invalid commentId" });
    }

    const userId = Number(req.user!.userId);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: "Invalid auth user" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) Ensure comment exists
      const existingComment = await tx.comments.findUnique({
        where: { cid: commentId },
        select: { cid: true, report_count: true },
      });

      if (!existingComment) {
        return { status: 404 as const, body: { error: "Comment not found" } };
      }

      // 2) Ensure this user hasn't already reported this comment
      const already = await tx.comment_reports.findUnique({
        where: {
          cid_uid: {
            cid: commentId,
            uid: userId,
          },
        },
        select: { cid: true, uid: true },
      });

      if (already) {
        return { status: 409 as const, body: { error: "You already reported this comment" } };
      }

      // 3) Record the report (creates the row with composite PK)
      await tx.comment_reports.create({
        data: {
          cid: commentId,
          uid: userId,
        },
      });

      // 4) Increment report_count
      const updated = await tx.comments.update({
        where: { cid: commentId },
        data: {
          report_count: { increment: 1 },
        },
        select: { cid: true, report_count: true },
      });

      const newCount = updated.report_count ?? 0;

      return {
        status: 200 as const,
        body: { success: true, reportCount: newCount },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    next(err);
  }
});

export default router;
