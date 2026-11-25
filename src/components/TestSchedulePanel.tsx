"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckSquare,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
} from "lucide-react";
import { HelpButton } from "@/components/common/HelpButton";
import { HelpModal } from "@/components/common/HelpModal";

type ScheduleItem = {
  especimenId: string;
  numero: number;
  tipo: string;
  edadDias: number | null;
  fechaProgramada: string;
  origenFecha: "REGISTRADA" | "CALCULADA";
  programacion: "PROVISIONAL" | "CONFIRMADA";
  moldeCodigo?: string | null;
  muestra: {
    id: string;
    idMuestra: string;
    noMuestra: string;
    fechaMuestreo: string;
    cliente: string;
    obra: string;
    elemento?: string | null;
    fcKgCm2?: string | number | null;
    estatusBitacora: string;
    colado?: { id: string; folio: string } | null;
  };
};

type ScheduleResponse = {
  items: ScheduleItem[];
  resumen?: {
    total?: number;
    hoy?: number;
    proximos?: number;
    vencidos?: number;
    porFecha?: Record<string, number>;
  };
};

type Props = {
  headers: () => Record<string, string>;
  onMessage: (message: string, error?: boolean) => void;
  onOpenSample: (id: string) => void;
};

type Scope = "HOY" | "MANANA" | "PROXIMOS" | "VENCIDOS";

const TYPE_LABELS: Record<string, string> = {
  CILINDRO_15X30: "Cilindro 15×30",
  CILINDRO_10X20: "Cilindro 10×20",
  VIGA_50X15X15: "Viga 50×15×15",
};

function civilToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cancun",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function monthBounds(month: string) {
  const [year, number] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function typeLabel(value: string) {
  return TYPE_LABELS[value] || value.replaceAll("_", " ").toLowerCase();
}

async function responseData(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (data as { error?: string }).error || "No se pudo cargar el programa de ensayes."
    );
  }
  return data as ScheduleResponse;
}

