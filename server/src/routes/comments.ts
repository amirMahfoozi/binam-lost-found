// src/routes/comments.ts
import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * Build a nested comment tree from flat list
 */
function buildCommentTree(comments: any[]) {
  const map = new Map<string, any>();
  const roots: any[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id);
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// GET /items/:itemId/comments
router.get("/items/:itemId/comments", async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // Ensure the item exists and is not deleted
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const comments = await prisma.comment.findMany({
      where: {
        itemId: itemId,
        isDeleted: false,
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    const tree = buildCommentTree(comments);

    res.json(tree);
  } catch (err) {
    next(err);
  }
});

// POST /items/:itemId/comments
// Body: { body, parentId? }
router.post(
  "/items/:itemId/comments",
  requireAuth,
  async (req: AuthRequest, res, next) => {
    try {
      const { itemId } = req.params;
      const { body, parentId } = req.body as {
        body?: string;
        parentId?: string;
      };

      if (!body || typeof body !== "string") {
        return res.status(400).json({ error: "body is required" });
      }

      // Check item exists
      const item = await prisma.item.findFirst({
        where: {
          id: itemId,
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // If parentId is provided, ensure that parent comment exists and belongs to the same item
      if (parentId) {
        const parent = await prisma.comment.findFirst({
          where: {
            id: parentId,
            itemId: itemId,
            isDeleted: false,
          },
          select: { id: true },
        });

        if (!parent) {
          return res
            .status(400)
            .json({ error: "Invalid parentId for this item" });
        }
      }

      const userId = req.user!.userId;

      const comment = await prisma.comment.create({
        data: {
          itemId,
          userId,
          body,
          parentId: parentId || null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /comments/:id
// Body: { body }
router.put(
  "/comments/:id",
  requireAuth,
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { body } = req.body as { body?: string };
      const userId = req.user!.userId;

      if (!body || typeof body !== "string") {
        return res.status(400).json({ error: "body is required" });
      }

      const existing = await prisma.comment.findUnique({
        where: { id },
      });

      if (!existing || existing.isDeleted) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (existing.userId !== userId) {
        return res.status(403).json({ error: "Not allowed to edit this comment" });
      }

      const updated = await prisma.comment.update({
        where: { id },
        data: { body },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /comments/:id  (soft delete)
router.delete(
  "/comments/:id",
  requireAuth,
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const existing = await prisma.comment.findUnique({
        where: { id },
      });

      if (!existing || existing.isDeleted) {
        return res.status(404).json({ error: "Comment not found" });
      }

      if (existing.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Not allowed to delete this comment" });
      }

      await prisma.comment.update({
        where: { id },
        data: { isDeleted: true },
      });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
