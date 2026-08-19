import { Hono } from "hono";

const productsRoutes = new Hono();

productsRoutes.get("/", (c) => {
  return c.json({
    success: true,
    data: [],
  });
});

export default productsRoutes;