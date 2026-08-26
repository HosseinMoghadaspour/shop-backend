import { Hono } from "hono";

import {
  activateUserController,
  createUserController,
  deactivateUserController,
  deleteUserController,
  getUserById,
  getUsers,
  updateUserController,
} from "./userInfo.controller.js";

export const userInfoRoutes = new Hono();

userInfoRoutes.get("/", getUsers);

userInfoRoutes.get("/:id", getUserById);

userInfoRoutes.post("/", createUserController);


userInfoRoutes.put("/:id", updateUserController);

userInfoRoutes.delete("/:id", deleteUserController);

userInfoRoutes.patch(
  "/:id/activate",
  activateUserController,
);


// PATCH /api/persons/:id/deactivate
userInfoRoutes.patch(
  "/:id/deactivate",
  deactivateUserController,
);