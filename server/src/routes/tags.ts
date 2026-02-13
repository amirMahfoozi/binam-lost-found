// src/routes/tags.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /tags/
// returns tags with their tids to use, name to display and color to show
router.get("/", async (req, res, next) => {
  try {
    const tags = await prisma.tags.findMany({
      orderBy: {
        tid: 'asc',
      },
      select: {
        tid: true,
        tagname: true,
        color: true,
      },
    });

    res.status(200).json(tags);
  } catch (err) {
    next(err);
  }
});

export default router;