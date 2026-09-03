import { Hono } from "hono";
import {
  listAmazingProducts,
  listNewProducts,
  listProducts,
  showProduct,
  showProductByCode,
} from "./product.controller.js";

export const productRoutes = new Hono();

productRoutes.get("/", listProducts);
productRoutes.get("/amazing", listAmazingProducts);
productRoutes.get("/new", listNewProducts);
productRoutes.get("/code/:code", showProductByCode);
productRoutes.get("/:id", showProduct);
