import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";

import {
  getFooterForAdmin,
  updateFooterForAdmin,
} from "./admin-footer.controller.js";

import {
  uploadFooterImageForAdmin,
  deleteFooterImageForAdmin,
} from "./admin-footer-image.controller.js";

export const adminFooterRoutes = new Hono();

adminFooterRoutes.get("/", requireAdminAuth, getFooterForAdmin);

adminFooterRoutes.patch("/", requireAdminAuth, updateFooterForAdmin);

adminFooterRoutes.post(
  "/images/:field",
  requireAdminAuth,
  uploadFooterImageForAdmin,
);

adminFooterRoutes.delete(
  "/images/:field",
  requireAdminAuth,
  deleteFooterImageForAdmin,
);
