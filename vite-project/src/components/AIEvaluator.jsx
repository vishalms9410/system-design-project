// ─────────────────────────────────────────────────────────────────
//  AIEvaluator.jsx  —  Updated (backend-driven)
//
//  WHAT CHANGED:
//  - No longer calls AI API directly from browser
//  - Receives review text as a prop from App.jsx
//  - App.jsx calls backend /api/loadtest/ai (key is server-side)
//  - This component just renders the text beautifully
// ─────────────────────────────────────────────────────────────────

export default function AIEvaluator({
  review,
  loading,
  error,
  onRunReview,
  nodes,
  edges,
  metrics,
}) {
  // ── Render one line with styling ─────────────────────────────
  const renderLine = (line, i) => {
    if (line.startsWith("## ")) {
      return (
        <div key={i} style={{
          fontSize: 14, fontWeight: 700, color: "#6EE7F7",
          marginTop: 24, marginBottom: 8,
          borderBottom: "1px solid #1E2D4A", paddingBottom: 6,
        }}>
          {line.replace("## ", "")}
        </div>
      );
    }
    if (line.match(/^\s*[-•]\s/)) {
      return <div key={i} style={{ paddingLeft: 16, color: "#94A3B8", lineHeight: 1.9 }}>{line}</div>;
    }
    if (line.match(/^\d\./)) {
      return <div key={i} style={{ paddingLeft: 16, color: "#94A3B8", marginBottom: 4 }}>{line}</div>;
    }
    const isScore = /\d+\/100/.test(line);
    return (
      <div key={i} style={{ color: isScore ? "#FBBF24" : "#94A3B8", lineHeight: 1.9 }}>
        {line}
      </div>
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>

      {/* ── Header row ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <button
          onClick={onRunReview}
          disabled={loading}
          style={{
            background: "#1A0D2E", color: "#A78BFA",
            border: "1px solid #A78BFA44",
            borderRadius: 6, padding: "7px 18px",
            fontSize: 10, fontFamily: "inherit",
            letterSpacing: 1, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? .6 : 1, transition: "all .2s",
          }}
        >{loading ? "🤖 Analyzing…" : "🤖 Run AI Review"}</button>

        <span style={{ fontSize: 10, color: "#475569" }}>
          {nodes.length} components · {edges.length} connections · {metrics.length} data points
        </span>

        {/* Backend badge */}
        <span style={{
          fontSize: 9, padding: "2px 8px", borderRadius: 20,
          background: "#0D2233", color: "#34D399",
          border: "1px solid #34D39944", letterSpacing: 1,
        }}>
          ⬡ SERVER-SIDE AI
        </span>
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: "#2D1515", border: "1px solid #F87171",
          borderRadius: 8, padding: "12px 16px",
          fontSize: 11, color: "#F87171", marginBottom: 16,
        }}>{error}</div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!review && !loading && !error && (
        <div style={{
          textAlign: "center", padding: 80, color: "#334155",
          border: "1px dashed #1E2D4A", borderRadius: 12,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <div style={{ fontSize: 13, letterSpacing: 2 }}>AI ARCHITECTURE REVIEW</div>
          <div style={{ fontSize: 10, marginTop: 8, color: "#1E2D4A" }}>
            Build your architecture → Run load test → Click AI Review
          </div>
          <div style={{ fontSize: 10, marginTop: 4, color: "#1E2D4A" }}>
            AI runs on the server — your API key stays safe
          </div>
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────── */}
      {loading && !review && (
        <div style={{
          background: "#0D1220", border: "1px solid #1E2D4A",
          borderRadius: 12, padding: 28,
        }}>
          <div style={{ color: "#A78BFA", fontSize: 12, animation: "pulse 1.5s infinite" }}>
            ⬡ Sending to backend → Groq AI analyzing…
          </div>
        </div>
      )}

      {/* ── Review output ─────────────────────────────────────── */}
      {review && (
        <div style={{
          background: "#0D1220", border: "1px solid #1E2D4A",
          borderRadius: 12, padding: 28,
          animation: "fadeIn .3s ease",
        }}>
          <div style={{ fontSize: 13, lineHeight: 2, whiteSpace: "pre-wrap" }}>
            {review.split("\n").map((line, i) => renderLine(line, i))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}