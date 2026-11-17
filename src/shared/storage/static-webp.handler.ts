import { readFile } from "node:fs/promises";
import type { Handler } from "hono";
import path from "node:path";

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export function serveStaticWebp(directory: string): Handler {
  return async (c) => {
    const filename = c.req.param("filename");
    const extension = path.extname(filename).toLowerCase();
    const contentType = IMAGE_CONTENT_TYPES[extension];

    if (!/^[\w-]+\.(?:avif|jpe?g|png|webp)$/i.test(filename) || !contentType) {
      return c.notFound();
    }

    try {
      const image = await readFile(path.join(directory, filename));

      return new Response(new Uint8Array(image), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return c.notFound();
    }
  };
}
