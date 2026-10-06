import { Hono } from "hono";
import {
  listCitiesByProvince,
  listProvinces,
  listAddress,
  listMyAddresses
} from "./locations.controller.js";
import { requireCustomerAuth } from "../../middleware/auth.middleware.js";

export const locationsRoutes = new Hono();

locationsRoutes.get("/provinces", listProvinces);
locationsRoutes.get("/provinces/:id/cities", listCitiesByProvince);
locationsRoutes.get("/address/me", requireCustomerAuth ,listMyAddresses);
locationsRoutes.get("/address/:id", listAddress);
