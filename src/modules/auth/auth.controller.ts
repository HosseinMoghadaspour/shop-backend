import type { Context } from "hono";

import {
  requestOtp as createOtp,
  revokeSession,
  revokeAllSessions,
  verifyOtp as verifyCode,
  normalizePhone,
  type AuthKind,
} from "./auth.service.js";

import { createPerson } from "../persons/person.service.js";

/**
 * =========================================================
 * PUBLIC DATA
 * =========================================================
 */

function publicData(value: unknown) {
  return JSON.parse(
    JSON.stringify(
      value,
      (key, nested) => {
        if (
          [
            "Passwrod",
            "OnlinePassword",
            "UserLoginPassword",
          ].includes(key)
        ) {
          return undefined;
        }

        if (
          typeof nested ===
          "bigint"
        ) {
          return nested.toString();
        }

        return nested;
      }
    )
  );
}

/**
 * =========================================================
 * CLIENT IP
 * =========================================================
 */

function getClientIp(
  c: Context
) {
  const cloudflareIp =
    c.req.header(
      "cf-connecting-ip"
    );

  if (cloudflareIp) {
    return cloudflareIp.trim();
  }

  const forwardedFor =
    c.req.header(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    const firstIp =
      forwardedFor
        .split(",")[0]
        ?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp =
    c.req.header(
      "x-real-ip"
    );

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * =========================================================
 * USER AGENT
 * =========================================================
 */

function getUserAgent(
  c: Context
) {
  const userAgent =
    c.req.header(
      "user-agent"
    );

  if (!userAgent) {
    return null;
  }

  return userAgent.slice(
    0,
    512
  );
}

/**
 * =========================================================
 * COOKIE
 * =========================================================
 */

const sessionCookieName =
  "shop_session";

const sessionCookieMaxAge =
  30 * 24 * 60 * 60;

/**
 * Set session cookie.
 */

function setCookie(
  c: Context,
  token: string
) {
  const parts = [
    `${sessionCookieName}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${sessionCookieMaxAge}`,
  ];

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    parts.push("Secure");
  }

  c.header(
    "Set-Cookie",
    parts.join("; ")
  );
}

/**
 * =========================================================
 * GET SESSION TOKEN
 * =========================================================
 */

function getSessionToken(
  c: Context
) {
  const cookie =
    c.req.header(
      "cookie"
    ) ?? "";

  const match =
    cookie.match(
      /(?:^|;\s*)shop_session=([^;]+)/
    );

  return (
    match?.[1] ??
    null
  );
}

/**
 * =========================================================
 * CLEAR COOKIE
 * =========================================================
 */

function clearSessionCookie(
  c: Context
) {
  const parts = [
    `${sessionCookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    parts.push("Secure");
  }

  c.header(
    "Set-Cookie",
    parts.join("; ")
  );
}

/**
 * =========================================================
 * SIGN OUT
 * =========================================================
 */

export async function signOut(
  c: Context
) {
  const token =
    getSessionToken(c);

  if (token) {
    await revokeSession(
      token
    );
  }

  clearSessionCookie(c);

  return c.json({
    success: true,
    message:
      "با موفقیت خارج شدید.",
  });
}

/**
 * =========================================================
 * REQUEST OTP
 * =========================================================
 */

export async function requestOtp(
  c: Context,
  kind: AuthKind
) {
  let body: {
    phoneNumber?: string;
  };

  try {
    body =
      await c.req.json<{
        phoneNumber?: string;
      }>();
  } catch {
    return c.json(
      {
        success: false,
        message:
          "اطلاعات ارسال‌شده نامعتبر است.",
      },
      400
    );
  }

  if (
    !body.phoneNumber ||
    typeof body.phoneNumber !==
      "string"
  ) {
    return c.json(
      {
        success: false,
        message:
          "شماره موبایل الزامی است.",
      },
      400
    );
  }

  const phoneNumber =
    normalizePhone(
      body.phoneNumber
    );

  if (
    !/^\+?\d{10,15}$/.test(
      phoneNumber
    )
  ) {
    return c.json(
      {
        success: false,
        message:
          "شماره موبایل نامعتبر است.",
      },
      400
    );
  }

  const ipAddress =
    getClientIp(c);

  /**
   * First attempt.
   */
  let result;

  try {
    result =
      await createOtp(
        kind,
        phoneNumber,
        ipAddress
      );
  } catch (error) {
    console.error(
      "OTP request error:",
      error
    );

    return c.json(
      {
        success: false,
        message:
          "در ارسال کد تایید خطایی رخ داد.",
      },
      500
    );
  }

  /**
   * Rate limit.
   */
  if (
    result.status ===
    "rate_limited"
  ) {
    return c.json(
      {
        success: false,
        message:
          "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.",
      },
      429
    );
  }

  /**
   * Cooldown.
   */
  if (
    result.status ===
    "cooldown"
  ) {
    return c.json(
      {
        success: false,
        message:
          "لطفاً قبل از درخواست کد جدید کمی صبر کنید.",
      },
      429
    );
  }

  /**
   * =======================================================
   * CUSTOMER AUTO CREATE
   * =======================================================
   */

  if (
    result.status ===
    "not_found"
  ) {
    /**
     * Admin can NEVER be auto-created.
     */
    if (
      kind === "admin"
    ) {
      /**
       * Generic response prevents
       * account enumeration.
       */
      return c.json({
        success: true,
        message:
          "اگر اطلاعات واردشده معتبر باشد، کد تایید ارسال خواهد شد.",
      });
    }

    /**
     * Customer does not exist.
     * Create it.
     */
    const person =
      await createPerson({
        RowID: 0,

        MobileNumber:
          phoneNumber,

        MobileForSMS:
          phoneNumber,

        IsActive: true,
      });

    if (!person) {
      return c.json(
        {
          success: false,
          message:
            "ایجاد حساب کاربری انجام نشد.",
        },
        500
      );
    }

    /**
     * requestOtp() released cooldown
     * when account did not exist,
     * so calling it again is safe.
     */
    try {
      const newResult =
        await createOtp(
          kind,
          phoneNumber,
          ipAddress
        );

      if (
        newResult.status !==
        "sent"
      ) {
        return c.json(
          {
            success: false,
            message:
              "ایجاد کد تایید انجام نشد.",
          },
          500
        );
      }

      return c.json({
        success: true,
        message:
          "کد تایید ارسال شد.",
      });
    } catch (error) {
      console.error(
        "OTP after customer creation error:",
        error
      );

      return c.json(
        {
          success: false,
          message:
            "ارسال کد تایید انجام نشد.",
        },
        500
      );
    }
  }

  return c.json({
    success: true,
    message:
      "کد تایید ارسال شد.",
  });
}

/**
 * =========================================================
 * VERIFY OTP
 * =========================================================
 */

export async function verifyOtp(
  c: Context,
  kind: AuthKind
) {
  let body: {
    phoneNumber?: string;
    code?: string;
  };

  try {
    body =
      await c.req.json<{
        phoneNumber?: string;
        code?: string;
      }>();
  } catch {
    return c.json(
      {
        success: false,
        message:
          "اطلاعات ارسال‌شده نامعتبر است.",
      },
      400
    );
  }

  if (
    !body.phoneNumber ||
    !body.code
  ) {
    return c.json(
      {
        success: false,
        message:
          "شماره موبایل و کد تایید الزامی است.",
      },
      400
    );
  }

  const phoneNumber =
    normalizePhone(
      body.phoneNumber
    );

  const code =
    body.code.trim();

  if (
    !/^\+?\d{10,15}$/.test(
      phoneNumber
    )
  ) {
    return c.json(
      {
        success: false,
        message:
          "شماره موبایل نامعتبر است.",
      },
      400
    );
  }

  if (
    !/^\d{6}$/.test(code)
  ) {
    return c.json(
      {
        success: false,
        message:
          "کد تایید باید ۶ رقم باشد.",
      },
      400
    );
  }

  const ipAddress =
    getClientIp(c);

  const userAgent =
    getUserAgent(c);

  let result;

  try {
    result =
      await verifyCode(
        kind,
        phoneNumber,
        code,
        {
          ipAddress,
          userAgent,
        }
      );
  } catch (error) {
    console.error(
      "OTP verification error:",
      error
    );

    return c.json(
      {
        success: false,
        message:
          "در بررسی کد تایید خطایی رخ داد.",
      },
      500
    );
  }

  if (!result) {
    return c.json(
      {
        success: false,
        message:
          "کد تایید نامعتبر یا منقضی شده است.",
      },
      401
    );
  }

  /**
   * Authentication successful.
   *
   * Raw token goes ONLY to HttpOnly cookie.
   */
  setCookie(
    c,
    result.token
  );

  return c.json({
    success: true,

    session: {
      id:
        result.session.id,

      role:
        result.session.role,

      createdAt:
        result.session.createdAt,

      lastSeenAt:
        result.session.lastSeenAt,

      expiresAt:
        result.session.expiresAt,
    },

    user:
      publicData(
        result.owner
      ),
  });
}

/**
 * =========================================================
 * LOGOUT ALL SESSIONS
 * =========================================================
 */

export async function signOutAllSessions(
  c: Context,
  kind: AuthKind
) {
  const token =
    getSessionToken(c);

  if (!token) {
    clearSessionCookie(c);

    return c.json(
      {
        success: false,
        message:
          "جلسه فعالی وجود ندارد.",
      },
      401
    );
  }

  /**
   * We need the current session
   * to identify the owner.
   */
  const { getSessionByToken } =
    await import(
      "./auth.service.js"
    );

  const session =
    await getSessionByToken(
      token
    );

  if (!session) {
    clearSessionCookie(c);

    return c.json(
      {
        success: false,
        message:
          "جلسه شما منقضی شده است.",
      },
      401
    );
  }

  /**
   * Verify that route kind matches
   * current session role.
   */
  const expectedRole =
    kind === "admin"
      ? "ADMIN"
      : "CUSTOMER";

  if (
    session.role !==
    expectedRole
  ) {
    return c.json(
      {
        success: false,
        message:
          "دسترسی غیرمجاز است.",
      },
      403
    );
  }

  const ownerId =
    kind === "customer"
      ? session.personId
      : session.userInfoId;

  if (
    ownerId === null ||
    ownerId === undefined
  ) {
    return c.json(
      {
        success: false,
        message:
          "مالک جلسه معتبر نیست.",
      },
      403
    );
  }

  const count =
    await revokeAllSessions(
      kind,
      ownerId
    );

  clearSessionCookie(c);

  return c.json({
    success: true,
    revokedSessions:
      count,
    message:
      "تمام جلسات فعال شما باطل شدند.",
  });
}

/**
 * =========================================================
 * ROUTE HANDLERS
 * =========================================================
 */

export const requestCustomerOtp =
  (c: Context) =>
    requestOtp(
      c,
      "customer"
    );

export const verifyCustomerOtp =
  (c: Context) =>
    verifyOtp(
      c,
      "customer"
    );

export const requestAdminOtp =
  (c: Context) =>
    requestOtp(
      c,
      "admin"
    );

export const verifyAdminOtp =
  (c: Context) =>
    verifyOtp(
      c,
      "admin"
    );

export const signOutAllCustomerSessions =
  (c: Context) =>
    signOutAllSessions(
      c,
      "customer"
    );

export const signOutAllAdminSessions =
  (c: Context) =>
    signOutAllSessions(
      c,
      "admin"
    );



export async function signOutAll(c: Context) {
  const session = c.get("session");

  const ownerId =
    session.role === "CUSTOMER"
      ? session.personId
      : session.userInfoId;

  if (!ownerId) {
    return c.json(
      {
        success: false,
        message: "اطلاعات کاربر نامعتبر است.",
      },
      400,
    );
  }

  const kind: AuthKind =
    session.role === "CUSTOMER"
      ? "customer"
      : "admin";

  await revokeAllSessions(
    kind,
    ownerId,
  );

  clearSessionCookie(c);

  return c.json({
    success: true,
    message: "از تمام دستگاه‌ها خارج شدید.",
  });
}