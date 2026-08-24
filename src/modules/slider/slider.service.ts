import {
  findActiveBanners,
  findActiveSliders
} from "./slider.repository.js";

export async function getActiveSliders() {
  return findActiveSliders();
}

export async function getActiveBanners() {
  return findActiveBanners();
}