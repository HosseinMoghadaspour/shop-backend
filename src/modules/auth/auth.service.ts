import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

export type AuthKind = "customer" | "admin";
const otpLifetimeMs = 3 * 60 * 1000;
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const maxOtpAttempts = 5;

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
  await prisma.customOtpCode.updateMany({ where: { phoneNumber, consumedAt: null }, data: { consumedAt: new Date() } });
  const code = String(randomInt(100000, 1000000));
  await prisma.customOtpCode.create({ data: { id: randomUUID(), phoneNumber, codeHash: hash(code), expiresAt: new Date(Date.now() + otpLifetimeMs) } });
  await sendOtp(phoneNumber, code);
  return owner;
}

export async function verifyOtp(kind: AuthKind, rawPhone: string, code: string) {
  const phoneNumber = normalizePhone(rawPhone);
  const owner = await findPhoneOwner(kind, phoneNumber);
  if (!owner) return null;
  const otp = await prisma.customOtpCode.findFirst({ where: { phoneNumber, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!otp || otp.attempts >= maxOtpAttempts || !sameHash(otp.codeHash, hash(code))) {
    if (otp) await prisma.customOtpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return null;
  }
  await prisma.customOtpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  const token = randomBytes(32).toString("base64url");
  const session = await prisma.customAuthSession.create({ data: { id: randomUUID(), tokenHash: hash(token), role: kind === "admin" ? "ADMIN" : "CUSTOMER", personId: kind === "customer" ? owner.RowID : undefined, userInfoId: kind === "admin" ? owner.RowID : undefined, expiresAt: new Date(Date.now() + sessionLifetimeMs) } });
  return { token, session, owner };
}

export async function getSessionByToken(token: string) {
  const session = await prisma.customAuthSession.findUnique({ where: { tokenHash: hash(token) } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session;
}

export async function revokeSession(token: string) {
  await prisma.customAuthSession.deleteMany({ where: { tokenHash: hash(token) } });
}
