// src/routes/health.ts
import { Router } from "express";
import { prisma } from "../db";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

// Optional: DB health check
router.get("/db", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    next(err);
  }
});

export default router;
