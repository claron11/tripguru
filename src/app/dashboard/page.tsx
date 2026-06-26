"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  DollarSign,
  PlusCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Compass,
  Download,
  Trash2,
} from "lucide-react";
import Timeline from "@/components/Timeline";
import WeatherWidget from "@/components/WeatherWidget";
import { IDay } from "@/lib/agent/types";
import Link from "next/link";

interface Trip {
  id: string;
  destination: string;
  budget: number;
  currency: string;
  startDate: string;
  endDate: string;
  preferences: string;
  itinerary: string;
  status: string;
  totalEstimatedCost: number | null;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/trips")
        .then((r) => r.json())
        .then((data) => {
          if (data.error) setError(data.error);
          else setTrips(data.trips || []);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: "60vh" }}>
        <div className="spinner" style={{ width: "36px", height: "36px" }} />
        <p className="text-muted">Loading your trips...</p>
      </div>
    );
  }

  const userName = session?.user?.name?.split(" ")[0] || "Traveler";

  const exportToPDF = async (trip: Trip, days: IDay[]) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    
    const primaryColor = [26, 86, 219]; // #1A56DB
    const surfaceAlt = [240, 247, 255]; // #F0F7FF
    const textColor = [30, 41, 59]; // #1E293B
    
    const drawPageDesign = (pageNum: number) => {
      // Full page soft background
      doc.setFillColor(surfaceAlt[0], surfaceAlt[1], surfaceAlt[2]);
      doc.rect(0, 0, 210, 297, 'F');
      
      // Top Brand Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 24, 'F');
      
      // Branding text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("TripGuru", 20, 15);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Your Ultimate AI Travel Companion", 20, 21);
      
      // Footer
      doc.setTextColor(150, 160, 180);
      doc.setFontSize(10);
      doc.text(`Page ${pageNum} • Made by Apoorv`, 105, 290, { align: "center" });
    };

    let pageNum = 1;
    drawPageDesign(pageNum);
    
    let y = 48;
    
    // Trip Title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Trip to ${trip.destination}`, 20, y);
    y += 10;
    
    // Trip Metadata
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 110, 130);
    doc.text(`${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`, 20, y);
    y += 7;
    doc.text(`Estimated Cost: ${trip.currency} ${trip.totalEstimatedCost ?? trip.budget}`, 20, y);
    y += 16;
    
    days.forEach((day) => {
      if (y > 260) {
        doc.addPage();
        pageNum++;
        drawPageDesign(pageNum);
        y = 48;
      }
      
      // Day Header (pill shape)
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.roundedRect(20, y - 7, 170, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Day ${day.day} - ${day.title} (${day.date})`, 25, y + 1);
      y += 12;
      
      day.activities.forEach((act) => {
        if (y > 275) {
          doc.addPage();
          pageNum++;
          drawPageDesign(pageNum);
          y = 48;
        }
        
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${act.time} - ${act.name}`, 25, y);
        
        // Cost
        if (act.estimatedCost) {
          doc.setTextColor(5, 150, 105);
          doc.text(`${trip.currency} ${act.estimatedCost.toLocaleString()}`, 185, y, { align: "right" });
        }
        
        y += 6;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 90, 110);
        const splitDesc = doc.splitTextToSize(act.description || "", 160);
        doc.text(splitDesc, 25, y);
        y += (splitDesc.length * 5) + 3;

        // Map location
        if (act.location) {
           doc.setTextColor(26, 86, 219);
           doc.setFont("helvetica", "bold");
           doc.text(`[View on Map]`, 25, y);
           doc.setFont("helvetica", "normal");
           doc.setTextColor(100, 110, 130);
           doc.text(` - ${act.location}`, 25 + doc.getTextWidth(`[View on Map]`), y);
           
           const linkUrl = act.locationLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location)}`;
           doc.link(25, y - 4, doc.getTextWidth(`[View on Map]`), 5, { url: linkUrl });
           y += 6;
        }

        y += 4;
      });
      y += 6;
    });

    doc.save(`TripGuru_${trip.destination.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const deleteTrip = async (tripId: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete trip");
      }
    } catch (err: any) {
      alert("Error deleting trip");
    }
  };

  return (
    <main>
      <div 
        className="hero-banner" 
        style={{ 
          backgroundImage: "url('/dashboard-bg.png')", 
          backgroundSize: "cover", 
          backgroundPosition: "center", 
          padding: "60px 24px", 
          position: "relative",
          marginBottom: "40px"
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}></div>
        <div className="page-container" style={{ position: "relative", zIndex: 1, padding: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <p style={{ color: "rgba(255,255,255,0.9)", marginBottom: "4px", fontSize: "1rem" }}>
                Welcome back,
              </p>
              <h1 style={{ color: "white", marginBottom: "8px", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
                Saved Trips
              </h1>
              <p style={{ color: "rgba(255,255,255,0.9)" }}>
                {trips.length === 0
                  ? "No trips planned yet. Let's fix that!"
                  : `${trips.length} trip${trips.length > 1 ? "s" : ""} saved`}
              </p>
            </div>

            <Link href="/plan-trip" className="btn btn-primary btn-lg" id="new-trip-btn" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <PlusCircle size={18} />
              Plan New Trip
            </Link>
          </div>
        </div>
      </div>

      <div className="page-container" style={{ paddingBottom: "80px" }}>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: "24px" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Empty state */}
        {trips.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: "center",
              padding: "80px 24px",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed var(--color-border-primary)",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                background: "var(--color-primary-light)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <Compass size={32} color="var(--color-primary)" />
            </div>
            <h2 style={{ marginBottom: "12px" }}>No trips yet</h2>
            <p className="text-muted" style={{ marginBottom: "28px", maxWidth: "360px", margin: "0 auto 28px" }}>
              Use our AI travel planner to generate a personalized multi-day itinerary in minutes.
            </p>
            <Link href="/plan-trip" className="btn btn-primary btn-lg" id="empty-plan-btn">
              <PlusCircle size={18} />
              Plan Your First Trip
            </Link>
          </motion.div>
        )}

        {/* Trip grid */}
        <div className="trip-grid">
          {trips.map((trip, idx) => {
            const days: IDay[] = (() => {
              try {
                return JSON.parse(trip.itinerary) || [];
              } catch {
                return [];
              }
            })();

            const prefs: string[] = (() => {
              try {
                return JSON.parse(trip.preferences) || [];
              } catch {
                return [];
              }
            })();

            const isExpanded = expandedId === trip.id;

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="trip-card"
                style={{ gridColumn: isExpanded ? "1 / -1" : undefined }}
              >
                {/* Card header */}
                <div className="trip-card-header">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ wordBreak: "break-word", margin: "0 0 4px 0" }}>{trip.destination}</h3>
                      <p className="trip-card-meta">
                        {new Date(trip.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" → "}
                        {new Date(trip.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                      <span className="status-badge finalized" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>✓ Saved</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          className="btn btn-sm btn-ghost" 
                          onClick={(e) => { e.stopPropagation(); exportToPDF(trip, days); }}
                          style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                        >
                          <Download size={12} style={{ marginRight: "4px" }} />
                          PDF
                        </button>
                        <button 
                          className="btn btn-sm btn-danger" 
                          onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }}
                          style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(220, 38, 38, 0.15)", border: "1px solid rgba(220, 38, 38, 0.3)", color: "#ef4444", boxShadow: "none" }}
                        >
                          <Trash2 size={12} style={{ marginRight: "4px" }} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card body */}
                <div className="trip-card-body">
                  <div className="trip-card-stat">
                    💵
                    <span>
                      <strong>{trip.currency} {(trip.totalEstimatedCost ?? trip.budget).toLocaleString()}</strong>
                      <span style={{ color: "var(--color-text-faint)" }}> estimated</span>
                    </span>
                  </div>
                  <div className="trip-card-stat">
                    <Calendar size={15} color="var(--color-primary)" />
                    <span>{days.length} days · {days.reduce((s, d) => s + d.activities.length, 0)} activities</span>
                  </div>
                  <div className="trip-card-stat">
                    <MapPin size={15} color="var(--color-primary)" />
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {prefs.slice(0, 3).join(", ")}
                      {prefs.length > 3 ? ` +${prefs.length - 3}` : ""}
                    </span>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{ width: "100%", marginTop: "16px" }}
                    onClick={() => setExpandedId(isExpanded ? null : trip.id)}
                    id={`expand-trip-${trip.id}`}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={15} /> Hide Itinerary
                      </>
                    ) : (
                      <>
                        <ChevronDown size={15} /> View Full Itinerary
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded timeline */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        style={{
                          padding: "28px 24px",
                          borderTop: "1px solid var(--color-border-primary)",
                          background: "var(--color-surface-alt)",
                        }}
                      >
                        <WeatherWidget destination={trip.destination} startDate={trip.startDate} endDate={trip.endDate} />
                        <Timeline days={days} currency={trip.currency} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
