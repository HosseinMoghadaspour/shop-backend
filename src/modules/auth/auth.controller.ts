import type { Context } from "hono";

import {
  requestOtp,
  verifyOtp,
  getCurrentUser,
  logout,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type AuthKind,
} from "./auth.service.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getClientIp(
  c: Context,
): string {
  return (
    c.req
      .header("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

function getUserAgent(
  c: Context,
): string | undefined {
  return (
    c.req.header("user-agent") ??
    undefined
  );
}

function setSessionCookie(
  c: Context,
  token: string,
) {
  const isProduction =
    process.env.NODE_ENV ===
    "production";

  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  c.header(
    "Set-Cookie",
    parts.join("; "),
  );
}

function clearSessionCookie(
  c: Context,
) {
  const isProduction =
    process.env.NODE_ENV ===
    "production";

  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  c.header(
    "Set-Cookie",
    parts.join("; "),
  );
}

/* -------------------------------------------------------------------------- */
/* Request OTP                                                                */
/* -------------------------------------------------------------------------- */

async function requestOtpController(
  c: Context,
  kind: AuthKind,
) {
  try {
    const body =
      await c.req
        .json<{
          mobile?: string;
          phone?: string;
        }>()
        .catch(
          () =>
            ({
              mobile: "",
              phone: "",
            }),
        );

    const phone =
      body.phone ??
      body.mobile ??
      "";

    const result =
      await requestOtp(
        kind,
        phone,
        getClientIp(c),
      );

    return c.json({
      success: true,
      message:
        result.message ??
        "کد تأیید ارسال شد.",
      data: result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطا در ارسال کد تأیید.",
      },
      400,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Verify OTP                                                                 */
/* -------------------------------------------------------------------------- */

async function verifyOtpController(
  c: Context,
  kind: AuthKind,
) {
  try {
    const body =
      await c.req
        .json<{
          mobile?: string;
          phone?: string;
          code?: string;
          otp?: string;
        }>()
        .catch(
          () =>
            ({
              mobile: "",
              phone: "",
              code: "",
              otp: "",
            }),
        );

    const phone =
      body.phone ??
      body.mobile ??
      "";

    const code =
      body.code ??
      body.otp ??
      "";

    const result =
      await verifyOtp(
        kind,
        phone,
        code,
        getClientIp(c),
        getUserAgent(c),
      );

    setSessionCookie(
      c,
      result.token,
    );

    return c.json({
      success: true,
      message:
        kind === "admin"
          ? "ورود مدیر با موفقیت انجام شد."
          : "ورود با موفقیت انجام شد.",

      data: {
        user:
          result.user,

        session: {
          sessionId:
            result.session
              .sessionId,

          kind:
            result.session
              .kind,

          createdAt:
            result.session
              .createdAt,

          lastActivityAt:
            result.session
              .lastActivityAt,

          absoluteExpiresAt:
            result.session
              .absoluteExpiresAt,

          idleExpiresAt:
            result.session
              .idleExpiresAt,

          expiresAt:
            result.session
              .expiresAt,
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطا در تأیید کد.",
      },
      400,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Customer                                                                    */
/* -------------------------------------------------------------------------- */

export async function requestCustomerOtp(
  c: Context,
) {
  return requestOtpController(
    c,
    "customer",
  );
}

export async function verifyCustomerOtp(
  c: Context,
) {
  return verifyOtpController(
    c,
    "customer",
  );
}

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */

export async function requestAdminOtp(
  c: Context,
) {
  return requestOtpController(
    c,
    "admin",
  );
}

export async function verifyAdminOtp(
  c: Context,
) {
  return verifyOtpController(
    c,
    "admin",
  );
}

/* -------------------------------------------------------------------------- */
/* Logout                                                                      */
/* -------------------------------------------------------------------------- */

export async function logoutController(
  c: Context,
) {
  try {
    const auth =
      c.get("auth") as
        | {
            sessionId: string;
          }
        | undefined;

    if (auth?.sessionId) {
      await logout(
        auth.sessionId,
      );
    }

    clearSessionCookie(c);

    return c.json({
      success: true,
      message:
        "با موفقیت از حساب خارج شدید.",
    });
  } catch (error) {
    console.error(
      "Logout error:",
      error,
    );

    return c.json(
      {
        success: false,
        message:
          "خطا در خروج از حساب.",
      },
      500,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Me                                                                          */
/* -------------------------------------------------------------------------- */

export async function meController(
  c: Context,
) {
  try {
    const auth =
      c.get("auth") as
        | {
            sessionId: string;
            kind: AuthKind;
          }
        | undefined;

    if (!auth?.sessionId) {
      return c.json(
        {
          success: false,
          message:
            "احراز هویت انجام نشده است.",
        },
        401,
      );
    }

    /*
     * Middleware session را قبلاً
     * validate کرده است.
     *
     * اما برای جلوگیری از اطلاعات stale،
     * دوباره session را از middleware
     * می‌گیریم.
     */
    const session =
      c.get("session") as
        | import("./auth.service.js").SessionRecord
        | undefined;

    if (!session) {
      return c.json(
        {
          success: false,
          message:
            "نشست معتبر نیست.",
        },
        401,
      );
    }

    const result =
      await getCurrentUser(
        session,
      );

    if (!result) {
      return c.json(
        {
          success: false,
          message:
            "کاربر فعال پیدا نشد.",
        },
        401,
      );
    }

    return c.json({
      success: true,
      data: {
        kind:
          result.kind,

        user:
          result.user,

        session: {
          sessionId:
            session.sessionId,

          lastActivityAt:
            session.lastActivityAt,

          absoluteExpiresAt:
            session.absoluteExpiresAt,

          idleExpiresAt:
            session.idleExpiresAt,
        },
      },
    });
  } catch (error) {
    console.error(
      "Me controller error:",
      error,
    );

    return c.json(
      {
        success: false,
        message:
          "خطا در دریافت اطلاعات کاربر.",
      },
      500,
    );
  }
}
