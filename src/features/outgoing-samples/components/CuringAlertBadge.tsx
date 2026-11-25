"use client";

import { AlertTriangle, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { EstadoCurado } from "../types";

interface CuringAlertBadgeProps {
  horas: number;
  estado: EstadoCurado;
}

export function CuringAlertBadge({ horas, estado }: CuringAlertBadgeProps) {
  const configs = {
    NORMAL: {
      label: `< 24h (${horas}h) - En curado inicial`,
      style: {
        background: "var(--ensalia-success-bg, #ecfdf5)",
        color: "var(--ensalia-success-text, #065f46)",
        borderColor: "var(--ensalia-success-border, #a7f3d0)",
      },
      icon: <ShieldCheck size={14} />,
    },
    ADVERTENCIA: {
      label: `24-36h (${horas}h) - Próximo desmolde`,
      style: {
        background: "var(--ensalia-primary-50, #edf5fd)",
        color: "var(--ensalia-primary-800, #0f3d64)",
        borderColor: "var(--ensalia-primary-100, #d8ecff)",
      },
      icon: <Clock size={14} />,
    },
    CRITICO: {
      label: `36-48h (${horas}h) - Traslado urgente`,
      style: {
        background: "var(--ensalia-warning-bg, #fffbeb)",
        color: "var(--ensalia-warning-text, #92400e)",
        borderColor: "var(--ensalia-warning-border, #fde68a)",
      },
      icon: <AlertTriangle size={14} />,
    },
    VENCIDO: {
      label: `> 48h (${horas}h) - Excede ASTM C31`,
      style: {
        background: "var(--ensalia-danger-bg, #fef2f2)",
        color: "var(--ensalia-danger-text, #991b1b)",
        borderColor: "var(--ensalia-danger-border, #fecaca)",
      },
      icon: <ShieldAlert size={14} />,
    },
  };

  const current = configs[estado] || configs.NORMAL;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 8px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 600,
        border: "1px solid",
        whiteSpace: "nowrap",
        ...current.style,
      }}
      title={`Tiempo transcurrido desde muestreo en obra: ${horas} horas. Norma ASTM C31 / NMX-C-109 exige traslado a curado antes de 48h.`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
}

