import type {
  Context,
  Next,
} from "hono";

import {
  getSession,
  refreshSession,
  SESSION_COOKIE_NAME,
  type AuthKind,
  type SessionRecord,
} from "../modules/auth/auth.service.js";

/* -------------------------------------------------------------------------- */
/* Context Types                                                              */
/* -------------------------------------------------------------------------- */

export type AuthContext = {
  RowID: number;
  kind: AuthKind;
  sessionId: string;
};

export type CustomerAuth = {
  RowID: number;
  kind: "customer";
  sessionId: string;
};

export type AdminAuth = {
  RowID: number;
  kind: "admin";
  sessionId: string;
};

/* -------------------------------------------------------------------------- */
/* Get Token                                                                  */
/* -------------------------------------------------------------------------- */

function getSessionToken(
  c: Context,
): string | null {
  /*
   * Authorization: Bearer <token>
   */
  const authorization =
    c.req.header(
      "Authorization",
    );

  if (
    authorization?.startsWith(
      "Bearer ",
    )
  ) {
    const token =
      authorization
        .slice(7)
        .trim();

    if (token) {
      return token;
    }
  }

  /*
   * Cookie
   */
  const cookieHeader =
    c.req.header("Cookie");

  if (!cookieHeader) {
    return null;
  }

  for (
    const cookie of
      cookieHeader.split(";")
  ) {
    const [
      name,
      ...valueParts
    ] =
      cookie
        .trim()
        .split("=");

    if (
      name !==
      SESSION_COOKIE_NAME
    ) {
      continue;
    }

    const value =
      valueParts.join("=");

    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(
        value,
      );
    } catch {
      return value;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Authenticate                                                               */
/* -------------------------------------------------------------------------- */

async function authenticate(
  c: Context,
  next: Next,
  expectedKind?: AuthKind,
) {
  try {
    const token =
      getSessionToken(c);

    if (!token) {
      return c.json(
        {
          success: false,
          message:
            "احراز هویت انجام نشده است.",
        },
        401,
      );
    }

   const session = await refreshSession(token);

    if (!session) {
      return c.json(
        {
          success: false,
          message:
            "نشست شما معتبر نیست یا منقضی شده است.",
        },
        401,
      );
    }

    if (
      expectedKind &&
      session.kind !==
        expectedKind
    ) {
      return c.json(
        {
          success: false,
          message:
            "دسترسی به این بخش برای شما مجاز نیست.",
        },
        403,
      );
    }

    const auth:
      AuthContext = {
      RowID:
        session.userId,

      kind:
        session.kind,

      sessionId:
        token,
    };

    /*
     * General auth
     */
    c.set(
      "auth",
      auth,
    );

    /*
     * Full session
     */
    c.set(
      "session",
      session,
    );

    /*
     * Customer
     */
    if (
      session.kind ===
      "customer"
    ) {
      const customer:
        CustomerAuth = {
        RowID:
          session.userId,

        kind:
          "customer",

        sessionId:
          token,
      };

      c.set(
        "customer",
        customer,
      );
    }

    /*
     * Admin
     */
    if (
      session.kind ===
      "admin"
    ) {
      const admin:
        AdminAuth = {
        RowID:
          session.userId,

        kind:
          "admin",

        sessionId:
          token,
      };

      c.set(
        "admin",
        admin,
      );
    }

    await next();
  } catch (error) {
    console.error(
      "Auth middleware error:",
      error,
    );

    return c.json(
      {
        success: false,
        message:
          "خطا در احراز هویت.",
      },
      500,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Public Middleware                                                          */
/* -------------------------------------------------------------------------- */

export async function requireAuth(
  c: Context,
  next: Next,
) {
  return authenticate(
    c,
    next,
  );
}

export async function requireCustomerAuth(
  c: Context,
  next: Next,
) {
  return authenticate(
    c,
    next,
    "customer",
  );
}

/*
 * Backward compatibility
 */
export async function requireCustomer(
  c: Context,
  next: Next,
) {
  return requireCustomerAuth(
    c,
    next,
  );
}

export async function requireAdminAuth(
  c: Context,
  next: Next,
) {
  return authenticate(
    c,
    next,
    "admin",
  );
}

/*
 * Backward compatibility
 */
export async function requireAdmin(
  c: Context,
  next: Next,
) {
  return requireAdminAuth(
    c,
    next,
  );
}
