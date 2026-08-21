import { Hono } from "hono";
import { routes } from "./routes/index.js";

export const app = new Hono();

app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Shop API is running"
  });
});

app.get("/health", async (c) => {
  return c.json({
    success: true,
    message: "OK"
  });
});

app.route("/api", routes);