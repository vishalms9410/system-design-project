import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
console.log("🔗 Redis URL:", REDIS_URL.substring(0, 30) + "...");

// Create both clients from same URL
export const redisClient = createClient({ url: REDIS_URL });
export const redisSubscriber = createClient({ url: REDIS_URL });

export async function connectRedis() {
  redisClient.on("error",     (err) => console.error("❌ Redis:", err.message));
  redisSubscriber.on("error", (err) => console.error("❌ Sub:",   err.message));

  await redisClient.connect();
  console.log("✅ Redis client connected");

  await redisSubscriber.connect();
  console.log("✅ Redis subscriber connected");
}

export async function publishMetric(jobId, data) {
  await redisClient.publish(`job:${jobId}:metrics`, JSON.stringify(data));
}
export async function publishComplete(jobId, summary) {
  await redisClient.publish(`job:${jobId}:complete`, JSON.stringify(summary));
}
export async function cacheArchitecture(id, data) {
  try { await redisClient.setEx(`arch:${id}`, 3600, JSON.stringify(data)); } catch {}
}
export async function getCachedArchitecture(id) {
  try {
    const r = await redisClient.get(`arch:${id}`);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}