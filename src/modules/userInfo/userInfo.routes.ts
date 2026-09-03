import { Hono } from "hono";

import {
  requireAdmin,
} from "../../middleware/auth.middleware.js";

import {
  activateUserController,
  createUserController,
  deactivateUserController,
  deleteUserController,
  getUserById,
  getUsers,
  updateUserController,
} from "./userInfo.controller.js";

export const userInfoRoutes =
  new Hono();

userInfoRoutes.use(
  "*",
  requireAdmin,
);

userInfoRoutes.get(
  "/",
  getUsers,
);

userInfoRoutes.get(
  "/:id",
  getUserById,
);

userInfoRoutes.post(
  "/",
  createUserController,
);

userInfoRoutes.put(
  "/:id",
  updateUserController,
);

userInfoRoutes.delete(
  "/:id",
  deleteUserController,
);

userInfoRoutes.patch(
  "/:id/activate",
  activateUserController,
);

userInfoRoutes.patch(
  "/:id/deactivate",
  deactivateUserController,
);