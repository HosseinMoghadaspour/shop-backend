import { Hono } from "hono";
import { showHomepage } from "./homepage.controller.js";

export const homepageRoutes = new Hono();

homepageRoutes.get("/", showHomepage);