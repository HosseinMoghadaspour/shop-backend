import type { Context } from "hono";
import {
  getActiveBanners,
  getActiveSliders
} from "./slider.service.js";


export async function listActiveSliders(c: Context) {
  const sliders = await getActiveSliders();

  const serializedSliders = sliders.map((slider) => ({
    ...slider,
    RowID:
      typeof slider.RowID === "bigint"
        ? slider.RowID.toString()
        : slider.RowID,
  }));

  return c.json(serializedSliders);
}


export async function listActiveBanners(c: Context) {
  const banners = await getActiveBanners();

  const serializedSliders = banners.map((slider) => ({
    ...slider,
    RowID:
      typeof slider.RowID === "bigint"
        ? slider.RowID.toString()
        : slider.RowID,
  }));

 return c.json(serializedSliders);
}
