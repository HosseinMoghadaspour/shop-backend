import { Hono } from "hono";

import { requireAdminAuth } from "../../../middleware/auth.middleware.js";

import {
  listPendingPaymentReceipts,
  approvePaymentReceiptForAdmin,
  rejectPaymentReceiptForAdmin,
} from "./payment-receipts.controller.js";

export const adminPaymentReceiptsRoutes = new Hono();

adminPaymentReceiptsRoutes.get(
  "/",
  requireAdminAuth,
  listPendingPaymentReceipts,
);

adminPaymentReceiptsRoutes.patch(
  "/:orderId/approve",
  requireAdminAuth,
  approvePaymentReceiptForAdmin,
);

adminPaymentReceiptsRoutes.patch(
  "/:orderId/reject",
  requireAdminAuth,
  rejectPaymentReceiptForAdmin,
);
