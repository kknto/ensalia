"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Lock,
  Plus,
  Search,
  Trash2,
  X,
  FileText,
} from "lucide-react";
import { ConfirmDialog } from "@/features/samples/components/ConfirmDialog";
import { AnularDialog } from "@/features/samples/components/AnularDialog";
import { HelpButton } from "@/components/common/HelpButton";
import { HelpModal } from "@/components/common/HelpModal";

export type Sample = {
  id: string;
  idMuestra?: string;
  noMuestra?: string;
  fechaMuestreo?: string;
  estatusBitacora?: string;
  numeroToma?: number;
  numeroDentroColado?: number;
};

export type Pour = {
  id: string;
  version?: number;
  folio?: string;
  fechaColado?: string;
  fecha?: string;
  cliente: string;
  obra: string;
  elemento?: string;
  volumenM3?: number | string | null;
  volumenTotalM3?: number | string | null;
  estado?: string;
  numeroTomas?: number;
  muestras?: Sample[];
  _count?: { muestras?: number };
};

type Props = {
  headers: () => Record<string, string>;
  onMessage: (message: string, error?: boolean) => void;
  onEditSample: (id: string) => void;
};

const unpack = <T,>(data: unknown, key: string): T[] =>
  Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>)[key])
    ? ((data as Record<string, unknown>)[key] as T[])
    : [];

const dateText = (value?: string) => (value ? value.slice(0, 10) : "Sin fecha");

const stateText = (value?: string) =>
  ({
    ABIERTO: "Abierto",
    BORRADOR: "Borrador",
    REVISADA: "Revisada",
    CERRADA: "Cerrada",
    CERRADO: "Cerrado",
    ANULADA: "Anulada",
    ANULADO: "Anulado",
  }[value || ""] ||
  value?.replaceAll("_", " ").toLowerCase() ||
  "Sin estado");

