import { Hono } from "hono";

import {
  checkoutController,
} from "./checkout.controller.js";

import {
  requireCustomerAuth,
} from "../../middleware/auth.middleware.js";

export const checkoutRoutes =
  new Hono();

/**
 * POST /checkout
 */
checkoutRoutes.post(
  "/",
  requireCustomerAuth,
  checkoutController,
);
