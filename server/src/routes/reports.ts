// src/routes/reports.ts
import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { ReportTargetType } from "../generated/prisma/client";

const router = Router();

// POST /reports
// Body: { targetType: 'ITEM' | 'COMMENT', itemId?: string, commentId?: string, reason: string }
router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { targetType, itemId, commentId, reason } = req.body as {
      targetType?: string;
      itemId?: string;
      commentId?: string;
      reason?: string;
    };

    if (!targetType || (targetType !== "ITEM" && targetType !== "COMMENT")) {
      return res
        .status(400)
        .json({ error: "targetType must be 'ITEM' or 'COMMENT'" });
    }

    if (!reason || typeof reason !== "string") {
      return res.status(400).json({ error: "reason is required" });
    }

    const reporterId = req.user!.userId;

    if (targetType === "ITEM") {
      if (!itemId || typeof itemId !== "string") {
        return res
          .status(400)
          .json({ error: "itemId is required when targetType is ITEM" });
      }

      // Ensure item exists and not deleted
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

      try {
        await prisma.report.create({
          data: {
            reporterId,
            targetType: ReportTargetType.ITEM,
            itemId,
            commentId: null,
            reason,
          },
        });
      } catch (err: any) {
        // Unique constraint: user already reported this target
        if (err.code === "P2002") {
          return res
            .status(400)
            .json({ error: "You have already reported this item" });
        }
        throw err;
      }

      // Count reports for this item
      const count = await prisma.report.count({
        where: {
          targetType: ReportTargetType.ITEM,
          itemId,
        },
      });

      // Auto-hide item when reports > 5
      if (count > 5) {
        await prisma.item.update({
          where: { id: itemId },
          data: { isDeleted: true },
        });
      }

      return res.json({ success: true, reportsCount: count });
    }

    // targetType === 'COMMENT'
    if (!commentId || typeof commentId !== "string") {
      return res
        .status(400)
        .json({ error: "commentId is required when targetType is COMMENT" });
    }

    // Ensure comment exists and not deleted
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    try {
      await prisma.report.create({
        data: {
          reporterId,
          targetType: ReportTargetType.COMMENT,
          itemId: null,
          commentId,
          reason,
        },
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        return res
          .status(400)
          .json({ error: "You have already reported this comment" });
      }
      throw err;
    }

    // Count reports for this comment
    const count = await prisma.report.count({
      where: {
        targetType: ReportTargetType.COMMENT,
        commentId,
      },
    });

    // Auto-hide comment when reports > 5
    if (count > 5) {
      await prisma.comment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      });
    }

    return res.json({ success: true, reportsCount: count });
  } catch (err) {
    next(err);
  }
});

export default router;
