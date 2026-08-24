import { Hono } from "hono";
import {
  listCategories,
  showCategory
} from "./category.controller.js";

export const categoryRoutes = new Hono();

categoryRoutes.get("/", listCategories);
categoryRoutes.get("/:id", showCategory);