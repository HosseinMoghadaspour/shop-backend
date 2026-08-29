import { Hono } from "hono";
import { requestAdminOtp, requestCustomerOtp, signOut, verifyAdminOtp, verifyCustomerOtp } from "./auth.controller.js";

export const authRoutes = new Hono();
authRoutes.post("/customer/request-otp", requestCustomerOtp);
authRoutes.post("/customer/verify-otp", verifyCustomerOtp);
authRoutes.post("/admin/request-otp", requestAdminOtp);
authRoutes.post("/admin/verify-otp", verifyAdminOtp);
authRoutes.post("/sign-out", signOut);