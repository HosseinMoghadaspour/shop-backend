import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { getDb } from "./db/connection.js";

async function bootstrap() {
  try {
    await getDb();

    serve({
      fetch: app.fetch,
      port: env.port
    });

    console.log(`🚀 Server running on http://localhost:${env.port}`);
  } catch (error) {
    console.error("❌ Failed to start server");
    console.error(error);

    process.exit(1);
  }
}

bootstrap();