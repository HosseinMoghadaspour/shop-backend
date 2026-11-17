import { Hono } from "hono";

import {
  orderController,
  getOrdersController,
  getOrderByIdController,
} from "./orders.controller.js";

import {
  requireShopAuth,
} from "../../middleware/auth.middleware.js";
import {
  createOrderRequestController,
  listCustomerOrderRequestsController,
} from "./order-requests.controller.js";

export const ordersRoutes =
  new Hono();


ordersRoutes.post(
  "/",
  requireShopAuth,
  orderController,
);

ordersRoutes.get(
  "/",
  requireShopAuth,
  getOrdersController,
);

ordersRoutes.post("/:id/requests", requireShopAuth, createOrderRequestController);
ordersRoutes.get("/:id/requests", requireShopAuth, listCustomerOrderRequestsController);

ordersRoutes.get(
  "/:id",
  requireShopAuth,
  getOrderByIdController,
);
