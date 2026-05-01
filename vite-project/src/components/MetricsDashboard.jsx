// ─────────────────────────────────────────────────────────────────
//  MetricsDashboard.jsx  —  Updated
//
//  WHAT CHANGED:
//  - Accepts `summary` prop from backend (computed server-side)
//  - Shows final score card when test is complete
//  - Score is computed by backend computeSummary() in simulator.js
// ─────────────────────────────────────────────────────────────────

import {
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: "#0D1220", border: "1px solid #1E2D4A",
      borderRadius: 12, padding: 20,
    }}>
      <p style={{ fontSize: 10, color: "#64748B", letterSpacing: 2, marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: {
    background: "#111827", border: "1px solid #1E2D4A",
    borderRadius: 8, fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
  },
};

export default function MetricsDashboard({ metrics, nodes, summary }) {
  const avgLatency = metrics.length
    ? (metrics.reduce((a, m) => a + m.latency, 0) / metrics.length).toFixed(0)
    : "--";
  const maxError = metrics.length
    ? Math.max(...metrics.map(m => m.errorRate)).toFixed(2)
    : "--";
  const peakRPS = metrics.length
    ? Math.max(...metrics.map(m => m.throughput)).toFixed(0)
    : "--";

  const statCards = [
    { label: "AVG LATENCY",  val: avgLatency === "--" ? "--" : avgLatency + "ms", color: "#6EE7F7", icon: "⏱" },
    { label: "PEAK ERROR %", val: maxError   === "--" ? "--" : maxError   + "%",  color: "#F87171", icon: "⚠" },
    { label: "PEAK RPS",     val: peakRPS,                                         color: "#34D399", icon: "⚡" },
    { label: "NODES PLACED", val: nodes.length,                                    color: "#A78BFA", icon: "⬡" },
  ];

  if (metrics.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ background: "#0D1220", border: "1px solid #1E2D4A", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", padding: 80, color: "#334155", border: "1px dashed #1E2D4A", borderRadius: 12 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 13, letterSpacing: 2 }}>RUN A LOAD TEST TO SEE LIVE CHARTS</div>
          <div style={{ fontSize: 10, marginTop: 8, color: "#1E2D4A" }}>
            Metrics stream live from backend via WebSocket
          </div>
        </div>
      </div>
    );
  }

  // Score color
  const scoreColor = !summary ? "#888"
    : summary.score >= 80 ? "#34D399"
    : summary.score >= 50 ? "#FBBF24"
    : "#F87171";

  return (
    <div style={{ padding: 24 }}>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: "#0D1220", border: "1px solid #1E2D4A", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Backend score card (shows after test completes) ── */}
      {summary && (
        <div style={{
          background: "#0D1220", border: `1px solid ${scoreColor}44`,
          borderRadius: 12, padding: 20, marginBottom: 24,
          display: "flex", alignItems: "center", gap: 24,
          animation: "fadeIn .4s ease",
        }}>
          <div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2 }}>BACKEND SCORE</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
              {summary.score}<span style={{ fontSize: 16, color: "#475569" }}>/100</span>
            </div>
          </div>
          <div style={{ height: 60, width: 1, background: "#1E2D4A" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 32px" }}>
            {[
              { label: "Avg Latency", val: summary.avgLatency + "ms" },
              { label: "Peak Error",  val: summary.maxError + "%" },
              { label: "Peak RPS",    val: summary.peakRPS },
              { label: "Peak Users",  val: summary.peakUsers?.toLocaleString() },
            ].map(s => (
              <div key={s.label}>
                <span style={{ fontSize: 9, color: "#475569", letterSpacing: 1 }}>{s.label}: </span>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>{s.val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 9, color: "#334155", letterSpacing: 1 }}>
            ⬡ COMPUTED SERVER-SIDE
          </div>
        </div>
      )}

      {/* ── Charts ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        <ChartCard title="LATENCY (ms)  •  via WebSocket">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={metrics}>
              <defs>
                <linearGradient id="gLat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6EE7F7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6EE7F7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="t" stroke="#334155" tick={{ fontSize: 9 }} />
              <YAxis stroke="#334155" tick={{ fontSize: 9 }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="latency" stroke="#6EE7F7" fill="url(#gLat)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ERROR RATE (%)  •  via WebSocket">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={metrics}>
              <defs>
                <linearGradient id="gErr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="t" stroke="#334155" tick={{ fontSize: 9 }} />
              <YAxis stroke="#334155" tick={{ fontSize: 9 }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="errorRate" stroke="#F87171" fill="url(#gErr)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="THROUGHPUT (RPS)  •  via WebSocket">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="t" stroke="#334155" tick={{ fontSize: 9 }} />
              <YAxis stroke="#334155" tick={{ fontSize: 9 }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="throughput" stroke="#34D399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="ACTIVE USERS  •  via WebSocket">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={metrics}>
              <defs>
                <linearGradient id="gUsr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FBBF24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" />
              <XAxis dataKey="t" stroke="#334155" tick={{ fontSize: 9 }} />
              <YAxis stroke="#334155" tick={{ fontSize: 9 }} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="activeUsers" stroke="#FBBF24" fill="url(#gUsr)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}