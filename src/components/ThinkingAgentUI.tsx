"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Terminal,
  Eye,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Timeline from "./Timeline";
import WeatherWidget from "./WeatherWidget";
import { IDay } from "@/lib/agent/types";

interface LogEntry {
  type: "log" | "node" | "start" | "complete" | "error";
  message: string;
  node?: string;
  timestamp: Date;
}

interface ThinkingAgentUIProps {
  logs: LogEntry[];
  isStreaming: boolean;
  draft: IDay[] | null;
  totalEstimatedCost: number;
  currency: string;
  threadId: string | null;
  tripData: {
    destination: string;
    budget: number;
    currency: string;
    startDate: string;
    endDate: string;
    preferences: string[];
  };
  onApprove: () => void;
  onReject: (feedback: string) => void;
  isSubmitting: boolean;
}

const nodeLabels: Record<string, string> = {
  supervisor: "🧭 Supervisor",
  hotelWorker: "🏨 Hotel Agent",
  flightWorker: "✈️ Flight Agent",
  restaurantWorker: "🍽️ Restaurant Agent",
  attractionWorker: "🗺️ Attraction Agent",
  draftAgent: "🧠 Draft Agent",
  humanReview: "👤 Human Review",
};

function getLineClass(log: LogEntry): string {
  if (log.type === "error") return "terminal-line error";
  if (log.message.includes("✅") || log.message.includes("Success")) return "terminal-line success";
  if (log.message.includes("⚠️") || log.message.includes("fallback")) return "terminal-line warn";
  if (log.type === "node" || log.message.includes("🚀") || log.message.includes("⏸️"))
    return "terminal-line accent";
  return "terminal-line";
}

