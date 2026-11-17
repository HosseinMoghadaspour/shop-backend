import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import {
  changeAdminOrderStatuses,
  listAdminOrders,
  showAdminOrder,
} from "./admin-orders.controller.js";

export const adminOrdersRoutes = new Hono();
adminOrdersRoutes.get("/", requireAdminAuth, listAdminOrders);
adminOrdersRoutes.get("/:id", requireAdminAuth, showAdminOrder);
adminOrdersRoutes.patch("/:id/status", requireAdminAuth, changeAdminOrderStatuses);
