import { Hono } from "hono";
import { requireAdminAuth } from "../../../middleware/auth.middleware.js";
import { listAdminBankAccounts } from "./bank-accounts.controller.js";

export const adminBankAccountsRoutes = new Hono();

adminBankAccountsRoutes.get(
  "/",
  requireAdminAuth,
  listAdminBankAccounts
);
