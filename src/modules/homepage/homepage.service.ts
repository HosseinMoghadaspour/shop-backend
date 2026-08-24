import { getActiveSiteModules } from "../site-modules/site-module.service.js";
import {
  getActiveBanners,
  getActiveSliders
} from "../slider/slider.service.js";
import { getSiteFooter } from "../footer/footer.service.js";
import { getRootCategories } from "../categories/category.service.js";

import {
  findAmazingProducts,
  findMostSaleProducts,
  findNewProducts
} from "./homepage.repository.js";

export async function getAmazingProducts(limit = 12) {
  return findAmazingProducts(limit);
}

export async function getMostSaleProducts(limit = 12) {
  return findMostSaleProducts(limit);
}

export async function getNewProducts(limit = 12) {
  return findNewProducts(limit);
}

export async function getHomepage() {
  const modules = await getActiveSiteModules();

  const enabled = new Set(
    modules.map((module) => module.Name)
  );

  const [
    slider,
    amazing,
    mostSale,
    categories,
    banners,
    newProducts,
    footer
  ] = await Promise.all([
    enabled.has("Slider")
      ? getActiveSliders()
      : Promise.resolve([]),

    enabled.has("Amazing")
      ? getAmazingProducts(12)
      : Promise.resolve([]),

    enabled.has("MostSale")
      ? getMostSaleProducts(12)
      : Promise.resolve([]),

    enabled.has("Category")
      ? getRootCategories()
      : Promise.resolve([]),

    enabled.has("Banner")
      ? getActiveBanners()
      : Promise.resolve([]),

    enabled.has("NewGood")
      ? getNewProducts(12)
      : Promise.resolve([]),

    getSiteFooter()
  ]);

  return {
    modules,
    slider,
    amazing,
    mostSale,
    categories,
    banners,
    newProducts,
    footer
  };
}