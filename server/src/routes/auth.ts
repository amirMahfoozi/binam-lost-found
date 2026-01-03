import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db";
import { signToken } from "../utils/jwt";
import { sendOtpEmail } from "../utils/mailer";

const router = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidEmail(email: string): boolean {
  // simple practical email check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Must contain: lowercase, uppercase, number, special char, length>=8
function isStrongPassword(pw: string): boolean {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

/**
 * POST /auth/register
 * Body: { email, username, password }
 *
 * Validates input, generates OTP, stores pending signup data, sends OTP to email.
 */
router.post("/register", async (req, res, next) => {
  try {
    const { email, username, password } = req.body as {
      email?: string;
      username?: string;
      password?: string;
    };

    if (!email || !username || !password) {
      return res
        .status(400)
        .json({ error: "Email, username, and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (normalizedUsername.length < 3) {
      return res
        .status(400)
        .json({ error: "Username must be at least 3 characters" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    // Check duplicates
    const [emailExists, usernameExists] = await Promise.all([
      prisma.users.findUnique({ where: { email: normalizedEmail } }),
      prisma.users.findFirst({ where: { username: normalizedUsername } }),
    ]);

    if (emailExists) {
      return res.status(400).json({ error: "Email already registered" });
    }
    if (usernameExists) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // Hash password BEFORE storing pending data
    const passwordHash = await bcrypt.hash(password, 10);

    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Optional: delete older pending OTPs for this email to avoid clutter
    await prisma.otps.deleteMany({
      where: { email: normalizedEmail },
    });

    await prisma.otps.create({
      data: {
        email: normalizedEmail,
        otp_code: otpCode,
        expires_at: expiresAt,
        pending_username: normalizedUsername,
        pending_password: passwordHash,
      },
    });

    // OTP console log + sending
    console.log(`OTP for ${normalizedEmail}: ${otpCode}`);

    try {
      await sendOtpEmail(normalizedEmail, otpCode, 10);
    } catch (err) {
      // If email sending fails, remove the OTP so it can't be used
      await prisma.otps.deleteMany({
        where: { email: normalizedEmail },
      });
      throw err;
    }

    return res.json({
      success: true,
      message: "OTP sent to email.",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/verify-otp
 * Body: { email, otp }
 *
 * Verifies OTP and creates the user using pending data stored with OTP.
 */
router.post("/verify-otp", async (req, res, next) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await prisma.otps.findFirst({
      where: {
        email: normalizedEmail,
        otp_code: otp,
        expires_at: { gt: new Date() },
      },
      orderBy: { oid: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Safety: re-check duplicates (race condition protection)
    const [emailExists, usernameExists] = await Promise.all([
      prisma.users.findUnique({ where: { email: normalizedEmail } }),
      prisma.users.findFirst({
        where: { username: otpRecord.pending_username },
      }),
    ]);

    if (emailExists) {
      // consume OTP anyway
      await prisma.otps.delete({ where: { oid: otpRecord.oid } });
      return res.status(400).json({ error: "Email already registered" });
    }

    if (usernameExists) {
      await prisma.otps.delete({ where: { oid: otpRecord.oid } });
      return res.status(400).json({ error: "Username already taken" });
    }

    const user = await prisma.users.create({
      data: {
        email: normalizedEmail,
        username: otpRecord.pending_username,
        password: otpRecord.pending_password,
      },
    });

    // consume OTP row so it can't be reused
    await prisma.otps.delete({
      where: { oid: otpRecord.oid },
    });

    const token = signToken({
      userId: user.uid,
      email: user.email,
    });

    return res.json({
      token,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 */
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

    const user = await prisma.users.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = signToken({
      userId: user.uid,
      email: user.email,
    });

    return res.json({
      token,
      user: {
        uid: user.uid,
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
