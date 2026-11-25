"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  User,
} from "lucide-react";
import { CuringAlertBadge } from "./CuringAlertBadge";
import { NewDispatchModal } from "./NewDispatchModal";
import { DispatchManifest, PendingSample } from "../types";

interface OutgoingSamplesDashboardProps {
  onMessage: (message: string, error?: boolean) => void;
  headers: () => Record<string, string>;
}

export function OutgoingSamplesDashboard({
  onMessage,
  headers,
}: OutgoingSamplesDashboardProps) {
  const [activeTab, setActiveTab] = useState<"pendientes" | "despachos">("pendientes");
  const [pendingSamples, setPendingSamples] = useState<PendingSample[]>([]);
  const [despachos, setDespachos] = useState<DispatchManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDispatch, setShowNewDispatch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [q, setQ] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [resPendientes, resDespachos] = await Promise.all([
        fetch("/api/despachos/pendientes", { headers: headers() }),
        fetch("/api/despachos", { headers: headers() }),
      ]);

      if (!resPendientes.ok || !resDespachos.ok) {
        throw new Error("No se pudo obtener la información de logística de muestras.");
      }

      const [dataPendientes, dataDespachos] = await Promise.all([
        resPendientes.json(),
        resDespachos.json(),
      ]);

      setPendingSamples(Array.isArray(dataPendientes) ? dataPendientes : []);
      setDespachos(Array.isArray(dataDespachos) ? dataDespachos : []);
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Error al cargar logística de salidas.",
        true
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    const enRiesgo = pendingSamples.filter(
      (s) => s.estadoCurado === "CRITICO" || s.estadoCurado === "VENCIDO"
    ).length;
    const enTransito = despachos.filter((d) => d.estado === "EN_TRANSITO").length;
    const completados = despachos.filter((d) => d.estado === "COMPLETADO").length;
    return {
      totalPendientes: pendingSamples.length,
      enRiesgo,
      enTransito,
      completados,
    };
  }, [pendingSamples, despachos]);

  const filteredSamples = useMemo(() => {
    if (!q.trim()) return pendingSamples;
    const term = q.toLowerCase();
    return pendingSamples.filter(
      (s) =>
        s.idMuestra.toLowerCase().includes(term) ||
        s.cliente.toLowerCase().includes(term) ||
        s.obra.toLowerCase().includes(term) ||
        (s.elemento && s.elemento.toLowerCase().includes(term))
    );
  }, [pendingSamples, q]);

  const handleCreateDispatch = async (payload: {
    fechaProgramada: string;
    choferOperadorId?: string;
    choferNombre?: string;
    vehiculo: string;
    placas: string;
    origen: string;
    destino: string;
    observaciones: string;
    muestrasIds: string[];
  }) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/despachos", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar el manifiesto de despacho.");
      }

      onMessage(`Manifiesto ${data.folio} generado con éxito.`);
      setShowNewDispatch(false);
      setActiveTab("despachos");
      await loadData();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Error al generar manifiesto.",
        true
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseNewDispatch = useCallback(() => {
    setShowNewDispatch(false);
  }, []);

  const handleUpdateStatus = async (
    despachoId: string,
    nuevoEstado: "EN_TRANSITO" | "COMPLETADO" | "CANCELADO"
  ) => {
    try {
      const res = await fetch(`/api/despachos/${despachoId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo actualizar el estado del despacho.");
      }

      const msg =
        nuevoEstado === "EN_TRANSITO"
          ? "Ruta en tránsito hacia laboratorio."
          : nuevoEstado === "COMPLETADO"
          ? "Muestras recibidas e ingresadas a curado húmedo."
          : "Manifiesto cancelado.";
      onMessage(msg);
      await loadData();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Error al actualizar estado.",
        true
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner KPI */}
      <section className="metric-grid" aria-label="KPIs de logística y curado">
        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Muestras en obra</span>
            <Clock size={18} style={{ color: "var(--brand, #16734c)" }} />
          </div>
          <strong>{kpis.totalPendientes}</strong>
          <small>Pendientes de recolección</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Riesgo ASTM C31 (&gt;36h)</span>
            <AlertTriangle
              size={18}
              style={{
                color: kpis.enRiesgo > 0 ? "var(--danger, #ef4444)" : "var(--muted)",
              }}
            />
          </div>
          <strong
            style={{
              color: kpis.enRiesgo > 0 ? "var(--danger, #ef4444)" : undefined,
            }}
          >
            {kpis.enRiesgo}
          </strong>
          <small>Urgente ingreso a curado</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Rutas en tránsito</span>
            <Truck size={18} style={{ color: "var(--ensalia-info, #0284c7)" }} />
          </div>
          <strong>{kpis.enTransito}</strong>
          <small>Vehículos en camino</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Despachos completados</span>
            <CheckCircle2 size={18} style={{ color: "var(--ensalia-success, #10b981)" }} />
          </div>
          <strong>{kpis.completados}</strong>
          <small>Recolecciones cerradas</small>
        </div>
      </section>

      {/* Control Bar & Tabs */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={activeTab === "pendientes" ? "primary" : "secondary"}
            onClick={() => setActiveTab("pendientes")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Clock size={16} />
            <span>Muestras Pendientes en Obra ({pendingSamples.length})</span>
          </button>
          <button
            type="button"
            className={activeTab === "despachos" ? "primary" : "secondary"}
            onClick={() => setActiveTab("despachos")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Truck size={16} />
            <span>Manifiestos de Despacho ({despachos.length})</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="secondary button-compact"
            onClick={() => void loadData()}
            title="Actualizar datos"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
          <button
            type="button"
            className="primary button-compact"
            onClick={() => setShowNewDispatch(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} />
            <span>Nuevo Manifiesto de Despacho</span>
          </button>
        </div>
      </div>

      {/* View 1: Muestras Pendientes en Obra */}
      {activeTab === "pendientes" && (
        <section className="card" style={{ padding: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ position: "relative", width: "320px" }}>
              <input
                type="text"
                placeholder="Buscar por ID, cliente, obra o elemento…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ paddingLeft: "34px", width: "100%" }}
              />
              <Search
                size={16}
                style={{ position: "absolute", left: "10px", top: "10px", color: "var(--muted)" }}
              />
            </div>

            <p className="muted" style={{ fontSize: "13px", margin: 0 }}>
              Control estricto según <strong>ASTM C31 / NMX-C-109</strong> (Cilindros deben ingresar a curado húmedo antes de 48h).
            </p>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Muestra</th>
                  <th>Cliente &amp; Obra</th>
                  <th>Elemento / Concreto</th>
                  <th>Especímenes</th>
                  <th>Muestreo</th>
                  <th>Semáforo Curado</th>
                  <th>Estado Logístico</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "30px" }}>
                      <div className="ensalia-shimmer-effect" style={{ height: "40px", borderRadius: "6px" }} />
                    </td>
                  </tr>
                ) : filteredSamples.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                      No se encontraron muestras pendientes de traslado en obra.
                    </td>
                  </tr>
                ) : (
                  filteredSamples.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.idMuestra}</strong>
                      </td>
                      <td>
                        <div><strong>{s.cliente}</strong></div>
                        <small className="muted">{s.obra}</small>
                      </td>
                      <td>
                        <div>{s.elemento || "Sin elemento"}</div>
                        <small className="muted">{s.tipoConcreto} ({s.fcKgCm2 ? `${s.fcKgCm2} kg/cm²` : "f'c N/E"})</small>
                      </td>
                      <td>
                        <span className="pill pill-default">
                          {s.numeroEspecimenes} cil.
                        </span>
                      </td>
                      <td>
                        <div>{new Date(s.fechaMuestreo).toLocaleDateString()}</div>
                        <small className="muted">{new Date(s.fechaMuestreo).toLocaleTimeString().slice(0, 5)}</small>
                      </td>
                      <td>
                        <CuringAlertBadge horas={s.horasTranscurridas} estado={s.estadoCurado} />
                      </td>
                      <td>
                        {s.enDespacho ? (
                          <span
                            className="pill"
                            style={{
                              background: "var(--ensalia-primary-50, #edf5fd)",
                              color: "var(--ensalia-primary-800, #0f3d64)",
                            }}
                          >
                            Asignada a {s.ultimoDespacho?.folio}
                          </span>
                        ) : (
                          <span className="pill pill-warning">
                            En espera de ruta
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* View 2: Manifiestos de Despacho */}
      {activeTab === "despachos" && (
        <section className="card" style={{ padding: "16px" }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Folio Manifiesto</th>
                  <th>Fecha Programada</th>
                  <th>Chofer / Vehículo</th>
                  <th>Ruta / Destino</th>
                  <th>Muestras Incluidas</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "30px" }}>
                      <div className="ensalia-shimmer-effect" style={{ height: "40px", borderRadius: "6px" }} />
                    </td>
                  </tr>
                ) : despachos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                      Aún no se han emitido manifiestos de despacho. Crea uno con el botón superior.
                    </td>
                  </tr>
                ) : (
                  despachos.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.folio}</strong>
                      </td>
                      <td>
                        <div>{new Date(d.fechaProgramada).toLocaleDateString()}</div>
                        <small className="muted">{new Date(d.fechaProgramada).toLocaleTimeString().slice(0, 5)}</small>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <User size={14} style={{ color: "var(--brand)" }} />
                          <strong>{d.choferOperador?.nombre || "Sin chofer"}</strong>
                        </div>
                        {d.vehiculo && (
                          <small className="muted">
                            {d.vehiculo} {d.placas ? `(${d.placas})` : ""}
                          </small>
                        )}
                      </td>
                      <td>
                        <div>{d.destino || "Sin destino"}</div>
                        <small className="muted">Origen: {d.origen || "Lab"}</small>
                      </td>
                      <td>
                        <span className="pill pill-default">
                          {d.items.length} muestras
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            d.estado === "COMPLETADO"
                              ? "pill-success"
                              : d.estado === "EN_TRANSITO"
                              ? "pill-warning"
                              : "pill-default"
                          }`}
                        >
                          {d.estado.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {d.estado === "PROGRAMADO" && (
                            <button
                              type="button"
                              className="secondary button-compact"
                              onClick={() => void handleUpdateStatus(d.id, "EN_TRANSITO")}
                              title="Marcar salida de laboratorio e inicio de recorrido"
                            >
                              <Truck size={14} />
                              <span>Iniciar Tránsito</span>
                            </button>
                          )}
                          {d.estado === "EN_TRANSITO" && (
                            <button
                              type="button"
                              className="primary button-compact"
                              onClick={() => void handleUpdateStatus(d.id, "COMPLETADO")}
                              title="Check-In en laboratorio: registrar muestras recolectadas e ingreso a curado"
                            >
                              <CheckCircle2 size={14} />
                              <span>Check-In Laboratorio</span>
                            </button>
                          )}
                          {d.estado === "COMPLETADO" && (
                            <span style={{ fontSize: "12px", color: "var(--ensalia-success-text, #065f46)" }}>
                              ✓ Entregado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal Nuevo Despacho */}
      <NewDispatchModal
        isOpen={showNewDispatch}
        pendingSamples={pendingSamples}
        isSaving={isSaving}
        onConfirm={(payload) => void handleCreateDispatch(payload)}
        onCancel={handleCloseNewDispatch}
      />
    </div>
  );
}

