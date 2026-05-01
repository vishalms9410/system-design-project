// ─────────────────────────────────────────────────────────────────
//  services/simulator.js  (SERVER SIDE)
//
//  This is the REAL simulation engine running on the backend.
//  Unlike the browser version, this runs inside a Bull job worker
//  which means:
//    - It runs even if the user closes the browser tab
//    - It can be scaled across multiple CPU cores
//    - Results are saved to PostgreSQL automatically
//    - Multiple users can run tests simultaneously
//
//  FLOW:
//  1. Worker receives a job { nodes, edges, scenario, jobId }
//  2. Every 500ms, generateLoadPoint() runs
//  3. Result is published to Redis channel "job:<id>:metrics"
//  4. Socket.io server listens to Redis and forwards to browser
//  5. After 60 ticks, summary is saved to PostgreSQL
// ─────────────────────────────────────────────────────────────────

/**
 * Generate one realistic load test data point.
 * Identical logic to the frontend version, but runs server-side.
 */
export function generateLoadPoint(t, nodes, peakUsers) {
  const hasLB       = nodes.some(n => n.type === "loadbalancer");
  const hasCache    = nodes.some(n => n.type === "cache");
  const hasQueue    = nodes.some(n => n.type === "queue");
  const hasCDN      = nodes.some(n => n.type === "cdn");
  const serverCount = nodes.filter(n => n.type === "server").length;

  // Traffic ramp: builds up over 30 ticks
  const ramp = Math.min(1, t / 30);
  const load = ramp * peakUsers * (1 + 0.3 * Math.sin(t / 8));

  let latency    = 80 + (load / peakUsers) * 600;
  let errorRate  = (load / peakUsers) * 8;
  let throughput = load / 100;

  if (hasLB) {
    latency    *= 0.75;
    errorRate  *= 0.60;
    throughput *= (1 + serverCount * 0.4);
  }
  if (hasCache) {
    latency    *= 0.55;
    throughput *= 1.80;
  }
  if (hasQueue) {
    errorRate  *= 0.40;
    latency    += 15;
  }
  if (hasCDN) {
    latency    *= 0.70;
    throughput *= 1.30;
  }
  if (serverCount > 1) {
    latency   *= Math.max(0.5, 1 - serverCount * 0.08);
    errorRate *= Math.max(0.2, 1 - serverCount * 0.12);
  }

  const noise = () => (Math.random() - 0.5) * 0.12;

  return {
    t,
    latency:     Math.max(12,  latency    * (1 + noise())),
    errorRate:   Math.max(0,   errorRate  * (1 + noise())),
    throughput:  Math.max(1,   throughput * (1 + noise())),
    activeUsers: Math.round(load),
    timestamp:   Date.now(),   // extra: real timestamp on each point
  };
}

/**
 * Compute summary statistics from a complete metrics array.
 * This is stored in PostgreSQL after the test finishes.
 */
export function computeSummary(metrics, peakUsers) {
  if (!metrics.length) return {};

  const avgLatency = metrics.reduce((a, m) => a + m.latency, 0) / metrics.length;
  const maxError   = Math.max(...metrics.map(m => m.errorRate));
  const peakRPS    = Math.max(...metrics.map(m => m.throughput));

  // Simple score: 100 minus penalties for high latency and errors
  const latencyPenalty = Math.min(40, (avgLatency - 100) / 10);
  const errorPenalty   = Math.min(40, maxError * 5);
  const score          = Math.max(10, Math.round(100 - latencyPenalty - errorPenalty));

  return {
    avgLatency:  parseFloat(avgLatency.toFixed(2)),
    maxError:    parseFloat(maxError.toFixed(2)),
    peakRPS:     parseFloat(peakRPS.toFixed(2)),
    peakUsers,
    score,
    totalTicks:  metrics.length,
  };
}