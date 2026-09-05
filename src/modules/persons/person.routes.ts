import { Hono } from "hono";
import { requireAdmin } from "../../middleware/auth.middleware.js";

import {
  activatePersonController,
  createPersonController,
  deactivatePersonController,
  deletePersonController,
  getPersonById,
  getPersons,
  updatePersonController,
} from "./person.controller.js";

export const personRoutes = new Hono();

personRoutes.get("/", requireAdmin ,getPersons);

personRoutes.get("/:id", getPersonById);

personRoutes.post("/", requireAdmin, createPersonController);


personRoutes.put("/:id", requireAdmin, updatePersonController);

personRoutes.delete("/:id", requireAdmin, deletePersonController);

personRoutes.patch(
  "/:id/activate",
  requireAdmin,
  activatePersonController,
);


// PATCH /api/persons/:id/deactivate
personRoutes.patch(
  "/:id/deactivate",
  requireAdmin,
  deactivatePersonController,
);