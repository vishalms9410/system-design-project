import { useState, useEffect } from "react";
import { COMPONENTS } from "../utils/constants";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const scoreColor = (score) => {
  if (!score) return "#475569";
  if (score >= 80) return "#34D399";
  if (score >= 50) return "#FBBF24";
  return "#F87171";
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export default function SavedDesigns({ onLoadDesign }) {
  const [designs,  setDesigns]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [expanded, setExpanded] = useState(null);
  const [results,  setResults]  = useState({});

  const fetchDesigns = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${BACKEND_URL}/api/architecture`);
      const data = await res.json();
      console.log("📦 Raw designs from DB:", data.architectures);
      setDesigns(data.architectures || []);
    } catch (err) {
      setError("Failed to load. Is backend running?");
    }
    setLoading(false);
  };

  useEffect(() => { fetchDesigns(); }, []);

  const fetchResults = async (id) => {
    if (results[id]) return;
    try {
      const res  = await fetch(`${BACKEND_URL}/api/architecture/${id}/results`);
      const data = await res.json();
      setResults(prev => ({ ...prev, [id]: data.results || [] }));
    } catch {}
  };

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    fetchResults(id);
  };

  // ── Load full design from backend by ID ───────────────────────
  // We fetch the FULL record (with nodes/edges) using the detail endpoint
  const handleLoad = async (designId) => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/architecture/${designId}`);
      const data = await res.json();
      const arch = data.architecture;

      console.log("📂 Loading design:", arch);
      console.log("📂 Nodes:", arch.nodes);
      console.log("📂 Edges:", arch.edges);

      if (onLoadDesign) {
        onLoadDesign({
          nodes:    Array.isArray(arch.nodes) ? arch.nodes : [],
          edges:    Array.isArray(arch.edges) ? arch.edges : [],
          scenario: arch.scenario,
        });
      }
    } catch (err) {
      console.error("Failed to load design:", err);
      alert("Failed to load design. Check console.");
    }
  };

  // ── Get component counts from nodes ──────────────────────────
  const getComponentSummary = (nodes) => {
    if (!Array.isArray(nodes)) return [];
    return COMPONENTS
      .map(c => ({ ...c, count: nodes.filter(n => n.type === c.type).length }))
      .filter(c => c.count > 0);
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#6EE7F7", letterSpacing: 1 }}>
            💾 SAVED DESIGNS
          </h2>
          <p style={{ fontSize: 10, color: "#475569", marginTop: 4, letterSpacing: 1 }}>
            STORED IN POSTGRESQL · {designs.length} DESIGN{designs.length !== 1 ? "S" : ""}
          </p>
        </div>
        <button onClick={fetchDesigns} style={{
          background: "#1E2D4A", color: "#6EE7F7",
          border: "1px solid #6EE7F744", borderRadius: 6,
          padding: "6px 14px", fontSize: 10,
          fontFamily: "inherit", letterSpacing: 1, cursor: "pointer",
        }}>🔄 Refresh</button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#334155", fontSize: 10, letterSpacing: 2 }}>
          LOADING FROM POSTGRESQL...
        </div>
      )}

      {error && (
        <div style={{ background: "#2D1515", border: "1px solid #F87171", borderRadius: 8, padding: 16, color: "#F87171", fontSize: 11 }}>
          {error}
        </div>
      )}

      {!loading && !error && designs.length === 0 && (
        <div style={{ textAlign: "center", padding: 80, border: "1px dashed #1E2D4A", borderRadius: 12, color: "#334155" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🗄️</div>
          <div style={{ fontSize: 13, letterSpacing: 2 }}>NO SAVED DESIGNS YET</div>
          <div style={{ fontSize: 10, marginTop: 8, color: "#1E2D4A" }}>
            Build an architecture → Click 💾 Save
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {designs.map((design, i) => {
          // nodes in the list endpoint are just metadata — no nodes/edges
          // We show a placeholder count from the DB column if available
          const isOpen   = expanded === design.id;
          const testList = results[design.id] || [];

          return (
            <div key={design.id} style={{
              background: "#0D1220",
              border: `1px solid ${isOpen ? "#6EE7F744" : "#1E2D4A"}`,
              borderRadius: 12, overflow: "hidden",
              transition: "border-color .2s",
            }}>

              {/* Card header */}
              <div
                style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                onClick={() => toggleExpand(design.id)}
              >
                {/* Index number */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#1E2D4A", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 11, color: "#6EE7F7",
                  fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>

                {/* Name + meta */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600 }}>
                    {design.name}
                  </div>
                  <div style={{ fontSize: 9, color: "#475569", marginTop: 3, letterSpacing: 1 }}>
                    {formatDate(design.created_at)} · {design.scenario?.toUpperCase()}
                  </div>
                </div>

                {/* Load button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleLoad(design.id); }}
                  style={{
                    background: "#0D2233", color: "#6EE7F7",
                    border: "1px solid #6EE7F744", borderRadius: 6,
                    padding: "6px 14px", fontSize: 10,
                    fontFamily: "inherit", letterSpacing: 1, cursor: "pointer",
                    fontWeight: 700,
                  }}
                >📂 LOAD ONTO CANVAS</button>

                {/* Expand arrow */}
                <div style={{
                  color: "#334155", fontSize: 12,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform .2s",
                }}>▼</div>
              </div>

              {/* Expanded: test results */}
              {isOpen && (
                <div style={{ borderTop: "1px solid #1E2D4A", padding: "16px 20px", background: "#080C15" }}>
                  <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginBottom: 12 }}>
                    TEST HISTORY
                  </div>
                  {testList.length === 0 ? (
                    <div style={{ fontSize: 10, color: "#334155" }}>
                      No load tests run for this design yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {testList.map((result) => (
                        <div key={result.id} style={{
                          display: "flex", alignItems: "center", gap: 16,
                          background: "#0D1220", borderRadius: 8,
                          padding: "10px 14px", border: "1px solid #1E2D4A",
                        }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(result.summary?.score), minWidth: 60 }}>
                            {result.summary?.score ?? "--"}<span style={{ fontSize: 10, color: "#475569" }}>/100</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4px 20px", flex: 1 }}>
                            {[
                              { label: "AVG LATENCY", val: result.avg_latency ? result.avg_latency + "ms" : "--" },
                              { label: "MAX ERROR",   val: result.max_error_rate ? result.max_error_rate + "%" : "--" },
                              { label: "PEAK RPS",    val: result.peak_rps ?? "--" },
                              { label: "PEAK USERS",  val: result.peak_users?.toLocaleString() ?? "--" },
                            ].map(s => (
                              <div key={s.label}>
                                <div style={{ fontSize: 8, color: "#475569", letterSpacing: 1 }}>{s.label}</div>
                                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{s.val}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: 9, color: "#334155" }}>{formatDate(result.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}