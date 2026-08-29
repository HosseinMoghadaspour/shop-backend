import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";

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

personRoutes.get("/", getPersons);

personRoutes.get("/:id", getPersonById);

personRoutes.post("/", requireAdminAuth, createPersonController);


personRoutes.put("/:id", requireAdminAuth, updatePersonController);

personRoutes.delete("/:id", requireAdminAuth, deletePersonController);

personRoutes.patch(
  "/:id/activate",
  requireAdminAuth,
  activatePersonController,
);


// PATCH /api/persons/:id/deactivate
personRoutes.patch(
  "/:id/deactivate",
  requireAdminAuth,
  deactivatePersonController,
);