import { Hono } from "hono";

import {
  orderController,
  getOrdersController,
  getOrderByIdController,
} from "./orders.controller.js";

import {
  requireShopAuth,
} from "../../middleware/auth.middleware.js";

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

ordersRoutes.get(
  "/:id",
  requireShopAuth,
  getOrderByIdController,
);
