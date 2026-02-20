// src/app.ts
import express from "express";
import cors from "cors";
import path from "path";

import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import itemsRouter from "./routes/items";
import uploadRouter from "./routes/upload";
import tagsRouter from "./routes/tags";
import commentsRouter from "./routes/comments";
import { errorHandler } from "./middleware/errorHandler";
import chatbotRouter from "./routes/chatbot";


// import path from "node:path";
import { fileURLToPath } from "node:url";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

  // Serve uploaded files statically
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "..", "uploads"))
  );

  // Routes
  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/items", itemsRouter);
  app.use("/upload", uploadRouter);
  app.use("/tags", tagsRouter);
  app.use("/comments", commentsRouter);
  app.use("/chatbot", chatbotRouter);


  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}



