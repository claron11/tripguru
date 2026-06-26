"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  DollarSign,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import ThinkingAgentUI from "@/components/ThinkingAgentUI";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { IDay } from "@/lib/agent/types";

// ─── Step 1: Location ─────────────────────────────────────────────────────────
interface Step1Data { origin: string; destination: string; }
function Step1({ data, onChange }: { data: Step1Data; onChange: (d: Step1Data) => void }) {
  const popular = ["Paris, France", "Tokyo, Japan", "New York, USA", "Bali, Indonesia", "Rome, Italy", "Barcelona, Spain"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="form-group">
        <label className="form-label" htmlFor="origin-input">
          <MapPin size={14} style={{ display: "inline", marginRight: "5px" }} />
          Where are you starting from? (Optional)
        </label>
        <LocationAutocomplete
          id="origin-input"
          placeholder="e.g. London, UK"
          value={data.origin}
          onChange={(val) => onChange({ ...data, origin: val })}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="destination-input">
          <MapPin size={14} style={{ display: "inline", marginRight: "5px" }} />
          Where do you want to go?
        </label>
        <LocationAutocomplete
          id="destination-input"
          placeholder="e.g. Paris, France"
          value={data.destination}
          onChange={(val) => onChange({ ...data, destination: val })}
          required
        />
      </div>

      <div>
        <p className="text-muted" style={{ fontSize: "0.875rem", marginBottom: "12px", fontWeight: 500 }}>
          Popular destinations
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {popular.map((dest) => (
            <button
              key={dest}
              onClick={() => onChange({ ...data, destination: dest })}
              className={`chip ${data.destination === dest ? "selected" : ""}`}
            >
              {dest}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Budget & Dates ───────────────────────────────────────────────────
interface Step2Data { budget: string; currency: string; startDate: string; endDate: string }
function Step2({ data, onChange }: { data: Step2Data; onChange: (d: Step2Data) => void }) {
  const currencies = ["USD", "EUR", "GBP", "JPY", "INR", "AUD", "CAD"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="currency-select">Currency</label>
          <select
            id="currency-select"
            className="form-select"
            value={data.currency}
            onChange={(e) => onChange({ ...data, currency: e.target.value })}
          >
            {currencies.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="budget-input">
            <DollarSign size={13} style={{ display: "inline", marginRight: "4px" }} />
            Total Budget
          </label>
          <input
            id="budget-input"
            className="form-input"
            type="number"
            min="100"
            placeholder="e.g. 3000"
            value={data.budget}
            onChange={(e) => onChange({ ...data, budget: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="start-date">
            <Calendar size={13} style={{ display: "inline", marginRight: "4px" }} />
            Start Date
          </label>
          <input
            id="start-date"
            className="form-input"
            type="date"
            value={data.startDate}
            onChange={(e) => onChange({ ...data, startDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="end-date">
            <Calendar size={13} style={{ display: "inline", marginRight: "4px" }} />
            End Date
          </label>
          <input
            id="end-date"
            className="form-input"
            type="date"
            value={data.endDate}
            min={data.startDate}
            onChange={(e) => onChange({ ...data, endDate: e.target.value })}
          />
        </div>
      </div>

      {data.startDate && data.endDate && (
        <div className="alert alert-info">
          <Calendar size={16} />
          <span>
            {Math.max(
              1,
              Math.round(
                (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
                  86400000
              )
            )}{" "}
            days planned
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Preferences ─────────────────────────────────────────────────────
const ALL_PREFS = [
  "🏖️ Beach", "🏔️ Mountains", "🏛️ History & Culture", "🎨 Art & Museums",
  "🍜 Local Food", "🍷 Fine Dining", "🎭 Nightlife", "🛍️ Shopping",
  "🌿 Nature & Hiking", "🚴 Adventure Sports", "💆 Wellness & Spa",
  "👨‍👩‍👧 Family-Friendly", "💑 Romantic", "💰 Budget Travel",
  "🌟 Luxury", "📸 Photography", "🎵 Music & Festivals",
];

interface Step3Data { preferences: string[]; additionalNotes: string }
function Step3({ data, onChange }: { data: Step3Data; onChange: (d: Step3Data) => void }) {
  const toggle = (pref: string) => {
    const exists = data.preferences.includes(pref);
    onChange({
      ...data,
      preferences: exists
        ? data.preferences.filter((p) => p !== pref)
        : [...data.preferences, pref],
    });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <p className="text-muted" style={{ fontSize: "0.9rem" }}>
        Select your travel style and interests. Our AI will tailor the itinerary to match.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {ALL_PREFS.map((pref) => (
          <button
            key={pref}
            onClick={() => toggle(pref)}
            className={`chip ${data.preferences.includes(pref) ? "selected" : ""}`}
          >
            {data.preferences.includes(pref) && <Check size={11} />}
            {pref}
          </button>
        ))}
      </div>
      {data.preferences.length > 0 && (
        <p style={{ fontSize: "0.8125rem", color: "var(--color-primary)", fontWeight: 500 }}>
          ✓ {data.preferences.length} preference{data.preferences.length > 1 ? "s" : ""} selected
        </p>
      )}

      <div className="form-group" style={{ marginTop: "12px" }}>
        <label className="form-label" htmlFor="additional-notes">
          Any specific activities or places you want to visit? (Optional)
        </label>
        <textarea
          id="additional-notes"
          className="form-textarea"
          placeholder="e.g. I want to visit the Eiffel Tower, try local street food, and avoid crowded places."
          value={data.additionalNotes}
          onChange={(e) => onChange({ ...data, additionalNotes: e.target.value })}
        />
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const STEP_LABELS = ["Destination", "Budget & Dates", "Preferences"];

interface LogEntry {
  type: "log" | "node" | "start" | "complete" | "error";
  message: string;
  node?: string;
  timestamp: Date;
}

export default function PlanTripPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [loc, setLoc] = useState<{ origin: string; destination: string }>({ origin: "", destination: "" });
  const [budget, setBudget] = useState({ budget: "", currency: "USD", startDate: "", endDate: "" });
  const [prefs, setPrefs] = useState<{ preferences: string[]; additionalNotes: string }>({ preferences: [], additionalNotes: "" });

  const [isPlanning, setIsPlanning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [draft, setDraft] = useState<IDay[] | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const canNext = () => {
    if (step === 1) return loc.destination.trim().length > 0;
    if (step === 2) return budget.budget && budget.startDate && budget.endDate;
    return true;
  };

  const addLog = (entry: Omit<LogEntry, "timestamp">) => {
    setLogs((prev) => [...prev, { ...entry, timestamp: new Date() }]);
  };

  const startPlanning = async () => {
    setIsPlanning(true);
    setIsStreaming(true);
    setLogs([]);
    setDraft(null);
    setError("");

    try {
      const response = await fetch("/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: loc.origin,
          destination: loc.destination,
          budget: budget.budget,
          currency: budget.currency,
          startDate: budget.startDate,
          endDate: budget.endDate,
          preferences: prefs.additionalNotes.trim() ? [...prefs.preferences, `Additional Notes: ${prefs.additionalNotes.trim()}`] : prefs.preferences,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to start planning");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));

            if (data.type === "start") {
              addLog({ type: "start", message: data.message });
              if (data.threadId) setThreadId(data.threadId);
            } else if (data.type === "log") {
              addLog({ type: "log", message: data.message });
            } else if (data.type === "node") {
              addLog({ type: "node", message: data.message, node: data.node });
            } else if (data.type === "complete") {
              setThreadId(data.threadId);
              setDraft(data.draft);
              setTotalCost(data.totalEstimatedCost || 0);
              addLog({ type: "complete", message: data.message });
            } else if (data.type === "error") {
              setError(data.message);
              addLog({ type: "error", message: data.message });
            }
          } catch {}
        }
      }
    } catch (err) {
      setError((err as Error).message);
      addLog({ type: "error", message: `Error: ${(err as Error).message}` });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleApprove = async () => {
    if (!draft || !threadId) return;
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/plan-trip/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          action: "approve",
          draft,
          totalEstimatedCost: totalCost,
          origin: loc.origin,
          destination: loc.destination,
          budget: budget.budget,
          currency: budget.currency,
          startDate: budget.startDate,
          endDate: budget.endDate,
          preferences: prefs.additionalNotes.trim() ? [...prefs.preferences, `Additional Notes: ${prefs.additionalNotes.trim()}`] : prefs.preferences,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save trip");
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1800);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (feedback: string) => {
    if (!threadId) return;
    setIsStreaming(true);
    setDraft(null);
    setError("");

    try {
      const response = await fetch("/api/plan-trip/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, action: "reject", feedback }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to send feedback");
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace("data: ", ""));
            if (data.type === "log" || data.type === "node") {
              addLog({ type: data.type, message: data.message, node: data.node });
            } else if (data.type === "complete") {
              setDraft(data.draft);
              setTotalCost(data.totalEstimatedCost || 0);
              addLog({ type: "complete", message: data.message });
            } else if (data.type === "error") {
              setError(data.message);
              addLog({ type: "error", message: data.message });
            }
          } catch {}
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsStreaming(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? -40 : 40,
      opacity: 0,
    }),
  };

  return (
    <main>
      <div 
        className="hero-banner" 
        style={{ 
          backgroundImage: "url('/hero-bg.png')", 
          backgroundSize: "cover", 
          backgroundPosition: "center", 
          padding: "80px 24px", 
          textAlign: "center",
          position: "relative",
          marginBottom: "40px"
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}></div>
        <div style={{ position: "relative", zIndex: 1, color: "white" }}>
          <div className="hero-eyebrow" style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
            <Sparkles size={14} />
            AI-Powered Trip Planning
          </div>
          <h1 style={{ color: "white", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>Plan Your Perfect Trip</h1>
          <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.1rem" }}>Tell us where you want to go and our AI agents will craft a personalized itinerary</p>
        </div>
      </div>

      <div className="page-container" style={{ paddingBottom: "80px" }}>

        {/* Success banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="alert alert-success"
              style={{ marginBottom: "24px", justifyContent: "center", fontSize: "1rem" }}
            >
              <Check size={18} />
              🎉 Trip saved! Redirecting to your dashboard...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="alert alert-error"
              style={{ marginBottom: "24px" }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard — only show before planning starts */}
        {!isPlanning && (
          <div className="wizard-container">
            {/* Step indicators */}
            <div className="wizard-steps" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              {STEP_LABELS.map((label, i) => {
                const num = i + 1;
                const isActive = step === num;
                const isCompleted = step > num;
                return (
                  <div key={label} style={{ display: "contents" }}>
                    <div className={`wizard-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`} style={{ flex: "0 0 auto", position: "relative", zIndex: 2 }}>
                      <div className="wizard-step-circle">
                        {isCompleted ? <Check size={14} /> : num}
                      </div>
                      <div className="wizard-step-label">{label}</div>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`wizard-connector ${isCompleted ? "completed" : ""}`}
                        style={{ flex: 1, height: "2px", background: isCompleted ? "var(--color-primary)" : "var(--color-border)", margin: "17px 12px 0 12px", zIndex: 1 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step card */}
            <div className="card card-elevated" style={{ overflow: "visible" }}>
              <div className="card-header">
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                  Step {step}: {STEP_LABELS[step - 1]}
                </h3>
              </div>
              <div className="card-body">
                <AnimatePresence mode="wait" custom={1}>
                  <motion.div
                    key={step}
                    custom={1}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    {step === 1 && <Step1 data={loc} onChange={setLoc} />}
                    {step === 2 && <Step2 data={budget} onChange={setBudget} />}
                    {step === 3 && <Step3 data={prefs} onChange={setPrefs} />}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={step === 1}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>

                {step < 3 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canNext()}
                    id={`wizard-next-step-${step}`}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={startPlanning}
                    disabled={!canNext()}
                    id="start-planning-btn"
                  >
                    <Sparkles size={16} />
                    Generate Itinerary
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Agent UI */}
        {isPlanning && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ maxWidth: "860px", margin: "0 auto" }}
          >
            <ThinkingAgentUI
              logs={logs}
              isStreaming={isStreaming}
              draft={draft}
              totalEstimatedCost={totalCost}
              currency={budget.currency}
              threadId={threadId}
              tripData={{
                destination: loc.destination,
                budget: parseFloat(budget.budget),
                currency: budget.currency,
                startDate: budget.startDate,
                endDate: budget.endDate,
                preferences: prefs.additionalNotes.trim() ? [...prefs.preferences, `Additional Notes: ${prefs.additionalNotes.trim()}`] : prefs.preferences,
              }}
              onApprove={handleApprove}
              onReject={handleReject}
              isSubmitting={isSubmitting}
            />
          </motion.div>
        )}
      </div>
    </main>
  );
}
