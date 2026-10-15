import { Hono } from "hono";
import { requireAdminAuth } from "../../../middleware/auth.middleware.js";
import {
  listAdminProducts,
  changeProductVisibility,
} from "./admin-product.controller.js";
import {
  uploadImages,
  makeDefaultImage,
  removeImage,
} from "./product-image.controller.js";

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

adminProductRoutes.post(
  "/:id/images",
  requireAdminAuth,
  uploadImages,
);

adminProductRoutes.patch(
  "/:id/images/:imageId/default",
  requireAdminAuth,
  makeDefaultImage,
);

adminProductRoutes.delete(
  "/:id/images/:imageId",
  requireAdminAuth,
  removeImage,
);
