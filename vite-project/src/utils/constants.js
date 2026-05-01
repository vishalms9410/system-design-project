// ─────────────────────────────────────────────
//  COMPONENT PALETTE
//  Each entry shows up as a draggable card in
//  the left sidebar of the canvas.
// ─────────────────────────────────────────────
export const COMPONENTS = [
  { type: "client",       label: "Client",         icon: "🖥️", color: "#6EE7F7" },
  { type: "loadbalancer", label: "Load Balancer",  icon: "⚖️", color: "#A78BFA" },
  { type: "server",       label: "App Server",     icon: "🖧",  color: "#34D399" },
  { type: "database",     label: "Database",       icon: "🗄️", color: "#FBBF24" },
  { type: "cache",        label: "Cache (Redis)",  icon: "⚡",  color: "#F87171" },
  { type: "queue",        label: "Message Queue",  icon: "📨",  color: "#FB923C" },
  { type: "cdn",          label: "CDN",            icon: "🌐",  color: "#38BDF8" },
  { type: "microservice", label: "Microservice",   icon: "🔷",  color: "#C084FC" },
];

// ─────────────────────────────────────────────
//  LOAD TEST SCENARIOS
//  Controls how many peak users are simulated.
// ─────────────────────────────────────────────
export const SCENARIOS = [
  { id: "twitter",   label: "Twitter Clone",       users: 500_000   },
  { id: "uber",      label: "Uber-like App",       users: 200_000   },
  { id: "netflix",   label: "Video Streaming",     users: 1_000_000 },
  { id: "ecommerce", label: "E-Commerce Platform", users: 100_000   },
  { id: "custom",    label: "Custom System",       users: 50_000    },
];

// ─────────────────────────────────────────────
//  CLAUDE MODEL
// ─────────────────────────────────────────────
export const AI_MODEL = "claude-sonnet-4-20250514";