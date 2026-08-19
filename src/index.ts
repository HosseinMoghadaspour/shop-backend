import { Hono } from "hono";
import { serve } from "@hono/node-server";

import productsRoutes from "./routes/products.routes.js";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:3001",
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Shop API is running",
  });
});

app.route("/api/products", productsRoutes);

serve({
  fetch: app.fetch,
  port: 3000,
});