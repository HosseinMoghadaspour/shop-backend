import type { Context } from "hono";
import {
  getActiveBanners,
  getActiveSliders
} from "./slider.service.js";

export async function listActiveSliders(c: Context) {
  const sliders = await getActiveSliders();

  return c.json({
    success: true,
    data: sliders
  });
}

export async function listActiveBanners(c: Context) {
  const banners = await getActiveBanners();

  return c.json({
    success: true,
    data: banners
  });
}