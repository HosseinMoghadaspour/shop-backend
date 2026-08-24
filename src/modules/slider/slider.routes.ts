import { Hono } from "hono";
import {
  listActiveSliders,
  listActiveBanners
} from "./slider.controller.js";

export const sliderRoutes = new Hono();

sliderRoutes.get("/", listActiveSliders);
sliderRoutes.get("/banners", listActiveBanners);