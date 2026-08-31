import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { env } from "../../config/env.js";

export type AuthKind = "customer" | "admin";
const otpLifetimeMs = 3 * 60 * 1000;
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const maxOtpAttempts = 5;

type RedisOtpRecord = {
  phoneNumber: string;
  codeHash: string;
  attempts: number;
  expiresAt: string;
  createdAt: string;
};

type RedisSessionRecord = {
  id: string;
  tokenHash: string;
  role: "ADMIN" | "CUSTOMER";
  personId?: number | null;
  userInfoId?: number | null;
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function secret() {
  if (env.auth.secret) return env.auth.secret;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SESSION_SECRET is required");
  return "local-development-auth-secret";
}

export function normalizePhone(value: string) {
  return value.trim()
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[^\d+]/g, "");
}

function hash(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function sameHash(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function otpKey(phoneNumber: string) {
  return `auth:otp:${phoneNumber}`;
}

function sessionKey(tokenHash: string) {
  return `auth:session:${tokenHash}`;
}

function toRedisExpiryMs(date: Date) {
  return Math.max(1, date.getTime() - Date.now());
}

export async function findPhoneOwner(kind: AuthKind, rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  if (kind === "admin") return prisma.userInfo.findFirst({ where: { Mobile: phone, IsActive: true, IsAdmin: true, AdminSite: true } });
  return prisma.person.findFirst({ where: { IsActive: true, OR: [{ MobileNumber: phone }, { MobileForSMS: phone }] } });
}

async function sendOtp(phoneNumber: string, code: string) {
  if (!env.sms.url || !env.sms.token) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[OTP development] ${phoneNumber}: ${code}`);
      return;
    }
    throw new Error("SMS provider is not configured");
  }
  const response = await fetch(env.sms.url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.sms.token}` },
    body: JSON.stringify({ to: phoneNumber, code, sender: env.sms.sender }),
  });
  if (!response.ok) throw new Error("SMS provider rejected the request");
}

export async function requestOtp(kind: AuthKind, rawPhone: string) {
  const phoneNumber = normalizePhone(rawPhone);
  const owner = await findPhoneOwner(kind, phoneNumber);
  if (!owner) return null;

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + otpLifetimeMs);
  const otp: RedisOtpRecord = {
    phoneNumber,
    codeHash: hash(code),
    attempts: 0,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };

  await redis.set(otpKey(phoneNumber), JSON.stringify(otp), {
    PX: toRedisExpiryMs(expiresAt),
  });

  await sendOtp(phoneNumber, code);
  return owner;
}

export async function verifyOtp(kind: AuthKind, rawPhone: string, code: string) {
  const phoneNumber = normalizePhone(rawPhone);
  const owner = await findPhoneOwner(kind, phoneNumber);
  if (!owner) return null;

  const storedOtpRaw = await redis.get(otpKey(phoneNumber));
  if (!storedOtpRaw) return null;

  const otp = JSON.parse(storedOtpRaw) as RedisOtpRecord;
  const expiresAt = new Date(otp.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    await redis.del(otpKey(phoneNumber));
    return null;
  }

  if (otp.attempts >= maxOtpAttempts || !sameHash(otp.codeHash, hash(code))) {
    const nextAttempts = otp.attempts + 1;
    if (nextAttempts >= maxOtpAttempts) {
      await redis.del(otpKey(phoneNumber));
      return null;
    }

    const nextValue: RedisOtpRecord = { ...otp, attempts: nextAttempts };
    await redis.set(otpKey(phoneNumber), JSON.stringify(nextValue), {
      PX: toRedisExpiryMs(expiresAt),
    });
    return null;
  }

  await redis.del(otpKey(phoneNumber));

  const token = randomBytes(32).toString("base64url");
  const sessionId = randomUUID();
  const sessionExpiry = new Date(Date.now() + sessionLifetimeMs);
  const sessionRecord: RedisSessionRecord = {
    id: sessionId,
    tokenHash: hash(token),
    role: kind === "admin" ? "ADMIN" : "CUSTOMER",
    personId: kind === "customer" ? owner.RowID : null,
    userInfoId: kind === "admin" ? owner.RowID : null,
    expiresAt: sessionExpiry.toISOString(),
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    ipAddress: null,
    userAgent: null,
  };

  await redis.set(sessionKey(sessionRecord.tokenHash), JSON.stringify(sessionRecord), {
    PX: toRedisExpiryMs(sessionExpiry),
  });

  return { token, session: sessionRecord, owner };
}

export async function getSessionByToken(token: string) {
  const tokenHash = hash(token);
  const sessionRaw = await redis.get(sessionKey(tokenHash));
  if (!sessionRaw) return null;

  const session = JSON.parse(sessionRaw) as RedisSessionRecord;
  const expiresAt = new Date(session.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    await redis.del(sessionKey(tokenHash));
    return null;
  }

  return session;
}

export async function revokeSession(token: string) {
  await redis.del(sessionKey(hash(token)));
}
