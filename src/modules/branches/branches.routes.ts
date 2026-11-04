import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { getAdminBranches, getBranches, putAdminBranch } from "./branches.controller.js";

export const branchRoutes = new Hono();
branchRoutes.get("/", getBranches);
branchRoutes.get("/admin", requireAdminAuth, getAdminBranches);
branchRoutes.put("/admin/:branchId", requireAdminAuth, putAdminBranch);
