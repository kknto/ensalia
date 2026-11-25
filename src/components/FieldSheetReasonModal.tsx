"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, X } from "lucide-react";

interface FieldSheetReasonModalProps {
  isOpen: boolean;
  actionType: "sustituir" | "anular" | null;
  controlNumber?: string;
  isSaving: boolean;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}

export function FieldSheetReasonModal({
  isOpen,
  actionType,
  controlNumber = "",
  isSaving,
  onConfirm,
  onCancel,
}: FieldSheetReasonModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isAnular = actionType === "anular";
  const title = isAnular ? `Anular Hoja de Campo ${controlNumber}` : "Sustituir Hoja de Campo Emitida";

  useEffect(() => {
    if (isOpen) {
      setMotivo("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSaving) onCancel();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isSaving, onCancel]);

  if (!isOpen || !actionType) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = motivo.trim();
    if (clean.length < 5) {
      setError("Debes ingresar un motivo descriptivo de al menos 5 caracteres.");
      inputRef.current?.focus();
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-modal-title"
        style={{ maxWidth: "460px" }}
      >
        <div className="section-head" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isAnular ? (
              <AlertCircle size={22} style={{ color: "var(--danger)" }} />
            ) : (
              <FileText size={22} style={{ color: "var(--brand)" }} />
            )}
            <div>
              <p className="eyebrow" style={{ color: isAnular ? "var(--danger)" : undefined, margin: 0 }}>
                Control documental
              </p>
              <h2 id="reason-modal-title" style={{ margin: 0, fontSize: "18px" }}>
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="muted" style={{ marginBottom: "16px" }}>
            {isAnular
              ? "Esta hoja será marcada como ANULADA pero su evidencia y código QR se conservarán en la bitácora histórica."
              : "La hoja activa actual pasará a estado SUSTITUIDA y se emitirá una nueva revisión con la información actualizada."}
          </p>

          <label className="field" style={{ marginBottom: "16px" }}>
            <span>Motivo técnico * (mínimo 5 caracteres)</span>
            <textarea
              ref={inputRef}
              rows={3}
              value={motivo}
              disabled={isSaving}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (error) setError("");
              }}
              placeholder={
                isAnular
                  ? "Ej. Error en número de remisión o espécimen inutilizado"
                  : "Ej. Corrección en fecha de descarga o adición de moldes"
              }
              required
              style={{ borderColor: error ? "var(--danger)" : undefined }}
            />
          </label>

          {error && (
            <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "-8px", marginBottom: "16px" }}>
              {error}
            </p>
          )}

          <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="secondary" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </button>
            <button
              type="submit"
              className={isAnular ? "danger" : "primary"}
              disabled={isSaving}
            >
              {isSaving ? "Procesando…" : isAnular ? "Confirmar anulación" : "Emitir nueva versión"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

