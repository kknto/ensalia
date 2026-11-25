"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart2,
  Boxes,
  ClipboardCheck,
  Clock,
  Database,
  Home as HomeIcon,
  Layers,
  Palette,
  PlusCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  Truck,
} from "lucide-react";

import ColadosPanel from "@/components/ColadosPanel";
import InventoryPanel from "@/components/InventoryPanel";
import PersonalizationPanel from "@/components/personalizacion/PersonalizationPanel";
import TestSchedulePanel from "@/components/TestSchedulePanel";
import { OutgoingSamplesDashboard } from "@/features/outgoing-samples/components/OutgoingSamplesDashboard";
import { FcStatisticalDashboard } from "@/features/fc-curves/components/FcStatisticalDashboard";

import { CodigoModulo, NivelSuscripcion } from "@prisma/client";
import { SubscriptionProvider } from "@/features/subscriptions/context/SubscriptionContext";
import { FeatureGate } from "@/features/subscriptions/components/FeatureGate";
import { SubscriptionBadge } from "@/features/subscriptions/components/SubscriptionBadge";

import { PRODUCT_IDENTITY } from "@/lib/product/identity";
import { addCivilDays } from "@/lib/civil-date";

import {
  dateOnly,
  dateTime,
  dateTimeFields,
  emptySample,
  numberFields,
  prepareForForm,
  Sample,
  Specimen,
  statusLabel,
  View,
} from "@/features/samples/types";

import { AlertsBanner } from "@/features/samples/components/AlertsBanner";
import { ConfirmDialog } from "@/features/samples/components/ConfirmDialog";
import { AnularDialog } from "@/features/samples/components/AnularDialog";
import { DashboardView } from "@/features/samples/components/DashboardView";
import { RecordsFilters } from "@/features/samples/components/RecordsFilters";
import { RecordsTable } from "@/features/samples/components/RecordsTable";
import { SampleDetailModal } from "@/features/samples/components/SampleDetailModal";
import { SampleFormView } from "@/features/samples/components/SampleFormView";
import { SettingsView } from "@/features/samples/components/SettingsView";
import { HelpButton } from "@/components/common/HelpButton";
import { HelpModal } from "@/components/common/HelpModal";

