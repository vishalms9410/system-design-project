import express from "express";
import {
  saveArchitecture,
  getAllArchitectures,
  getArchitectureById,
  getResultsByArchitecture,
} from "../db/postgres.js";
import {
  cacheArchitecture,
  getCachedArchitecture,
} from "../db/redis.js";

const router = express.Router();

// ── POST /api/architecture ────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, nodes, edges, scenario } = req.body;

    console.log("💾 Saving architecture:");
    console.log("   name:", name);
    console.log("   nodes count:", nodes?.length);
    console.log("   edges count:", edges?.length);
    console.log("   nodes sample:", JSON.stringify(nodes?.[0]));

    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ error: "nodes must be an array" });
    }

    const arch = await saveArchitecture({ name, nodes, edges, scenario });
    await cacheArchitecture(arch.id, arch);

    console.log("✅ Saved with ID:", arch.id);

    res.status(201).json({ success: true, architecture: arch });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save architecture" });
  }
});

// ── GET /api/architecture ─────────────────────────────────────────
// Returns list (with nodes and edges included)
router.get("/", async (req, res) => {
  try {
    const architectures = await getAllArchitectures();
    res.json({ architectures });
  } catch (err) {
    console.error("List error:", err);
    res.status(500).json({ error: "Failed to fetch architectures" });
  }
});

// ── GET /api/architecture/:id ─────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Try cache first
    const cached = await getCachedArchitecture(id);
    if (cached) {
      console.log("📦 Served from cache:", id);
      return res.json({ architecture: cached, source: "cache" });
    }

    // Fall back to DB
    const arch = await getArchitectureById(id);
    if (!arch) return res.status(404).json({ error: "Not found" });

    console.log("📦 Served from DB:", id);
    console.log("   nodes:", arch.nodes?.length);

    await cacheArchitecture(id, arch);
    res.json({ architecture: arch, source: "database" });
  } catch (err) {
    console.error("Get error:", err);
    res.status(500).json({ error: "Failed to fetch architecture" });
  }
});

// ── GET /api/architecture/:id/results ────────────────────────────
router.get("/:id/results", async (req, res) => {
  try {
    const results = await getResultsByArchitecture(req.params.id);
    res.json({ results });
  } catch (err) {
    console.error("Results error:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

export default router;