"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, X } from "lucide-react";

interface NewProfileModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NewProfileModal({
  isOpen,
  isSaving,
  onConfirm,
  onCancel,
}: NewProfileModalProps) {
  const [name, setName] = useState("Nuevo cliente");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("Nuevo cliente");
      setError("");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);

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
    const clean = name.trim();
    if (!clean) {
      setError("Indica el nombre de la empresa o cliente.");
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
        aria-labelledby="new-profile-title"
        style={{ maxWidth: "440px" }}
      >
        <div className="section-head" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Palette size={22} style={{ color: "var(--brand)" }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Personalización</p>
              <h2 id="new-profile-title" style={{ margin: 0, fontSize: "18px" }}>
                Nuevo Perfil de Cliente
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
            Crea un perfil para configurar logotipos, reglas operativas y folios para este cliente.
          </p>

          <label className="field" style={{ marginBottom: "16px" }}>
            <span>Nombre del cliente / empresa *</span>
            <input
              ref={inputRef}
              value={name}
              disabled={isSaving}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              placeholder="Ej. Concretos del Sureste S.A."
              required
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
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving ? "Creando…" : "Crear perfil"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

