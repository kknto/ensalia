"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, ShieldAlert, Wrench, X } from "lucide-react";
import { Equipment, stateLabel } from "./InventoryPanel";

interface ChangeStateModalProps {
  isOpen: boolean;
  item: Equipment | null;
  nextState: string;
  isSaving: boolean;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}

export function ChangeStateModal({
  isOpen,
  item,
  nextState,
  isSaving,
  onConfirm,
  onCancel,
}: ChangeStateModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isAvailable = nextState === "DISPONIBLE";
  const stateName = stateLabel(nextState).toLowerCase();

  useEffect(() => {
    if (isOpen) {
      setMotivo(isAvailable ? "Retorno a operación normal" : "");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSaving) onCancel();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, isAvailable, isSaving, onCancel]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = motivo.trim();
    if (!isAvailable && !clean) {
      setError("Debes indicar el motivo técnico del cambio de estado.");
      inputRef.current?.focus();
      return;
    }
    onConfirm(clean || "Retorno a operación");
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
        aria-labelledby="change-state-title"
        style={{ maxWidth: "460px" }}
      >
        <div className="section-head" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Wrench size={22} style={{ color: "var(--brand)" }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Gestión de equipo</p>
              <h2 id="change-state-title" style={{ margin: 0, fontSize: "18px" }}>
                Cambiar a {stateName}
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
            Vas a cambiar el estado del equipo <strong>{item.codigoInterno}</strong>{" "}
            {item.numeroSerie ? `(Serie: ${item.numeroSerie})` : ""}.
          </p>

          <label className="field" style={{ marginBottom: "16px" }}>
            <span>Motivo del cambio de estado {!isAvailable && "*"}</span>
            <textarea
              ref={inputRef}
              rows={3}
              value={motivo}
              disabled={isSaving}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (error) setError("");
              }}
              placeholder="Ej. Enviado a mantenimiento preventivo / Presenta desgaste en caras de apoyo"
              required={!isAvailable}
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
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving ? "Guardando…" : "Actualizar estado"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

interface CalibrateModalProps {
  isOpen: boolean;
  item: Equipment | null;
  isSaving: boolean;
  onConfirm: (
    fecha: string,
    venceEn: string,
    file?: File | null,
    certificado?: string,
    proveedor?: string
  ) => void;
  onCancel: () => void;
}

export function CalibrateModal({
  isOpen,
  item,
  isSaving,
  onConfirm,
  onCancel,
}: CalibrateModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);
  const [venceEn, setVenceEn] = useState("");
  const [certificado, setCertificado] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFecha(today);
      const [year, month, day] = today.split("-").map(Number);
      const nextYear = `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setVenceEn(nextYear);
      setCertificado("");
      setProveedor("");
      setSelectedFile(null);
      setError("");

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSaving) onCancel();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, today, isSaving, onCancel]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !venceEn) {
      setError("Debes indicar tanto la fecha de calibración como la fecha de vigencia.");
      return;
    }
    if (venceEn < fecha) {
      setError("La fecha de vigencia no puede ser anterior a la fecha de calibración.");
      return;
    }
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("El certificado adjunto debe ser un archivo PDF.");
      return;
    }
    onConfirm(fecha, venceEn, selectedFile, certificado, proveedor);
  };

  const setShortcut = (months: number) => {
    const [year, month, day] = (fecha || today).split("-").map(Number);
    const target = new Date(Date.UTC(year, month - 1 + months, day));
    setVenceEn(target.toISOString().slice(0, 10));
    setError("");
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
        aria-labelledby="calibrate-title"
        style={{ maxWidth: "520px" }}
      >
        <div className="section-head" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Calendar size={22} style={{ color: "var(--brand)" }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Metrología y control</p>
              <h2 id="calibrate-title" style={{ margin: 0, fontSize: "18px" }}>
                Registrar Calibración: {item.codigoInterno}
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
            Registra el informe o certificado de calibración vigente para habilitar el uso oficial del equipo.
          </p>

          <div className="grid two" style={{ marginBottom: "12px" }}>
            <label className="field">
              <span>Fecha de calibración *</span>
              <input
                type="date"
                required
                value={fecha}
                disabled={isSaving}
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Vigente hasta *</span>
              <input
                type="date"
                required
                value={venceEn}
                disabled={isSaving}
                onChange={(e) => setVenceEn(e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Vigencia rápida:</span>
            <button
              type="button"
              className="text-button"
              style={{ fontSize: "12px" }}
              onClick={() => setShortcut(6)}
            >
              +6 meses
            </button>
            <button
              type="button"
              className="text-button"
              style={{ fontSize: "12px" }}
              onClick={() => setShortcut(12)}
            >
              +1 año
            </button>
            <button
              type="button"
              className="text-button"
              style={{ fontSize: "12px" }}
              onClick={() => setShortcut(24)}
            >
              +2 años
            </button>
          </div>

          <div className="grid two" style={{ marginBottom: "12px" }}>
            <label className="field">
              <span>No. de Certificado / Folio</span>
              <input
                type="text"
                placeholder="Ej. CERT-2026-MET-089"
                value={certificado}
                disabled={isSaving}
                onChange={(e) => setCertificado(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Laboratorio / Proveedor</span>
              <input
                type="text"
                placeholder="Ej. CENAM / Metrología del Norte"
                value={proveedor}
                disabled={isSaving}
                onChange={(e) => setProveedor(e.target.value)}
              />
            </label>
          </div>

          {/* Adjunto de Certificado PDF */}
          <div style={{ marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Adjuntar Certificado PDF (Inmutable SHA-256)
            </span>
            <div
              style={{
                border: "2px dashed var(--line, #cbd5e1)",
                borderRadius: "6px",
                padding: "12px",
                textAlign: "center",
                backgroundColor: "var(--wash, #f8fafc)",
                cursor: "pointer",
              }}
              onClick={() => document.getElementById("cert-pdf-input")?.click()}
            >
              <input
                id="cert-pdf-input"
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                disabled={isSaving}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
              />
              {selectedFile ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                  <span style={{ fontSize: "13px", fontWeight: 500 }}>{selectedFile.name}</span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div style={{ color: "var(--muted)", fontSize: "13px" }}>
                  Haz clic para seleccionar el archivo <strong>PDF</strong> del certificado
                </div>
              )}
            </div>
          </div>

          {error && (
            <p style={{ color: "var(--danger)", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </p>
          )}

          <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="secondary" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving ? "Guardando…" : "Registrar calibración"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function InventoryTableSkeleton() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="skeleton-row" style={{ opacity: 0.7, pointerEvents: "none" }}>
          <td>
            <div style={{ width: "90px", height: "16px", borderRadius: "4px", background: "var(--line)", marginBottom: "4px" }} />
            <div style={{ width: "110px", height: "12px", borderRadius: "4px", background: "var(--line)", opacity: 0.6 }} />
          </td>
          <td>
            <div style={{ width: "100px", height: "16px", borderRadius: "4px", background: "var(--line)" }} />
          </td>
          <td>
            <div style={{ width: "80px", height: "20px", borderRadius: "999px", background: "var(--line)" }} />
          </td>
          <td>
            <div style={{ width: "85px", height: "16px", borderRadius: "4px", background: "var(--line)" }} />
          </td>
          <td>
            <div style={{ width: "70px", height: "16px", borderRadius: "4px", background: "var(--line)" }} />
          </td>
          <td style={{ textAlign: "right" }}>
            <div style={{ width: "120px", height: "24px", borderRadius: "4px", background: "var(--line)", marginLeft: "auto" }} />
          </td>
        </tr>
      ))}
    </>
  );
}

