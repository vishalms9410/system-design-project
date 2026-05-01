// ─────────────────────────────────────────────────────────────────
//  routes/loadtest.js
//
//  Endpoints for starting load tests and getting AI reviews.
//
//  ENDPOINTS:
//  POST /api/loadtest/start   → adds job to Bull queue
//  POST /api/loadtest/ai      → runs AI review (server-side key)
//  GET  /api/loadtest/status/:jobId → check job status
// ─────────────────────────────────────────────────────────────────

import express    from "express";
import { Queue }  from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { getAIReview }  from "../services/aiService.js";

const router = express.Router();

// ── Bull Queue ────────────────────────────────────────────────────
// This is the PRODUCER side — it adds jobs to the queue.
// The CONSUMER (worker) is in workers/loadTestWorker.js
// Parse Redis URL for BullMQ
const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");

const loadTestQueue = new Queue("load-tests", {
  connection: {
    host:     redisUrl.hostname,
    port:     parseInt(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
    username: redisUrl.username || undefined,
  },
  defaultJobOptions: {
    attempts:    3,           // retry up to 3 times if it fails
    backoff: {
      type:  "exponential",
      delay: 2000,            // wait 2s, then 4s, then 8s between retries
    },
    removeOnComplete: 100,    // keep last 100 completed jobs
    removeOnFail:     50,     // keep last 50 failed jobs
  },
});

// ── POST /api/loadtest/start ──────────────────────────────────────
// Adds a new load test job to the Bull queue.
// Returns a jobId that the frontend uses to subscribe via WebSocket.
router.post("/start", async (req, res) => {
  try {
    const { nodes, edges, scenario, peakUsers, architectureId } = req.body;

    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ error: "nodes array required" });
    }

    // Generate a unique ID for this specific test run
    const jobId = uuidv4();

    // Add to Bull queue — worker picks this up automatically
    const job = await loadTestQueue.add(
      "run-load-test",
      {
        nodes,
        edges:          edges    || [],
        scenario:       scenario || "Custom",
        peakUsers:      peakUsers || 50000,
        architectureId: architectureId || null,
        jobId,
      },
      // Job-specific options
      { jobId }
    );

    console.log(`📋 Load test queued: ${jobId}`);

    res.status(202).json({
      success: true,
      jobId,
      message: "Load test queued. Connect via WebSocket to receive updates.",
    });
  } catch (err) {
    console.error("Start load test error:", err);
    res.status(500).json({ error: "Failed to queue load test" });
  }
});

// ── POST /api/loadtest/ai ─────────────────────────────────────────
// Runs AI review server-side (API key never exposed to browser)
router.post("/ai", async (req, res) => {
  try {
    const { nodes, edges, scenario, summary } = req.body;

    // Rate limiting hint (you can add express-rate-limit middleware later)
    console.log(`🤖 AI review requested for scenario: ${scenario}`);

    const review = await getAIReview(nodes, edges, scenario, summary);

    res.json({
      success: true,
      review,
    });
  } catch (err) {
    console.error("AI review error:", err);
    res.status(500).json({ error: err.message || "AI review failed" });
  }
});

// ── GET /api/loadtest/status/:jobId ──────────────────────────────
// Check the status of a queued job
router.get("/status/:jobId", async (req, res) => {
  try {
    const job = await loadTestQueue.getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state    = await job.getState();
    const progress = job.progress;

    res.json({
      jobId:    req.params.jobId,
      state,                         // "waiting" | "active" | "completed" | "failed"
      progress,                      // 0-100
      result:   job.returnvalue,     // available when state === "completed"
    });
  } catch (err) {
    console.error("Job status error:", err);
    res.status(500).json({ error: "Failed to get job status" });
  }
});

export default router;