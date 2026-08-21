import { Hono } from "hono";
import { productRoutes } from "../modules/products/product.routes.js";

export const routes = new Hono();

routes.get("/", (c) => {
  return c.json({
    success: true,
    message: "API is working"
  });
});

routes.route("/products", productRoutes);