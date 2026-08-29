import { Hono } from "hono";
import { routes } from "./routes/index.js";
import { errorHandler } from "./shared/errors/error-handler.js";

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

app.onError(errorHandler);

app.route("/", routes);