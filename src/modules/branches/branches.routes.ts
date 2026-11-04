import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { getAdminBranches, getAdminBranchSetupOptions, getBranches, putAdminBranch } from "./branches.controller.js";

export const branchRoutes = new Hono();
branchRoutes.get("/", getBranches);
branchRoutes.get("/admin", requireAdminAuth, getAdminBranches);
branchRoutes.get("/admin/options", requireAdminAuth, getAdminBranchSetupOptions);
branchRoutes.put("/admin/:branchId", requireAdminAuth, putAdminBranch);
