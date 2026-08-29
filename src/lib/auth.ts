import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { authPrisma } from "./auth-prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(authPrisma, {
    provider: "sqlserver",
  }),

  baseURL:
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000",

  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
  },

  advanced: {
    disableCSRFCheck: true,
  },
});