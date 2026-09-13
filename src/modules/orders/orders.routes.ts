import { Hono } from "hono";

import {
  orderController,
} from "./orders.controller.js";

import {
  requireCustomerAuth,
} from "../../middleware/auth.middleware.js";

export const ordersRoutes =
  new Hono();

  
ordersRoutes.post(
  "/",
  requireCustomerAuth,
  orderController,
);