export default function ThinkingAgentUI({
  logs,
  isStreaming,
  draft,
  totalEstimatedCost,
  currency,
  threadId,
  tripData,
  onApprove,
  onReject,
  isSubmitting,
}: ThinkingAgentUIProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"terminal" | "review">("terminal");
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Switch to review tab when draft arrives
  useEffect(() => {
    if (draft && draft.length > 0 && !isStreaming) {
      setActiveTab("review");
    }
  }, [draft, isStreaming]);

  const handleReject = () => {
    if (!feedback.trim()) {
      setShowFeedback(true);
      return;
    }
    onReject(feedback);
    setFeedback("");
    setShowFeedback(false);
    setActiveTab("terminal");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          background: "var(--color-surface-alt)",
          padding: "4px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--color-border)",
          width: "fit-content",
        }}
      >
        <button
          onClick={() => setActiveTab("terminal")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 18px",
            borderRadius: "var(--radius-full)",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
            transition: "all 200ms",
            background: activeTab === "terminal" ? "var(--color-terminal-bg)" : "transparent",
            color: activeTab === "terminal" ? "var(--color-terminal-text)" : "var(--color-text-muted)",
          }}
        >
          <Terminal size={14} />
          Agent Logs
          {isStreaming && (
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#34D399",
                animation: "pulse 1.5s ease infinite",
                display: "inline-block",
              }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("review")}
          disabled={!draft}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 18px",
            borderRadius: "var(--radius-full)",
            border: "none",
            cursor: draft ? "pointer" : "not-allowed",
            fontSize: "0.875rem",
            fontWeight: 500,
            transition: "all 200ms",
            background:
              activeTab === "review" ? "var(--color-primary)" : "transparent",
            color:
              activeTab === "review" ? "#fff" : draft ? "var(--color-text-muted)" : "var(--color-text-faint)",
            opacity: draft ? 1 : 0.5,
          }}
        >
          <Eye size={14} />
          Review Draft
          {draft && (
            <span
              style={{
                background: activeTab === "review" ? "rgba(255,255,255,0.25)" : "var(--color-primary)",
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "1px 7px",
                borderRadius: "var(--radius-full)",
              }}
            >
              {draft.length}d
            </span>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "terminal" && (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="terminal"
          >
            {/* Terminal chrome */}
            <div className="terminal-header">
              <div className="terminal-dot red" />
              <div className="terminal-dot yellow" />
              <div className="terminal-dot green" />
              <span className="terminal-title">TripGuru Agent Pipeline — {tripData.destination}</span>
              {isStreaming && (
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Loader2
                    size={13}
                    style={{ animation: "spin 0.8s linear infinite", color: "var(--color-terminal-accent)" }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--color-terminal-accent)", fontFamily: "var(--font-mono)" }}>
                    RUNNING
                  </span>
                </div>
              )}
            </div>

            {/* Log body */}
            <div className="terminal-body" ref={terminalRef}>
              {logs.length === 0 && (
                <div className="terminal-line" style={{ opacity: 0.4 }}>
                  $ Initializing TripGuru pipeline...
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={getLineClass(log)}>
                  <span style={{ opacity: 0.45, marginRight: "10px", userSelect: "none" }}>
                    {log.timestamp.toLocaleTimeString("en-US", { hour12: false })}
                  </span>
                  {log.message}
                  {i === logs.length - 1 && isStreaming && (
                    <span className="terminal-cursor" />
                  )}
                </div>
              ))}
              {!isStreaming && logs.length > 0 && (
                <div className="terminal-line success" style={{ marginTop: "8px" }}>
                  $ Pipeline complete. {draft ? "Review your draft →" : ""}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "review" && draft && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="review-panel"
          >
            {/* Panel header */}
            <div className="review-panel-header">
              <Eye size={18} color="#fff" />
              <div>
                <h3>Draft Itinerary — {tripData.destination}</h3>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8125rem", margin: 0 }}>
                  {draft.length} days · Est. {currency} {totalEstimatedCost.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Timeline preview */}
            <div className="review-panel-body">
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-primary)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  padding: "0 0 16px",
                }}
              >
                {showTimeline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showTimeline ? "Hide" : "Preview"} Full Itinerary
              </button>

              <AnimatePresence>
                {showTimeline && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <WeatherWidget destination={tripData.destination} startDate={tripData.startDate} endDate={tripData.endDate} />
                    <Timeline days={draft} currency={currency} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick day list */}
              {!showTimeline && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {draft.slice(0, 5).map((day) => (
                    <div
                      key={day.day}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 14px",
                        background: "var(--color-surface-alt)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <span
                        style={{
                          width: "28px",
                          height: "28px",
                          background: "var(--color-primary)",
                          color: "#fff",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {day.day}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{day.title}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                          {day.activities.length} activities · {currency}{" "}
                          {(day.dailyCost || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {draft.length > 5 && (
                    <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textAlign: "center" }}>
                      + {draft.length - 5} more days
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden", borderTop: "1px solid var(--color-border)" }}
                >
                  <div style={{ padding: "16px 24px", background: "var(--color-terminal-bg)" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--color-terminal-text)",
                        fontSize: "0.8125rem",
                        fontFamily: "var(--font-mono)",
                        marginBottom: "8px",
                      }}
                    >
                      <MessageSquare size={14} />
                      Describe what to change:
                    </label>
                    <textarea
                      className="feedback-input"
                      placeholder="e.g. Replace the hotel with something closer to the beach, add more local restaurants, reduce flight costs..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="review-actions">
              <button
                className="btn btn-success btn-lg"
                onClick={onApprove}
                disabled={isSubmitting}
                id="approve-trip-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Approve & Save Trip
                  </>
                )}
              </button>

              {!showFeedback ? (
                <button
                  className="btn btn-danger"
                  onClick={() => setShowFeedback(true)}
                  disabled={isSubmitting}
                  id="reject-trip-btn"
                >
                  <XCircle size={16} />
                  Request Changes
                </button>
              ) : (
                <button
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={isSubmitting || !feedback.trim()}
                  id="submit-feedback-btn"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
                  ) : (
                    <XCircle size={16} />
                  )}
                  Regenerate with Feedback
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
