"use client";

import { Crown, ShieldCheck } from "lucide-react";
import { NivelSuscripcion } from "@prisma/client";
import { useSubscription } from "../context/SubscriptionContext";

export function SubscriptionBadge() {
  const { tier, info, loading } = useSubscription();

  if (loading) {
    return (
      <span
        style={{
          display: "inline-block",
          width: "90px",
          height: "24px",
          borderRadius: "999px",
          background: "var(--line)",
          opacity: 0.7,
        }}
      />
    );
  }

  const planLabels: Record<NivelSuscripcion, { label: string; bg: string; color: string }> = {
    STARTER: { label: "Básico", bg: "var(--wash)", color: "var(--muted)" },
    ESTANDAR: { label: "Estándar", bg: "#e6f4ea", color: "#137333" },
    PROFESIONAL: { label: "Profesional", bg: "#e8f0fe", color: "#1a73e8" },
    EMPRESARIAL: { label: "Empresarial", bg: "#fce8e6", color: "#c5221f" },
  };

  const current = planLabels[tier] || planLabels.STARTER;

  return (
    <div
      title={info ? `${info.titular} · ${info.diasRestantes ? `${info.diasRestantes} días restantes` : "Vigente"}` : "Licencia Local"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        background: current.bg,
        color: current.color,
        border: `1px solid ${current.color}30`,
        cursor: "default",
      }}
    >
      {tier === NivelSuscripcion.PROFESIONAL || tier === NivelSuscripcion.EMPRESARIAL ? (
        <Crown size={14} />
      ) : (
        <ShieldCheck size={14} />
      )}
      <span>{current.label}</span>
    </div>
  );
}

