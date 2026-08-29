import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { prisma } from "../lib/prisma.js";
import { getSessionByToken } from "../modules/auth/auth.service.js";

export type AuthEnv = {
  Variables: {
    session: NonNullable<Awaited<ReturnType<typeof getSessionByToken>>>;
    customer: { RowID: number };
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionData = await getSessionFromRequest(c);

  if (!sessionData) {
    return c.json(
      {
        success: false,
        message: "لطفاً ابتدا وارد حساب کاربری خود شوید.",
      },
      401
    );
  }

  c.set("session", sessionData);

  await next();
});

export const optionalAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionData = await getSessionFromRequest(c);

  if (sessionData) {
    c.set("session", sessionData);
  }

  await next();
});

export const requireCustomerAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionData = await getSessionFromRequest(c);
  if (!sessionData) return c.json({ success: false, message: "لطفاً ابتدا وارد حساب کاربری خود شوید." }, 401);

  if (sessionData.role !== "CUSTOMER" || !sessionData.personId) {
    return c.json({ success: false, message: "حساب مشتری معتبر نیست." }, 403);
  }

  const customer = await prisma.person.findFirst({
    where: { RowID: sessionData.personId, IsActive: true },
    select: { RowID: true },
  });
  if (!customer) return c.json({ success: false, message: "حساب مشتری غیرفعال است." }, 403);

  c.set("customer", customer);
  c.set("session", sessionData);
  await next();
});

export const requireAdminAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionData = await getSessionFromRequest(c);
  if (!sessionData) return c.json({ success: false, message: "دسترسی نیازمند ورود مدیر است." }, 401);

  const admin = await prisma.userInfo.findFirst({
    where: {
      RowID: sessionData.userInfoId ?? -1,
      IsActive: true,
      IsAdmin: true,
      AdminSite: true,
    },
    select: { RowID: true, IsAdmin: true, AdminSite: true, IsActive: true },
  });
  if (!admin) return c.json({ success: false, message: "دسترسی مدیر معتبر نیست." }, 403);

  c.set("session", sessionData);
  await next();
});

async function getSessionFromRequest(c: Context) {
  const cookie = c.req.header("cookie") ?? "";
  const token = cookie.match(/(?:^|;\s*)shop_session=([^;]+)/)?.[1];
  return token ? getSessionByToken(token) : null;
}
