import { Hono } from "hono";
import path from "node:path";
import { swaggerUI } from "@hono/swagger-ui";

import { routes } from "./routes/index.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { serveStaticWebp } from "./shared/storage/static-webp.handler.js";
import { openApiDocument } from "./docs/openapi.js";

export const app = new Hono();

app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Shop API is running",
  });
});

app.get("/health", (c) => {
  return c.json({
    success: true,
    message: "OK",
  });
});

app.get("/openapi.json", (c) => c.json(openApiDocument));

app.get(
  "/api-docs",
  swaggerUI({
    url: "/openapi.json",
    docExpansion: "list",
    persistAuthorization: true,
  }),
);

app.onError(errorHandler);

const uploadsDirectory = path.resolve(process.cwd(), "uploads");

app.get(
  "/uploads/products/:filename",
  serveStaticWebp(path.join(uploadsDirectory, "products")),
);

app.get(
  "/uploads/sliders/:filename",
  serveStaticWebp(path.join(uploadsDirectory, "sliders")),
);

app.route("/", routes);

app.get(
  "/uploads/footer/:filename",
  serveStaticWebp(path.join(uploadsDirectory, "footer")),
);
