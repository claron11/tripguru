"use client";

import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { IDay, IActivity } from "@/lib/agent/types";

const RouteMap = dynamic(() => import("./RouteMap"), { 
  ssr: false, 
  loading: () => <div style={{ height: "300px", width: "100%", background: "var(--bg-secondary)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}><span className="spinner"></span></div> 
});
import {
  Hotel,
  Plane,
  UtensilsCrossed,
  MapPin,
  Clock,
  DollarSign,
  ExternalLink,
  Car,
  Star,
} from "lucide-react";

interface TimelineProps {
  days: IDay[];
  currency?: string;
}

const categoryIcon = (category: IActivity["category"]) => {
  switch (category) {
    case "hotel": return <Hotel size={15} />;
    case "flight": return <Plane size={15} />;
    case "restaurant": return <UtensilsCrossed size={15} />;
    case "attraction": return <Star size={15} />;
    case "transport": return <Car size={15} />;
    default: return <MapPin size={15} />;
  }
};

const categoryColor = (category: IActivity["category"]) => {
  switch (category) {
    case "hotel": return "#8B5CF6";
    case "flight": return "#06B6D4";
    case "restaurant": return "#F59E0B";
    case "attraction": return "#10B981";
    case "transport": return "#6366F1";
    default: return "#64748B";
  }
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -24, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 180, damping: 22 },
  },
};

const activityVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Timeline({ days, currency = "INR" }: TimelineProps) {
  if (!days || days.length === 0) {
    return (
      <div className="loading-overlay">
        <p className="text-muted">No itinerary data available.</p>
      </div>
    );
  }

  const totalCost = days.reduce((sum, d) => sum + (d.dailyCost || 0), 0);

  return (
    <div>
      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: "flex",
          gap: "24px",
          marginBottom: "32px",
          padding: "16px 20px",
          background: "var(--color-primary-light)",
          border: "1px solid var(--color-primary-mid)",
          borderRadius: "var(--radius-md)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={16} color="var(--color-primary)" />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-primary)" }}>
            {days.length} {days.length === 1 ? "Day" : "Days"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <DollarSign size={16} color="var(--color-primary)" />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-primary)" }}>
            {currency} {totalCost.toLocaleString()} estimated
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MapPin size={16} color="var(--color-primary)" />
          <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            {days.reduce((sum, d) => sum + d.activities.length, 0)} activities planned
          </span>
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div
        className="timeline"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {days.map((day) => (
            <motion.div
              key={day.day}
              className="timeline-item"
              variants={itemVariants}
              layout
            >
              {/* Timeline dot */}
              <div
                className="timeline-dot"
                style={{ background: "var(--color-primary)" }}
              />

              <div className="timeline-card">
                {/* Day header */}
                <div style={{ marginBottom: "16px" }}>
                  <div className="timeline-day-label">Day {day.day}</div>
                  <div className="timeline-day-title">{day.title}</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--color-text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Clock size={12} />
                      {day.date}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: "#059669",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <DollarSign size={12} />
                      {currency} {(day.dailyCost || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Day Route Map */}
                <RouteMap activities={day.activities} />

                {/* Activities */}
                <div className="activity-list">
                  {day.activities.map((activity, idx) => (
                    <motion.div
                      key={idx}
                      className="activity-item"
                      variants={activityVariants}
                    >
                      {/* Category icon */}
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          background: `${categoryColor(activity.category)}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: categoryColor(activity.category),
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {categoryIcon(activity.category)}
                      </div>

                      {/* Time */}
                      <div className="activity-time">{activity.time}</div>

                      {/* Content */}
                      <div className="activity-content" style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "2px" }}>
                          {activity.name}
                        </h4>
                        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0 }}>
                          {activity.description}
                        </p>
                        {activity.location && (
                          <a
                            href={activity.locationLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--color-primary)",
                              marginTop: "3px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              textDecoration: "none",
                            }}
                          >
                            <MapPin size={11} />
                            {activity.location}
                          </a>
                        )}
                      </div>

                      {/* Cost + link */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        <span className="activity-cost">
                          {currency} {(activity.estimatedCost || 0).toLocaleString()}
                        </span>
                        {activity.bookingUrl && (
                          <a
                            href={activity.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--color-primary)",
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                              fontSize: "0.72rem",
                            }}
                          >
                            Book <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
