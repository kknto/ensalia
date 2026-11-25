"use client";

import { HelpCircle } from "lucide-react";

interface HelpButtonProps {
  onClick: () => void;
  label?: string;
  style?: React.CSSProperties;
}

export function HelpButton({ onClick, label = "Guía de ayuda", style }: HelpButtonProps) {
  return (
    <button
      type="button"
      className="secondary"
      onClick={onClick}
      title="Ver instrucciones y preguntas frecuentes de esta pantalla (F1)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: "rgba(2, 132, 199, 0.08)",
        color: "var(--brand, #0284c7)",
        borderColor: "rgba(2, 132, 199, 0.25)",
        cursor: "pointer",
        borderRadius: "8px",
        transition: "all 0.15s ease",
        ...style,
      }}
    >
      <HelpCircle size={15} style={{ color: "var(--brand, #0284c7)" }} />
      <span>{label}</span>
    </button>
  );
}
