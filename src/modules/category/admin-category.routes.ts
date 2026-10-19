import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import {
  changeCategoryDisplayOrder,
  changeCategoryIcon,
  changeCategoryVisibility,
  listAdminCategories,
} from "./admin-category.controller.js";

export const adminCategoryRoutes = new Hono();

adminCategoryRoutes.get("/", requireAdminAuth, listAdminCategories);
adminCategoryRoutes.patch("/:id/visibility", requireAdminAuth, changeCategoryVisibility);
adminCategoryRoutes.patch("/:id/display-order", requireAdminAuth, changeCategoryDisplayOrder);
adminCategoryRoutes.patch("/:id/icon", requireAdminAuth, changeCategoryIcon);
