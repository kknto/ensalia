"use client";

import React, { useEffect, useState } from "react";
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Tablet,
  MapPin,
} from "lucide-react";

interface Dispositivo {
  id: string;
  deviceUuid: string;
  nombre: string;
  modelo: string | null;
  plataforma: string;
  appVersion: string | null;
  codigoEnrolamiento: string | null;
  codigoExpiraEn: string | null;
  estado: "PENDIENTE" | "ACTIVO" | "BLOQUEADO" | "DADO_DE_BAJA";
  ultimoAcceso: string | null;
  ipUltimoAcceso: string | null;
  operadorAsignado: { id: string; nombre: string; rol: string } | null;
  creadoEn: string;
  _count: { muestras: number; fotos: number };
}

interface Meta {
  total: number;
  activos: number;
  dispositivosMaximos: number;
  disponiblesParaEnrolar: number;
}

export function DevicesPanel() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<string>("TODOS");
  const [error, setError] = useState<string>("");
  const [mensaje, setMensaje] = useState<string>("");

  // Modal de Enrolamiento
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [enrolamientoData, setEnrolamientoData] = useState<{
    codigo: string;
    expiraEn: string;
    serverUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    void cargarDispositivos();
  }, []);

  async function cargarDispositivos() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dispositivos");
      if (!res.ok) throw new Error("Error al obtener la lista de dispositivos.");
      const data = await res.json();
      setDispositivos(data.dispositivos || []);
      setMeta(data.meta || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  async function crearEnrolamiento() {
    setGenerando(true);
    setError("");
    try {
      const res = await fetch("/api/dispositivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevoNombre.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el código.");
      setEnrolamientoData(data.enrolamiento);
      setMensaje("Código y QR generados correctamente.");
      void cargarDispositivos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enrolar.");
    } finally {
      setGenerando(false);
    }
  }

  async function ejecutarAccion(id: string, accion: "bloquear" | "desbloquear" | "dar-de-baja" | "regenerar-codigo") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/dispositivos/${id}/${accion}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al ejecutar la acción.");
      setMensaje(data.mensaje || "Acción completada.");
      if (accion === "regenerar-codigo" && data.enrolamiento) {
        setEnrolamientoData(data.enrolamiento);
        setModalOpen(true);
      }
      void cargarDispositivos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en la operación.");
    } finally {
      setLoading(false);
    }
  }

  function copiarAlPortapapeles(texto: string) {
    void navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const dispositivosFiltrados = dispositivos.filter((d) => {
    if (filtro === "TODOS") return d.estado !== "DADO_DE_BAJA";
    return d.estado === filtro;
  });

  return (
    <div className="devices-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Encabezado y Métricas */}
      <section className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2>Control y Enrolamiento de Dispositivos Móviles</h2>
          <p className="muted">
            Gestiona y autoriza las tabletas y teléfonos de campo que sincronizan muestras, coordenadas GPS y fotos.
          </p>
        </div>
        <button
          type="button"
          className="primary large"
          onClick={() => {
            setEnrolamientoData(null);
            setNuevoNombre("");
            setModalOpen(true);
          }}
          disabled={meta ? meta.disponiblesParaEnrolar <= 0 : false}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <PlusCircle size={18} />
          <span>Vincular nuevo dispositivo</span>
        </button>
      </section>

      {/* Tarjetas de Métricas de Licencia */}
      {meta && (
        <div className="metric-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div className="card metric">
            <span className="muted">Dispositivos Activos</span>
            <strong style={{ fontSize: "28px", color: "var(--brand, #1e4a38)" }}>{meta.activos}</strong>
            <small>En servicio en obra</small>
          </div>
          <div className="card metric">
            <span className="muted">Límite de Licencia</span>
            <strong style={{ fontSize: "28px" }}>{meta.dispositivosMaximos}</strong>
            <small>Cupo máximo permitido</small>
          </div>
          <div className="card metric">
            <span className="muted">Disponibles</span>
            <strong style={{ fontSize: "28px", color: meta.disponiblesParaEnrolar > 0 ? "#137333" : "#d93025" }}>
              {meta.disponiblesParaEnrolar}
            </strong>
            <small>Para enrolar de inmediato</small>
          </div>
        </div>
      )}

      {/* Alertas */}
      {mensaje && (
        <div className="notice success" style={{ padding: "10px 14px", borderRadius: "6px", background: "#e6f4ea", color: "#137333" }}>
          {mensaje}
        </div>
      )}
      {error && (
        <div className="notice error" style={{ padding: "10px 14px", borderRadius: "6px", background: "#fce8e6", color: "#c5221f" }}>
          {error}
        </div>
      )}

      {/* Filtros de Lista */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          type="button"
          className={`tag-btn ${filtro === "TODOS" ? "primary" : ""}`}
          onClick={() => setFiltro("TODOS")}
        >
          Activos y Pendientes
        </button>
        <button
          type="button"
          className={`tag-btn ${filtro === "ACTIVO" ? "primary" : ""}`}
          onClick={() => setFiltro("ACTIVO")}
        >
          Solo Activos
        </button>
        <button
          type="button"
          className={`tag-btn ${filtro === "BLOQUEADO" ? "primary" : ""}`}
          onClick={() => setFiltro("BLOQUEADO")}
        >
          Bloqueados
        </button>
        <button
          type="button"
          className={`tag-btn ${filtro === "PENDIENTE" ? "primary" : ""}`}
          onClick={() => setFiltro("PENDIENTE")}
        >
          Pendientes de Enlace
        </button>
      </div>

      {/* Lista de Dispositivos */}
      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--table-header, #f8fafc)", textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "12px" }}>Dispositivo</th>
                <th style={{ padding: "12px" }}>Estado</th>
                <th style={{ padding: "12px" }}>Hardware UUID / Código</th>
                <th style={{ padding: "12px" }}>Operador Asignado</th>
                <th style={{ padding: "12px" }}>Último Enlace</th>
                <th style={{ padding: "12px" }}>Muestras / Fotos</th>
                <th style={{ padding: "12px", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dispositivosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
                    {loading ? "Cargando dispositivos..." : "No hay dispositivos registrados con este filtro."}
                  </td>
                </tr>
              ) : (
                dispositivosFiltrados.map((d) => {
                  const esActivo = d.estado === "ACTIVO";
                  const esBloqueado = d.estado === "BLOQUEADO";
                  const esPendiente = d.estado === "PENDIENTE";

                  return (
                    <tr key={d.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {d.plataforma === "IOS" ? <Smartphone size={20} /> : <Tablet size={20} />}
                          <div>
                            <strong>{d.nombre}</strong>
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                              {d.modelo || d.plataforma} {d.appVersion ? `· v${d.appVersion}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: esActivo ? "#e6f4ea" : esBloqueado ? "#fce8e6" : "#fef7e0",
                            color: esActivo ? "#137333" : esBloqueado ? "#c5221f" : "#b06000",
                          }}
                        >
                          {esActivo && <CheckCircle2 size={12} />}
                          {esBloqueado && <Lock size={12} />}
                          {esPendiente && <Clock size={12} />}
                          {d.estado}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>
                        {esPendiente && d.codigoEnrolamiento ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <strong style={{ color: "var(--brand)", fontSize: "14px" }}>{d.codigoEnrolamiento}</strong>
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => copiarAlPortapapeles(d.codigoEnrolamiento!)}
                              title="Copiar código de un solo uso"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        ) : (
                          <span title={d.deviceUuid} style={{ color: "var(--muted)" }}>
                            {d.deviceUuid.length > 20 ? `${d.deviceUuid.substring(0, 8)}...${d.deviceUuid.substring(d.deviceUuid.length - 6)}` : d.deviceUuid}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {d.operadorAsignado ? d.operadorAsignado.nombre : <span style={{ color: "var(--muted)" }}>Sin asignar</span>}
                      </td>
                      <td style={{ padding: "12px", fontSize: "12px", color: "var(--muted)" }}>
                        {d.ultimoAcceso ? new Date(d.ultimoAcceso).toLocaleString("es-MX") : "Nunca"}
                        {d.ipUltimoAcceso && <div style={{ fontSize: "10px" }}>IP: {d.ipUltimoAcceso}</div>}
                      </td>
                      <td style={{ padding: "12px", fontSize: "12px" }}>
                        <strong>{d._count.muestras}</strong> muestras · <strong>{d._count.fotos}</strong> fotos
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {esPendiente && (
                            <button
                              type="button"
                              className="button secondary small"
                              onClick={() => void ejecutarAccion(d.id, "regenerar-codigo")}
                              title="Ver QR o generar nuevo código"
                            >
                              <QrCode size={14} />
                            </button>
                          )}
                          {esActivo && (
                            <button
                              type="button"
                              className="button secondary small"
                              onClick={() => void ejecutarAccion(d.id, "bloquear")}
                              title="Bloquear inmediatamente este dispositivo"
                              style={{ color: "#c5221f" }}
                            >
                              <Lock size={14} />
                              <span>Bloquear</span>
                            </button>
                          )}
                          {esBloqueado && (
                            <button
                              type="button"
                              className="button secondary small"
                              onClick={() => void ejecutarAccion(d.id, "desbloquear")}
                              title="Reactivar dispositivo"
                            >
                              <Unlock size={14} />
                              <span>Reactivar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="button secondary small"
                            onClick={() => {
                              if (window.confirm(`¿Confirmas dar de baja '${d.nombre}'? Se liberará el cupo de la licencia.`)) {
                                void ejecutarAccion(d.id, "dar-de-baja");
                              }
                            }}
                            title="Dar de baja y liberar licencia"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Enrolamiento (QR + Código) */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="modal card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "24px",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <QrCode size={22} style={{ color: "var(--brand)" }} />
                <h3 style={{ margin: 0 }}>Vincular Tableta o Teléfono</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {!enrolamientoData ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <p className="muted" style={{ margin: 0 }}>
                  Asigna un nombre a la tableta de campo para identificarla en el laboratorio y generar su código de vinculación.
                </p>
                <div>
                  <label htmlFor="nombre-dispositivo" style={{ display: "block", marginBottom: "6px", fontWeight: 600 }}>
                    Nombre identificador del dispositivo:
                  </label>
                  <input
                    id="nombre-dispositivo"
                    type="text"
                    className="input"
                    placeholder="Ej. Tableta Obra Norte - Samsung Tab A9"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--line)" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" className="button secondary" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="button primary" onClick={crearEnrolamiento} disabled={generando}>
                    {generando ? "Generando..." : "Generar Código y QR"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
                {/* QR Code */}
                <div style={{ padding: "10px", background: "white", borderRadius: "8px", border: "1px solid var(--line)" }}>
                  <img src={enrolamientoData.qrDataUrl} alt="Código QR de Enrolamiento" style={{ width: "240px", height: "240px", display: "block" }} />
                </div>
                <small className="muted">Opción 1: Abre la app en el teléfono y escanea este código QR con la cámara.</small>

                {/* Código Manual */}
                <div style={{ width: "100%", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>
                    Opción 2: O ingresa este código de un solo uso en la app:
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "2px", color: "var(--brand)", fontFamily: "monospace" }}>
                      {enrolamientoData.codigo}
                    </span>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => copiarAlPortapapeles(enrolamientoData.codigo)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      {copiado ? <Check size={14} style={{ color: "#137333" }} /> : <Copy size={14} />}
                      <span>{copiado ? "Copiado" : "Copiar"}</span>
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Este código es de <strong>un solo uso</strong> y expira en 24 horas. Al vincularse, el hardware del teléfono quedará asegurado contra clonación.
                </div>

                <button
                  type="button"
                  className="button primary"
                  onClick={() => setModalOpen(false)}
                  style={{ width: "100%", marginTop: "8px" }}
                >
                  Entendido / Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
