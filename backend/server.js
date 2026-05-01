import "dotenv/config";
console.log("✅ Step 1: dotenv loaded");

import express          from "express";
console.log("✅ Step 2: express loaded");

import { createServer } from "http";
import { Server }       from "socket.io";
console.log("✅ Step 3: socket.io loaded");

import cors             from "cors";
console.log("✅ Step 4: cors loaded");

import { connectRedis, redisSubscriber } from "./db/redis.js";
console.log("✅ Step 5: redis module loaded");

import { initDB }           from "./db/postgres.js";
console.log("✅ Step 6: postgres module loaded");

import architectureRoutes   from "./routes/architecture.js";
console.log("✅ Step 7: architecture routes loaded");

import loadtestRoutes       from "./routes/loadtest.js";
console.log("✅ Step 8: loadtest routes loaded");

// ── CORS config ───────────────────────────────────────────────────
// Allows both local dev AND production Vercel URL
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_URL,           // e.g. https://your-app.vercel.app
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

// ── App setup ─────────────────────────────────────────────────────
const app    = express();
const server = createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      allowedOrigins,
    methods:     ["GET", "POST"],
    credentials: true,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

// ── Middleware ────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// ── Health check ──────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || "development",
    services:  { express: "up", socketio: "up" },
  });
});

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/architecture", architectureRoutes);
app.use("/api/loadtest",     loadtestRoutes);

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── WebSocket handler ─────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("join_test", ({ jobId }) => {
    socket.join(`job:${jobId}`);
    console.log(`📡 Socket ${socket.id} joined: job:${jobId}`);
    socket.emit("joined", { jobId, message: "Subscribed" });
  });

  socket.on("leave_test", ({ jobId }) => {
    socket.leave(`job:${jobId}`);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Disconnected: ${socket.id}`);
  });
});

// ── Redis → Socket.io bridge ──────────────────────────────────────
async function setupRedisBridge() {
  await redisSubscriber.pSubscribe("job:*:metrics", (message, channel) => {
    const jobId = channel.split(":")[1];
    io.to(`job:${jobId}`).emit("metric_update", JSON.parse(message));
  });

  await redisSubscriber.pSubscribe("job:*:complete", (message, channel) => {
    const jobId = channel.split(":")[1];
    io.to(`job:${jobId}`).emit("test_complete", JSON.parse(message));
    console.log(`🏁 Test complete: job:${jobId}`);
  });

  console.log("✅ Redis → Socket.io bridge active");
}

// ── Startup ───────────────────────────────────────────────────────
async function start() {
  try {
    console.log("🔄 Connecting to Redis...");
    await connectRedis();

    console.log("🔄 Initializing PostgreSQL...");
    await initDB();

    console.log("🔄 Setting up Redis bridge...");
    await setupRedisBridge();

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
      console.log(`🌍 Allowed origins: ${allowedOrigins.join(", ")}\n`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
}

start();