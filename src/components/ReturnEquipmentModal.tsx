"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";

interface ReturnEquipmentModalProps {
  isOpen: boolean;
  count: number;
  isSaving: boolean;
  onConfirm: (observacion?: string) => void;
  onCancel: () => void;
}

export function ReturnEquipmentModal({
  isOpen,
  count,
  isSaving,
  onConfirm,
  onCancel,
}: ReturnEquipmentModalProps) {
  const [observacion, setObservacion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setObservacion("");
      setTimeout(() => inputRef.current?.focus(), 50);

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
    onConfirm(observacion.trim() || undefined);
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
        aria-labelledby="return-modal-title"
        style={{ maxWidth: "460px" }}
      >
        <div className="section-head" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <RotateCcw size={22} style={{ color: "var(--brand)" }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Trazabilidad de equipos</p>
              <h2 id="return-modal-title" style={{ margin: 0, fontSize: "18px" }}>
                Registrar Devolución de Equipos
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
            Se registrará la devolución de <strong>{count} {count === 1 ? "equipo activo" : "equipos activos"}</strong> vinculados a esta muestra. Pasarán nuevamente a estado <strong>DISPONIBLE</strong> en el inventario.
          </p>

          <label className="field" style={{ marginBottom: "16px" }}>
            <span>Observaciones de devolución (opcional)</span>
            <textarea
              ref={inputRef}
              rows={3}
              value={observacion}
              disabled={isSaving}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej. Moldes limpios y lubricados / Termómetro verificado"
            />
          </label>

          <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="secondary" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving ? "Procesando…" : "Confirmar devolución"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

