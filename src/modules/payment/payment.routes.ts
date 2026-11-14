import { Hono } from "hono";
import {
  paymentMethodDetail,
  paymentMethods,
  paymentStatusDetail,
  paymentStatuses,
  publicBankAccounts,
  startOrderPayment,
  submitOrderPaymentReceipt,
} from "./payment.controller.js";
import { requireShopAuth } from "../../middleware/auth.middleware.js";


const paymentRoutes = new Hono();

paymentRoutes.get(
  "/methods",
  paymentMethods,
);

paymentRoutes.get(
  "/methods/:id",
  paymentMethodDetail,
);

paymentRoutes.get(
  "/statuses",
  paymentStatuses,
);

paymentRoutes.get(
  "/statuses/:id",
  paymentStatusDetail,
);

paymentRoutes.post(
  "/order/:orderId",
  requireShopAuth,
  startOrderPayment,
);

paymentRoutes.get(
  "/bank-accounts",
  publicBankAccounts,
);

paymentRoutes.post(
  "/order/:orderId/receipt",
  requireShopAuth,
  submitOrderPaymentReceipt,
);

export default paymentRoutes;
