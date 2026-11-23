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
import { confirmCustomerOrderTotalController } from "./order-workflow.controller.js";

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
ordersRoutes.post("/:id/confirm-total", requireShopAuth, confirmCustomerOrderTotalController);
ordersRoutes.get("/:id/requests", requireShopAuth, listCustomerOrderRequestsController);

ordersRoutes.get(
  "/:id",
  requireShopAuth,
  getOrderByIdController,
);
