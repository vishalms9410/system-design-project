import { useState, useCallback } from "react";
import Canvas           from "./components/Canvas";
import MetricsDashboard from "./components/MetricsDashboard";
import AIEvaluator      from "./components/AIEvaluator";
import SavedDesigns     from "./components/SavedDesigns";
import { SCENARIOS }    from "./utils/constants";
import { useSocket }    from "./hooks/useSocket";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export default function App() {
  // ── Canvas state ──────────────────────────────────────────────
  const [nodes,      setNodes]      = useState([]);
  const [edges,      setEdges]      = useState([]);
  const [dragging,   setDragging]   = useState(null);
  const [connecting, setConnecting] = useState(null);

  // ── Test state ────────────────────────────────────────────────
  const [scenario,    setScenario]    = useState(SCENARIOS[0]);
  const [metrics,     setMetrics]     = useState([]);
  const [running,     setRunning]     = useState(false);
  const [elapsed,     setElapsed]     = useState(0);
  const [summary,     setSummary]     = useState(null);
  const [saveStatus,  setSaveStatus]  = useState("");

  // ── UI state ──────────────────────────────────────────────────
  const [tab,       setTab]       = useState("canvas");
  const [aiReview,  setAiReview]  = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState("");

  // ── WebSocket hook ────────────────────────────────────────────
  const { connected, loading, startTest, stopTest, requestAIReview } = useSocket({
    onMetric: useCallback((point) => {
      setMetrics(prev => {
        const next = [...prev, point];
        return next.length > 60 ? next.slice(-60) : next;
      });
      setElapsed(point.t || 0);
    }, []),

    onComplete: useCallback((data) => {
      setRunning(false);
      setSummary(data.summary);
    }, []),

    onError: useCallback((msg) => {
      setRunning(false);
      console.error("WebSocket error:", msg);
    }, []),
  });

  // ── Start load test ───────────────────────────────────────────
  const handleStartTest = async () => {
    setMetrics([]);
    setSummary(null);
    setElapsed(0);
    setRunning(true);
    try {
      await startTest({
        nodes, edges,
        scenario:  scenario.label,
        peakUsers: scenario.users,
      });
    } catch (err) {
      setRunning(false);
    }
  };

  // ── Stop load test ────────────────────────────────────────────
  const handleStopTest = () => {
    stopTest();
    setRunning(false);
  };

  // ── Save design to PostgreSQL ─────────────────────────────────
  const handleSaveDesign = async () => {
    if (nodes.length === 0) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`${BACKEND_URL}/api/architecture`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     `${scenario.label} Design`,
          nodes, edges,
          scenario: scenario.id,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  // ── Load a design from SavedDesigns page ─────────────────────
  const handleLoadDesign = ({ nodes: n, edges: e, scenario: s }) => {
    setNodes(n || []);
    setEdges(e || []);
    const found = SCENARIOS.find(sc => sc.id === s);
    if (found) setScenario(found);
    setTab("canvas");  // switch back to canvas
    setMetrics([]);
    setSummary(null);
  };

  // ── AI Review ─────────────────────────────────────────────────
  const handleRunAI = async () => {
    setTab("ai");
    setAiLoading(true);
    setAiReview("");
    setAiError("");
    try {
      const review = await requestAIReview({
        nodes, edges,
        scenario: scenario.label,
        summary,
      });
      setAiReview(review);
    } catch (err) {
      setAiError("⚠️ " + err.message);
    }
    setAiLoading(false);
  };

  const lastMetric = metrics[metrics.length - 1] ?? null;

  // ── Tab style ─────────────────────────────────────────────────
  const tabBtn = (id) => ({
    padding: "6px 14px", borderRadius: 6,
    border: "none", cursor: "pointer",
    fontSize: 10, letterSpacing: 1,
    fontFamily: "inherit", fontWeight: 600,
    background: tab === id ? "#6EE7F7" : "#1E2D4A",
    color:      tab === id ? "#0A0E1A" : "#94A3B8",
    transition: "all .2s",
  });

  return (
    <div style={{ fontFamily: "'JetBrains Mono',monospace", background: "#0A0E1A", minHeight: "100vh", color: "#E2E8F0" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        background: "#0D1220", borderBottom: "1px solid #1E2D4A",
        padding: "12px 24px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20, letterSpacing: "-1px", fontWeight: 700, color: "#6EE7F7" }}>
            ⬡ SysDesign<span style={{ color: "#A78BFA" }}>AI</span>
          </span>
          <span style={{ fontSize: 9, color: "#475569", background: "#1E2D4A", padding: "2px 8px", borderRadius: 4, letterSpacing: 2 }}>
            v2.0
          </span>
          {/* WebSocket status */}
          <span style={{
            fontSize: 9, padding: "2px 8px", borderRadius: 20,
            background: connected ? "#0D2233" : "#2D1515",
            color:      connected ? "#34D399"  : "#F87171",
            border:     `1px solid ${connected ? "#34D399" : "#F87171"}44`,
            letterSpacing: 1,
          }}>
            {connected ? "● LIVE" : "○ OFFLINE"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Save button */}
          <button onClick={handleSaveDesign} disabled={nodes.length === 0} style={{
            padding: "6px 12px", borderRadius: 6,
            border: "1px solid #1E2D4A44", cursor: nodes.length === 0 ? "not-allowed" : "pointer",
            fontSize: 10, fontFamily: "inherit", letterSpacing: 1,
            background: saveStatus === "saved"  ? "#0D2233"
                      : saveStatus === "error"  ? "#2D1515" : "#1E2D4A",
            color:      saveStatus === "saved"  ? "#34D399"
                      : saveStatus === "error"  ? "#F87171" : "#94A3B8",
            opacity: nodes.length === 0 ? 0.4 : 1,
            transition: "all .2s",
          }}>
            {saveStatus === "saving" ? "💾 Saving…"
           : saveStatus === "saved"  ? "✅ Saved!"
           : saveStatus === "error"  ? "❌ Error"
           : "💾 Save"}
          </button>

          {/* Tabs */}
          <button style={tabBtn("canvas")}  onClick={() => setTab("canvas")}>🗺 CANVAS</button>
          <button style={tabBtn("metrics")} onClick={() => setTab("metrics")}>📊 METRICS</button>
          <button style={tabBtn("ai")}      onClick={() => setTab("ai")}>🤖 AI</button>
          <button style={tabBtn("saved")}   onClick={() => setTab("saved")}>💾 SAVED</button>
        </div>
      </header>

      {/* ── Scenario bar ──────────────────────────────────────── */}
      <div style={{
        background: "#0D1220", borderBottom: "1px solid #1E2D4A",
        padding: "8px 24px", display: "flex",
        gap: 8, alignItems: "center", flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 10, color: "#475569", letterSpacing: 2 }}>SCENARIO:</span>
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => setScenario(s)} style={{
            padding: "4px 12px", borderRadius: 20,
            border: "1px solid", cursor: "pointer",
            fontSize: 10, fontFamily: "inherit",
            borderColor: scenario.id === s.id ? "#6EE7F7" : "#1E2D4A",
            background:  scenario.id === s.id ? "#0D2233"  : "transparent",
            color:       scenario.id === s.id ? "#6EE7F7"  : "#64748B",
          }}>{s.label}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#475569" }}>
          PEAK USERS: <span style={{ color: "#FBBF24" }}>{scenario.users.toLocaleString()}</span>
        </span>
        {summary && (
          <span style={{
            fontSize: 10, padding: "2px 10px", borderRadius: 20,
            background: "#1A0D2E", border: "1px solid #A78BFA44", color: "#A78BFA",
          }}>
            Last Score: <strong>{summary.score}/100</strong>
          </span>
        )}
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
      {tab === "canvas" && (
        <Canvas
          nodes={nodes}           setNodes={setNodes}
          edges={edges}           setEdges={setEdges}
          dragging={dragging}     setDragging={setDragging}
          connecting={connecting} setConnecting={setConnecting}
          running={running}       elapsed={elapsed}
          lastMetric={lastMetric}
          onStartTest={handleStartTest}
          onStopTest={handleStopTest}
          onRunAI={handleRunAI}
          aiLoading={aiLoading}
          connected={connected}
        />
      )}

      {tab === "metrics" && (
        <MetricsDashboard metrics={metrics} nodes={nodes} summary={summary} />
      )}

      {tab === "ai" && (
        <AIEvaluator
          review={aiReview}
          loading={aiLoading}
          error={aiError}
          onRunReview={handleRunAI}
          nodes={nodes}
          edges={edges}
          metrics={metrics}
        />
      )}

      {tab === "saved" && (
        <SavedDesigns onLoadDesign={handleLoadDesign} />
      )}
    </div>
  );
}