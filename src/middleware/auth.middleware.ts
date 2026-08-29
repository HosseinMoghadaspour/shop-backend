import { createMiddleware } from "hono/factory";
import { auth } from "../lib/auth.js";

export type AuthEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
};

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionData = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!sessionData) {
    return c.json(
      {
        success: false,
        message: "لطفاً ابتدا وارد حساب کاربری خود شوید.",
      },
      401
    );
  }

  c.set("user", sessionData.user);
  c.set("session", sessionData.session);

  await next();
});

export const optionalAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionData = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (sessionData) {
    c.set("user", sessionData.user);
    c.set("session", sessionData.session);
  }

  await next();
});
