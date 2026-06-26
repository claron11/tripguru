"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { IActivity } from "@/lib/agent/types";

interface RouteMapProps {
  activities: IActivity[];
}

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case "hotel": return "🏨";
    case "flight": return "✈️";
    case "restaurant": return "🍽️";
    case "attraction": return "📸";
    case "transport": return "🚗";
    default: return "📍";
  }
};

// Custom component to automatically fit bounds to all markers
function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  return null;
}

export default function RouteMap({ activities }: RouteMapProps) {
  // Filter activities that actually have coordinates
  const validActivities = activities.filter(
    (act) => act.coordinates && typeof act.coordinates.lat === "number" && typeof act.coordinates.lng === "number"
  );

  if (validActivities.length === 0) {
    return null; // No map to show if AI didn't return coordinates
  }

  const positions: [number, number][] = validActivities.map((act) => [
    act.coordinates!.lat,
    act.coordinates!.lng,
  ]);

  return (
    <div style={{ height: "300px", width: "100%", borderRadius: "12px", overflow: "hidden", marginBottom: "20px", border: "1px solid var(--border-color)", zIndex: 10 }}>
      <MapContainer
        center={positions[0]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validActivities.map((act, idx) => {
          const icon = L.divIcon({
            html: `<div style="font-size: 24px; text-shadow: 0 0 5px rgba(0,0,0,0.3); transform: translate(-50%, -50%);">${getCategoryEmoji(act.category)}</div>`,
            className: "custom-leaflet-icon",
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          return (
            <Marker
              key={idx}
              position={[act.coordinates!.lat, act.coordinates!.lng]}
              icon={icon}
            >
              <Popup>
                <div style={{ textAlign: "center", minWidth: "150px" }}>
                  <h4 style={{ margin: "0 0 5px 0", fontSize: "14px" }}>{act.name}</h4>
                  <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666" }}>{act.time}</p>
                  <p style={{ margin: 0, fontSize: "12px" }}>{act.location}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {positions.length > 1 && (
          <Polyline positions={positions} pathOptions={{ color: "#8B5CF6", weight: 3, dashArray: "5, 10" }} />
        )}

        <MapBounds positions={positions} />
      </MapContainer>
    </div>
  );
}
