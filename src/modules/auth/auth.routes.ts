import { Hono } from "hono";

import {
  requestCustomerOtp,
  verifyCustomerOtp,
  requestAdminOtp,
  verifyAdminOtp,
  logoutController,
  meController,
} from "./auth.controller.js";

import {
  requireAuth,
} from "../../middleware/auth.middleware.js";

export const authRoutes =
  new Hono();

/* -------------------------------------------------------------------------- */
/* Customer                                                                    */
/* -------------------------------------------------------------------------- */

authRoutes.post(
  "/customer/request-otp",
  requestCustomerOtp,
);

authRoutes.post(
  "/customer/verify-otp",
  verifyCustomerOtp,
);

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */

authRoutes.post(
  "/admin/request-otp",
  requestAdminOtp,
);

authRoutes.post(
  "/admin/verify-otp",
  verifyAdminOtp,
);

/* -------------------------------------------------------------------------- */
/* Authenticated                                                               */
/* -------------------------------------------------------------------------- */

authRoutes.get(
  "/me",
  requireAuth,
  meController,
);

authRoutes.post(
  "/logout",
  requireAuth,
  logoutController,
);
