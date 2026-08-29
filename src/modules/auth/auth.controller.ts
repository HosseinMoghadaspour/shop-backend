import type { Context } from "hono";
import { requestOtp as createOtp, revokeSession, verifyOtp as verifyCode, normalizePhone, type AuthKind } from "./auth.service.js";

function publicData(value: unknown) {
  return JSON.parse(JSON.stringify(value, (key, nested) => ["Passwrod", "OnlinePassword", "UserLoginPassword"].includes(key) ? undefined : typeof nested === "bigint" ? nested.toString() : nested));
}

function setCookie(c: Context, token: string) {
  c.header("Set-Cookie", `shop_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

export async function signOut(c: Context) {
  const token = c.req.header("cookie")?.match(/(?:^|;\s*)shop_session=([^;]+)/)?.[1];
  if (token) await revokeSession(token);
  c.header("Set-Cookie", "shop_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return c.json({ success: true, message: "با موفقیت خارج شدید." });
}

export async function requestOtp(c: Context, kind: AuthKind) {
  const body = await c.req.json<{ phoneNumber?: string }>();
  if (!body.phoneNumber) return c.json({ success: false, message: "شماره موبایل الزامی است." }, 400);
  const owner = await createOtp(kind, normalizePhone(body.phoneNumber));
  if (!owner) return c.json({ success: false, message: "حساب فعال با این شماره پیدا نشد." }, 404);
  return c.json({ success: true, message: "کد تایید ارسال شد." });
}

export async function verifyOtp(c: Context, kind: AuthKind) {
  const body = await c.req.json<{ phoneNumber?: string; code?: string }>();
  if (!body.phoneNumber || !body.code) return c.json({ success: false, message: "شماره موبایل و کد تایید الزامی است." }, 400);
  const result = await verifyCode(kind, normalizePhone(body.phoneNumber), body.code.trim());
  if (!result) return c.json({ success: false, message: "کد تایید نامعتبر یا منقضی شده است." }, 401);
  setCookie(c, result.token);
  return c.json({ success: true, session: { id: result.session.id, expiresAt: result.session.expiresAt }, user: publicData(result.owner) });
}

export const requestCustomerOtp = (c: Context) => requestOtp(c, "customer");
export const verifyCustomerOtp = (c: Context) => verifyOtp(c, "customer");
export const requestAdminOtp = (c: Context) => requestOtp(c, "admin");
export const verifyAdminOtp = (c: Context) => verifyOtp(c, "admin");
