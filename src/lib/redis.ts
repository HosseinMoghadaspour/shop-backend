import { createClient } from "redis";
import { env } from "../config/env.js";

export const redis = createClient({
  url: env.redis.url,
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
  },
});

redis.on("error", (error: any) => {
  console.error("Redis client error:", error);
});

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function disconnectRedis() {
  if (redis.isOpen) {
    await redis.quit();
  }
}
