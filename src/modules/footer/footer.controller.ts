import type { Context } from "hono";
import { getSiteFooter } from "./footer.service.js";

export async function showFooter(c: Context) {
  const footer = await getSiteFooter();

  if (!footer) {
    return c.json({
      success: true,
      data: null
    });
  }

  return c.json({
    success: true,
    data: footer
  });
}