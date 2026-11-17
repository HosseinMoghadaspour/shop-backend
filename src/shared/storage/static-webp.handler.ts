import { readFile } from "node:fs/promises";
import type { Handler } from "hono";
import path from "node:path";

export function serveStaticWebp(directory: string): Handler {
  return async (c) => {
    const filename = c.req.param("filename");

    if (!/^[\\w-]+\\.webp$/.test(filename)) {
      return c.notFound();
    }

    try {
      const image = await readFile(path.join(directory, filename));

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
  };
}
