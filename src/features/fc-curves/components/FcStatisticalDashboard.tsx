"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Activity,
  BarChart2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { FcEvolutionChart } from "./FcEvolutionChart";
import { FcGaussianChart } from "./FcGaussianChart";
import { CylinderBreakCaptureModal } from "./CylinderBreakCaptureModal";
import { PressKioskModal } from "./kiosk";
import { EnsayeItem, EstadisticasFc, FotoEnsaye } from "../types";

interface FcStatisticalDashboardProps {
  onMessage: (message: string, error?: boolean) => void;
  headers: () => Record<string, string>;
}

export function FcStatisticalDashboard({
  onMessage,
  headers,
}: FcStatisticalDashboardProps) {
  const [ensayes, setEnsayes] = useState<EnsayeItem[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasFc>({
    totalMuestras: 0,
    media: 0,
    desviacionEstandar: 0,
    coeficienteVariacionPct: 0,
    minimo: 0,
    maximo: 0,
    calificacionAci: "INSUFICIENTE_DATOS",
  });
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroObra, setFiltroObra] = useState("");
  const [filtroEdad, setFiltroEdad] = useState("");

  // Modales
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<FotoEnsaye | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Especímenes elegibles para ensaye
  const [especimenesPendientes, setEspecimenesPendientes] = useState<
    Array<{ id: string; numero: number; edadDias: number; muestraId: string; idMuestra: string; cliente: string; obra: string; fcKgCm2: number }>
  >([]);
  const [selectedEspecimenId, setSelectedEspecimenId] = useState("");
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingExcel(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ensayes/excel/importar?persist=true", {
        method: "POST",
        headers: headers(),
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Error al importar el archivo Excel.");
      }

      const total = data.totalEspecimenes || 0;
      const muestraId = data.reconciliation?.idMuestra || data.metadata?.id || "";
      onMessage(`Libro Excel importado exitosamente: ${total} probetas registradas para la muestra ${muestraId}.`);
      await loadData();
    } catch (err: any) {
      onMessage(err.message || "Error al procesar el archivo Excel.", true);
    } finally {
      setIsImportingExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroCliente) params.set("cliente", filtroCliente);
      if (filtroObra) params.set("obra", filtroObra);
      if (filtroEdad) params.set("edadDias", filtroEdad);

      const res = await fetch(`/api/ensayes?${params}`, { headers: headers() });
      if (!res.ok) throw new Error("No se pudo cargar la estadística de ensayes.");

      const data = await res.json();
      setEnsayes(data.ensayes || []);
      setEstadisticas(data.estadisticas || {
        totalMuestras: 0,
        media: 0,
        desviacionEstandar: 0,
        coeficienteVariacionPct: 0,
        minimo: 0,
        maximo: 0,
        calificacionAci: "INSUFICIENTE_DATOS",
      });

      // Cargar muestras para extraer especímenes pendientes de ensaye
      const muestrasRes = await fetch("/api/muestras?limit=30", { headers: headers() });
      if (muestrasRes.ok) {
        const muestrasData = await muestrasRes.json();
        const listaMuestras = Array.isArray(muestrasData) ? muestrasData : muestrasData.muestras || [];
        const espList: typeof especimenesPendientes = [];
        for (const m of listaMuestras) {
          if (Array.isArray(m.especimenes)) {
            for (const esp of m.especimenes) {
              espList.push({
                id: esp.id,
                numero: esp.numero,
                edadDias: esp.edadDias || 28,
                muestraId: m.id,
                idMuestra: m.idMuestra,
                cliente: m.cliente,
                obra: m.obra,
                fcKgCm2: Number(m.fcKgCm2) || 250,
              });
            }
          }
        }
        setEspecimenesPendientes(espList);
        if (espList.length > 0 && !selectedEspecimenId) {
          setSelectedEspecimenId(espList[0].id);
        }
      }
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Error al cargar módulo estadístico.",
        true
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEspInfo = useMemo(() => {
    return especimenesPendientes.find((e) => e.id === selectedEspecimenId);
  }, [especimenesPendientes, selectedEspecimenId]);

  const handleRecordBreak = async (payload: {
    especimenId: string;
    fechaHoraEnsaye: string;
    edadRealDias: number;
    diametroMm: number;
    longitudMm: number;
    masaG?: number;
    cargaMaximaKn?: number;
    cargaMaximaKg?: number;
    tipoFalla: any;
    condicionHumedad: any;
    observaciones?: string;
    fotoBlob?: Blob;
  }) => {
    setIsSaving(true);
    try {
      const { fotoBlob, ...ensayeData } = payload;
      const res = await fetch("/api/ensayes", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(ensayeData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el ensaye de compresión.");
      }

      // Si se capturó fotografía con la cámara WebRTC, subirla al storage
      if (fotoBlob && data.id) {
        const formData = new FormData();
        formData.append("file", fotoBlob, `rotura_${data.id}.webp`);
        formData.append("tipo", "ROTURA_FRACTURA");

        const hdrs = headers();
        const uploadRes = await fetch(`/api/ensayes/${data.id}/fotos`, {
          method: "POST",
          headers: hdrs["x-operator-name"] ? { "x-operator-name": hdrs["x-operator-name"] } : {},
          body: formData,
        });

        if (!uploadRes.ok) {
          console.warn("Ensaye guardado pero no se pudo adjuntar foto WebP");
        }
      }

      onMessage(`Rotura de cilindro registrada (${data.resistenciaKgCm2} kg/cm²).`);
      setShowCaptureModal(false);
      await loadData();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Error al guardar ensaye.",
        true
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Statistical KPI Cards */}
      <section className="metric-grid" aria-label="Estadísticas de control de concreto">
        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Resistencia Media x̄</span>
            <TrendingUp size={18} style={{ color: "var(--brand, #16734c)" }} />
          </div>
          <strong>{estadisticas.media} kg/cm²</strong>
          <small>{estadisticas.totalMuestras} ensayes analizados</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Desv. Estándar (s)</span>
            <Activity size={18} style={{ color: "var(--ensalia-primary-700, #145388)" }} />
          </div>
          <strong>{estadisticas.desviacionEstandar} kg/cm²</strong>
          <small>Grado ACI: {estadisticas.calificacionAci}</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Coef. Variación (V)</span>
            <BarChart2 size={18} style={{ color: "var(--ensalia-info, #0284c7)" }} />
          </div>
          <strong>{estadisticas.coeficienteVariacionPct}%</strong>
          <small>Dispersión estadística relativa</small>
        </div>

        <div className="metric">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Rango de Rotura</span>
            <Layers size={18} style={{ color: "var(--ensalia-primary-900, #0a2540)" }} />
          </div>
          <strong>
            {estadisticas.minimo} - {estadisticas.maximo}
          </strong>
          <small>Mínimo y máximo (kg/cm²)</small>
        </div>
      </section>

      {/* Control Bar & Action Button */}
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            <span className="muted">Cliente:</span>
            <input
              type="text"
              placeholder="Todos"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              style={{ width: "130px", height: "32px", fontSize: "12px" }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            <span className="muted">Obra:</span>
            <input
              type="text"
              placeholder="Todas"
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              style={{ width: "130px", height: "32px", fontSize: "12px" }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
            <span className="muted">Edad:</span>
            <select
              value={filtroEdad}
              onChange={(e) => setFiltroEdad(e.target.value)}
              style={{ height: "32px", fontSize: "12px" }}
            >
              <option value="">Todas</option>
              <option value="3">3 días</option>
              <option value="7">7 días</option>
              <option value="14">14 días</option>
              <option value="28">28 días</option>
            </select>
          </label>

          <button
            type="button"
            className="secondary button-compact"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Filtrar</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="file"
            ref={excelInputRef}
            onChange={handleExcelImport}
            accept=".xlsx,.xls"
            style={{ display: "none" }}
          />

          <button
            type="button"
            className="secondary button-compact"
            onClick={() => excelInputRef.current?.click()}
            disabled={isImportingExcel}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Importar libro de roturas de concreto desde Excel (.xlsx)"
          >
            <Upload size={14} className={isImportingExcel ? "spin" : ""} />
            <span>{isImportingExcel ? "Importando..." : "Importar Excel"}</span>
          </button>

          {especimenesPendientes.length > 0 && (
            <select
              value={selectedEspecimenId}
              onChange={(e) => setSelectedEspecimenId(e.target.value)}
              style={{ height: "34px", fontSize: "12px", maxWidth: "220px" }}
            >
              {especimenesPendientes.map((esp) => (
                <option key={esp.id} value={esp.id}>
                  {esp.idMuestra} - C{esp.numero} ({esp.edadDias}d)
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="secondary button-compact"
            onClick={() => setShowKioskModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#0F172A",
              color: "#00E676",
              borderColor: "#334155",
              fontWeight: "700",
            }}
            title="Abrir Modo Quiosco Táctil Industrial de Prensa (Pantalla completa, teclado táctil gigante)"
          >
            <Monitor size={16} />
            <span>Quiosco Prensa</span>
          </button>

          <button
            type="button"
            className="primary button-compact"
            onClick={() => setShowCaptureModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Camera size={16} />
            <span>Rotura con Cámara WebRTC</span>
          </button>
        </div>
      </div>

      {/* Two Bespoke Charts Side by Side */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "20px" }}>
        {/* Chart 1: Evolución f'c vs Edad */}
        <section className="card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>Desarrollo de Resistencia</p>
            <h3 style={{ margin: 0, fontSize: "16px" }}>Curva de Evolución f&apos;c vs Edad (Días)</h3>
          </div>
          <FcEvolutionChart ensayes={ensayes} fcDiseno={250} />
        </section>

        {/* Chart 2: Campana de Gauss ACI 214R */}
        <section className="card" style={{ padding: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <p className="eyebrow" style={{ margin: 0 }}>Control de Calidad ACI 214R</p>
            <h3 style={{ margin: 0, fontSize: "16px" }}>Campana de Gauss y Distribución Normal</h3>
          </div>
          <FcGaussianChart estadisticas={estadisticas} fcDiseno={250} />
        </section>
      </div>

      {/* Table of Individual Breaks */}
      <section className="card" style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Ensayes Oficiales</p>
            <h3 style={{ margin: 0, fontSize: "16px" }}>Registro Forense de Probetas Ensayadas</h3>
          </div>
          <span className="muted" style={{ fontSize: "13px" }}>
            Total registrados: <strong>{ensayes.length}</strong>
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Muestra / Especímen</th>
                <th>Edad</th>
                <th>Carga Rotura</th>
                <th>f&apos;c Calculado</th>
                <th>% Cumplimiento</th>
                <th>Patrón de Falla</th>
                <th style={{ textAlign: "right" }}>Foto Forense</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px" }}>
                    <div className="ensalia-shimmer-effect" style={{ height: "40px", borderRadius: "6px" }} />
                  </td>
                </tr>
              ) : ensayes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No se han registrado ensayes de compresión con los filtros actuales.
                  </td>
                </tr>
              ) : (
                ensayes.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.especimen?.muestra?.idMuestra || "MUESTRA"}</strong> - C{e.especimen?.numero || 1}
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                        {e.especimen?.muestra?.cliente} ({e.especimen?.muestra?.obra})
                      </div>
                    </td>
                    <td>
                      <span className="pill pill-default">{e.edadRealDias} días</span>
                    </td>
                    <td>
                      <div><strong>{Number(e.cargaMaximaKg).toLocaleString()} kgf</strong></div>
                      <small className="muted">{e.cargaMaximaKn} kN</small>
                    </td>
                    <td>
                      <strong style={{ fontSize: "14px", color: e.cumpleEspecificacion ? "#065f46" : "#991b1b" }}>
                        {e.resistenciaKgCm2} kg/cm²
                      </strong>
                    </td>
                    <td>
                      {e.porcentajeFc != null ? (
                        <span
                          className={`pill ${
                            e.cumpleEspecificacion ? "pill-success" : "pill-danger"
                          }`}
                        >
                          {e.porcentajeFc}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "12px" }}>
                        {e.tipoFalla.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <a
                          href={`/api/ensayes/${e.id}/pdf?formato=labsico`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="secondary button-compact"
                          title="Informe Oficial de Ensayes a Compresión LABSICO (MC-LBS-CC-IE Rev. 07)"
                          style={{
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor: "rgba(22, 115, 76, 0.08)",
                            borderColor: "var(--brand, #16734c)",
                            color: "var(--brand, #16734c)",
                            fontWeight: 600,
                          }}
                        >
                          <FileText size={13} style={{ color: "var(--brand, #16734c)" }} />
                          <span>LABSICO</span>
                        </a>

                        {e.especimen?.muestra?.id && (
                          <a
                            href={`/api/ensayes/excel/exportar?muestraId=${e.especimen.muestra.id}`}
                            className="secondary button-compact"
                            title="Exportar Libro Corporativo con Fórmulas Activas en Excel (.xlsx)"
                            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <FileSpreadsheet size={13} style={{ color: "#0284c7" }} />
                            <span>XLSX</span>
                          </a>
                        )}

                        {e.fotos && e.fotos.length > 0 ? (
                          <button
                            type="button"
                            className="secondary button-compact"
                            onClick={() => setViewingPhoto(e.fotos[0])}
                            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <Eye size={13} style={{ color: "var(--brand)" }} />
                            <span>Foto</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Rotura y Captura WebRTC */}
      <CylinderBreakCaptureModal
        isOpen={showCaptureModal}
        especimenId={selectedEspecimenId || (especimenesPendientes[0]?.id || "default")}
        identificadorEspecimen={
          selectedEspInfo
            ? `${selectedEspInfo.idMuestra} - Cilindro #${selectedEspInfo.numero}`
            : "Probeta C-01"
        }
        edadDiasSugerida={selectedEspInfo?.edadDias || 28}
        fcDiseno={selectedEspInfo?.fcKgCm2 || 250}
        isSaving={isSaving}
        onConfirm={(payload) => void handleRecordBreak(payload)}
        onCancel={() => setShowCaptureModal(false)}
      />

      {/* Modal Visor de Fotografía WebP */}
      {viewingPhoto && (
        <div
          className="modal-backdrop"
          role="presentation"
          style={{ zIndex: 1200 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingPhoto(null);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-viewer-title"
            style={{ maxWidth: "700px", padding: "16px" }}
          >
            <div className="section-head" style={{ marginBottom: "12px" }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Evidencia Forense de Fractura</p>
                <h3 id="photo-viewer-title" style={{ margin: 0 }}>
                  {viewingPhoto.nombreArchivo}
                </h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setViewingPhoto(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                borderRadius: "6px",
                overflow: "hidden",
                background: "#0f172a",
                maxHeight: "65vh",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <img
                src={`/api/ensayes/fotos/${viewingPhoto.id}`}
                alt="Foto de rotura de cilindro"
                style={{ width: "100%", height: "auto", objectFit: "contain" }}
              />
            </div>

            <div
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                color: "var(--muted)",
              }}
            >
              <span>Hash SHA-256: <code>{viewingPhoto.hashSha256.slice(0, 24)}…</code></span>
              <span>Formato: WebP | {(viewingPhoto.tamano / 1024).toFixed(1)} KB</span>
            </div>
          </section>
        </div>
      )}

      {/* Modo Quiosco Táctil Industrial de Prensa */}
      <PressKioskModal
        isOpen={showKioskModal}
        onClose={() => setShowKioskModal(false)}
        especimenesPendientes={especimenesPendientes}
        initialEspecimenId={selectedEspecimenId}
        onSaveEnsaye={handleRecordBreak}
        isSaving={isSaving}
      />
    </div>
  );
}

