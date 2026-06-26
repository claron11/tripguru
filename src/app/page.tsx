import Link from "next/link";
import { Sparkles, Map, Zap, Shield, Globe, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TripGuru — AI-Powered Travel Planner",
  description:
    "TripGuru uses multi-agent AI to craft personalized multi-day travel itineraries in minutes. Hotels, flights, restaurants, and attractions — all planned for you.",
};

const features = [
  {
    icon: <Zap size={24} />,
    title: "4 Parallel AI Agents",
    desc: "Hotel, flight, restaurant, and attraction agents work simultaneously to gather the best options.",
  },
  {
    icon: <Map size={24} />,
    title: "Smart Itinerary Synthesis",
    desc: "Gemini 1.5 Flash weaves all research into a coherent, budget-aware day-by-day plan.",
  },
  {
    icon: <Shield size={24} />,
    title: "Human-in-the-Loop Review",
    desc: "Review the draft before saving. Request changes and regenerate — you're always in control.",
  },
  {
    icon: <Globe size={24} />,
    title: "Real-Time Web Search",
    desc: "Tavily Search API pulls current prices, reviews, and availability — not stale training data.",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <Sparkles size={14} />
            Powered by Gemini 1.5 Flash & LangGraph
          </div>

          <h1>
            Your AI Travel{" "}
            <span className="text-gradient">Co-Pilot</span>
          </h1>

          <p>
            TripGuru&apos;s multi-agent AI researches hotels, flights, restaurants, and
            attractions in parallel — then synthesizes a perfect itinerary tailored to
            your budget and style.
          </p>

          <div className="hero-actions">
            <Link href="/plan-trip" className="btn btn-primary btn-lg" id="hero-plan-btn">
              <Sparkles size={18} />
              Start Planning Free
              <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg" id="hero-login-btn">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ background: "var(--color-surface)", padding: "80px 0" }}>
        <div className="page-container">
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2>Everything planned, nothing left to chance</h2>
            <p style={{ fontSize: "1.125rem", marginTop: "12px", maxWidth: "520px", margin: "12px auto 0" }}>
              From research to a printable itinerary in under 60 seconds.
            </p>
          </div>

          <div className="features-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h4 style={{ marginBottom: "8px" }}>{f.title}</h4>
                <p style={{ fontSize: "0.9rem", margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: "linear-gradient(135deg, var(--color-primary) 0%, #1E40AF 100%)",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div className="page-container">
          <h2 style={{ color: "#fff", marginBottom: "16px" }}>
            Ready to plan your next adventure?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "32px", fontSize: "1.125rem" }}>
            Create a free account and generate your first AI itinerary in minutes.
          </p>
          <Link href="/register" className="btn" id="cta-register-btn"
            style={{
              background: "#fff",
              color: "var(--color-primary)",
              padding: "14px 36px",
              fontSize: "1rem",
              fontWeight: 700,
              borderRadius: "var(--radius-full)",
            }}
          >
            Get Started — It&apos;s Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
