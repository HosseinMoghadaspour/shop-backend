import { Hono } from "hono";

import { productRoutes } from "../modules/products/product.routes.js";
import { sliderRoutes } from "../modules/slider/slider.routes.js";
import { footerRoutes } from "../modules/footer/footer.routes.js";
import { siteModuleRoutes } from "../modules/site-modules/site-module.routes.js";
import { homepageRoutes } from "../modules/homepage/homepage.routes.js";
import { categoryRoutes } from "../modules/categories/category.routes.js";
import { personRoutes } from "../modules/persons/person.routes.js";
import {userInfoRoutes} from "../modules/userInfo/userInfo.routes.js"

export const routes = new Hono();

routes.get("/", (c) => {
  return c.json({
    success: true,
    message: "Shop API is working"
  });
});

routes.route("/products", productRoutes);
routes.route("/sliders", sliderRoutes);
routes.route("/footer", footerRoutes);
routes.route("/site-modules", siteModuleRoutes);
routes.route("/home", homepageRoutes);
routes.route("/categories", categoryRoutes);
routes.route("/persons", personRoutes);
routes.route("/users" , userInfoRoutes)