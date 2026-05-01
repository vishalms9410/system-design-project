// ─────────────────────────────────────────────────────────────────
//  AI PROMPT BUILDER
//
//  This file turns your canvas (nodes + edges) and load test results
//  into a structured prompt that Claude can evaluate.
//
//  WHY A SEPARATE FILE?
//  Keeping prompts here makes them easy to iterate on independently
//  of the UI code.  Good prompt engineering is half the battle.
// ─────────────────────────────────────────────────────────────────

/**
 * Build the system prompt sent to Claude for architecture review.
 *
 * @param {Array}  nodes    - Canvas nodes (components)
 * @param {Array}  edges    - Connections between nodes
 * @param {string} scenario - Scenario label e.g. "Twitter Clone"
 * @param {Array}  metrics  - Load test data points
 * @returns {string}        - Full prompt string
 */
export function buildEvaluationPrompt(nodes, edges, scenario, metrics) {
  // Summarize architecture into plain English
  const componentList = nodes.length
    ? nodes.map(n => `  - ${n.label} (${n.type})`).join("\n")
    : "  (no components placed)";

  const connectionList = edges.length
    ? edges.map(e => {
        const src = nodes.find(n => n.id === e.from);
        const dst = nodes.find(n => n.id === e.to);
        return `  - ${src?.label ?? "?"} → ${dst?.label ?? "?"}`;
      }).join("\n")
    : "  (no connections drawn)";

  // Summarize load test results
  const last = metrics[metrics.length - 1] || {};
  const avg  = metrics.length
    ? (metrics.reduce((a, m) => a + m.latency, 0) / metrics.length).toFixed(0)
    : "N/A";

  const metricsBlock = `
  - Average latency : ${avg} ms
  - Peak latency    : ${last.latency?.toFixed(0) ?? "N/A"} ms
  - Peak error rate : ${last.errorRate?.toFixed(2) ?? "N/A"} %
  - Peak throughput : ${last.throughput?.toFixed(0) ?? "N/A"} RPS
  - Peak users      : ${last.activeUsers?.toLocaleString() ?? "N/A"}
  - Data points     : ${metrics.length}
`.trim();

  return `You are a principal software engineer at a top-tier tech company conducting a system design review.
The candidate has submitted the following architecture for the scenario: "${scenario}".

━━━ ARCHITECTURE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Components placed:
${componentList}

Connections:
${connectionList}

━━━ LOAD TEST RESULTS ━━━━━━━━━━━━━━━━━━━━━━━━━━
${metricsBlock}

━━━ YOUR TASK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provide a thorough but concise architecture review using EXACTLY these section headers:

## 🏆 Overall Score
Give a score X/100 and one bold verdict sentence.

## ✅ Strengths
2–3 specific strengths of this architecture.

## ⚠️ Critical Issues
2–3 concrete problems that would cause real failures at scale. Be brutally honest.

## 🔧 Recommendations
3 actionable improvements with brief reasoning for each.

## 🎯 Scalability Verdict
One paragraph: can this handle the load? What component breaks first and why?

Rules:
- Be direct and technical. No fluff or filler.
- Reference specific components the candidate placed (or didn't).
- If no components were placed, treat it as a blank-slate failure.
- Keep total response under 450 words.`;
}