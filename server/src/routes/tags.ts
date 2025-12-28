// src/routes/tags.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

// GET /tags  => list all tags (for dropdowns etc.)
router.get("/", async (_req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
    });
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

export default router;
