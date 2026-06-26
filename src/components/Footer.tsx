import Link from "next/link";
import { Mail, Phone, Heart, Camera } from "lucide-react";
import packageJson from "../../package.json";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: "var(--color-surface)",
      borderTop: "1px solid var(--color-border)",
      padding: "48px 24px",
      marginTop: "auto"
    }}>
      <div className="page-container" style={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "32px"
        }}>
          {/* Brand & Made By */}
          <div style={{ maxWidth: "300px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 16px 0", color: "var(--color-primary)" }}>
              <span style={{ fontSize: "1.5rem" }}>✈️</span> TripGuru
            </h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "16px" }}>
              Your ultimate AI-powered travel companion. We plan, you travel!
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
              Made with <Heart size={14} color="#ef4444" fill="#ef4444" /> by <strong>Apoorv Jain</strong>
            </p>
          </div>

          {/* Links / Contact */}
          <div>
            <h4 style={{ margin: "0 0 16px 0", color: "var(--color-text-primary)" }}>Need Help?</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              <li>
                <a href="mailto:query@tripguru.com" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-text-muted)", textDecoration: "none", fontSize: "0.9rem", transition: "color 0.2s" }} className="footer-link">
                  <Mail size={16} /> Query: query@tripguru.com
                </a>
              </li>
              <li>
                <a href="tel:+919876543210" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-text-muted)", textDecoration: "none", fontSize: "0.9rem", transition: "color 0.2s" }} className="footer-link">
                  <Phone size={16} /> Helpline: +91 98765 43210
                </a>
              </li>
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h4 style={{ margin: "0 0 16px 0", color: "var(--color-text-primary)" }}>Connect With Us</h4>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" 
               style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--color-text-muted)", textDecoration: "none", fontSize: "0.9rem", transition: "color 0.2s" }} className="footer-link">
              <Camera size={18} /> Follow on Instagram
            </a>
          </div>
        </div>

        {/* Copyright & Version */}
        <div style={{
          borderTop: "1px solid var(--color-border)",
          paddingTop: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          color: "var(--color-text-muted)",
          fontSize: "0.85rem"
        }}>
          <div>&copy; {currentYear} TripGuru. All rights reserved.</div>
          <div style={{ display: "flex", gap: "16px" }}>
            <span>Version {packageJson.version}</span>
            <span>Last Updated: June 27, 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
