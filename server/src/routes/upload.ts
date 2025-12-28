// src/routes/upload.ts
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// Ensure uploads directory exists: /server/uploads
const uploadRoot = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-")
      .toLowerCase();

    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// POST /upload/item-image
// form-data: key = "image", type = File
router.post(
  "/item-image",
  requireAuth,
  upload.single("image"),
  (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const relativeUrl = `/uploads/${req.file.filename}`;

    return res.status(201).json({
      url: relativeUrl,
    });
  }
);

export default router;
