"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import BulkInventoryWizard from "./BulkInventoryWizard";
import {
  CalibrateModal,
  ChangeStateModal,
  InventoryTableSkeleton,
} from "./InventoryModals";
import { CertificateViewerModal } from "./CertificateViewerModal";

export type EquipmentType = {
  id: string;
  nombre: string;
  codigo?: string;
  requiereCalibracion?: boolean;
  esMolde?: boolean;
};

export type CalibrationRecord = {
  id: string;
  fechaCalibracion: string;
  vigenteHasta?: string | null;
  resultado: string;
  certificado?: string | null;
  proveedor?: string | null;
  documento?: {
    id: string;
    nombreArchivo: string;
    hashSha256: string;
    tamano: number;
    rutaRelativa: string;
  } | null;
};

export type Equipment = {
  id: string;
  version?: number;
  tipoId?: string;
  tipo?: EquipmentType | string;
  numeroSerie?: string | null;
  codigoInterno: string;
  estado: string;
  ubicacion?: string;
  calibracionVigenteHasta?: string | null;
  notas?: string;
  historial?: Array<Record<string, unknown>>;
  calibraciones?: CalibrationRecord[];
};

type Props = {
  headers: () => Record<string, string>;
  onMessage: (message: string, error?: boolean) => void;
};

export const stateLabel = (value: string): string =>
  ({
    DISPONIBLE: "Disponible",
    ASIGNADO: "Asignado",
    MANTENIMIENTO: "Mantenimiento",
    FUERA_SERVICIO: "Fuera de servicio",
    BAJA: "Baja",
    EXTRAVIADO: "Extraviado",
  }[value] || value.replaceAll("_", " "));

export const equipmentName = (item: Equipment): string =>
  item.codigoInterno || item.numeroSerie || "Equipo sin código";

const list = <T,>(data: unknown, key: string): T[] =>
  Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as Record<string, unknown>)[key])
      ? ((data as Record<string, unknown>)[key] as T[])
      : [];

