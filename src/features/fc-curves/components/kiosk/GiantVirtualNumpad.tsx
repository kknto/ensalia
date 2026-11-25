"use client";

import React from "react";
import { Delete, RotateCcw } from "lucide-react";
import { kioskAudio } from "./PressKioskAudio";
import { PressKioskHaptics } from "./PressKioskHaptics";

interface GiantVirtualNumpadProps {
  value: string;
  onChange: (newValue: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
  theme?: "dark" | "light";
  compact?: boolean;
}

export function GiantVirtualNumpad({
  value,
  onChange,
  onEnter,
  disabled = false,
  theme = "dark",
  compact = false,
}: GiantVirtualNumpadProps) {
  const isDark = theme === "dark";

  const handleDigit = (digit: string) => {
    if (disabled) return;
    PressKioskHaptics.keyPress();
    kioskAudio.playKeyClick();

    // Si ya tiene punto decimal y se presiona punto, ignorar
    if (digit === "." && value.includes(".")) {
      PressKioskHaptics.alert();
      kioskAudio.playAlertTone();
      return;
    }

    // Evitar ceros a la izquierda múltiples
    if (value === "0" && digit !== ".") {
      onChange(digit);
      return;
    }

    onChange(value + digit);
  };

  const handleBackspace = () => {
    if (disabled) return;
    PressKioskHaptics.keyPress();
    kioskAudio.playKeyClick();
    if (value.length <= 1) {
      onChange("");
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (disabled) return;
    PressKioskHaptics.alert();
    kioskAudio.playAlertTone();
    onChange("");
  };

  const btnSize = compact ? "52px" : "76px";
  const btnFontSize = compact ? "22px" : "28px";

  const btnBaseStyle: React.CSSProperties = {
    flex: 1,
    maxWidth: compact ? "80px" : "90px",
    height: btnSize,
    fontSize: btnFontSize,
    fontWeight: "700",
    borderRadius: compact ? "8px" : "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
    transition: "transform 0.05s, background-color 0.1s",
    border: isDark ? "2px solid #334155" : "2px solid #CBD5E1",
    backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
    color: isDark ? "#FFFFFF" : "#0F172A",
    boxShadow: isDark ? "0 4px 6px -1px rgba(0, 0, 0, 0.4)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    touchAction: "manipulation",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: compact ? "8px" : "12px",
    justifyContent: "center",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? "8px" : "12px",
        padding: compact ? "10px" : "16px",
        borderRadius: compact ? "12px" : "14px",
        backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
        border: isDark ? "2px solid #1E293B" : "2px solid #E2E8F0",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={rowStyle}>
        {["1", "2", "3"].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(d)}
            style={btnBaseStyle}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={rowStyle}>
        {["4", "5", "6"].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(d)}
            style={btnBaseStyle}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={rowStyle}>
        {["7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(d)}
            style={btnBaseStyle}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={rowStyle}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit(".")}
          style={{ ...btnBaseStyle, fontSize: compact ? "26px" : "34px" }}
        >
          .
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit("0")}
          style={btnBaseStyle}
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={handleBackspace}
          style={{
            ...btnBaseStyle,
            backgroundColor: isDark ? "#334155" : "#E2E8F0",
            color: isDark ? "#F8FAFC" : "#334155",
          }}
          title="Borrar último dígito"
        >
          <Delete size={compact ? 22 : 28} />
        </button>
      </div>

      <div style={rowStyle}>
        <button
          type="button"
          disabled={disabled}
          onClick={handleClear}
          style={{
            ...btnBaseStyle,
            flex: 1,
            height: compact ? "44px" : "56px",
            fontSize: compact ? "12px" : "14px",
            backgroundColor: isDark ? "#450A0A" : "#FEE2E2",
            color: isDark ? "#FCA5A5" : "#991B1B",
            borderColor: isDark ? "#991B1B" : "#FCA5A5",
          }}
        >
          <RotateCcw size={compact ? 14 : 16} style={{ marginRight: "4px" }} />
          LIMPIAR
        </button>

        {onEnter && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              PressKioskHaptics.success();
              kioskAudio.playSuccessChime();
              onEnter();
            }}
            style={{
              ...btnBaseStyle,
              flex: 1.5,
              height: compact ? "44px" : "56px",
              fontSize: compact ? "13px" : "15px",
              fontWeight: "800",
              backgroundColor: isDark ? "#065F46" : "#16734C",
              color: "#FFFFFF",
              borderColor: isDark ? "#00E676" : "#0D9488",
            }}
          >
            CONFIRMAR
          </button>
        )}
      </div>
    </div>
  );
}
