// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  const status = err.status || 500;
  const message =
    err.message || "Something went wrong. Please try again later.";

  res.status(status).json({ error: message });
}