function HomeContent() {
  const [view, setView] = useState<View>("inicio");
  const [form, setForm] = useState<Sample>(() => emptySample());
  const [baseline, setBaseline] = useState(() => JSON.stringify(emptySample()));
  const [rows, setRows] = useState<Sample[]>([]);
  const [selected, setSelected] = useState<Sample | null>(null);

  // Filtros
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Operador y autenticación local
  const [operator, setOperator] = useState("Captura oficina");
  const [accessCode, setAccessCode] = useState("");

  // Feedback y carga
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Diálogos accesibles (reemplazo de window.confirm y window.prompt)
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
    sampleId?: string;
    sampleCode?: string;
  }>({
    isOpen: false,
  });

  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handleHelpKey = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", handleHelpKey);
    return () => window.removeEventListener("keydown", handleHelpKey);
  }, []);

  const helpKey = useMemo(() => {
    switch (view) {
      case "nueva":
        return "nueva";
      case "colados":
        return "colados";
      case "ensayos":
        return "calendario";
      case "curvas":
        return "fc_curves";
      case "inventario":
        return "inventario";
      case "salidas":
        return "despachos";
      case "personalizacion":
      case "configuracion":
        return "personalizacion";
      default:
        return "registros";
    }
  }, [view]);

  const dirty = view === "nueva" && JSON.stringify(form) !== baseline;
  const specimens = useMemo(() => form.especimenes || [], [form.especimenes]);
  const pending = rows.filter(
    (row) => row.estatusBitacora === "BORRADOR" || row.estatusBitacora === "REVISADA"
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("labsico.operator");
    if (saved) setOperator(saved);
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setFormField = (key: string, value: unknown) => {
    setForm((old) => {
      if (key === "fechaMuestreo") {
        const fechaMuestreo = String(value || "");
        return {
          ...old,
          fechaMuestreo,
          especimenes: old.especimenes.map((item) => ({
            ...item,
            fechaEnsaye:
              fechaMuestreo && item.edadDias != null
                ? addCivilDays(fechaMuestreo, item.edadDias)
                : null,
          })),
        };
      }
      if (key === "especimenes" && Array.isArray(value)) {
        const next = (value as Specimen[]).map((item, index) =>
          item.edadDias !== old.especimenes[index]?.edadDias
            ? {
                ...item,
                fechaEnsaye:
                  item.edadDias != null && old.fechaMuestreo
                    ? addCivilDays(old.fechaMuestreo, item.edadDias)
                    : null,
              }
            : item
        );
        return { ...old, especimenes: next };
      }
      return { ...old, [key]: value };
    });
  };

  const headers = () => ({
    "Content-Type": "application/json",
    "x-operator-name": operator.trim() || "Captura oficina",
    "x-app-access-code": accessCode,
  });

  const notify = (success = "", failure = "") => {
    setMessage(success);
    setError(failure);
  };

  async function readResponse(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.details?.fieldErrors && Object.keys(data.details.fieldErrors).length > 0) {
        const fieldLabels: Record<string, string> = {
          cliente: "Cliente",
          obra: "Obra",
          noMuestra: "No. de muestra",
          tipoConcreto: "Tipo de concreto",
          fechaMuestreo: "Fecha de muestreo",
          especimenes: "Especímenes",
          salidaPlanta: "Salida de planta",
          llegadaObra: "Llegada a obra",
          inicioDescarga: "Inicio de descarga",
          finDescarga: "Fin de descarga",
          fcKgCm2: "f'c de diseño",
          revenimientoCm: "Revenimiento de diseño",
          revenimientoObtenido: "Revenimiento obtenido",
          tempAmbienteC: "Temp. ambiente",
          tempConcretoC: "Temp. concreto",
          numeroEspecimenes: "Número de especímenes",
        };
        const errorList = Object.entries(data.details.fieldErrors).map(([field, errs]) => {
          const label = fieldLabels[field] || field;
          const msg = Array.isArray(errs) ? errs.join(", ") : String(errs);
          return `${label}: ${msg}`;
        });
        throw new Error(`Datos inválidos: ${errorList.join(" | ")}`);
      }
      if (data.details?.formErrors && data.details.formErrors.length > 0) {
        throw new Error(`Datos inválidos: ${data.details.formErrors.join(" | ")}`);
      }
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "No se pudo completar la operación."
      );
    }
    return data;
  }

  async function load(overrides?: { estado?: string }) {
    setLoading(true);
    notify();
    const params = new URLSearchParams();
    const status = overrides?.estado ?? stateFilter;
    if (query) params.set("q", query);
    if (status) params.set("estado", status);
    if (from) params.set("desde", from);
    if (to) params.set("hasta", to);
    try {
      setRows(await readResponse(await fetch(`/api/muestras?${params}`)));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudieron cargar los registros."
      );
    } finally {
      setLoading(false);
    }
  }

  const clientesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.cliente?.trim()) set.add(r.cliente.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const obrasPorCliente = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of rows) {
      const c = r.cliente?.trim();
      const o = r.obra?.trim();
      if (c && o) {
        if (!map[c]) map[c] = [];
        if (!map[c].includes(o)) map[c].push(o);
      }
    }
    for (const c in map) {
      map[c].sort((a, b) => a.localeCompare(b));
    }
    return map;
  }, [rows]);

  function executeNavigation(next: View) {
    notify();
    setSelected(null);
    setView(next);
    if (next === "registros" || next === "pendientes" || next === "inicio") {
      void load(next === "pendientes" ? { estado: "" } : undefined);
    }
  }

  function navigate(next: View) {
    if (dirty) {
      setConfirmDialog({
        isOpen: true,
        title: "Cambios sin guardar",
        description:
          "Hay información modificada en este formulario. ¿Deseas salir y descartar los cambios?",
        confirmLabel: "Descartar y salir",
        isDestructive: true,
        action: () => executeNavigation(next),
      });
      return;
    }
    executeNavigation(next);
  }

  function executeNewSample() {
    const next = emptySample();
    setForm(next);
    setBaseline(JSON.stringify(next));
    setSelected(null);
    notify();
    setView("nueva");
  }

  function newSample() {
    if (dirty) {
      setConfirmDialog({
        isOpen: true,
        title: "Descartar borrador actual",
        description:
          "Hay cambios capturados sin guardar. ¿Deseas descartarlos para crear una muestra nueva?",
        confirmLabel: "Crear nueva",
        isDestructive: true,
        action: executeNewSample,
      });
      return;
    }
    executeNewSample();
  }

  function toPayload() {
    const payload: Record<string, unknown> = {};
    for (const key of Object.keys(emptySample())) {
      payload[key] = form[key];
    }
    payload.fechaMuestreo = dateOnly(form.fechaMuestreo);
    payload.especimenes = specimens.map((item, index) => ({
      ...item,
      numero: index + 1,
      fechaEnsaye: dateOnly(item.fechaEnsaye),
    }));
    payload.numeroEspecimenes = specimens.length;
    for (const [key] of numberFields) {
      payload[key] =
        form[key] === "" || form[key] == null ? null : Number(form[key]);
    }
    for (const [key] of dateTimeFields) {
      payload[key] = dateTime(form[key]);
    }
    return payload;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    notify();
    const editing = Boolean(form.id);
    try {
      const data = await readResponse(
        await fetch(editing ? `/api/muestras/${form.id}` : "/api/muestras", {
          method: editing ? "PATCH" : "POST",
          headers: headers(),
          body: JSON.stringify(toPayload()),
        })
      );
      const next = prepareForForm(data);
      setForm(next);
      setBaseline(JSON.stringify(next));
      setSelected(data);
      setMessage(
        editing
          ? `Cambios guardados en ${data.idMuestra}.`
          : `Muestra guardada como borrador: ${data.idMuestra}.`
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo guardar la muestra."
      );
    } finally {
      setSaving(false);
    }
  }

  async function openSample(row: Sample) {
    setLoading(true);
    notify();
    try {
      const data = await readResponse(await fetch(`/api/muestras/${row.id}`));
      setSelected(data);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo abrir la muestra."
      );
    } finally {
      setLoading(false);
    }
  }

  function editSample(sample: Sample) {
    const next = prepareForForm(sample);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setSelected(null);
    notify();
    setView("nueva");
  }

  function requestTransition(action: "revisar" | "cerrar" | "anular") {
    if (!selected?.id) return;

    if (action === "anular") {
      setAnularDialog({
        isOpen: true,
        sampleId: selected.id,
        sampleCode: String(selected.idMuestra || ""),
      });
      return;
    }

    const isClose = action === "cerrar";
    setConfirmDialog({
      isOpen: true,
      title: isClose ? "Cerrar muestra definitivamente" : "Marcar muestra como revisada",
      description: isClose
        ? `¿Confirmas el cierre de la muestra ${selected.idMuestra}? La bitácora quedará sellada para edición directa.`
        : `¿Deseas marcar la muestra ${selected.idMuestra} como revisada y lista para ensayes?`,
      confirmLabel: isClose ? "Cerrar definitivamente" : "Marcar revisada",
      isDestructive: false,
      action: () => void executeTransition(action, null),
    });
  }

  async function executeTransition(
    action: "revisar" | "cerrar" | "anular",
    motivo: string | null
  ) {
    if (!selected?.id) return;
    setSaving(true);
    notify();
    try {
      const data = await readResponse(
        await fetch(`/api/muestras/${selected.id}/${action}`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(motivo ? { motivo: motivo.trim() } : {}),
        })
      );
      setSelected({ ...selected, ...data });
      setMessage(
        `La muestra ${selected.idMuestra} ahora está ${statusLabel(
          data.estatusBitacora
        ).toLowerCase()}.`
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo cambiar el estado de la muestra."
      );
    } finally {
      setSaving(false);
      setAnularDialog({ isOpen: false });
    }
  }

  function addSpecimen() {
    if (specimens.length < 4) {
      setFormField("especimenes", [
        ...specimens,
        {
          numero: specimens.length + 1,
          edadDias: null,
          tipo: "CILINDRO_15X30",
          fechaEnsaye: null,
        },
      ]);
    }
  }

  async function editLinkedSample(id: string) {
    setLoading(true);
    notify();
    try {
      const data = await readResponse(await fetch(`/api/muestras/${id}`));
      editSample(data);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo abrir la muestra."
      );
    } finally {
      setLoading(false);
    }
  }

  function removeSpecimen(index: number) {
    setFormField(
      "especimenes",
      specimens
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, numero: i + 1 }))
    );
  }

  function resetForm() {
    if (dirty) {
      setConfirmDialog({
        isOpen: true,
        title: "Limpiar formulario",
        description:
          "¿Deseas borrar todos los datos capturados en este formulario? Los cambios no guardados se perderán.",
        confirmLabel: "Limpiar datos",
        isDestructive: true,
        action: () => {
          const next = emptySample();
          setForm(next);
          setBaseline(JSON.stringify(next));
          setSelected(null);
          notify();
        },
      });
      return;
    }
    const next = emptySample();
    setForm(next);
    setBaseline(JSON.stringify(next));
    setSelected(null);
    notify();
  }

  function saveOperator(value: string) {
    setOperator(value);
    window.localStorage.setItem("labsico.operator", value);
    setMessage("Operador guardado localmente en esta PC.");
  }

  interface NavGroup {
    title?: string;
    items: Array<{
      key: View;
      label: string;
      icon: any;
      isCta?: boolean;
    }>;
  }

  const navigationGroups: NavGroup[] = [
    {
      items: [
        { key: "nueva" as View, label: "Nueva muestra", icon: PlusCircle, isCta: true },
        { key: "inicio" as View, label: "Inicio", icon: HomeIcon },
      ],
    },
    {
      title: "Campo y Muestreo",
      items: [
        { key: "colados" as View, label: "Colados", icon: Layers },
      ],
    },
    {
      title: "Logística y Curado",
      items: [
        { key: "salidas" as View, label: "Muestras a Salir", icon: Truck },
        { key: "ensayos" as View, label: "Programa de ensayes", icon: ClipboardCheck },
      ],
    },
    {
      title: "Laboratorio y Ensayes f'c",
      items: [
        { key: "curvas" as View, label: "Curvas y Ensayes f'c", icon: BarChart2 },
      ],
    },
    {
      title: "Registros y Control",
      items: [
        { key: "registros" as View, label: "Registros", icon: Database },
        { key: "pendientes" as View, label: "Pendientes", icon: Clock },
      ],
    },
    {
      title: "Metrología y Configuración",
      items: [
        { key: "inventario" as View, label: "Inventario", icon: Boxes },
        { key: "personalizacion" as View, label: "Personalización", icon: Palette },
        { key: "configuracion" as View, label: "Configuración", icon: SettingsIcon },
      ],
    },
  ];

  return (
    <div className="app-shell">
      {/* Barra lateral institucional */}
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand">
          <span className="brand-mark">{PRODUCT_IDENTITY.shortName}</span>
          <div>
            <strong>{PRODUCT_IDENTITY.name}</strong>
            <small>{PRODUCT_IDENTITY.edition}</small>
          </div>
        </div>

        <nav>
          {navigationGroups.map((group, gIdx) => (
            <div key={group.title || `group-${gIdx}`} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {group.title && (
                <div className="nav-section-title">
                  {group.title}
                </div>
              )}
              {group.items.map(({ key, label, icon: Icon, isCta }) => (
                <button
                  key={key}
                  className={`${view === key ? "nav-active" : ""} ${isCta ? "sidebar-cta-btn" : ""}`}
                  onClick={() => (key === "nueva" ? newSample() : navigate(key))}
                  aria-current={view === key ? "page" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <ShieldCheck size={14} style={{ color: "#bad1c8" }} />
            <span>Operador activo</span>
          </div>
          <strong>{operator || "Sin identificar"}</strong>
        </div>
      </aside>

      {/* Área de trabajo central */}
      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {PRODUCT_IDENTITY.name.toUpperCase()} · {PRODUCT_IDENTITY.mode.toUpperCase()}
            </p>
            <h1>
              {(
                {
                  inicio: "Inicio",
                  colados: "Colados",
                  nueva: form.id ? "Editar muestra" : "Nueva muestra",
                  registros: "Registros",
                  pendientes: "Pendientes",
                  salidas: "Muestras a Salir",
                  curvas: "Curvas y Ensayes f'c",
                  ensayos: "Programa de ensayes",
                  inventario: "Inventario",
                  personalizacion: "Personalización",
                  configuracion: "Configuración",
                } as Record<View, string>
              )[view]}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <HelpButton onClick={() => setHelpOpen(true)} label="Guía de pantalla (F1)" />
            <SubscriptionBadge />
            <span className="local-pill">Disponible en esta PC</span>
          </div>
        </header>

        {/* Notificaciones accesibles */}
        <AlertsBanner
          message={message}
          error={error}
          onClearMessage={() => setMessage("")}
          onClearError={() => setError("")}
        />

        {/* Vistas principales */}
        {view === "inicio" && (
          <DashboardView
            rows={rows}
            loading={loading}
            onNew={newSample}
            onNavigate={navigate}
            onOpen={openSample}
          />
        )}

        {view === "colados" && (
          <ColadosPanel
            headers={headers}
            onMessage={(value, failed) =>
              notify(failed ? "" : value, failed ? value : "")
            }
            onEditSample={(id) => void editLinkedSample(id)}
          />
        )}

        {view === "nueva" && (
          <SampleFormView
            form={form}
            set={setFormField}
            specimens={specimens}
            saving={saving}
            headers={headers}
            onMessage={(value, failed) =>
              notify(failed ? "" : value, failed ? value : "")
            }
            onSubmit={submit}
            onReset={resetForm}
            onAddSpecimen={addSpecimen}
            onRemoveSpecimen={removeSpecimen}
            clientesDisponibles={clientesDisponibles}
            obrasPorCliente={obrasPorCliente}
          />
        )}

        {view === "registros" && (
          <>
            <RecordsFilters
              query={query}
              setQuery={setQuery}
              stateFilter={stateFilter}
              setStateFilter={setStateFilter}
              from={from}
              setFrom={setFrom}
              to={to}
              setTo={setTo}
              loading={loading}
              onSearch={() => void load()}
              onDownload={(template) => {
                const params = new URLSearchParams();
                if (query) params.set("q", query);
                if (stateFilter) params.set("estado", stateFilter);
                if (from) params.set("desde", from);
                if (to) params.set("hasta", to);
                window.location.href = template
                  ? `/api/muestras/export/plantilla?${params}`
                  : `/api/muestras/export?${params}`;
              }}
            />
            <RecordsTable rows={rows} loading={loading} onOpen={openSample} />
          </>
        )}

        {view === "pendientes" && (
          <>
            <section className="notice">
              <strong>Trabajo por completar.</strong> Abre una muestra para continuar su revisión o cierre definitivo.
            </section>
            <RecordsTable rows={pending} loading={loading} onOpen={openSample} />
          </>
        )}

        {view === "salidas" && (
          <FeatureGate
            module={CodigoModulo.LOGISTICA_SALIDAS}
            title="Logística y Muestras a Salir"
            description="La gestión de traslados en obra, alertas de curado ASTM C31 (<48h) y manifiestos de despacho requieren Plan Estándar."
            requiredTier={NivelSuscripcion.ESTANDAR}
          >
            <OutgoingSamplesDashboard
              headers={headers}
              onMessage={(value, failed) =>
                notify(failed ? "" : value, failed ? value : "")
              }
            />
          </FeatureGate>
        )}

        {view === "curvas" && (
          <FeatureGate
            module={CodigoModulo.CURVAS_FC_FOTOS}
            title="Curvas Estadísticas y Rotura WebRTC"
            description="El control de calidad estadístico ACI 214R (Gauss) y el registro fotográfico forense WebP forman parte del Plan Profesional."
            requiredTier={NivelSuscripcion.PROFESIONAL}
          >
            <FcStatisticalDashboard
              headers={headers}
              onMessage={(value, failed) =>
                notify(failed ? "" : value, failed ? value : "")
              }
            />
          </FeatureGate>
        )}

        {view === "ensayos" && (
          <FeatureGate
            module={CodigoModulo.PROGRAMACION_ENSAYOS}
            title="Programa de Ensayes"
            description="El calendario operativo y la agenda de ensayes están disponibles a partir del Plan Estándar."
            requiredTier={NivelSuscripcion.ESTANDAR}
          >
            <TestSchedulePanel
              headers={headers}
              onMessage={(value, failed) =>
                notify(failed ? "" : value, failed ? value : "")
              }
              onOpenSample={(id) => void editLinkedSample(id)}
            />
          </FeatureGate>
        )}

        {view === "inventario" && (
          <FeatureGate
            module={CodigoModulo.INVENTARIO_EQUIPOS}
            title="Inventario y Control Metrológico"
            description="El control físico de moldes, equipos, semáforos de calibración y certificados PDF forma parte del Plan Profesional."
            requiredTier={NivelSuscripcion.PROFESIONAL}
          >
            <InventoryPanel
              headers={headers}
              onMessage={(value, failed) =>
                notify(failed ? "" : value, failed ? value : "")
              }
            />
          </FeatureGate>
        )}

        {view === "personalizacion" && (
          <PersonalizationPanel
            headers={headers}
            onMessage={(value, failed) =>
              notify(failed ? "" : value, failed ? value : "")
            }
          />
        )}

        {view === "configuracion" && (
          <SettingsView
            operator={operator}
            accessCode={accessCode}
            onOperator={saveOperator}
            onAccessCode={setAccessCode}
          />
        )}
      </main>

      {/* Modal de Detalle de Muestra */}
      {selected && (
        <SampleDetailModal
          sample={selected}
          saving={saving}
          headers={headers}
          onMessage={(value, failed) =>
            notify(failed ? "" : value, failed ? value : "")
          }
          onClose={() => setSelected(null)}
          onEdit={editSample}
          onRequestTransition={requestTransition}
        />
      )}

      {/* Diálogo de Confirmación Accesible */}
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

      {/* Diálogo de Anulación Accesible */}
      <AnularDialog
        isOpen={anularDialog.isOpen}
        sampleCode={anularDialog.sampleCode}
        isSaving={saving}
        onConfirm={(motivo) => executeTransition("anular", motivo)}
        onCancel={() => setAnularDialog({ isOpen: false })}
      />

      {/* Modal de Ayuda Contextual Inteligente */}
      <HelpModal
        viewKey={helpKey}
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <SubscriptionProvider>
      <HomeContent />
    </SubscriptionProvider>
  );
}
