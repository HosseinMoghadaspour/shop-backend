import type { Context } from "hono";
import {
  getCurrentUser,
  logout,
  requestOtp,
  verifyOtp,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  type AuthKind,
} from "./auth.service.js";

function getClientIp(c: Context) {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    undefined
  );
}

function getUserAgent(c: Context) {
  return c.req.header("user-agent") ?? undefined;
}

function setSessionCookie(
  c: Context,
  token: string,
) {
  const isProduction =
    process.env.NODE_ENV === "production";

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

function clearSessionCookie(c: Context) {
  c.header(
    "Set-Cookie",
    [
      `${SESSION_COOKIE_NAME}=`,
      "Path=/",
      "Max-Age=0",
      "HttpOnly",
      "SameSite=Lax",
    ].join("; "),
  );
}

/**
 * POST /auth/customer/request-otp
 */
export async function requestCustomerOtp(
  c: Context,
) {
  try {
      const body = await c.req
  .json<{ mobile?: string }>()
  .catch((): { mobile?: string } => ({}));

    const result = await requestOtp(
      "customer",
      body.mobile ?? "",
    );

    return c.json({
      success: true,
      message:
        "کد تایید با موفقیت ارسال شد.",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "خطا در ارسال کد تایید.";

    return c.json(
      {
        success: false,
        message,
      },
      400,
    );
  }
}

/**
 * POST /auth/customer/verify-otp
 */
export async function verifyCustomerOtp(
  c: Context,
) {
  try {
   const body = await c.req
  .json<{
    mobile?: string;
    code?: string;
  }>()
  .catch(
    (): {
      mobile?: string;
      code?: string;
    } => ({}),
  );

    const result = await verifyOtp({
      kind: "customer",
      mobile: body.mobile ?? "",
      code: body.code ?? "",
      ip: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    setSessionCookie(c, result.token);

    return c.json({
      success: true,
      message:
        "ورود با موفقیت انجام شد.",
      data: {
        user: result.user,
        session: {
          kind: result.session.kind,
          expiresAt:
            result.session.expiresAt,
        },
        token: result.token,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "خطا در تایید کد.";

    return c.json(
      {
        success: false,
        message,
      },
      400,
    );
  }
}

/**
 * POST /auth/admin/request-otp
 */
export async function requestAdminOtp(
  c: Context,
) {
  try {
  const body = await c.req
  .json<{ mobile?: string }>()
  .catch((): { mobile?: string } => ({}));
    const result = await requestOtp(
      "admin",
      body.mobile ?? "",
    );

    return c.json({
      success: true,
      message:
        "کد تایید با موفقیت ارسال شد.",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "خطا در ارسال کد تایید.";

    return c.json(
      {
        success: false,
        message,
      },
      400,
    );
  }
}

/**
 * POST /auth/admin/verify-otp
 */
export async function verifyAdminOtp(
  c: Context,
) {
  try {
      const body = await c.req
        .json<{
          mobile?: string;
          code?: string;
        }>()
      .catch(
        (): {
          mobile?: string;
          code?: string;
        } => ({}),
      );

    const result = await verifyOtp({
      kind: "admin",
      mobile: body.mobile ?? "",
      code: body.code ?? "",
      ip: getClientIp(c),
      userAgent: getUserAgent(c),
    });

    setSessionCookie(c, result.token);

    return c.json({
      success: true,
      message:
        "ورود مدیر با موفقیت انجام شد.",
      data: {
        user: result.user,
        session: {
          kind: result.session.kind,
          expiresAt:
            result.session.expiresAt,
        },
        token: result.token,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "خطا در تایید کد.";

    return c.json(
      {
        success: false,
        message,
      },
      400,
    );
  }
}

/**
 * POST /auth/logout
 */
export async function logoutController(
  c: Context,
) {
  try {
    const auth = c.get("auth") as
      | {
          sessionId: string;
        }
      | undefined;

    if (auth?.sessionId) {
      await logout(auth.sessionId);
    }

    clearSessionCookie(c);

    return c.json({
      success: true,
      message: "با موفقیت خارج شدید.",
    });
  } catch (error) {
    console.error(
      "Logout error:",
      error,
    );

    return c.json(
      {
        success: false,
        message: "خطا در خروج از حساب.",
      },
      500,
    );
  }
}

/**
 * GET /auth/me
 */
export async function meController(
  c: Context,
) {
  try {
    const auth = c.get("auth") as
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

    const user = await getCurrentUser(
      auth.sessionId,
    );

    if (!user) {
      return c.json(
        {
          success: false,
          message:
            "کاربر پیدا نشد.",
        },
        401,
      );
    }

    return c.json({
      success: true,
      data: {
        user,
        kind: auth.kind,
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