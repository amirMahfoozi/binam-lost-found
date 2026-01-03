// src/config/env.ts
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Email (SMTP) configuration
// Set EMAIL_MODE=smtp to actually send emails.
// For local development, you can set EMAIL_MODE=log to print the OTP instead.
const EMAIL_MODE = (process.env.EMAIL_MODE || "smtp").toLowerCase();
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SECURE =
  (process.env.SMTP_SECURE || "").toLowerCase() === "true" || SMTP_PORT === 465;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER || "no-reply@example.com";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

export const env = {
  PORT,
  JWT_SECRET,

  EMAIL_MODE,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  EMAIL_FROM,
};
