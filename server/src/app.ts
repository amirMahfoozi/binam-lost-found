// src/app.ts
import express from "express";
import cors from "cors";
import path from "path";

import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import tagsRouter from "./routes/tags";
import itemsRouter from "./routes/items";
import commentsRouter from "./routes/comments";
import reportsRouter from "./routes/reports";
import uploadRouter from "./routes/upload";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve uploaded files statically
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "..", "uploads"))
  );

  // Routes
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/tags", tagsRouter);
  app.use("/items", itemsRouter);
  app.use("/", commentsRouter);
  app.use("/reports", reportsRouter);
  app.use("/upload", uploadRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
