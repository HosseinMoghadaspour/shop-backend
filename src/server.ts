import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

async function bootstrap() {
  try {
    await prisma.$connect();

    console.log("✅ Prisma connected to SQL Server");

    serve({
      fetch: app.fetch,
      port: env.port,
    });

    console.log(
      `Server running on http://localhost:${env.port}`
    );
  } catch (error) {
    console.error("Failed to start server");
    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  }
}

bootstrap();