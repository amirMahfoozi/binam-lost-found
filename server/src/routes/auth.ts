// src/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db";
import { signToken } from "../utils/jwt";

const router = Router();

// Helper: generate 6-digit OTP as a string
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/request-otp
// Body: { email }
router.post("/request-otp", async (req, res, next) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        otpCode,
        expiresAt,
      },
    });

    // For now, log the OTP instead of sending email
    console.log(`OTP for ${normalizedEmail}: ${otpCode}`);

    return res.json({
      success: true,
      message: "OTP generated. Check server logs for the code (dev mode).",
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/verify-otp
// Body: { email, otp, password }
router.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, otp, password } = req.body as {
      email?: string;
      otp?: string;
      password?: string;
    };

    if (!email || !otp || !password) {
      return res
        .status(400)
        .json({ error: "Email, otp, and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        otpCode: otp,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists. Please log in instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    });

    await prisma.emailOtp.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    const token = signToken({ userId: user.id, email: user.email });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
// Body: { email, password }
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = signToken({ userId: user.id, email: user.email });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
