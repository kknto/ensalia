"use client";

import { useState } from "react";
import { KeyRound, ShieldAlert, User, Laptop } from "lucide-react";

interface SettingsViewProps {
  operator: string;
  accessCode: string;
  onOperator: (v: string) => void;
  onAccessCode: (v: string) => void;
}

export function SettingsView({
  operator,
  accessCode,
  onOperator,
  onAccessCode,
}: SettingsViewProps) {
  const [draft, setDraft] = useState(operator);

  return (
    <div className="settings-grid">
      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <User size={22} style={{ color: "var(--brand)" }} />
          <h2 style={{ margin: 0 }}>Operador Activo</h2>
        </div>
        <p className="muted" style={{ marginBottom: "16px" }}>
          Este nombre identifica todas las acciones de captura y cambios de estado realizadas desde esta estación de trabajo.
        </p>
        <div className="setting-form">
          <label className="field">
            <span>Nombre del operador</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ej. Ing. Juan Pérez"
            />
          </label>
          <button
            type="button"
            className="primary"
            onClick={() => onOperator(draft.trim() || "Captura oficina")}
          >
            Guardar operador
          </button>
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <KeyRound size={22} style={{ color: "var(--brand)" }} />
          <h2 style={{ margin: 0 }}>Código de Acceso</h2>
        </div>
        <p className="muted" style={{ marginBottom: "16px" }}>
          Sólo completa el código si fue configurado y requerido durante la instalación del laboratorio.
        </p>
        <label className="field">
          <span>Código de acceso local</span>
          <input
            type="password"
            value={accessCode}
            onChange={(e) => onAccessCode(e.target.value)}
            autoComplete="off"
            placeholder="••••••••"
          />
        </label>
      </section>

      <section className="card unavailable">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <ShieldAlert size={22} style={{ color: "var(--muted)" }} />
          <h2 style={{ margin: 0 }}>Respaldo y Restauración</h2>
        </div>
        <p>
          Esta función requiere integración con el servicio local de Windows (`RESPALDAR-ENSALIA.cmd`). No se ejecuta desde la interfaz web para prevenir respaldos incompletos con transacciones abiertas en SQLite.
        </p>
        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button disabled>Crear respaldo</button>
          <button disabled>Restaurar respaldo</button>
        </div>
      </section>

      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <Laptop size={22} style={{ color: "var(--brand)" }} />
          <h2 style={{ margin: 0 }}>Acerca del Sistema</h2>
        </div>
        <dl className="detail-grid">
          <div>
            <dt>Modo</dt>
            <dd>Aplicación local de laboratorio</dd>
          </div>
          <div>
            <dt>Versión</dt>
            <dd>0.1.0 (Producción)</dd>
          </div>
          <div>
            <dt>Entorno</dt>
            <dd>Next.js 15 + Prisma 6 + SQLite</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

