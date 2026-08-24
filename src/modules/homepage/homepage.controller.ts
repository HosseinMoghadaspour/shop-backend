import type { Context } from "hono";
import { getHomepage } from "./homepage.service.js";

export async function showHomepage(c: Context) {
  const homepage = await getHomepage();

  return c.json({
    success: true,
    data: homepage
  });
}