import { Hono } from "hono";
import { showFooter } from "./footer.controller.js";

export const footerRoutes = new Hono();

footerRoutes.get("/", showFooter);