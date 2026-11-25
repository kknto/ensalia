"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <section
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        style={{ maxWidth: "440px" }}
      >
        <div className="section-head" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isDestructive ? (
              <AlertTriangle size={24} style={{ color: "var(--danger)" }} />
            ) : (
              <HelpCircle size={24} style={{ color: "var(--brand)" }} />
            )}
            <h2 id="confirm-dialog-title" style={{ margin: 0, fontSize: "18px" }}>
              {title}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onCancel}
            aria-label="Cerrar confirmación"
          >
            <X size={18} />
          </button>
        </div>

        <p
          id="confirm-dialog-desc"
          className="muted"
          style={{ marginBottom: "24px", lineHeight: "1.5" }}
        >
          {description}
        </p>

        <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            className="secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={isDestructive ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

