import { Hono } from "hono";

import {
  addItem,
  clearMyCart,
  getMyCart,
  removeItem,
  updateItem,
} from "./cart.controller.js";

import {
  requireShopAuth,
} from "../../middleware/auth.middleware.js";

export const cartRoutes = new Hono();

cartRoutes.use("*", requireShopAuth);

cartRoutes.get("/", getMyCart);

cartRoutes.post(
  "/items",
  addItem,
);

cartRoutes.patch(
  "/items/:goodId",
  updateItem,
);

cartRoutes.delete(
  "/items/:goodId",
  removeItem,
);

cartRoutes.delete(
  "/",
  clearMyCart,
);