export default function TestSchedulePanel({ headers, onMessage, onOpenSample }: Props) {
  const today = useMemo(civilToday, []);
  const [mode, setMode] = useState<"AGENDA" | "CALENDARIO">("AGENDA");
  const [scope, setScope] = useState<Scope>("HOY");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // La API limita las consultas a 370 días.
  const requestRange = useMemo(
    () =>
      mode === "CALENDARIO"
        ? monthBounds(month)
        : { from: addDays(today, -360), to: addDays(today, 7) },
    [mode, month, today]
  );

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      desde: requestRange.from,
      hasta: requestRange.to,
      incluirBorradores: String(includeDrafts),
    });
    if (query.trim()) params.set("q", query.trim());
    if (type) params.set("tipo", type);
    if (status) params.set("estado", status);
    try {
      const data = await responseData(
        await fetch(`/api/ensayos/calendario?${params}`, { headers: headers() })
      );
      setItems(data.items || []);
      onMessage("");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "No se pudo cargar el programa.", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [requestRange.from, requestRange.to, includeDrafts]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(
    () => ({
      today: items.filter((item) => item.fechaProgramada === today).length,
      tomorrow: items.filter((item) => item.fechaProgramada === addDays(today, 1)).length,
      upcoming: items.filter(
        (item) => item.fechaProgramada > today && item.fechaProgramada <= addDays(today, 7)
      ).length,
      overdue: items.filter((item) => item.fechaProgramada < today).length,
    }),
    [items, today]
  );

  const visible = useMemo(
    () =>
      items
        .filter((item) => {
          if (mode === "CALENDARIO") return item.fechaProgramada === selectedDate;
          if (scope === "HOY") return item.fechaProgramada === today;
          if (scope === "MANANA") return item.fechaProgramada === addDays(today, 1);
          if (scope === "PROXIMOS")
            return item.fechaProgramada > today && item.fechaProgramada <= addDays(today, 7);
          return item.fechaProgramada < today;
        })
        .sort(
          (a, b) =>
            a.fechaProgramada.localeCompare(b.fechaProgramada) ||
            a.muestra.idMuestra.localeCompare(b.muestra.idMuestra) ||
            a.numero - b.numero
        ),
    [items, mode, scope, selectedDate, today]
  );

  const days = useMemo(() => {
    const bounds = monthBounds(month);
    const first = new Date(`${bounds.from}T00:00:00Z`).getUTCDay();
    const cells: Array<string | null> = Array(first).fill(null);
    for (let day = 1; day <= Number(bounds.to.slice(-2)); day += 1) {
      cells.push(`${month}-${String(day).padStart(2, "0")}`);
    }
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);

  const byDate = useMemo(
    () =>
      items.reduce<Record<string, number>>((result, item) => {
        result[item.fechaProgramada] = (result[item.fechaProgramada] || 0) + 1;
        return result;
      }, {}),
    [items]
  );

  async function download(format: "pdf" | "csv") {
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        fecha: selectedDate,
        incluirBorradores: String(includeDrafts),
      });
      if (query.trim()) params.set("q", query.trim());
      if (type) params.set("tipo", type);
      if (status) params.set("estado", status);
      const response = await fetch(`/api/ensayos/diario.${format}?${params}`, {
        headers: headers(),
      });
      if (!response.ok) {
        throw new Error(
          ((await response.json().catch(() => ({}))) as { error?: string }).error ||
            "No se pudo generar el reporte."
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `programa-ensayes-${selectedDate}.${format}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "No se pudo generar el reporte.", true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="schedule-layout">
      {/* Encabezado y Selector de Modo */}
      <section className="card schedule-intro">
        <div>
          <p className="eyebrow">Planeación del laboratorio</p>
          <h2>Programa de ensayes</h2>
          <p className="muted">
            Consulta cada espécimen por su fecha prevista. Las fechas calculadas son propuestas técnicas y se identifican con claridad.
          </p>
        </div>
        <div className="view-switch" role="group" aria-label="Vista del programa" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <HelpButton onClick={() => setHelpOpen(true)} label="Guía de ensayes" />
          <button
            type="button"
            className={mode === "AGENDA" ? "primary" : "secondary"}
            onClick={() => setMode("AGENDA")}
            aria-pressed={mode === "AGENDA"}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Clock size={16} />
            <span>Agenda</span>
          </button>
          <button
            type="button"
            className={mode === "CALENDARIO" ? "primary" : "secondary"}
            onClick={() => setMode("CALENDARIO")}
            aria-pressed={mode === "CALENDARIO"}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <CalendarDays size={16} />
            <span>Calendario</span>
          </button>
        </div>
      </section>

      {/* Métricas por Alcance Temporal */}
      <section className="metric-grid schedule-metrics" aria-label="Resumen de ensayes">
        <button
          type="button"
          className={scope === "HOY" ? "metric active" : "metric"}
          onClick={() => {
            setMode("AGENDA");
            setScope("HOY");
            setSelectedDate(today);
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Hoy</span>
            <CheckSquare size={16} style={{ color: "var(--brand)" }} />
          </div>
          <strong>{loading ? "…" : counts.today}</strong>
          <small>Programados hoy</small>
        </button>

        <button
          type="button"
          className={scope === "MANANA" ? "metric active" : "metric"}
          onClick={() => {
            setMode("AGENDA");
            setScope("MANANA");
            setSelectedDate(addDays(today, 1));
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Mañana</span>
            <Calendar size={16} style={{ color: "var(--brand)" }} />
          </div>
          <strong>{loading ? "…" : counts.tomorrow}</strong>
          <small>Preparación próxima</small>
        </button>

        <button
          type="button"
          className={scope === "PROXIMOS" ? "metric active" : "metric"}
          onClick={() => {
            setMode("AGENDA");
            setScope("PROXIMOS");
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Próximos 7 días</span>
            <CalendarDays size={16} style={{ color: "var(--brand-dark)" }} />
          </div>
          <strong>{loading ? "…" : counts.upcoming}</strong>
          <small>Por atender</small>
        </button>

        <button
          type="button"
          className={scope === "VENCIDOS" ? "metric overdue" : "metric"}
          onClick={() => {
            setMode("AGENDA");
            setScope("VENCIDOS");
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Fechas vencidas</span>
            <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
          </div>
          <strong style={{ color: counts.overdue > 0 ? "var(--danger)" : undefined }}>
            {loading ? "…" : counts.overdue}
          </strong>
          <small>Requieren revisión</small>
        </button>
      </section>

      {/* Filtros */}
      <form
        className="card schedule-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <label className="field">
          <span>Buscar</span>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Muestra, cliente, obra o colado"
              style={{ paddingLeft: "36px" }}
            />
            <Search
              size={16}
              style={{ position: "absolute", left: "12px", color: "var(--muted)", pointerEvents: "none" }}
            />
          </div>
        </label>

        <label className="field">
          <span>Tipo de espécimen</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="CILINDRO_15X30">Cilindro 15×30</option>
            <option value="CILINDRO_10X20">Cilindro 10×20</option>
            <option value="VIGA_50X15X15">Viga 50×15×15</option>
          </select>
        </label>

        <label className="field">
          <span>Estado de muestra</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="BORRADOR">Borrador</option>
            <option value="REVISADA">Revisada</option>
            <option value="CERRADA">Cerrada</option>
          </select>
        </label>

        <label className="switch-row schedule-drafts">
          <input
            type="checkbox"
            checked={includeDrafts}
            onChange={(event) => setIncludeDrafts(event.target.checked)}
          />
          <span>
            <strong>Mostrar borradores</strong>
            <small>Se señalan como provisionales</small>
          </span>
        </label>

        <button
          className="primary"
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Search size={16} />
          <span>{loading ? "Consultando…" : "Aplicar filtros"}</span>
        </button>
      </form>

      {/* Vista de Calendario Mensual */}
      {mode === "CALENDARIO" && (
        <section className="card schedule-calendar">
          <div className="section-head">
            <div>
              <h2>Calendario mensual</h2>
              <p className="muted">Selecciona un día para inspeccionar sus especímenes programados.</p>
            </div>
            <label className="field month-picker">
              <span>Mes</span>
              <input
                type="month"
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value);
                  setSelectedDate(`${event.target.value}-01`);
                }}
              />
            </label>
          </div>

          <div className="calendar-weekdays" aria-hidden="true">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div
            className="calendar-grid"
            role="grid"
            aria-label={`Ensayes de ${formatDate(`${month}-01`, { month: "long", year: "numeric" })}`}
          >
            {days.map((date, index) =>
              date ? (
                <button
                  type="button"
                  key={date}
                  className={`calendar-day${date === selectedDate ? " selected" : ""}${
                    date === today ? " today" : ""
                  }`}
                  onClick={() => setSelectedDate(date)}
                  aria-label={`${formatDate(date)}, ${byDate[date] || 0} especímenes`}
                  aria-pressed={date === selectedDate}
                >
                  <span>{Number(date.slice(-2))}</span>
                  {Boolean(byDate[date]) && (
                    <strong>
                      {byDate[date]}{" "}
                      <small>{byDate[date] === 1 ? "espécimen" : "especímenes"}</small>
                    </strong>
                  )}
                </button>
              ) : (
                <span className="calendar-empty" key={`empty-${index}`} />
              )
            )}
          </div>
        </section>
      )}

      {/* Lista de Agenda de Ensayes con Skeletons */}
      <section className="card schedule-agenda" aria-busy={loading}>
        <div className="section-head">
          <div>
            <h2>
              {mode === "CALENDARIO"
                ? `Agenda del ${formatDate(selectedDate)}`
                : (
                    {
                      HOY: "Ensayes de hoy",
                      MANANA: "Ensayes de mañana",
                      PROXIMOS: "Próximos 7 días",
                      VENCIDOS: "Fechas vencidas",
                    } as const
                  )[scope]}
            </h2>
            <p className="muted">
              {visible.length} {visible.length === 1 ? "espécimen" : "especímenes"} en esta vista.
            </p>
          </div>

          <div className="report-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <label className="field" style={{ margin: 0 }}>
              <span className="sr-only">Fecha del reporte</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="secondary"
              disabled={downloading}
              onClick={() => void download("csv")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FileSpreadsheet size={16} />
              <span>Reporte CSV</span>
            </button>
            <button
              type="button"
              className="primary"
              disabled={downloading}
              onClick={() => void download("pdf")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FileText size={16} />
              <span>{downloading ? "Generando…" : "Reporte PDF"}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <ScheduleSkeletonList />
        ) : visible.length === 0 ? (
          <div className="empty" style={{ padding: "48px 24px", textAlign: "center" }}>
            <CalendarDays size={40} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.6 }} />
            <strong style={{ display: "block", fontSize: "16px", marginBottom: "4px" }}>
              No hay especímenes programados en esta vista
            </strong>
            <span style={{ color: "var(--muted)", fontSize: "14px" }}>
              Prueba seleccionando otra fecha en el calendario o modificando los filtros de búsqueda.
            </span>
          </div>
        ) : (
          <div className="schedule-list">
            {visible.map((item) => (
              <article
                className={`schedule-item ${item.programacion.toLowerCase()}`}
                key={item.especimenId}
              >
                <div className="schedule-date">
                  <strong>
                    {formatDate(item.fechaProgramada, { day: "2-digit", month: "short" })}
                  </strong>
                  <span>
                    {item.edadDias == null ? "Edad sin registrar" : `${item.edadDias} días`}
                  </span>
                </div>

                <div className="schedule-main">
                  <div className="schedule-title">
                    <h3>
                      {item.muestra.idMuestra} · Espécimen {item.numero}
                    </h3>
                    <span className={`schedule-source ${item.origenFecha.toLowerCase()}`}>
                      {item.origenFecha === "REGISTRADA" ? "Fecha registrada" : "Fecha calculada"}
                    </span>
                    <span className={`status ${item.muestra.estatusBitacora.toLowerCase()}`}>
                      {item.programacion === "PROVISIONAL"
                        ? "Provisional · borrador"
                        : item.muestra.estatusBitacora.toLowerCase()}
                    </span>
                  </div>

                  <p>
                    {typeLabel(item.tipo)} · {item.muestra.cliente} · {item.muestra.obra}
                  </p>
                  <small>
                    {item.muestra.colado?.folio ? `Colado ${item.muestra.colado.folio} · ` : ""}
                    {item.muestra.elemento || "Elemento sin registrar"}
                    {item.moldeCodigo ? ` · Molde ${item.moldeCodigo}` : ""}
                  </small>
                </div>

                <button
                  type="button"
                  className="text-button"
                  onClick={() => onOpenSample(item.muestra.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>Abrir muestra</span>
                  <ArrowRight size={14} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <HelpModal
        viewKey="calendario"
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}

function ScheduleSkeletonList() {
  return (
    <div className="schedule-list">
      {[1, 2, 3].map((i) => (
        <article key={i} className="schedule-item" style={{ opacity: 0.7, pointerEvents: "none" }}>
          <div className="schedule-date">
            <div style={{ width: "45px", height: "18px", borderRadius: "4px", background: "var(--line)", marginBottom: "4px" }} />
            <div style={{ width: "35px", height: "12px", borderRadius: "4px", background: "var(--line)", opacity: 0.6 }} />
          </div>
          <div className="schedule-main" style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <div style={{ width: "140px", height: "18px", borderRadius: "4px", background: "var(--line)" }} />
              <div style={{ width: "80px", height: "18px", borderRadius: "999px", background: "var(--line)" }} />
            </div>
            <div style={{ width: "240px", height: "14px", borderRadius: "4px", background: "var(--line)", marginBottom: "6px" }} />
            <div style={{ width: "160px", height: "12px", borderRadius: "4px", background: "var(--line)", opacity: 0.6 }} />
          </div>
          <div style={{ width: "80px", height: "18px", borderRadius: "4px", background: "var(--line)" }} />
        </article>
      ))}
    </div>
  );
}
