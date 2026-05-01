// ─────────────────────────────────────────────────────────────────
//  LOAD TEST SIMULATOR ENGINE
//
//  This file contains the math that simulates how your architecture
//  performs under load.  It runs every 300ms during a load test and
//  returns one "data point" per tick.
//
//  HOW IT WORKS:
//  1. We ramp users up over the first 30 ticks (like a real traffic spike)
//  2. Each architecture component you've added improves specific metrics:
//     - Load balancer  → lower latency, fewer errors, more throughput
//     - Cache          → dramatically lower latency, higher throughput
//     - Message queue  → fewer errors (requests don't get dropped)
//     - CDN            → lower latency, more throughput
//     - More servers   → linear latency + error improvement
//  3. We add random noise so graphs look realistic (not perfectly smooth)
// ─────────────────────────────────────────────────────────────────

/**
 * Generate one load-test data point.
 *
 * @param {number} t          - Current tick (0–60)
 * @param {Array}  nodes      - All nodes on the canvas
 * @param {number} peakUsers  - Max concurrent users for this scenario
 * @returns {{ t, latency, errorRate, throughput, activeUsers }}
 */
export function generateLoadPoint(t, nodes, peakUsers) {
  // What components does this architecture have?
  const hasLB          = nodes.some(n => n.type === "loadbalancer");
  const hasCache       = nodes.some(n => n.type === "cache");
  const hasQueue       = nodes.some(n => n.type === "queue");
  const hasCDN         = nodes.some(n => n.type === "cdn");
  const serverCount    = nodes.filter(n => n.type === "server").length;

  // Traffic ramp: 0→1 over 30 ticks, then stays at 1
  const ramp       = Math.min(1, t / 30);
  // Add a gentle sine wave so traffic breathes naturally
  const load       = ramp * peakUsers * (1 + 0.3 * Math.sin(t / 8));
  const baseRPS    = load / 100;

  // ── Baseline metrics (no architecture) ──────────────────────────
  let latency   = 80 + (load / peakUsers) * 600;  // ms
  let errorRate = (load / peakUsers) * 8;          // %
  let throughput = baseRPS;                         // req/sec

  // ── Apply architecture bonuses ───────────────────────────────────
  if (hasLB) {
    latency    *= 0.75;
    errorRate  *= 0.60;
    throughput *= (1 + serverCount * 0.4);  // more servers = more throughput
  }

  if (hasCache) {
    latency    *= 0.55;   // cache hits are fast
    throughput *= 1.80;   // cache reduces DB pressure
  }

  if (hasQueue) {
    errorRate  *= 0.40;   // queue absorbs traffic spikes
    latency    += 15;     // tiny overhead for queueing
  }

  if (hasCDN) {
    latency    *= 0.70;   // CDN serves static assets nearby
    throughput *= 1.30;
  }

  if (serverCount > 1) {
    // Each extra server helps (with diminishing returns)
    latency   *= Math.max(0.5, 1 - serverCount * 0.08);
    errorRate *= Math.max(0.2, 1 - serverCount * 0.12);
  }

  // ── Add realistic noise ──────────────────────────────────────────
  const noise = () => (Math.random() - 0.5) * 0.12;

  return {
    t,
    latency:     Math.max(12,  latency    * (1 + noise())),
    errorRate:   Math.max(0,   errorRate  * (1 + noise())),
    throughput:  Math.max(1,   throughput * (1 + noise())),
    activeUsers: Math.round(load),
  };
}

/**
 * Compute summary stats from a full metrics array.
 * Used in the metrics dashboard and AI prompt.
 */
export function summarizeMetrics(metrics) {
  if (!metrics.length) return null;
  return {
    avgLatency:  (metrics.reduce((a, m) => a + m.latency,   0) / metrics.length).toFixed(0),
    maxError:    Math.max(...metrics.map(m => m.errorRate)).toFixed(2),
    peakRPS:     Math.max(...metrics.map(m => m.throughput)).toFixed(0),
    peakUsers:   Math.max(...metrics.map(m => m.activeUsers)).toLocaleString(),
  };
}