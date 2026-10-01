import { Hono } from "hono";

import {
  orderController,
  getOrdersController,
  getOrderByIdController,
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

ordersRoutes.get(
  "/",
  requireCustomerAuth,
  getOrdersController,
);

ordersRoutes.get(
  "/:id",
  requireCustomerAuth,
  getOrderByIdController,
);
