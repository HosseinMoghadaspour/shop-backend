import { Hono } from "hono";
import { routes } from "./routes/index.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

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


const sliderUploadsDir = path.resolve(process.cwd(), "uploads", "sliders");

const productUploadsDir = path.resolve(
  process.cwd(),
  "uploads",
  "products",
);

app.get("/uploads/products/:filename", async (c) => {
  const filename = c.req.param("filename");

  if (!/^[\w-]+\.webp$/.test(filename)) {
    return c.notFound();
  }

  try {
    const image = await readFile(
      path.join(productUploadsDir, filename),
    );

    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return c.notFound();
  }
});

app.get("/uploads/sliders/:filename", async (c) => {
  const filename = c.req.param("filename");
  if (!/^[\\w-]+\\.webp$/.test(filename)) return c.notFound();

  try {
    const image = await readFile(path.join(sliderUploadsDir, filename));
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return c.notFound();
  }
});

app.route("/", routes);
