import { Hono } from "hono";
import { requireShopAuth, requireAdminAuth } from "../../middleware/auth.middleware.js";
import {
  createOrderRequestController,
  listAdminOrderRequestsController,
  listCustomerOrderRequestsController,
  updateAdminOrderRequestController,
} from "./order-requests.controller.js";

export const customerOrderRequestRoutes = new Hono();
customerOrderRequestRoutes.post("/:id/requests", requireShopAuth, createOrderRequestController);
customerOrderRequestRoutes.get("/:id/requests", requireShopAuth, listCustomerOrderRequestsController);

export const adminOrderRequestRoutes = new Hono();
adminOrderRequestRoutes.get("/", requireAdminAuth, listAdminOrderRequestsController);
adminOrderRequestRoutes.patch("/:id", requireAdminAuth, updateAdminOrderRequestController);
