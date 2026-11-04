
import { Hono } from "hono";

import { requireAdminAuth } from "../../../middleware/auth.middleware.js";

import {
  listPaymentMethodsForAdmin,
  updatePaymentMethodStatusForAdmin,
} from "./payment-methods.controller.js";

export const adminPaymentMethodsRoutes = new Hono();

adminPaymentMethodsRoutes.get(
  "/",
  requireAdminAuth,
  listPaymentMethodsForAdmin,
);

adminPaymentMethodsRoutes.patch(
  "/:id",
  requireAdminAuth,
  updatePaymentMethodStatusForAdmin,
);
