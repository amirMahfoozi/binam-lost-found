import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';

// --- mock jwt + mailer (ESM mock style)
jest.unstable_mockModule('../utils/jwt', () => ({
  signToken: () => 'TEST_TOKEN',
}));

jest.unstable_mockModule('../utils/mailer', () => ({
  sendOtpEmail: async () => undefined,
}));

// --- in-memory prisma mock
jest.unstable_mockModule('../db', () => {
  const users: any[] = [];
  const otps: any[] = [];
  let uidSeq = 1;
  let oidSeq = 1;

  const prisma = {
    users: {
      findUnique: async ({ where }: any) => {
        if (where?.email) return users.find((u) => u.email === where.email) ?? null;
        if (where?.uid) return users.find((u) => u.uid === where.uid) ?? null;
        return null;
      },
      findFirst: async ({ where }: any) => {
        if (where?.username) return users.find((u) => u.username === where.username) ?? null;
        return null;
      },
      create: async ({ data }: any) => {
        const u = { uid: uidSeq++, ...data };
        users.push(u);
        return u;
      },
    },
    otps: {
      deleteMany: async ({ where }: any) => {
        const email = where?.email;
        for (let i = otps.length - 1; i >= 0; i--) {
          if (!email || otps[i].email === email) otps.splice(i, 1);
        }
        return { count: 1 };
      },
      create: async ({ data }: any) => {
        const row = { oid: oidSeq++, ...data };
        otps.push(row);
        return row;
      },
      findFirst: async ({ where, orderBy }: any) => {
        const now = new Date();
        let list = otps.filter((o) => o.email === where.email && o.otp_code === where.otp_code);
        if (where?.expires_at?.gt) list = list.filter((o) => new Date(o.expires_at) > now);
        if (orderBy?.oid === 'desc') list.sort((a, b) => b.oid - a.oid);
        return list[0] ?? null;
      },
      delete: async ({ where }: any) => {
        const idx = otps.findIndex((o) => o.oid === where.oid);
        if (idx >= 0) otps.splice(idx, 1);
        return { success: true };
      },
    },
  };

  return { prisma };
});

// IMPORTANT: import AFTER mocks are defined
const { default: authRouter } = await import('../routes/auth');

function makeTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  return app;
}

// supertest import that works reliably with ESM + TS
const { default: request } = await import('supertest');

describe('Auth routes', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('register: 400 if missing fields', async () => {
    const app = makeTestApp();
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('register: success for valid payload', async () => {
    const realRandom = Math.random;
    Math.random = () => 0; // OTP = 100000

    const app = makeTestApp();
    const res = await request(app).post('/auth/register').send({
      email: 'ok@example.com',
      username: 'okuser',
      password: 'Aa1!aaaa',
    });

    Math.random = realRandom;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('verify-otp: creates user and returns token', async () => {
    const realRandom = Math.random;
    Math.random = () => 0;

    const app = makeTestApp();

    await request(app).post('/auth/register').send({
      email: 'ok2@example.com',
      username: 'okuser2',
      password: 'Aa1!aaaa',
    });

    const res = await request(app).post('/auth/verify-otp').send({
      email: 'ok2@example.com',
      otp: '100000',
    });

    Math.random = realRandom;

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('TEST_TOKEN');
    expect(res.body.user.email).toBe('ok2@example.com');
    expect(res.body.user.username).toBe('okuser2');
  });

  it('login: 400 if wrong password', async () => {
    const realRandom = Math.random;
    Math.random = () => 0;

    const app = makeTestApp();

    await request(app).post('/auth/register').send({
      email: 'login@example.com',
      username: 'loginuser',
      password: 'Aa1!aaaa',
    });

    await request(app).post('/auth/verify-otp').send({
      email: 'login@example.com',
      otp: '100000',
    });

    Math.random = realRandom;

    const res = await request(app).post('/auth/login').send({
      email: 'login@example.com',
      password: 'WRONGPASS1!',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it('login: success after verify-otp', async () => {
    const realRandom = Math.random;
    Math.random = () => 0;

    const app = makeTestApp();

    await request(app).post('/auth/register').send({
      email: 'login2@example.com',
      username: 'loginuser2',
      password: 'Aa1!aaaa',
    });

    await request(app).post('/auth/verify-otp').send({
      email: 'login2@example.com',
      otp: '100000',
    });

    Math.random = realRandom;

    const res = await request(app).post('/auth/login').send({
      email: 'login2@example.com',
      password: 'Aa1!aaaa',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('TEST_TOKEN');
    expect(res.body.user.username).toBe('loginuser2');
  });
});