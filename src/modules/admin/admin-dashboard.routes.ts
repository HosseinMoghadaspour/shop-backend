import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { getAdminDashboard } from "./admin-dashboard.controller.js";

export const adminDashboardRoutes = new Hono();
adminDashboardRoutes.get("/", requireAdminAuth, getAdminDashboard);
