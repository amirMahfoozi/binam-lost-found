// src/db.ts
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Create a pg connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter for Postgres
const adapter = new PrismaPg(pool);

// Instantiate PrismaClient with adapter (required in Prisma 7)
export const prisma = new PrismaClient({
  adapter,
});
