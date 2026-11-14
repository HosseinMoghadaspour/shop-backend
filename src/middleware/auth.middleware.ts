import type {
  Context,
  Next,
} from "hono";
import { prisma } from "../lib/prisma.js";
import { create as createPerson } from "../modules/persons/person.repository.js";

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
  expectedKind?: AuthKind | "shop",
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

    // Refresh the browser cookie together with the Redis idle timeout.
    // Do not issue a cookie when this request authenticated via Bearer token.
    const authorization = c.req.header("Authorization");
    const cookieHeader = c.req.header("Cookie") ?? "";
    const hasSessionCookie = cookieHeader
      .split(";")
      .some((part) => part.trim().startsWith(`${SESSION_COOKIE_NAME}=`));

    if (
      !authorization?.startsWith("Bearer ") &&
      hasSessionCookie
    ) {
      const maxAge = Math.max(
        1,
        Math.ceil((session.idleExpiresAt - Date.now()) / 1000),
      );
      const parts = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        "Path=/",
        `Max-Age=${maxAge}`,
        "HttpOnly",
        "SameSite=Lax",
      ];

      if (process.env.NODE_ENV === "production") {
        parts.push("Secure");
      }

      c.header("Set-Cookie", parts.join("; "), { append: true });
    }

    if (
      expectedKind &&
      expectedKind !== "shop" &&
      session.kind !== expectedKind
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

      // Admins may also use customer-facing shop features.
      // Their shopping identity is a Person record, not UserInfo.RowID.
      if (expectedKind === "shop") {
        const adminUser = await prisma.userInfo.findFirst({
          where: {
            RowID: session.userId,
            IsActive: true,
            IsAdmin: true,
          },
          select: {
            RowName: true,
            Mobile: true,
          },
        });

        const mobile = adminUser?.Mobile?.trim();
        if (!adminUser || !mobile) {
          return c.json(
            {
              success: false,
              message: "برای استفاده از فروشگاه، شماره موبایل مدیر معتبر نیست.",
            },
            403,
          );
        }

        let shopPerson = await prisma.person.findFirst({
          where: {
            IsActive: true,
            OR: [
              { MobileNumber: mobile },
              { MobileForSMS: mobile },
            ],
          },
          select: { RowID: true },
        });

        if (!shopPerson) {
          const mobileForSms = mobile.length <= 11 ? mobile : undefined;
          shopPerson = await createPerson({
            RowName: adminUser.RowName,
            MobileNumber: mobile,
            ...(mobileForSms ? { MobileForSMS: mobileForSms } : {}),
            IsRegisteredOnline: true,
          });
        }

        const shopCustomer: CustomerAuth = {
          RowID: shopPerson.RowID,
          kind: "customer",
          sessionId: token,
        };

        c.set("customer", shopCustomer);
      }
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


/**
 * Authenticated customer or admin access for customer-facing shop flows.
 * Admin sessions are mapped to a Person record using their verified mobile.
 */
export async function requireShopAuth(
  c: Context,
  next: Next,
) {
  return authenticate(c, next, "shop");
}
