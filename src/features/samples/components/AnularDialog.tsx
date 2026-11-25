"use client";

import { useEffect, useRef, useState } from "react";
import { AlertOctagon, X } from "lucide-react";

interface AnularDialogProps {
  isOpen: boolean;
  sampleId?: string;
  sampleCode?: string;
  isSaving: boolean;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}

export function AnularDialog({
  isOpen,
  sampleCode = "",
  isSaving,
  onConfirm,
  onCancel,
}: AnularDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [validationError, setValidationError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMotivo("");
      setValidationError("");
      setTimeout(() => textareaRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSaving) onCancel();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isSaving, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = motivo.trim();
    if (!clean) {
      setValidationError("La anulación requiere un motivo detallado.");
      textareaRef.current?.focus();
      return;
    }
    if (clean.length < 5) {
      setValidationError("Ingresa un motivo descriptivo (mínimo 5 caracteres).");
      textareaRef.current?.focus();
      return;
    }
    onConfirm(clean);
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onCancel();
      }}
    >
      <section
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="anular-title"
        style={{ maxWidth: "480px" }}
      >
        <div className="section-head" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertOctagon size={24} style={{ color: "var(--danger)" }} />
            <div>
              <p className="eyebrow" style={{ color: "var(--danger)", margin: 0 }}>Acción irreversible</p>
              <h2 id="anular-title" style={{ margin: 0, fontSize: "18px" }}>
                Anular Muestra {sampleCode}
              </h2>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="muted" style={{ marginBottom: "16px", lineHeight: "1.5" }}>
            Esta muestra quedará marcada como <strong>ANULADA</strong> en la bitácora y no podrá reactivarse.
            Especifica el motivo de la anulación para los registros de auditoría:
          </p>

          <label className="field" style={{ marginBottom: "16px" }}>
            <span>Motivo de anulación *</span>
            <textarea
              ref={textareaRef}
              rows={3}
              value={motivo}
              disabled={isSaving}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (validationError) setValidationError("");
              }}
              placeholder="Ej. Probeta dañada en transporte / Error de identificación en campo"
              style={{
                borderColor: validationError ? "var(--danger)" : undefined,
              }}
              required
            />
          </label>

          {validationError && (
            <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "-10px", marginBottom: "16px" }}>
              {validationError}
            </p>
          )}

          <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="danger"
              disabled={isSaving}
            >
              {isSaving ? "Anulando…" : "Confirmar anulación"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

