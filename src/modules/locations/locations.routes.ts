import { Hono } from "hono";
import {
  listCitiesByProvince,
  listProvinces,
  listAddress,
  listMyAddresses
} from "./locations.controller.js";
import { requireShopAuth } from "../../middleware/auth.middleware.js";
import { createMyDeliveryAddress } from "./address-write.controller.js";

export const locationsRoutes = new Hono();

locationsRoutes.get("/provinces", listProvinces);
locationsRoutes.get("/provinces/:id/cities", listCitiesByProvince);
locationsRoutes.get("/address/me", requireShopAuth ,listMyAddresses);
locationsRoutes.get("/address/:id", listAddress);

locationsRoutes.post("/address/me", requireShopAuth, createMyDeliveryAddress);
