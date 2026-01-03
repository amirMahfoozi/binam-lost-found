// src/utils/mailer.ts
import nodemailer from "nodemailer";
import { env } from "../config/env";

function assertEmailConfig() {
  if (env.EMAIL_MODE !== "smtp") return;

  const missing: string[] = [];
  if (!env.SMTP_HOST) missing.push("SMTP_HOST");
  if (!env.SMTP_USER) missing.push("SMTP_USER");
  if (!env.SMTP_PASS) missing.push("SMTP_PASS");
  if (!env.EMAIL_FROM) missing.push("EMAIL_FROM");

  if (missing.length) {
    throw new Error(
      `Missing email configuration for EMAIL_MODE=smtp: ${missing.join(", ")}`
    );
  }
}

// Create the transporter lazily to avoid hard-crashing in dev when EMAIL_MODE=log
let cachedTransporter: nodemailer.Transporter | null = null;
function getTransporter() {
  assertEmailConfig();
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}

export async function sendOtpEmail(to: string, otp: string, expiresMinutes: number) {
  // Local dev option: don't send, just log
  if (env.EMAIL_MODE === "log") {
    // eslint-disable-next-line no-console
    console.log(`[EMAIL_MODE=log] OTP for ${to}: ${otp} (expires in ${expiresMinutes} min)`);
    return;
  }

  const transporter = getTransporter();

  const subject = `Your verification code: ${otp}`;
  const text =
    `Your one-time verification code is: ${otp}\n\n` +
    `It expires in ${expiresMinutes} minutes. ` +
    `If you didn't request this, you can ignore this email.`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin: 0 0 12px 0;">Verify your email</h2>
      <p style="margin: 0 0 12px 0;">Use the code below to continue:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 8px 0 16px 0;">${otp}</div>
      <p style="margin: 0 0 6px 0;">This code expires in <b>${expiresMinutes} minutes</b>.</p>
      <p style="margin: 0; color: #555;">If you didn't request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}
