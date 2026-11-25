"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";

interface AlertsBannerProps {
  message: string;
  error: string;
  onClearMessage?: () => void;
  onClearError?: () => void;
}

export function AlertsBanner({
  message,
  error,
  onClearMessage,
  onClearError,
}: AlertsBannerProps) {
  if (!message && !error) return null;

  return (
    <div className="alerts" aria-live="polite">
      {error && (
        <div className="alert error" role="alert" style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <strong>No se pudo completar.</strong>
            <span> {error}</span>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              aria-label="Cerrar error"
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", opacity: 0.7 }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {message && (
        <div className="alert success" role="status" style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ flex: 1 }}>
            <strong>Listo.</strong>
            <span> {message}</span>
          </div>
          {onClearMessage && (
            <button
              type="button"
              onClick={onClearMessage}
              aria-label="Cerrar notificación"
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", opacity: 0.7 }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

