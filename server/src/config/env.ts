// src/config/env.ts
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

export const env = {
  PORT,
  JWT_SECRET
};
