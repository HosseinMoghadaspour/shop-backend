import { Hono } from "hono";

import {
  requestAdminOtp,
  requestCustomerOtp,
  signOut,
  signOutAll,
  signOutAllAdminSessions,
  signOutAllCustomerSessions,
  verifyAdminOtp,
  verifyCustomerOtp,
} from "./auth.controller.js";

import {
  requireAuth,
  requireCustomer,
  requireAdmin,
} from "../../middleware/auth.middleware.js";

export const authRoutes =
  new Hono();

authRoutes.post(
  "/customer/request-otp",
  requestCustomerOtp,
);

authRoutes.post(
  "/customer/verify-otp",
  verifyCustomerOtp,
);

authRoutes.post(
  "/admin/request-otp",
  requestAdminOtp,
);

authRoutes.post(
  "/admin/verify-otp",
  verifyAdminOtp,
);

authRoutes.post(
  "/sign-out",
  signOut,
);

authRoutes.post(
  "/customer/sign-out-all",
  signOutAllCustomerSessions,
);

authRoutes.post(
  "/admin/sign-out-all",
  signOutAllAdminSessions,
);

/**
 * =========================================================
 * TEST AUTH
 * =========================================================
 */

authRoutes.get(
  "/me",
  requireAuth,
  (c) => {
    const { session } =
      c.get("auth");

    return c.json({
      success: true,

      session: {
        id: session.id,
        role: session.role,

        personId:
          session.personId,

        userInfoId:
          session.userInfoId,

        createdAt:
          session.createdAt,

        lastSeenAt:
          session.lastSeenAt,

        expiresAt:
          session.expiresAt,
      },
    });
  },
);

/**
 * CUSTOMER TEST
 */

authRoutes.get(
  "/customer/me",
  requireCustomer,
  (c) => {
    const { session } =
      c.get("auth");

    return c.json({
      success: true,
      role: session.role,
      personId:
        session.personId,
    });
  },
);

/**
 * ADMIN TEST
 */

authRoutes.get(
  "/admin/me",
  requireAdmin,
  (c) => {
    const { session } =
      c.get("auth");

    return c.json({
      success: true,
      role: session.role,
      userInfoId:
        session.userInfoId,
    });
  },
);

authRoutes.post(
  "/sign-out",
  signOut,
);

authRoutes.post(
  "/sign-out-all",
  requireAuth,
  signOutAll,
);