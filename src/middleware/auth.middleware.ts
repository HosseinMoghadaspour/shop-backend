import type { Context, Next } from "hono";
import { getSession } from "../modules/auth/auth.service.js";

type CustomerAuth = {
  RowID: number;
  kind: "customer";
  sessionId: string;
};

type AdminAuth = {
  RowID: number;
  kind: "admin";
  sessionId: string;
};

type AuthContext = {
  RowID: number;
  kind: "customer" | "admin";
  sessionId: string;
};

const SESSION_COOKIE_NAME = "shop_session";

/**
 * Get session token from:
 *
 * 1. Authorization: Bearer <token>
 * 2. Cookie: shop_session=<token>
 */
function getSessionToken(c: Context): string | null {
  const authorization = c.req.header("Authorization");

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();

    if (token) {
      return token;
    }
  }

  const cookieHeader = c.req.header("Cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name === SESSION_COOKIE_NAME) {
      const value = valueParts.join("=");

      if (value) {
        return decodeURIComponent(value);
      }
    }
  }

  return null;
}

/**
 * Common authentication middleware.
 *
 * Session is stored in Redis and resolved by auth.service.
 */
async function authenticate(
  c: Context,
  next: Next,
  expectedKind?: "customer" | "admin",
) {
  try {
    const sessionToken = getSessionToken(c);

    if (!sessionToken) {
      return c.json(
        {
          success: false,
          message: "احراز هویت انجام نشده است.",
        },
        401,
      );
    }

    const session = await getSession(sessionToken);

    if (!session) {
      return c.json(
        {
          success: false,
          message: "نشست شما معتبر نیست یا منقضی شده است.",
        },
        401,
      );
    }

    if (expectedKind && session.kind !== expectedKind) {
      return c.json(
        {
          success: false,
          message: "دسترسی به این بخش برای شما مجاز نیست.",
        },
        403,
      );
    }

    const auth: AuthContext = {
      RowID: session.userId,
      kind: session.kind,
      sessionId: sessionToken,
    };

    /**
     * General auth context
     */
    c.set("auth", auth);

    /**
     * Customer context
     */
    if (session.kind === "customer") {
      const customer: CustomerAuth = {
        RowID: session.userId,
        kind: "customer",
        sessionId: sessionToken,
      };

      c.set("customer", customer);
    }

    /**
     * Admin context
     */
    if (session.kind === "admin") {
      const admin: AdminAuth = {
        RowID: session.userId,
        kind: "admin",
        sessionId: sessionToken,
      };

      c.set("admin", admin);
    }

    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    return c.json(
      {
        success: false,
        message: "خطا در احراز هویت.",
      },
      500,
    );
  }
}

/**
 * Require any authenticated user.
 */
export async function requireAuth(c: Context, next: Next) {
  return authenticate(c, next);
}

/**
 * Require customer authentication.
 *
 * Use for:
 * /cart
 * /orders
 * /profile
 * /addresses
 * ...
 */
export async function requireCustomerAuth(c: Context, next: Next) {
  return authenticate(c, next, "customer");
}

/**
 * Alias for backward compatibility.
 *
 * Existing code using requireCustomer
 * will continue to work.
 */
export async function requireCustomer(c: Context, next: Next) {
  return requireCustomerAuth(c, next);
}

/**
 * Require admin authentication.
 */
export async function requireAdminAuth(c: Context, next: Next) {
  return authenticate(c, next, "admin");
}

/**
 * Alias for backward compatibility.
 */
export async function requireAdmin(c: Context, next: Next) {
  return requireAdminAuth(c, next);
}

