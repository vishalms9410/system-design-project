import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export function useSocket({ onMetric, onComplete, onError }) {
  const socketRef    = useRef(null);
  const [connected,  setConnected]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const currentJobId = useRef(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports:        ["websocket", "polling"],
      reconnection:      true,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("🔌 WebSocket connected:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("🔌 WebSocket disconnected");
      setConnected(false);
    });

    socket.on("metric_update", (data) => {
      if (onMetric) onMetric(data);
    });

    socket.on("test_complete", (data) => {
      setLoading(false);
      if (onComplete) onComplete(data);
    });

    socket.on("connect_error", (err) => {
      console.error("WebSocket error:", err.message);
      if (onError) onError(err.message);
    });

    socketRef.current = socket;

    return () => socket.disconnect();
  }, []); // eslint-disable-line

  const startTest = useCallback(async ({ nodes, edges, scenario, peakUsers, architectureId }) => {
    if (!socketRef.current) return;
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/loadtest/start`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, scenario, peakUsers, architectureId }),
      });

      if (!res.ok) throw new Error("Failed to queue load test");

      const { jobId } = await res.json();
      currentJobId.current = jobId;
      socketRef.current.emit("join_test", { jobId });
      console.log(`▶ Load test started: ${jobId}`);
      return jobId;

    } catch (err) {
      setLoading(false);
      if (onError) onError(err.message);
      throw err;
    }
  }, [onError]);

  const stopTest = useCallback(() => {
    if (currentJobId.current && socketRef.current) {
      socketRef.current.emit("leave_test", { jobId: currentJobId.current });
    }
    setLoading(false);
    currentJobId.current = null;
  }, []);

  const requestAIReview = useCallback(async ({ nodes, edges, scenario, summary }) => {
    const res = await fetch(`${BACKEND_URL}/api/loadtest/ai`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, edges, scenario, summary }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "AI review failed");
    }

    const data = await res.json();
    return data.review;
  }, []);

  return { connected, loading, startTest, stopTest, requestAIReview };
}