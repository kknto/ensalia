"use client";

import { CheckCircle2, Clock, Database, Plus, ArrowRight } from "lucide-react";
import { Sample, View } from "../types";
import { RecordsTable } from "./RecordsTable";

interface DashboardViewProps {
  rows: Sample[];
  loading: boolean;
  onNew: () => void;
  onNavigate: (view: View) => void;
  onOpen: (row: Sample) => void;
}

export function DashboardView({
  rows,
  loading,
  onNew,
  onNavigate,
  onOpen,
}: DashboardViewProps) {
  const drafts = rows.filter((row) => row.estatusBitacora === "BORRADOR").length;
  const reviewed = rows.filter((row) => row.estatusBitacora === "REVISADA").length;

  return (
    <>
      <section className="hero card" style={{ position: "relative", overflow: "hidden" }}>
        <div>
          <p className="eyebrow">Trabajo del día</p>
          <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
            Captura y controla tus muestras desde un solo lugar
          </h2>
          <p className="muted">
            Los registros se guardan primero como borrador y requieren revisión técnica antes del cierre definitivo.
          </p>
        </div>
        <button
          type="button"
          className="primary large"
          onClick={onNew}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={20} />
          <span>Nueva muestra</span>
        </button>
      </section>

      <section className="metric-grid" aria-label="Métricas de muestras">
        <button
          type="button"
          className="metric"
          onClick={() => onNavigate("pendientes")}
          aria-label="Ver borradores pendientes de revisión"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span>Borradores</span>
            <Clock size={18} style={{ color: "var(--muted)", opacity: 0.7 }} />
          </div>
          <strong>
            {loading ? (
              <span className="skeleton-block" style={{ display: "inline-block", width: "40px", height: "32px", background: "var(--line)", borderRadius: "4px" }} />
            ) : (
              drafts
            )}
          </strong>
          <small>Requieren revisión</small>
        </button>

        <button
          type="button"
          className="metric"
          onClick={() => onNavigate("pendientes")}
          aria-label="Ver muestras revisadas listas para cerrar"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span>Revisadas</span>
            <CheckCircle2 size={18} style={{ color: "var(--brand)", opacity: 0.8 }} />
          </div>
          <strong>
            {loading ? (
              <span className="skeleton-block" style={{ display: "inline-block", width: "40px", height: "32px", background: "var(--line)", borderRadius: "4px" }} />
            ) : (
              reviewed
            )}
          </strong>
          <small>Listas para cerrar</small>
        </button>

        <button
          type="button"
          className="metric"
          onClick={() => onNavigate("registros")}
          aria-label="Ver todos los registros visibles"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span>Registros visibles</span>
            <Database size={18} style={{ color: "var(--muted)", opacity: 0.7 }} />
          </div>
          <strong>
            {loading ? (
              <span className="skeleton-block" style={{ display: "inline-block", width: "40px", height: "32px", background: "var(--line)", borderRadius: "4px" }} />
            ) : (
              rows.length
            )}
          </strong>
          <small>Abrir consulta general</small>
        </button>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <h2>Actividad reciente</h2>
            <p className="muted">Últimas muestras registradas en la bitácora local.</p>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => onNavigate("registros")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>Ver todas</span>
            <ArrowRight size={14} />
          </button>
        </div>
        <RecordsTable
          rows={rows.slice(0, 5)}
          loading={loading}
          onOpen={onOpen}
          embedded
        />
      </section>
    </>
  );
}

