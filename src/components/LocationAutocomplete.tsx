"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface LocationAutocompleteProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function LocationAutocomplete({
  id,
  placeholder,
  value,
  onChange,
  required,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
      setSelected(true);
    }
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Debounced search
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length > 2 && !selected) {
        setLoading(true);
        try {
          // Use Open-Meteo Geocoding API (Free, no CORS issues, no User-Agent limits)
          const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
              query
            )}&count=5&language=en&format=json`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.results) {
              const formatted = data.results.map((item: any) => {
                const parts = [item.name];
                if (item.admin1 && item.admin1 !== item.name) parts.push(item.admin1);
                if (item.country) parts.push(item.country);
                return parts.join(", ");
              });
              setSuggestions(Array.from(new Set(formatted)) as string[]);
              setIsOpen(true);
            } else {
              setSuggestions([]);
              setIsOpen(false);
            }
          }
        } catch (error) {
          console.error("Error fetching locations:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(searchTimeout);
  }, [query, selected]);

  const handleSelect = (suggestion: string) => {
    setQuery(suggestion);
    onChange(suggestion);
    setSelected(true);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value); // keep parent state in sync
    setSelected(false);
    if (e.target.value.length === 0) setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          className="form-input"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          required={required}
          style={{ paddingRight: "36px" }}
          autoComplete="off"
        />
        {loading && (
          <div
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-muted)",
              pointerEvents: "none",
            }}
          >
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          className="autocomplete-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "var(--glass-bg)",
            backdropFilter: "var(--glass-blur)",
            WebkitBackdropFilter: "var(--glass-blur)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--glass-shadow)",
            zIndex: 50,
            listStyle: "none",
            padding: "8px 0",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              style={{
                padding: "10px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "var(--color-text-primary)",
                fontSize: "0.9rem",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(147, 197, 253, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <MapPin size={16} color="var(--color-primary)" />
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
