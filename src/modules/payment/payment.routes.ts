import { Hono } from "hono";

import {
  paymentMethodDetail,
  paymentMethods,
  paymentStatusDetail,
  paymentStatuses,
  startOrderPayment
} from "./payment.controller.js";
import { requireCustomerAuth } from "../../middleware/auth.middleware.js";


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
  requireCustomerAuth,
  startOrderPayment,
);

export default paymentRoutes;