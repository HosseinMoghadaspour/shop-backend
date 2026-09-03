import type { Context, Next } from "hono";

import {
  getSessionByToken,
  type RedisSessionRecord,
} from "../modules/auth/auth.service.js";

const SESSION_COOKIE_NAME = "shop_session";

export type AuthEnv = {
  Variables: {
    session: RedisSessionRecord;
  };
};

/**
 * =========================================================
 * GET SESSION COOKIE
 * =========================================================
 */

function getSessionToken(
  c: Context<AuthEnv>,
): string | null {
  const cookieHeader =
    c.req.header("Cookie");

  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] =
      cookie.trim().split("=");

    if (
      name !== SESSION_COOKIE_NAME
    ) {
      continue;
    }

    const value =
      valueParts.join("=");

    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * =========================================================
 * AUTHENTICATE
 * =========================================================
 */

async function authenticate(
  c: Context<AuthEnv>,
) {
  const token =
    getSessionToken(c);

  if (!token) {
    return null;
  }

  const session =
    await getSessionByToken(token);

  if (!session) {
    return null;
  }

  return session;
}

/**
 * =========================================================
 * REQUIRE AUTH
 * =========================================================
 */

export async function requireAuth(
  c: Context<AuthEnv>,
  next: Next,
) {
  const session =
    await authenticate(c);

  if (!session) {
    return c.json(
      {
        success: false,
        message:
          "احراز هویت الزامی است.",
      },
      401,
    );
  }

  c.set(
    "session",
    session,
  );

  await next();
}

/**
 * =========================================================
 * REQUIRE CUSTOMER
 * =========================================================
 */

export async function requireCustomer(
  c: Context<AuthEnv>,
  next: Next,
) {
  const session =
    await authenticate(c);

  if (!session) {
    return c.json(
      {
        success: false,
        message:
          "احراز هویت الزامی است.",
      },
      401,
    );
  }

  if (
    session.role !== "CUSTOMER"
  ) {
    return c.json(
      {
        success: false,
        message:
          "دسترسی غیرمجاز.",
      },
      403,
    );
  }

  c.set(
    "session",
    session,
  );

  await next();
}

/**
 * =========================================================
 * REQUIRE ADMIN
 * =========================================================
 */

export async function requireAdmin(
  c: Context<AuthEnv>,
  next: Next,
) {
  const session =
    await authenticate(c);

  if (!session) {
    return c.json(
      {
        success: false,
        message:
          "احراز هویت الزامی است.",
      },
      401,
    );
  }

  if (
    session.role !== "ADMIN"
  ) {
    return c.json(
      {
        success: false,
        message:
          "دسترسی غیرمجاز.",
      },
      403,
    );
  }

  c.set(
    "session",
    session,
  );

  await next();
}