export default function ColadosPanel({ headers, onMessage, onEditSample }: Props) {
  const [rows, setRows] = useState<Pour[]>([]);
  const [selected, setSelected] = useState<Pour | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Formulario nuevo colado
  const [form, setForm] = useState({
    fechaColado: new Date().toLocaleDateString("en-CA", { timeZone: "America/Cancun" }),
    cliente: "",
    obra: "",
    elemento: "",
    volumenM3: "",
    numeroTomas: 1,
  });

  // Diálogos accesibles
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    action: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: () => {},
  });

  const [anularDialog, setAnularDialog] = useState<{
    isOpen: boolean;
    pourId?: string;
    pourCode?: string;
  }>({
    isOpen: false,
  });

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function parse(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(
        new Error((data as { error?: string }).error || "No se pudo completar la operación."),
        { status: response.status }
      );
    }
    return data;
  }

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    try {
      setRows(unpack<Pour>(await parse(await fetch(`/api/colados?${params}`)), "colados"));
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "No se pudieron cargar los colados.", true);
    } finally {
      setLoading(false);
    }
  }

  async function open(item: Pour) {
    setLoading(true);
    try {
      const [detail, sampleData] = await Promise.all([
        parse(await fetch(`/api/colados/${item.id}`)),
        parse(await fetch(`/api/colados/${item.id}/muestras`)),
      ]);
      const found = (detail.colado || detail) as Pour;
      const linked = unpack<Sample>(sampleData, "muestras");
      setSelected({ ...found, muestras: linked });
      setSamples(linked);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "No se pudo abrir el colado.", true);
    } finally {
      setLoading(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await parse(
        await fetch("/api/colados", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            ...form,
            volumenM3: form.volumenM3 === "" ? null : Number(form.volumenM3),
            fechaColado: `${form.fechaColado}T12:00:00-05:00`,
          }),
        })
      );
      const created = (data.colado || data) as Pour;
      setShowCreate(false);
      onMessage(`Colado ${created.folio || "creado"}. Ya puedes registrar sus tomas.`);
      await load();
      await open(created);
    } catch (error) {
      onMessage(
        error instanceof Error && "status" in error && error.status === 409
          ? `Conflicto: ${error.message} Actualiza la lista e inténtalo nuevamente.`
          : error instanceof Error
          ? error.message
          : "No se pudo crear el colado.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  async function addSamples(amount: number) {
    if (!selected || amount < 1) return;
    setLoading(true);
    try {
      let currentVersion = selected.version;
      const targetTotal = samples.length + amount;
      if (targetTotal > (selected.numeroTomas || 0)) {
        const patchRes = await parse(
          await fetch(`/api/colados/${selected.id}`, {
            method: "PATCH",
            headers: headers(),
            body: JSON.stringify({
              numeroTomas: targetTotal,
              version: currentVersion,
            }),
          })
        );
        const updatedColado = (patchRes.colado || patchRes) as Pour;
        currentVersion = updatedColado.version ?? (currentVersion ? currentVersion + 1 : 1);
      }

      const data = await parse(
        await fetch(`/api/colados/${selected.id}/muestras`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            cantidad: amount,
            versionColado: currentVersion,
          }),
        })
      );
      const created = unpack<Sample>(data, "muestras");
      onMessage(
        `${created.length || amount} ${
          amount === 1 ? "toma agregada" : "tomas agregadas"
        } al colado. Completa cada borrador antes de revisarlo.`
      );
      await open(selected);
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error && "status" in error && error.status === 409
          ? `El colado cambió: ${error.message} Vuelve a abrirlo antes de continuar.`
          : error instanceof Error
          ? error.message
          : "No se pudieron agregar las tomas.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  function requestTransition(action: "cerrar" | "anular") {
    if (!selected) return;

    if (action === "anular") {
      setAnularDialog({
        isOpen: true,
        pourId: selected.id,
        pourCode: selected.folio || "sin folio",
      });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Cerrar evento de colado",
      description: `¿Confirmas el cierre del colado ${selected.folio || ""}? Todas las tomas deben estar previamente registradas.`,
      confirmLabel: "Cerrar colado",
      isDestructive: false,
      action: () => void executeTransition("cerrar", undefined),
    });
  }

  async function executeTransition(action: "cerrar" | "anular", motivo?: string) {
    if (!selected) return;
    setLoading(true);
    try {
      await parse(
        await fetch(`/api/colados/${selected.id}/${action}`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ version: selected.version, motivo }),
        })
      );
      onMessage(`Colado ${action === "cerrar" ? "cerrado" : "anulado"}.`);
      setSelected(null);
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "No se pudo cambiar el estado del colado.",
        true
      );
    } finally {
      setLoading(false);
      setAnularDialog({ isOpen: false });
    }
  }

  async function downloadPackage() {
    if (!selected) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/colados/${selected.id}/hoja-campo/pdf`, {
        headers: headers(),
      });
      if (!response.ok) await parse(response);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selected.folio || "colado"}-hojas-campo.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      onMessage("Hojas faltantes emitidas y paquete PDF descargado.");
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "No se pudo preparar y descargar el paquete PDF.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(
    () => ({
      active: rows.filter((item) => !["COMPLETO", "CERRADO", "ANULADO"].includes(item.estado || ""))
        .length,
      samples: rows.reduce(
        (sum, item) => sum + (item._count?.muestras ?? item.muestras?.length ?? 0),
        0
      ),
    }),
    [rows]
  );

  return (
    <>
      <section className="metric-grid pour-metrics" aria-label="Métricas de colados">
        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Colados visibles</span>
            <Layers size={18} style={{ color: "var(--muted)", opacity: 0.7 }} />
          </div>
          <strong>{rows.length}</strong>
          <small>En la consulta actual</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>En proceso</span>
            <Clock size={18} style={{ color: "var(--brand)", opacity: 0.8 }} />
          </div>
          <strong>{totals.active}</strong>
          <small>Con trabajo pendiente</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Tomas registradas</span>
            <CheckCircle2 size={18} style={{ color: "var(--brand-dark)", opacity: 0.8 }} />
          </div>
          <strong>{totals.samples}</strong>
          <small>En los colados visibles</small>
        </div>
      </section>

      <form
        className="card pour-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
        style={{ marginBottom: "20px" }}
      >
        <label className="field" style={{ flex: 1 }}>
          <span>Buscar colado</span>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Folio, cliente, obra o elemento"
              style={{ paddingLeft: "36px" }}
            />
            <Search
              size={16}
              style={{ position: "absolute", left: "12px", color: "var(--muted)", pointerEvents: "none" }}
            />
          </div>
        </label>
        <button
          className="secondary"
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Search size={16} />
          <span>{loading ? "Buscando…" : "Buscar"}</span>
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => setShowCreate(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={16} />
          <span>Nuevo colado</span>
        </button>
        <HelpButton onClick={() => setHelpOpen(true)} label="Guía de Colados" />
      </form>

      <section className="pour-grid" aria-busy={loading}>
        {loading ? (
          <PourSkeletonGrid />
        ) : (
          rows.map((item) => {
            const current = item._count?.muestras ?? item.muestras?.length ?? 0;
            const expected = item.numeroTomas || current;
            const percent = expected ? Math.min(100, Math.round((current / expected) * 100)) : 0;
            return (
              <button
                className="pour-card"
                key={item.id}
                onClick={() => void open(item)}
                style={{ textAlign: "left", cursor: "pointer" }}
              >
                <div className="pour-card-head">
                  <strong>{item.folio || "Colado sin folio"}</strong>
                  <span className={`status ${(item.estado || "BORRADOR").toLowerCase()}`}>
                    {stateText(item.estado)}
                  </span>
                </div>
                <span>
                  {dateText(item.fechaColado || item.fecha)} · {item.cliente}
                </span>
                <b>{item.obra}</b>
                {item.elemento && <small>{item.elemento}</small>}
                <div className="progress-label">
                  <span>
                    {current} de {expected || "?"} tomas
                  </span>
                  <span>{percent}%</span>
                </div>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label={`Progreso de ${item.folio || "colado"}`}
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${percent}%` }} />
                </div>
              </button>
            );
          })
        )}
        {!loading && !rows.length && (
          <div className="card empty" style={{ padding: "48px 24px", textAlign: "center", gridColumn: "1 / -1" }}>
            <Layers size={40} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.6 }} />
            <strong style={{ display: "block", fontSize: "16px", marginBottom: "4px" }}>
              No hay colados para mostrar
            </strong>
            <span style={{ color: "var(--muted)", fontSize: "14px" }}>
              Crea un colado para agrupar una o varias tomas del mismo evento técnico.
            </span>
          </div>
        )}
      </section>

      {showCreate && (
        <PourFormModal
          form={form}
          setForm={setForm}
          loading={loading}
          onClose={() => setShowCreate(false)}
          onSubmit={create}
        />
      )}

      {selected && (
        <PourDetailModal
          item={selected}
          samples={samples}
          loading={loading}
          onClose={() => setSelected(null)}
          onAdd={addSamples}
          onEditSample={onEditSample}
          onDownload={() => void downloadPackage()}
          onRequestTransition={requestTransition}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={() => {
          confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      <AnularDialog
        isOpen={anularDialog.isOpen}
        sampleCode={anularDialog.pourCode}
        isSaving={loading}
        onConfirm={(motivo) => executeTransition("anular", motivo)}
        onCancel={() => setAnularDialog({ isOpen: false })}
      />

      <HelpModal
        viewKey="colados"
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}

function PourSkeletonGrid() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="pour-card" style={{ opacity: 0.7, pointerEvents: "none" }}>
          <div className="pour-card-head" style={{ marginBottom: "10px" }}>
            <div style={{ width: "90px", height: "18px", borderRadius: "4px", background: "var(--line)" }} />
            <div style={{ width: "65px", height: "20px", borderRadius: "999px", background: "var(--line)" }} />
          </div>
          <div style={{ width: "160px", height: "14px", borderRadius: "4px", background: "var(--line)", marginBottom: "8px" }} />
          <div style={{ width: "120px", height: "16px", borderRadius: "4px", background: "var(--line)", marginBottom: "12px" }} />
          <div style={{ width: "100%", height: "8px", borderRadius: "999px", background: "var(--line)", marginTop: "auto" }} />
        </div>
      ))}
    </>
  );
}

