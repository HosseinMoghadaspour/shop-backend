import { Hono } from "hono";

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

personRoutes.post("/", createPersonController);


personRoutes.put("/:id", updatePersonController);

personRoutes.delete("/:id", deletePersonController);

personRoutes.patch(
  "/:id/activate",
  activatePersonController,
);


// PATCH /api/persons/:id/deactivate
personRoutes.patch(
  "/:id/deactivate",
  deactivatePersonController,
);