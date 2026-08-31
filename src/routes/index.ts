import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  requireAuth,
  type AuthEnv,
} from "../middleware/auth.middleware.js";
import { productRoutes } from "../modules/products/product.routes.js";
import { sliderRoutes } from "../modules/slider/slider.routes.js";
import { footerRoutes } from "../modules/footer/footer.routes.js";
import { siteModuleRoutes } from "../modules/site-modules/site-module.routes.js";
import { homepageRoutes } from "../modules/homepage/homepage.routes.js";
import { categoryRoutes } from "../modules/categories/category.routes.js";
import { personRoutes } from "../modules/persons/person.routes.js";
import { userInfoRoutes } from "../modules/userInfo/userInfo.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";

export const routes = new Hono<AuthEnv>();

routes.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    allowHeaders: [
      "Content-Type",
      "Authorization",
    ],
    allowMethods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    exposeHeaders: [
      "Content-Length",
    ],
    maxAge: 600,
    credentials: true,
  })
);
routes.route("/api/auth", authRoutes);
routes.get("/", (c) => {
  return c.text("Server is running!");
});
routes.get("/api/me", requireAuth, (c) => {
  const session = c.get("session");

  return c.json({
    success: true,
    session,
  });
});
routes.route("/products", productRoutes);
routes.route("/sliders", sliderRoutes);
routes.route("/footer", footerRoutes);
routes.route("/site-modules", siteModuleRoutes);
routes.route("/home", homepageRoutes);
routes.route("/categories", categoryRoutes);
routes.route("/persons", personRoutes);
routes.route("/users", userInfoRoutes);
