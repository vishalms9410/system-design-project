// ─────────────────────────────────────────────────────────────────
//  Canvas.jsx
//
//  The main architecture drawing board.
//  - Left sidebar: palette of draggable components
//  - Center: free-form canvas where you place + connect nodes
//  - Right sidebar: load test controls + live metric readouts
//
//  KEY INTERACTIONS:
//  • Drag from palette → drops new node on canvas
//  • Drag existing node → repositions it
//  • Shift + click two nodes → draws a connection arrow
//  • Click ✕ on a node → deletes it
// ─────────────────────────────────────────────────────────────────

import { useRef, useCallback } from "react";
import { COMPONENTS } from "../utils/constants";

// ── small shared button style helper ────────────────────────────
const btn = (bg, color, width = "auto") => ({
  background: bg,
  color,
  border: `1px solid ${color}33`,
  borderRadius: 6,
  padding: "7px 14px",
  fontSize: 10,
  fontFamily: "inherit",
  letterSpacing: 1,
  cursor: "pointer",
  width,
  transition: "all .2s",
});

export default function Canvas({
  nodes, setNodes,
  edges, setEdges,
  dragging, setDragging,
  connecting, setConnecting,
  running, elapsed,
  lastMetric,
  onStartTest, onStopTest,
  onRunAI, aiLoading,
}) {
  const canvasRef = useRef(null);

  // ── Drop a NEW node from the palette ──────────────────────────
  const onPaletteMouseDown = (comp) => (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const id   = `node_${Date.now()}`;
    const x    = e.clientX - rect.left - 48;
    const y    = e.clientY - rect.top  - 24;
    setNodes(prev => [...prev, { ...comp, id, x, y }]);
    setDragging({ id, ox: 48, oy: 24 });
  };

  // ── Move an EXISTING node ──────────────────────────────────────
  const onNodeMouseDown = (id) => (e) => {
    // Shift+click = connect mode
    if (e.shiftKey) {
      if (!connecting) {
        setConnecting(id);
      } else {
        if (connecting !== id)
          setEdges(prev => [...prev, { id: `e_${Date.now()}`, from: connecting, to: id }]);
        setConnecting(null);
      }
      return;
    }
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    setDragging({ id, ox: e.clientX - node.x, oy: e.clientY - node.y });
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setNodes(prev => prev.map(n =>
      n.id === dragging.id
        ? { ...n, x: e.clientX - rect.left - (dragging.ox ?? 48), y: e.clientY - rect.top - (dragging.oy ?? 24) }
        : n
    ));
  }, [dragging, setNodes]);

  const onMouseUp = useCallback(() => setDragging(null), [setDragging]);

  const deleteNode = (id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
  };

  // ── Metric card color: green / yellow / red ───────────────────
  const metricColor = (val, warnAt, critAt) => {
    if (!val) return "#888";
    return val < warnAt ? "#34D399" : val < critAt ? "#FBBF24" : "#F87171";
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 108px)" }}>

      {/* ── LEFT: Component Palette ──────────────────────────── */}
      <aside style={{ width: 164, background: "#0D1220", borderRight: "1px solid #1E2D4A", padding: 12, overflowY: "auto" }}>
        <p style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginBottom: 10 }}>COMPONENTS</p>
        <p style={{ fontSize: 9, color: "#334155", marginBottom: 12, lineHeight: 1.6 }}>
          Drag to canvas<br />Shift+click to connect
        </p>

        {COMPONENTS.map(comp => (
          <div
            key={comp.type}
            onMouseDown={onPaletteMouseDown(comp)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", marginBottom: 6,
              background: "#111827", border: "1px solid #1E2D4A",
              borderRadius: 8, cursor: "grab", fontSize: 11,
              userSelect: "none", transition: "border-color .2s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = comp.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#1E2D4A"}
          >
            <span>{comp.icon}</span>
            <span style={{ fontSize: 10, color: "#94A3B8" }}>{comp.label}</span>
          </div>
        ))}

        <div style={{ marginTop: 16, borderTop: "1px solid #1E2D4A", paddingTop: 12 }}>
          <button
            onClick={() => { setNodes([]); setEdges([]); }}
            style={btn("#1E2D4A", "#94A3B8", "100%")}
          >🗑 Clear All</button>
        </div>
      </aside>

      {/* ── CENTER: Drawing Canvas ───────────────────────────── */}
      <div
        ref={canvasRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {/* Dot-grid background */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: .15, pointerEvents: "none" }}>
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#334155" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Connection arrows */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {edges.map(e => {
            const s = nodes.find(n => n.id === e.from);
            const t = nodes.find(n => n.id === e.to);
            if (!s || !t) return null;
            const x1 = s.x + 48, y1 = s.y + 24;
            const x2 = t.x + 48, y2 = t.y + 24;
            const mx = (x1 + x2) / 2;
            return (
              <g key={e.id}>
                <path
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none" stroke="#6EE7F7" strokeWidth="1.5"
                  strokeDasharray="6 3" opacity=".6"
                />
                <circle cx={x2} cy={y2} r={4} fill="#6EE7F7" opacity=".8" />
              </g>
            );
          })}
        </svg>

        {/* Component nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            onMouseDown={onNodeMouseDown(node.id)}
            style={{
              position: "absolute", left: node.x, top: node.y,
              background: "#111827",
              border: `1.5px solid ${connecting === node.id ? "#FBBF24" : node.color}`,
              borderRadius: 10, padding: "8px 14px",
              cursor: "grab", minWidth: 96, textAlign: "center",
              userSelect: "none",
              boxShadow: `0 0 12px ${node.color}33`,
              zIndex: 10, transition: "box-shadow .2s",
            }}
          >
            <div style={{ fontSize: 20 }}>{node.icon}</div>
            <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 4 }}>{node.label}</div>
            <button
              onClick={() => deleteNode(node.id)}
              style={{
                position: "absolute", top: -8, right: -8,
                width: 16, height: 16, borderRadius: "50%",
                border: "none", background: "#F87171",
                color: "#0A0E1A", fontSize: 9, cursor: "pointer", lineHeight: "16px",
              }}
            >✕</button>
          </div>
        ))}

        {/* Empty state hint */}
        {nodes.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#334155", pointerEvents: "none" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⬡</div>
            <div style={{ fontSize: 13, letterSpacing: 2 }}>DRAG COMPONENTS TO BUILD YOUR ARCHITECTURE</div>
            <div style={{ fontSize: 10, marginTop: 8, color: "#1E2D4A" }}>Shift + click two nodes to connect them</div>
          </div>
        )}

        {/* Connection hint banner */}
        {connecting && (
          <div style={{
            position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
            background: "#FBBF2422", border: "1px solid #FBBF24",
            borderRadius: 6, padding: "6px 16px", fontSize: 11, color: "#FBBF24",
          }}>
            ⚡ Shift+click another node to connect
          </div>
        )}
      </div>

      {/* ── RIGHT: Controls + Live Metrics ───────────────────── */}
      <aside style={{ width: 204, background: "#0D1220", borderLeft: "1px solid #1E2D4A", padding: 16 }}>
        <p style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginBottom: 12 }}>LOAD TEST</p>

        <button
          onClick={running ? onStopTest : onStartTest}
          style={{ ...btn(running ? "#2D1515" : "#0D2233", running ? "#F87171" : "#6EE7F7", "100%"), marginBottom: 8, fontWeight: 700 }}
        >{running ? `⬛ STOP (${elapsed}s)` : "▶ RUN TEST"}</button>

        <button
          onClick={onRunAI}
          disabled={aiLoading}
          style={{ ...btn("#1A0D2E", "#A78BFA", "100%"), marginBottom: 20, opacity: aiLoading ? .6 : 1 }}
        >{aiLoading ? "🤖 ANALYZING…" : "🤖 AI REVIEW"}</button>

        {/* Live metric cards */}
        <p style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginBottom: 10 }}>LIVE METRICS</p>
        {[
          { label: "LATENCY",    val: lastMetric?.latency?.toFixed(0), unit: "ms",  color: metricColor(lastMetric?.latency, 200, 400) },
          { label: "ERROR RATE", val: lastMetric?.errorRate?.toFixed(2), unit: "%", color: metricColor(lastMetric?.errorRate, 1, 5) },
          { label: "THROUGHPUT", val: lastMetric?.throughput?.toFixed(0), unit: "RPS", color: "#34D399" },
          { label: "USERS",      val: lastMetric?.activeUsers?.toLocaleString(), unit: "", color: "#FBBF24" },
        ].map(m => (
          <div key={m.label} style={{ marginBottom: 10, background: "#111827", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ fontSize: 8, color: "#475569", letterSpacing: 1 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: m.color, marginTop: 2 }}>
              {m.val ? `${m.val}${m.unit}` : "--"}
            </div>
          </div>
        ))}

        {/* Architecture summary */}
        <p style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginTop: 16, marginBottom: 8 }}>ARCH SUMMARY</p>
        <div style={{ fontSize: 10, color: "#64748B", lineHeight: 1.9 }}>
          {COMPONENTS.map(c => {
            const count = nodes.filter(n => n.type === c.type).length;
            return count > 0
              ? <div key={c.type}>{c.icon} {c.label}: <span style={{ color: c.color }}>{count}</span></div>
              : null;
          })}
          {nodes.length === 0 && <div style={{ color: "#334155" }}>No components placed</div>}
        </div>
      </aside>
    </div>
  );
}