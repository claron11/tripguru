"use client";
import React, { useEffect, useState } from "react";
import { CloudRain, Sun, Loader2, Info } from "lucide-react";
import { motion } from "framer-motion";

interface WeatherWidgetProps {
  destination: string;
  startDate: string;
  endDate: string;
}

export default function WeatherWidget({ destination, startDate, endDate }: WeatherWidgetProps) {
  const [data, setData] = useState<{ weatherSummary: string; packingTips: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true);
        const res = await fetch(`/api/weather?destination=${encodeURIComponent(destination)}&startDate=${startDate}&endDate=${endDate}`);
        const result = await res.json();
        
        if (res.ok) {
          setData(result);
        } else {
          setError(result.error || "Failed to fetch weather data.");
        }
      } catch (err) {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchWeather();
  }, [destination, startDate, endDate]);

  if (error) {
    return (
      <div className="card" style={{ padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", color: "var(--color-terminal-error)", background: "rgba(248, 113, 113, 0.1)" }}>
        <Info size={20} />
        <p style={{ margin: 0, fontSize: "0.9rem" }}>{error}</p>
      </div>
    );
  }

  return (
    <div 
      className="card" 
      style={{ 
        marginBottom: "24px", 
        background: "linear-gradient(135deg, rgba(26, 86, 219, 0.05) 0%, rgba(56, 189, 248, 0.05) 100%)",
        border: "1px solid rgba(26, 86, 219, 0.15)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{ background: "var(--color-primary)", padding: "10px", borderRadius: "12px", color: "white" }}>
            <Sun size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--color-primary-dark)" }}>AI Weather & Packing Guide</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-muted)" }}>For {destination}</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-text-muted)", padding: "10px 0" }}>
            <Loader2 size={16} className="spin" />
            <span style={{ fontSize: "0.9rem" }}>Analyzing local weather and packing essentials...</span>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ 
              background: "var(--color-surface-alt)", 
              padding: "16px", 
              borderRadius: "12px", 
              boxShadow: "var(--shadow-sm)",
              marginBottom: "16px",
              border: "1px solid var(--color-border)"
            }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--color-text-secondary)", lineHeight: "1.5" }}>
                <strong>Forecast:</strong> {data?.weatherSummary}
              </p>
            </div>
            
            <div>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <CloudRain size={18} style={{ color: "var(--color-terminal-accent)" }} />
                Smart Packing Tips
              </h4>
              <div style={{ 
                fontSize: "0.95rem", 
                color: "var(--color-text-secondary)",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap"
              }}>
                {data?.packingTips}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
