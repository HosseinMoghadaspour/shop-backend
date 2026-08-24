import { Hono } from "hono";
import { listActiveModules } from "./site-module.controller.js";

export const siteModuleRoutes = new Hono();

siteModuleRoutes.get("/", listActiveModules);