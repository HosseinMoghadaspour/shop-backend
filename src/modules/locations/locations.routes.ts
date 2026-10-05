import { Hono } from "hono";
import {
  listCitiesByProvince,
  listProvinces,
  listAddress,
  listMyAddresses
} from "./locations.controller.js";

export const locationsRoutes = new Hono();

locationsRoutes.get("/provinces", listProvinces);
locationsRoutes.get("/provinces/:id/cities", listCitiesByProvince);
locationsRoutes.get("/address/me", listMyAddresses);
locationsRoutes.get("/address/:id", listAddress);