function PourFormModal({
  form,
  setForm,
  loading,
  onClose,
  onSubmit,
}: {
  form: {
    fechaColado: string;
    cliente: string;
    obra: string;
    elemento: string;
    volumenM3: string;
    numeroTomas: number;
  };
  setForm: (value: typeof form) => void;
  loading: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-pour-title"
        onSubmit={onSubmit}
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">Evento de colado</p>
            <h2 id="new-pour-title">Nuevo colado</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        <p className="muted" style={{ marginBottom: "16px" }}>
          Agrupa todas las tomas realizadas durante el mismo evento de colado.
        </p>

        <div className="grid two pour-form">
          <label className="field">
            <span>Fecha del colado *</span>
            <input
              type="date"
              required
              value={form.fechaColado}
              onChange={(event) => setForm({ ...form, fechaColado: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Número de tomas previstas *</span>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={form.numeroTomas}
              onChange={(event) => setForm({ ...form, numeroTomas: Number(event.target.value) })}
            />
          </label>
          <label className="field">
            <span>Cliente *</span>
            <input
              required
              value={form.cliente}
              onChange={(event) => setForm({ ...form, cliente: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Obra *</span>
            <input
              required
              value={form.obra}
              onChange={(event) => setForm({ ...form, obra: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Elemento o frente</span>
            <input
              value={form.elemento}
              onChange={(event) => setForm({ ...form, elemento: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Volumen total (m³)</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={form.volumenM3}
              onChange={(event) => setForm({ ...form, volumenM3: event.target.value })}
            />
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: "24px", justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="primary" disabled={loading}>
            {loading ? "Creando…" : "Crear colado"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PourDetailModal({
  item,
  samples,
  loading,
  onClose,
  onAdd,
  onEditSample,
  onDownload,
  onRequestTransition,
}: {
  item: Pour;
  samples: Sample[];
  loading: boolean;
  onClose: () => void;
  onAdd: (amount: number) => void;
  onEditSample: (id: string) => void;
  onDownload: () => void;
  onRequestTransition: (action: "cerrar" | "anular") => void;
}) {
  const [amount, setAmount] = useState(1);
  const expected = item.numeroTomas || samples.length;
  const percent = expected ? Math.min(100, Math.round((samples.length / expected) * 100)) : 0;
  const isOpen = item.estado === "ABIERTO";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <section
        className="modal pour-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pour-detail-title"
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">Detalle del colado</p>
            <h2 id="pour-detail-title">{item.folio || "Colado"}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        <dl className="detail-grid" style={{ marginBottom: "20px" }}>
          <div>
            <dt>Fecha</dt>
            <dd>{dateText(item.fechaColado || item.fecha)}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={`status ${(item.estado || "BORRADOR").toLowerCase()}`}>
                {stateText(item.estado)}
              </span>
            </dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{item.cliente}</dd>
          </div>
          <div>
            <dt>Obra</dt>
            <dd>{item.obra}</dd>
          </div>
          <div>
            <dt>Elemento</dt>
            <dd>{item.elemento || "No indicado"}</dd>
          </div>
          <div>
            <dt>Volumen total</dt>
            <dd>{item.volumenM3 ?? item.volumenTotalM3 ?? "No indicado"} m³</dd>
          </div>
        </dl>

        <div className="progress-label">
          <strong>Progreso de tomas</strong>
          <span>
            {samples.length} de {expected || "?"} · {percent}%
          </span>
        </div>
        <div
          className="progress large-progress"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ marginBottom: "24px" }}
        >
          <span style={{ width: `${percent}%` }} />
        </div>

        <div className="section-head sample-add">
          <div>
            <h3>Tomas o muestras registradas</h3>
            <p className="muted">
              Cada toma conserva su propio folio, cuatro especímenes iniciales y trazabilidad independiente.
            </p>
          </div>
          {isOpen && (
            <div className="inline-add" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label>
                <span className="sr-only">Cantidad de tomas</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  style={{ width: "64px" }}
                />
              </label>
              <button
                type="button"
                className="primary"
                disabled={loading || amount < 1}
                onClick={() => void onAdd(amount)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} />
                <span>
                  {samples.length + amount > expected
                    ? `Ampliar y agregar ${amount === 1 ? "1 toma" : `${amount} tomas`}`
                    : `Agregar ${amount === 1 ? "toma" : "tomas"}`}
                </span>
              </button>
            </div>
          )}
        </div>

        <ol className="sample-list" style={{ maxHeight: "240px", overflowY: "auto", margin: "16px 0" }}>
          {samples.map((sample, index) => (
            <li key={sample.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="sample-number">{sample.numeroDentroColado || index + 1}</span>
                <div>
                  <strong>{sample.idMuestra || sample.noMuestra || `Toma ${index + 1}`}</strong>
                  <small style={{ display: "block", color: "var(--muted)" }}>
                    {dateText(sample.fechaMuestreo)} · {stateText(sample.estatusBitacora)}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => onEditSample(sample.id)}
              >
                Completar toma
              </button>
            </li>
          ))}
          {!samples.length && (
            <li className="empty" style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
              Aún no hay tomas registradas en este colado.
            </li>
          )}
        </ol>

        <p className="muted" style={{ fontSize: "13px", marginBottom: "16px" }}>
          Al descargar, Ensalia emitirá automáticamente las hojas de campo pendientes y las conservará como documentos controlados con código QR.
        </p>

        <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
          <button
            type="button"
            className="secondary"
            disabled={loading || !samples.length}
            onClick={onDownload}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Download size={16} />
            <span>{loading ? "Preparando PDF…" : "Emitir y descargar paquete PDF"}</span>
          </button>
          {isOpen && (
            <button
              type="button"
              className="primary"
              disabled={loading || samples.length !== expected}
              onClick={() => onRequestTransition("cerrar")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Lock size={16} />
              <span>Cerrar colado</span>
            </button>
          )}
          {isOpen && (
            <button
              type="button"
              className="danger"
              disabled={loading}
              onClick={() => onRequestTransition("anular")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Trash2 size={16} />
              <span>Anular colado</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
