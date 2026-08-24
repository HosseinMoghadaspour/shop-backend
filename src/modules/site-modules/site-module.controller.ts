import type { Context } from "hono";
import { getActiveSiteModules } from "./site-module.service.js";

export async function listActiveModules(c: Context) {
  const modules = await getActiveSiteModules();

  return c.json({
    success: true,
    data: modules
  });
}