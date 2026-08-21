import { Hono } from "hono";
import {
  listProducts,
  showProduct,
  showProductByCode
} from "./product.controller.js";

export const productRoutes = new Hono();

productRoutes.get("/", listProducts);

productRoutes.get("/code/:code", showProductByCode);

productRoutes.get("/:id", showProduct);