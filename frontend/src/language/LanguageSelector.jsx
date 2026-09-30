import React, { useState, useRef, useEffect } from "react";
import { Languages, Check, Loader2 } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export default function LanguageSelector({ className = "" }) {
  const { language, setLanguage, languages, isTranslating, currentLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`language-selector-wrapper ${className}`} ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="language-selector-btn"
        aria-label="Select Language"
        title="Select Platform Language"
        aria-expanded={isOpen}
      >
        {isTranslating ? (
          <Loader2 size={13} className="spin-icon" style={{ color: "#0284c7" }} />
        ) : (
          <Languages size={13} style={{ color: "#0284c7" }} />
        )}
        <span className="language-btn-label">
          {currentLanguage.nativeLabel}
        </span>
      </button>

      {isOpen && (
        <div
          className="language-dropdown-menu"
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: "175px",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            boxShadow: "0 10px 25px -5px rgba(11, 34, 63, 0.15), 0 8px 10px -6px rgba(11, 34, 63, 0.1)",
            zIndex: 9999,
            padding: "4px 0"
          }}
        >
          <div
            className="language-dropdown-header"
            style={{
              padding: "6px 12px 4px 12px",
              fontSize: "10px",
              fontFamily: "var(--font-mono, monospace)",
              fontWeight: 700,
              letterSpacing: "0.8px",
              color: "#94a3b8",
              borderBottom: "1px solid #f1f5f9",
              marginBottom: "2px"
            }}
          >
            EMERGENCY LANGUAGE
          </div>
          <div className="language-dropdown-list" style={{ display: "flex", flexDirection: "column" }}>
            {languages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`language-dropdown-item ${isSelected ? "selected" : ""}`}
                  role="menuitem"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 12px",
                    border: "none",
                    background: isSelected ? "#f0f7ff" : "transparent",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <div className="language-item-labels" style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    <span className="lang-native" style={{ fontSize: "12.5px", fontWeight: isSelected ? 700 : 500, color: isSelected ? "#0284c7" : "#0f172a" }}>
                      {lang.nativeLabel}
                    </span>
                    <span className="lang-en" style={{ fontSize: "10px", color: "#64748b", fontFamily: "var(--font-mono, monospace)" }}>
                      {lang.label}
                    </span>
                  </div>
                  {isSelected && <Check size={14} style={{ color: "#0284c7" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
