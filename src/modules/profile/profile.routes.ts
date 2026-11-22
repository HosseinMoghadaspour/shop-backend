import { Hono } from "hono";
import { requireShopAuth } from "../../middleware/auth.middleware.js";
import { getMyProfile, updateMyProfile } from "./profile.controller.js";

export const profileRoutes = new Hono();
profileRoutes.get("/me", requireShopAuth, getMyProfile);
profileRoutes.patch("/me", requireShopAuth, updateMyProfile);
