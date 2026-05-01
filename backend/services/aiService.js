// ─────────────────────────────────────────────────────────────────
//  services/aiService.js
//
//  Handles ALL AI API calls from the SERVER side.
//
//  WHY SERVER SIDE?
//  - API key is hidden from the browser (can't be stolen)
//  - You can add rate limiting (1 review per user per minute)
//  - You can log all AI requests to your database
//  - You can swap AI providers without touching the frontend
//
//  Current provider: Groq (free, fast, Llama 3.3 70B)
//  Easy to swap to OpenAI or Anthropic — just change the fetch URL
// ─────────────────────────────────────────────────────────────────

/**
 * Build the evaluation prompt from architecture data.
 */
function buildPrompt(nodes, edges, scenario, summary) {
  const componentList = nodes.length
    ? nodes.map(n => `  - ${n.label} (${n.type})`).join("\n")
    : "  (no components placed)";

  const connectionList = edges.length
    ? edges.map((e, i) => `  - Connection ${i + 1}`).join("\n")
    : "  (no connections drawn)";

  return `You are a principal software engineer conducting a system design review.

SCENARIO: "${scenario}"

ARCHITECTURE:
${componentList}

CONNECTIONS:
${connectionList}

LOAD TEST RESULTS:
- Average latency : ${summary?.avgLatency ?? "N/A"} ms
- Peak error rate : ${summary?.maxError   ?? "N/A"} %
- Peak throughput : ${summary?.peakRPS    ?? "N/A"} RPS
- Peak users      : ${summary?.peakUsers  ?? "N/A"}
- Score           : ${summary?.score      ?? "N/A"}/100

Provide a review with EXACTLY these sections:

## 🏆 Overall Score
Score X/100 and one verdict sentence.

## ✅ Strengths
2-3 specific strengths.

## ⚠️ Critical Issues
2-3 problems that would fail at scale.

## 🔧 Recommendations
3 actionable improvements.

## 🎯 Scalability Verdict
One paragraph: can this handle the load? What breaks first?

Be direct and technical. Under 400 words total.`;
}

/**
 * Call Groq API and return the AI review text.
 *
 * @param {Array}  nodes    - Canvas nodes
 * @param {Array}  edges    - Canvas edges
 * @param {string} scenario - Scenario label
 * @param {Object} summary  - Load test summary from computeSummary()
 * @returns {Promise<string>} - AI review text
 */
export async function getAIReview(nodes, edges, scenario, summary) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY not set in environment variables");
  }

  const prompt = buildPrompt(nodes, edges, scenario, summary);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:      "llama-3.3-70b-versatile",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "AI API error");
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "No response received.";
}