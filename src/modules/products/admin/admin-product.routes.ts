
import { Hono } from "hono";
import { requireAdminAuth } from "../../../middleware/auth.middleware.js";
import {
  listAdminProducts,
  changeProductVisibility,
} from "./admin-product.controller.js";

export const adminProductRoutes = new Hono();

adminProductRoutes.get(
  "/",
  requireAdminAuth,
  listAdminProducts,
);

adminProductRoutes.patch(
  "/:id/visibility",
  requireAdminAuth,
  changeProductVisibility,
);
