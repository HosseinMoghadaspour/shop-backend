import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import {
  getAdminBranches,
  getAdminBranchSetupOptions,
  getAdminWarehouses,
  getBranches,
  putAdminBranch,
} from "./branches.controller.js";

export const branchRoutes = new Hono();
branchRoutes.get("/", getBranches);
branchRoutes.get("/admin", requireAdminAuth, getAdminBranches);
branchRoutes.get("/admin/options", requireAdminAuth, getAdminBranchSetupOptions);
branchRoutes.get("/admin/warehouses", requireAdminAuth, getAdminWarehouses);
branchRoutes.put("/admin/:branchId", requireAdminAuth, putAdminBranch);
