import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import {
  createSliderForAdmin,
  deleteSliderForAdmin,
  listSlidersForAdmin,
  updateSliderForAdmin,
  uploadSliderImageForAdmin,
} from "./admin-slider.controller.js";

export const adminSliderRoutes = new Hono();

adminSliderRoutes.get("/", requireAdminAuth, listSlidersForAdmin);
adminSliderRoutes.post("/", requireAdminAuth, createSliderForAdmin);
adminSliderRoutes.patch("/:id", requireAdminAuth, updateSliderForAdmin);
adminSliderRoutes.post("/:id/image", requireAdminAuth, uploadSliderImageForAdmin);
adminSliderRoutes.delete("/:id", requireAdminAuth, deleteSliderForAdmin);
