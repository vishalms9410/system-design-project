import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/sysdesign",
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS architectures (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL DEFAULT 'Untitled Design',
        nodes       JSONB NOT NULL DEFAULT '[]',
        edges       JSONB NOT NULL DEFAULT '[]',
        scenario    TEXT NOT NULL DEFAULT 'custom',
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS test_results (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        architecture_id UUID REFERENCES architectures(id) ON DELETE CASCADE,
        scenario        TEXT NOT NULL,
        metrics         JSONB NOT NULL DEFAULT '[]',
        summary         JSONB NOT NULL DEFAULT '{}',
        peak_users      INTEGER,
        avg_latency     NUMERIC(10,2),
        max_error_rate  NUMERIC(10,2),
        peak_rps        NUMERIC(10,2),
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_results_arch_id ON test_results(architecture_id);
      CREATE INDEX IF NOT EXISTS idx_results_created ON test_results(created_at DESC);
    `);
    console.log("✅ PostgreSQL tables ready");
  } finally {
    client.release();
  }
}

// ── Save architecture ─────────────────────────────────────────────
export async function saveArchitecture({ name, nodes, edges, scenario }) {
  // Ensure nodes and edges are proper arrays before saving
  const nodesData = Array.isArray(nodes) ? nodes : [];
  const edgesData = Array.isArray(edges) ? edges : [];

  console.log(`💾 DB saving ${nodesData.length} nodes, ${edgesData.length} edges`);

  const result = await pool.query(
    `INSERT INTO architectures (name, nodes, edges, scenario)
     VALUES ($1, $2::jsonb, $3::jsonb, $4)
     RETURNING *`,
    [
      name || "Untitled Design",
      JSON.stringify(nodesData),
      JSON.stringify(edgesData),
      scenario || "custom",
    ]
  );
  return result.rows[0];
}

// ── Get all architectures (WITH nodes and edges) ──────────────────
export async function getAllArchitectures() {
  const result = await pool.query(
    `SELECT id, name, scenario, nodes, edges, created_at
     FROM architectures
     ORDER BY created_at DESC
     LIMIT 50`
  );
  return result.rows;
}

// ── Get one architecture by ID ────────────────────────────────────
export async function getArchitectureById(id) {
  const result = await pool.query(
    `SELECT * FROM architectures WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

// ── Save test result ──────────────────────────────────────────────
export async function saveTestResult({ architectureId, scenario, metrics, summary }) {
  const result = await pool.query(
    `INSERT INTO test_results
       (architecture_id, scenario, metrics, summary,
        peak_users, avg_latency, max_error_rate, peak_rps)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)
     RETURNING *`,
    [
      architectureId,
      scenario,
      JSON.stringify(metrics),
      JSON.stringify(summary),
      summary.peakUsers  || 0,
      summary.avgLatency || 0,
      summary.maxError   || 0,
      summary.peakRPS    || 0,
    ]
  );
  return result.rows[0];
}

// ── Get results for an architecture ──────────────────────────────
export async function getResultsByArchitecture(architectureId) {
  const result = await pool.query(
    `SELECT * FROM test_results
     WHERE architecture_id = $1
     ORDER BY created_at DESC`,
    [architectureId]
  );
  return result.rows;
}