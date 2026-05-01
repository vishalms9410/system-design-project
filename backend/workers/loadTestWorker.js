import "dotenv/config";
import { Worker }   from "bullmq";
import { createClient } from "redis";
import { generateLoadPoint, computeSummary } from "../services/simulator.js";
import { saveTestResult } from "../db/postgres.js";

// ── Redis connection (worker's own client) ────────────────────────
// The worker needs its OWN Redis client for publishing.
// It cannot share the one from server.js (different process).
const publisher = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

publisher.on("error", (err) => console.error("❌ Redis error:", err));

await publisher.connect();
console.log("✅ Redis connected (worker)");

// ── Bull worker Redis connection ──────────────────────────────────
const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");

const REDIS_CONNECTION = {
  host:     redisUrl.hostname,
  port:     parseInt(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  username: redisUrl.username || undefined,
};

const TOTAL_TICKS   = 60;
const TICK_INTERVAL = 500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Worker ────────────────────────────────────────────────────────
const worker = new Worker(
  "load-tests",
  async (job) => {
    const { nodes, edges, scenario, jobId, peakUsers, architectureId } = job.data;
    console.log(`🔄 Processing job: ${jobId} | Scenario: ${scenario}`);

    const allMetrics = [];

    for (let t = 1; t <= TOTAL_TICKS; t++) {
      const point = generateLoadPoint(t, nodes, peakUsers);
      allMetrics.push(point);

      await job.updateProgress(Math.round((t / TOTAL_TICKS) * 100));

      // Publish metric to Redis → server.js picks it up → sends to browser
      await publisher.publish(
        `job:${jobId}:metrics`,
        JSON.stringify({ ...point, progress: Math.round((t / TOTAL_TICKS) * 100), jobId })
      );

      await sleep(TICK_INTERVAL);
    }

    // ── Test complete ─────────────────────────────────────────────
    const summary = computeSummary(allMetrics, peakUsers);

    let savedResult = null;
    if (architectureId) {
      try {
        savedResult = await saveTestResult({ architectureId, scenario, metrics: allMetrics, summary });
        console.log(`💾 Saved to DB: ${savedResult.id}`);
      } catch (err) {
        console.error("⚠️ DB save failed:", err.message);
      }
    }

    // Notify browser test is done
    await publisher.publish(
      `job:${jobId}:complete`,
      JSON.stringify({ summary, resultId: savedResult?.id || null, jobId })
    );

    console.log(`✅ Job done: ${jobId} | Score: ${summary.score}/100`);
    return summary;
  },
  { connection: REDIS_CONNECTION, concurrency: 5 }
);

worker.on("completed", (job) => console.log(`✅ Job ${job.id} completed`));
worker.on("failed",    (job, err) => console.error(`❌ Job ${job?.id} failed:`, err.message));
worker.on("error",     (err) => console.error("❌ Worker error:", err));

console.log("🚀 Load test worker started — waiting for jobs...");