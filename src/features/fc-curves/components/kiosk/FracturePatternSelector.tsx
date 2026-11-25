"use client";

import React from "react";
import { TipoFallaConcreto } from "../../types";
import { kioskAudio } from "./PressKioskAudio";
import { PressKioskHaptics } from "./PressKioskHaptics";

interface FracturePatternSelectorProps {
  value: TipoFallaConcreto;
  onChange: (val: TipoFallaConcreto) => void;
  disabled?: boolean;
  theme?: "dark" | "light";
}

interface PatternOption {
  type: TipoFallaConcreto;
  label: string;
  sub: string;
  astm: string;
  svgPath: (color: string) => React.ReactNode;
}

const PATTERNS: PatternOption[] = [
  {
    type: "CONO_TIPO_1",
    label: "Tipo 1",
    sub: "Cono",
    astm: "Fig. 2 (a)",
    svgPath: (c) => (
      <svg width="32" height="48" viewBox="0 0 40 60">
        <rect x="6" y="4" width="28" height="52" fill="none" stroke={c} strokeWidth="2" />
        <line x1="2" y1="4" x2="38" y2="4" stroke={c} strokeWidth="3" />
        <line x1="2" y1="56" x2="38" y2="56" stroke={c} strokeWidth="3" />
        {/* Conos */}
        <line x1="8" y1="4" x2="20" y2="28" stroke="#EF4444" strokeWidth="2" />
        <line x1="32" y1="4" x2="20" y2="28" stroke="#EF4444" strokeWidth="2" />
        <line x1="8" y1="56" x2="20" y2="32" stroke="#EF4444" strokeWidth="2" />
        <line x1="32" y1="56" x2="20" y2="32" stroke="#EF4444" strokeWidth="2" />
      </svg>
    ),
  },
  {
    type: "CONO_Y_DIVIDIDO_TIPO_2",
    label: "Tipo 2",
    sub: "Cono / Div.",
    astm: "Fig. 2 (b)",
    svgPath: (c) => (
      <svg width="32" height="48" viewBox="0 0 40 60">
        <rect x="6" y="4" width="28" height="52" fill="none" stroke={c} strokeWidth="2" />
        <line x1="2" y1="4" x2="38" y2="4" stroke={c} strokeWidth="3" />
        <line x1="2" y1="56" x2="38" y2="56" stroke={c} strokeWidth="3" />
        {/* Cono inferior y división vertical */}
        <line x1="8" y1="56" x2="20" y2="34" stroke="#EF4444" strokeWidth="2" />
        <line x1="32" y1="56" x2="20" y2="34" stroke="#EF4444" strokeWidth="2" />
        <line x1="20" y1="34" x2="20" y2="4" stroke="#EF4444" strokeWidth="2" />
      </svg>
    ),
  },
  {
    type: "COLUMNA_TIPO_3",
    label: "Tipo 3",
    sub: "Columnar",
    astm: "Fig. 2 (c)",
    svgPath: (c) => (
      <svg width="32" height="48" viewBox="0 0 40 60">
        <rect x="6" y="4" width="28" height="52" fill="none" stroke={c} strokeWidth="2" />
        <line x1="2" y1="4" x2="38" y2="4" stroke={c} strokeWidth="3" />
        <line x1="2" y1="56" x2="38" y2="56" stroke={c} strokeWidth="3" />
        {/* Fisuras verticales continuas */}
        <line x1="14" y1="4" x2="14" y2="56" stroke="#EF4444" strokeWidth="2" />
        <line x1="20" y1="4" x2="20" y2="56" stroke="#EF4444" strokeWidth="2" />
        <line x1="26" y1="4" x2="26" y2="56" stroke="#EF4444" strokeWidth="2" />
      </svg>
    ),
  },
  {
    type: "CIZALLA_TIPO_4",
    label: "Tipo 4",
    sub: "Cizalla",
    astm: "Fig. 2 (d)",
    svgPath: (c) => (
      <svg width="32" height="48" viewBox="0 0 40 60">
        <rect x="6" y="4" width="28" height="52" fill="none" stroke={c} strokeWidth="2" />
        <line x1="2" y1="4" x2="38" y2="4" stroke={c} strokeWidth="3" />
        <line x1="2" y1="56" x2="38" y2="56" stroke={c} strokeWidth="3" />
        {/* Plano diagonal completo */}
        <line x1="8" y1="8" x2="32" y2="52" stroke="#EF4444" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    type: "ESQUINA_TIPO_5",
    label: "Tipo 5",
    sub: "Lateral",
    astm: "Fig. 2 (e)",
    svgPath: (c) => (
      <svg width="32" height="48" viewBox="0 0 40 60">
        <rect x="6" y="4" width="28" height="52" fill="none" stroke={c} strokeWidth="2" />
        <line x1="2" y1="4" x2="38" y2="4" stroke={c} strokeWidth="3" />
        <line x1="2" y1="56" x2="38" y2="56" stroke={c} strokeWidth="3" />
        {/* Fractura en esquinas */}
        <line x1="18" y1="4" x2="34" y2="24" stroke="#EF4444" strokeWidth="2" />
        <line x1="6" y1="36" x2="22" y2="56" stroke="#EF4444" strokeWidth="2" />
      </svg>
    ),
  },
  {
    type: "PUNTUAL_TIPO_6",
    label: "Tipo 6",
    sub: "Cabeceo",
    astm: "Fig. 2 (f)",
    svgPath: (c) => (
      <svg width="32" height="48" viewBox="0 0 40 60">
        <rect x="6" y="4" width="28" height="52" fill="none" stroke={c} strokeWidth="2" />
        <line x1="2" y1="4" x2="38" y2="4" stroke={c} strokeWidth="3" />
        <line x1="2" y1="56" x2="38" y2="56" stroke={c} strokeWidth="3" />
        {/* Falla puntual superior */}
        <line x1="6" y1="12" x2="16" y2="8" stroke="#EF4444" strokeWidth="2" />
        <line x1="16" y1="8" x2="28" y2="14" stroke="#EF4444" strokeWidth="2" />
        <line x1="28" y1="14" x2="34" y2="9" stroke="#EF4444" strokeWidth="2" />
      </svg>
    ),
  },
];

export function FracturePatternSelector({
  value,
  onChange,
  disabled = false,
  theme = "dark",
}: FracturePatternSelectorProps) {
  const isDark = theme === "dark";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(78px, 1fr))",
        gap: "10px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {PATTERNS.map((p) => {
        const isSelected = value === p.type;
        return (
          <button
            key={p.type}
            type="button"
            disabled={disabled}
            onClick={() => {
              PressKioskHaptics.keyPress();
              kioskAudio.playKeyClick();
              onChange(p.type);
            }}
            style={{
              minHeight: "88px",
              padding: "6px 2px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: "10px",
              cursor: disabled ? "not-allowed" : "pointer",
              userSelect: "none",
              border: isSelected
                ? isDark
                  ? "3px solid #00E676"
                  : "3px solid #16734C"
                : isDark
                ? "2px solid #334155"
                : "2px solid #CBD5E1",
              backgroundColor: isSelected
                ? isDark
                  ? "#064E3B"
                  : "#DCFCE7"
                : isDark
                ? "#1E293B"
                : "#F8FAFC",
              boxShadow: isSelected
                ? isDark
                  ? "0 0 12px rgba(0, 230, 118, 0.4)"
                  : "0 0 10px rgba(22, 115, 76, 0.25)"
                : "none",
              transform: isSelected ? "scale(1.02)" : "scale(1)",
              transition: "all 0.1s ease-in-out",
              touchAction: "manipulation",
            }}
          >
            <div>{p.svgPath(isDark ? "#F8FAFC" : "#0F172A")}</div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  color: isDark ? "#FFFFFF" : "#0F172A",
                  lineHeight: 1.1,
                }}
              >
                {p.label}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: isDark ? "#94A3B8" : "#64748B",
                  marginTop: "2px",
                }}
              >
                {p.sub}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