export default function InventoryPanel({ headers, onMessage }: Props) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [typeId, setTypeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  // Modales accesibles (reemplazo de window.prompt)
  const [stateChangeReq, setStateChangeReq] = useState<{
    item: Equipment;
    next: string;
  } | null>(null);

  const [calibrateReq, setCalibrateReq] = useState<Equipment | null>(null);
  const [viewingCert, setViewingCert] = useState<{
    equipoId: string;
    calibracionId: string;
    nombreArchivo: string;
    hashSha256: string;
    tamanoBytes?: number;
  } | null>(null);

  const counts = useMemo(
    () => ({
      total: equipment.length,
      available: equipment.filter((item) => item.estado === "DISPONIBLE").length,
      unavailable: equipment.filter((item) => item.estado === "FUERA_SERVICIO").length,
      expired: equipment.filter(
        (item) =>
          item.calibracionVigenteHasta &&
          item.calibracionVigenteHasta.slice(0, 10) <
            new Date().toISOString().slice(0, 10)
      ).length,
    }),
    [equipment]
  );

  useEffect(() => {
    void Promise.all([load(), loadTypes()]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function parse(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        (data as { error?: string }).error || "No se pudo completar la operación."
      );
      error.name = String(response.status);
      throw error;
    }
    return data;
  }

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (state) params.set("estado", state);
    if (typeId) params.set("tipoId", typeId);
    try {
      setEquipment(
        list<Equipment>(
          await parse(await fetch(`/api/equipos?${params}`)),
          "equipos"
        )
      );
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el inventario.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadTypes() {
    try {
      setTypes(
        list<EquipmentType>(
          await parse(await fetch("/api/equipos/tipos")),
          "tipos"
        )
      );
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los tipos de equipo.",
        true
      );
    }
  }

  function requestChangeState(item: Equipment, next: string) {
    setStateChangeReq({ item, next });
  }

  async function executeChangeState(motivo: string) {
    if (!stateChangeReq) return;
    const { item, next } = stateChangeReq;
    setActionLoading(true);
    try {
      await parse(
        await fetch(`/api/equipos/${item.id}/estado`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            estado: next,
            motivo,
            version: item.version ?? 0,
          }),
        })
      );
      onMessage(
        `${equipmentName(item)} ahora está ${stateLabel(next).toLowerCase()}.`
      );
      setStateChangeReq(null);
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error && error.name === "409"
          ? `Conflicto: ${error.message} Actualiza el inventario y vuelve a intentarlo.`
          : error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado.",
        true
      );
    } finally {
      setActionLoading(false);
    }
  }

  function requestCalibrate(item: Equipment) {
    setCalibrateReq(item);
  }

  async function executeCalibrate(
    fecha: string,
    venceEn: string,
    file?: File | null,
    certificado?: string,
    proveedor?: string
  ) {
    if (!calibrateReq) return;
    const item = calibrateReq;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/equipos/${item.id}/calibraciones`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          fecha: `${fecha}T12:00:00-05:00`,
          venceEn: `${venceEn}T12:00:00-05:00`,
          certificado: certificado || undefined,
          proveedor: proveedor || undefined,
          resultado: "APROBADO",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "No se pudo registrar la calibración.");
      }

      if (file && data.id) {
        const formData = new FormData();
        formData.append("file", file);
        const hdrs = headers();
        const uploadRes = await fetch(`/api/equipos/${item.id}/calibraciones/${data.id}/documento`, {
          method: "POST",
          headers: hdrs["x-operator-name"] ? { "x-operator-name": hdrs["x-operator-name"] } : {},
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          console.warn("Calibración guardada pero falló carga de PDF:", errData.error);
        }
      }

      onMessage(`Calibración ${file ? "y certificado PDF " : ""}registrada para ${equipmentName(item)}.`);
      setCalibrateReq(null);
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la calibración.",
        true
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function openEquipment(item: Equipment) {
    try {
      const data = await parse(await fetch(`/api/equipos/${item.id}`));
      setEditing((data as { equipo?: Equipment }).equipo || (data as Equipment));
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "No se pudo consultar el historial del equipo.",
        true
      );
    }
  }

  return (
    <>
      <section className="metric-grid inventory-metrics" aria-label="Resumen de equipos">
        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Total equipos</span>
            <Boxes size={18} style={{ color: "var(--muted)", opacity: 0.7 }} />
          </div>
          <strong>{counts.total}</strong>
          <small>Registrados</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Disponibles</span>
            <CheckCircle2 size={18} style={{ color: "var(--brand)", opacity: 0.8 }} />
          </div>
          <strong>{counts.available}</strong>
          <small>En laboratorio</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Fuera de servicio</span>
            <Wrench size={18} style={{ color: "var(--danger)", opacity: 0.8 }} />
          </div>
          <strong>{counts.unavailable}</strong>
          <small>En mantenimiento o baja</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Calibración vencida</span>
            <ShieldAlert size={18} style={{ color: "var(--danger)", opacity: 0.8 }} />
          </div>
          <strong style={{ color: counts.expired > 0 ? "var(--danger)" : undefined }}>
            {counts.expired}
          </strong>
          <small>Requieren atención</small>
        </div>
      </section>

      <form
        className="card filters inventory-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="field">
          <span>Buscar</span>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Código interno o serie del fabricante"
              style={{ paddingLeft: "36px" }}
            />
            <Search
              size={16}
              style={{ position: "absolute", left: "12px", color: "var(--muted)", pointerEvents: "none" }}
            />
          </div>
        </label>

        <label className="field">
          <span>Tipo</span>
          <select value={typeId} onChange={(event) => setTypeId(event.target.value)}>
            <option value="">Todos los tipos</option>
            {types.map((item) => (
              <option value={item.id} key={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Estado</span>
          <select value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">Todos los estados</option>
            {[
              "DISPONIBLE",
              "ASIGNADO",
              "MANTENIMIENTO",
              "FUERA_SERVICIO",
              "BAJA",
              "EXTRAVIADO",
            ].map((value) => (
              <option value={value} key={value}>
                {stateLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <div className="filter-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            className="primary"
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Search size={16} />
            <span>{loading ? "Buscando…" : "Buscar"}</span>
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} />
            <span>Alta de equipo</span>
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setShowBulk(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FileSpreadsheet size={16} />
            <span>Carga masiva</span>
          </button>
        </div>
      </form>

      <section className="card table-wrap" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th scope="col">Equipo</th>
              <th scope="col">Tipo</th>
              <th scope="col">Estado</th>
              <th scope="col">Calibración</th>
              <th scope="col">Ubicación</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <InventoryTableSkeleton />
            ) : (
              equipment.map((item) => {
                const type =
                  typeof item.tipo === "object"
                    ? item.tipo
                    : types.find((candidate) => candidate.id === item.tipoId);
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.codigoInterno}</strong>
                      <small style={{ display: "block", color: "var(--muted)", fontSize: "12px" }}>
                        {item.numeroSerie
                          ? `Serie: ${item.numeroSerie}`
                          : "Sin serie de fabricante"}
                      </small>
                    </td>
                    <td>
                      {type?.nombre ||
                        (typeof item.tipo === "string" ? item.tipo : "—")}
                    </td>
                    <td>
                      <span className={`equipment-state ${item.estado.toLowerCase()}`}>
                        {stateLabel(item.estado)}
                      </span>
                    </td>
                    <td>
                      {item.calibracionVigenteHasta
                        ? item.calibracionVigenteHasta.slice(0, 10)
                        : "No aplica / sin dato"}
                    </td>
                    <td>{item.ubicacion || "—"}</td>
                    <td className="table-actions">
                      <button
                        className="text-button"
                        onClick={() => void openEquipment(item)}
                      >
                        Historial
                      </button>

                      {type?.requiereCalibracion && (
                        <button
                          className="text-button"
                          onClick={() => requestCalibrate(item)}
                        >
                          Calibrar
                        </button>
                      )}

                      {item.estado === "DISPONIBLE" && (
                        <button
                          className="secondary"
                          onClick={() => requestChangeState(item, "MANTENIMIENTO")}
                        >
                          Mantenimiento
                        </button>
                      )}

                      {item.estado !== "FUERA_SERVICIO" &&
                        item.estado !== "BAJA" &&
                        item.estado !== "ASIGNADO" && (
                          <button
                            className="danger-quiet"
                            onClick={() => requestChangeState(item, "FUERA_SERVICIO")}
                          >
                            Fuera de servicio
                          </button>
                        )}

                      {["MANTENIMIENTO", "FUERA_SERVICIO", "EXTRAVIADO"].includes(
                        item.estado
                      ) && (
                        <button
                          className="secondary"
                          onClick={() => requestChangeState(item, "DISPONIBLE")}
                        >
                          Habilitar
                        </button>
                      )}

                      {item.estado !== "BAJA" && item.estado !== "ASIGNADO" && (
                        <button
                          className="danger-quiet"
                          onClick={() => requestChangeState(item, "BAJA")}
                        >
                          Dar de baja
                        </button>
                      )}

                      {item.estado !== "EXTRAVIADO" &&
                        item.estado !== "BAJA" &&
                        item.estado !== "ASIGNADO" && (
                          <button
                            className="danger-quiet"
                            onClick={() => requestChangeState(item, "EXTRAVIADO")}
                          >
                            Extraviado
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {!loading && !equipment.length && (
          <div className="empty" style={{ padding: "36px 20px", textAlign: "center" }}>
            <Boxes size={36} style={{ margin: "0 auto 8px", color: "var(--muted)", opacity: 0.6 }} />
            <p className="empty" style={{ margin: 0 }}>
              No hay equipos que coincidan con los filtros de búsqueda.
            </p>
          </div>
        )}
      </section>

      {showForm && (
        <EquipmentForm
          item={editing}
          types={types}
          headers={headers}
          onClose={() => setShowForm(false)}
          onSaved={async (message) => {
            setShowForm(false);
            onMessage(message);
            await load();
          }}
          onError={(message) => onMessage(message, true)}
        />
      )}

      {showBulk && (
        <BulkInventoryWizard
          types={types}
          headers={headers}
          onClose={() => setShowBulk(false)}
          onComplete={async (message) => {
            onMessage(message);
            await load();
          }}
          onError={(message) => onMessage(message, true)}
        />
      )}

      {/* Modal accesible de cambio de estado */}
      <ChangeStateModal
        isOpen={Boolean(stateChangeReq)}
        item={stateChangeReq?.item || null}
        nextState={stateChangeReq?.next || ""}
        isSaving={actionLoading}
        onConfirm={(motivo) => void executeChangeState(motivo)}
        onCancel={() => setStateChangeReq(null)}
      />

      {/* Modal accesible de registro de calibración */}
      <CalibrateModal
        isOpen={Boolean(calibrateReq)}
        item={calibrateReq}
        isSaving={actionLoading}
        onConfirm={(fecha, venceEn, file, certificado, proveedor) =>
          void executeCalibrate(fecha, venceEn, file, certificado, proveedor)
        }
        onCancel={() => setCalibrateReq(null)}
      />

      {/* Modal visor de certificados PDF con hash SHA-256 inmutable */}
      {viewingCert && (
        <CertificateViewerModal
          isOpen={Boolean(viewingCert)}
          equipoId={viewingCert.equipoId}
          calibracionId={viewingCert.calibracionId}
          nombreArchivo={viewingCert.nombreArchivo}
          hashSha256={viewingCert.hashSha256}
          tamanoBytes={viewingCert.tamanoBytes}
          onClose={() => setViewingCert(null)}
        />
      )}

      {editing?.historial && editing.historial.length > 0 && (
        <section className="card" style={{ marginTop: "24px" }}>
          <h2>Historial de {equipmentName(editing)}</h2>
          <ol className="history-list">
            {editing.historial.map((event, index) => (
              <li key={index}>
                {String(
                  event.tipo || event.accion || event.estado || "Actualización"
                )}{" "}
                <small>{String(event.creadoEn || event.fecha || "")}</small>
              </li>
            ))}
          </ol>
        </section>
      )}

      {editing?.calibraciones && editing.calibraciones.length > 0 && (
        <section className="card" style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Metrología y Trazabilidad</p>
              <h2 style={{ margin: 0, fontSize: "18px" }}>Certificados de Calibración: {equipmentName(editing)}</h2>
            </div>
            <button
              type="button"
              className="primary button-compact"
              onClick={() => requestCalibrate(editing)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={14} />
              <span>Nueva calibración</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Vigencia</th>
                  <th>Resultado</th>
                  <th>Certificado / Proveedor</th>
                  <th style={{ textAlign: "right" }}>Certificado PDF</th>
                </tr>
              </thead>
              <tbody>
                {editing.calibraciones.map((cal) => (
                  <tr key={cal.id}>
                    <td>{cal.fechaCalibracion.slice(0, 10)}</td>
                    <td>
                      {cal.vigenteHasta ? (
                        <span
                          style={{
                            fontWeight: 500,
                            color:
                              cal.vigenteHasta.slice(0, 10) < new Date().toISOString().slice(0, 10)
                                ? "var(--danger)"
                                : "var(--brand)",
                          }}
                        >
                          {cal.vigenteHasta.slice(0, 10)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className={`pill ${cal.resultado === "APROBADO" ? "pill-success" : "pill-danger"}`}>
                        {cal.resultado}
                      </span>
                    </td>
                    <td>
                      <div><strong>{cal.certificado || "Sin folio"}</strong></div>
                      {cal.proveedor && <small className="muted">{cal.proveedor}</small>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {cal.documento ? (
                        <button
                          type="button"
                          className="secondary button-compact"
                          onClick={() =>
                            setViewingCert({
                              equipoId: editing.id,
                              calibracionId: cal.id,
                              nombreArchivo: cal.documento!.nombreArchivo,
                              hashSha256: cal.documento!.hashSha256,
                              tamanoBytes: cal.documento!.tamano,
                            })
                          }
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <FileText size={14} style={{ color: "var(--brand)" }} />
                          <span>Ver PDF (SHA-256)</span>
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: "12px" }}>Sin adjunto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function EquipmentForm({
  item,
  types,
  headers,
  onClose,
  onSaved,
  onError,
}: {
  item: Equipment | null;
  types: EquipmentType[];
  headers: Props["headers"];
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({
    tipoId:
      item?.tipoId || (typeof item?.tipo === "object" ? item.tipo.id : ""),
    numeroSerie: item?.numeroSerie || "",
    codigoInterno: item?.codigoInterno || "",
    ubicacion: item?.ubicacion || "",
    notas: item?.notas || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const values = { ...form, numeroSerie: form.numeroSerie || null };
      const response = await fetch(
        item ? `/api/equipos/${item.id}` : "/api/equipos",
        {
          method: item ? "PATCH" : "POST",
          headers: headers(),
          body: JSON.stringify(
            item ? { ...values, version: item.version ?? 0 } : values
          ),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? `Conflicto: ${data.error || "el código interno ya existe"}.`
            : data.error || "No se pudo guardar el equipo."
        );
      onSaved(item ? "Equipo actualizado." : "Equipo dado de alta.");
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "No se pudo guardar el equipo."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipment-form-title"
        onSubmit={submit}
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">Inventario de laboratorio</p>
            <h2 id="equipment-form-title">
              {item ? `Editar equipo: ${item.codigoInterno}` : "Alta de nuevo equipo"}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid two" style={{ marginTop: "16px" }}>
          <label className="field">
            <span>Tipo de equipo *</span>
            <select
              required
              value={form.tipoId}
              onChange={(event) =>
                setForm({ ...form, tipoId: event.target.value })
              }
            >
              <option value="">Seleccionar tipo</option>
              {types.map((type) => (
                <option value={type.id} key={type.id}>
                  {type.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Código interno *</span>
            <input
              required
              autoFocus
              value={form.codigoInterno}
              onChange={(event) =>
                setForm({ ...form, codigoInterno: event.target.value })
              }
              placeholder="Ej. CIL-01 / CONO-02"
            />
          </label>

          <label className="field">
            <span>Serie del fabricante (opcional)</span>
            <input
              value={form.numeroSerie}
              onChange={(event) =>
                setForm({ ...form, numeroSerie: event.target.value })
              }
              placeholder="Ej. SN-894231"
            />
          </label>

          <label className="field">
            <span>Ubicación en laboratorio</span>
            <input
              value={form.ubicacion}
              onChange={(event) =>
                setForm({ ...form, ubicacion: event.target.value })
              }
              placeholder="Ej. Cuarto de curado / Mesa 2"
            />
          </label>
        </div>

        <label className="field" style={{ marginTop: "12px" }}>
          <span>Notas técnicas</span>
          <textarea
            rows={3}
            value={form.notas}
            onChange={(event) =>
              setForm({ ...form, notas: event.target.value })
            }
            placeholder="Observaciones de estado físico, marcas o calibración previa"
          />
        </label>

        <div className="modal-actions" style={{ marginTop: "24px", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="primary" disabled={saving}>
            {saving ? "Guardando…" : item ? "Guardar cambios" : "Registrar equipo"}
          </button>
        </div>
      </form>
    </div>
  );
}
