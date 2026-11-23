import { Hono } from "hono";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { setAdminShippingQuoteController } from "./order-workflow.admin-controller.js";

export const adminOrderWorkflowRoutes = new Hono();
adminOrderWorkflowRoutes.patch("/:id/shipping-quote", requireAdminAuth, setAdminShippingQuoteController);
