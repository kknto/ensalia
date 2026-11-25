"use client";

import { ReactNode } from "react";
import { CodigoModulo, NivelSuscripcion } from "@prisma/client";
import { Lock, Sparkles } from "lucide-react";
import { useSubscription } from "../context/SubscriptionContext";

interface FeatureGateProps {
  module: CodigoModulo;
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
  requiredTier?: NivelSuscripcion;
}

export function FeatureGate({
  module,
  children,
  fallback,
  title = "Módulo no contratado",
  description = "Esta funcionalidad está disponible a partir del plan comercial correspondiente.",
  requiredTier = NivelSuscripcion.PROFESIONAL,
}: FeatureGateProps) {
  const { isModuleEnabled, loading } = useSubscription();

  if (loading) {
    return (
      <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <p className="muted">Verificando permisos de suscripción…</p>
      </div>
    );
  }

  if (isModuleEnabled(module)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const tierNames: Record<NivelSuscripcion, string> = {
    STARTER: "Plan Básico",
    ESTANDAR: "Plan Estándar",
    PROFESIONAL: "Plan Profesional",
    EMPRESARIAL: "Plan Empresarial",
  };

  return (
    <div className="card" style={{ padding: "48px 32px", textAlign: "center", maxWidth: "600px", margin: "40px auto" }}>
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--warning)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 16px",
          color: "var(--brand-dark)",
        }}
      >
        <Lock size={28} />
      </div>

      <p className="eyebrow" style={{ marginBottom: "6px" }}>
        Actualización de plan
      </p>
      <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>{title}</h2>
      <p className="muted" style={{ marginBottom: "24px", lineHeight: "1.5" }}>
        {description} Este módulo forma parte del <strong>{tierNames[requiredTier]}</strong> de ENSALIA.
      </p>

      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--wash)", padding: "10px 18px", borderRadius: "8px" }}>
        <Sparkles size={18} style={{ color: "var(--brand)" }} />
        <span style={{ fontSize: "14px", fontWeight: 600 }}>
          Contacta a tu asesor para activar este módulo en tu licencia.
        </span>
      </div>
    </div>
  );
}

