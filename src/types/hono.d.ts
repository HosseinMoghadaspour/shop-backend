import type { AuthContext } from "../middleware/auth.middleware.js";

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}