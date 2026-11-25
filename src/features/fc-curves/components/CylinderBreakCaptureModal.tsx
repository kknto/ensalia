"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, CheckCircle2, RotateCcw, Upload, Video, X } from "lucide-react";
import { TipoFallaConcreto } from "../types";

interface CylinderBreakCaptureModalProps {
  isOpen: boolean;
  especimenId: string;
  identificadorEspecimen: string;
  edadDiasSugerida?: number;
  fcDiseno?: number;
  isSaving: boolean;
  onConfirm: (payload: {
    especimenId: string;
    fechaHoraEnsaye: string;
    edadRealDias: number;
    diametroMm: number;
    longitudMm: number;
    masaG?: number;
    cargaMaximaKn?: number;
    cargaMaximaKg?: number;
    tipoFalla: TipoFallaConcreto;
    condicionHumedad: "HUMEDO_SATURADO" | "SUPERFICIALMENTE_SECO" | "SECO_AIRE";
    observaciones?: string;
    fotoBlob?: Blob;
  }) => void;
  onCancel: () => void;
}

export function CylinderBreakCaptureModal({
  isOpen,
  especimenId,
  identificadorEspecimen,
  edadDiasSugerida = 28,
  fcDiseno = 250,
  isSaving,
  onConfirm,
  onCancel,
}: CylinderBreakCaptureModalProps) {
  // Datos del ensaye metrológico
  const [edadRealDias, setEdadRealDias] = useState(edadDiasSugerida);
  const [diametroMm, setDiametroMm] = useState(150); // Especimen 15x30 cm
  const [longitudMm, setLongitudMm] = useState(300);
  const [masaG, setMasaG] = useState<number | undefined>(12800);
  const [cargaKn, setCargaKn] = useState<number>(450);
  const [cargaKg, setCargaKg] = useState<number>(45887);
  const [tipoFalla, setTipoFalla] = useState<TipoFallaConcreto>("CONO_TIPO_1");
  const [condicionHumedad, setCondicionHumedad] = useState<
    "HUMEDO_SATURADO" | "SUPERFICIALMENTE_SECO" | "SECO_AIRE"
  >("HUMEDO_SATURADO");
  const [observaciones, setObservaciones] = useState("");

  // Cámara WebRTC y Captura WebP
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cálculo en tiempo real de Resistencia
  const diametroCm = diametroMm / 10;
  const areaCm2 = (Math.PI * Math.pow(diametroCm, 2)) / 4;
  const resistenciaCalculada = areaCm2 > 0 ? Math.round((cargaKg / areaCm2) * 10) / 10 : 0;
  const pctFc = fcDiseno > 0 ? Math.round((resistenciaCalculada / fcDiseno) * 100) : 0;
  const cumple = resistenciaCalculada >= fcDiseno;

  // Iniciar cámara WebRTC si está disponible
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Cámara no disponible o permisos denegados. Puedes subir una foto de archivo.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capturar frame del video a WebP
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Marca de agua forense en canvas
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.fillText(
      `ENSALIA FORENSIC: ${identificadorEspecimen} | ${resistenciaCalculada} kg/cm² (${pctFc}%) | ${new Date().toISOString()}`,
      20,
      canvas.height - 15
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedPreview(URL.createObjectURL(blob));
          stopCamera();
        }
      },
      "image/webp",
      0.85
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedBlob(file);
      setCapturedPreview(URL.createObjectURL(file));
      stopCamera();
    }
  };

  const resetCapture = () => {
    setCapturedBlob(null);
    setCapturedPreview(null);
    void startCamera();
  };

  useEffect(() => {
    if (isOpen) {
      setEdadRealDias(edadDiasSugerida);
      setCapturedBlob(null);
      setCapturedPreview(null);
      void startCamera();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSaving) onCancel();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        stopCamera();
      };
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      especimenId,
      fechaHoraEnsaye: new Date().toISOString(),
      edadRealDias,
      diametroMm,
      longitudMm,
      masaG,
      cargaMaximaKn: cargaKn,
      cargaMaximaKg: cargaKg,
      tipoFalla,
      condicionHumedad,
      observaciones,
      fotoBlob: capturedBlob || undefined,
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          stopCamera();
          onCancel();
        }
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-modal-title"
        style={{ maxWidth: "800px", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        <div className="section-head" style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Camera size={22} style={{ color: "var(--brand, #16734c)" }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Ensaye de Compresión ASTM C39 / NMX-C-083</p>
              <h2 id="break-modal-title" style={{ margin: 0, fontSize: "18px" }}>
                Rotura y Evidencia Fotográfica: {identificadorEspecimen}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            disabled={isSaving}
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: "auto", paddingRight: "4px" }}>
          {/* Cámara WebRTC / Visor con silueta cilíndrica */}
          <div style={{ marginBottom: "16px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Captura de Fractura en Prensa (WebRTC / Evidencia Inmutable)
            </span>

            <div
              style={{
                position: "relative",
                width: "100%",
                height: "240px",
                backgroundColor: "#1e293b",
                borderRadius: "8px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {capturedPreview ? (
                // Imagen capturada
                <img
                  src={capturedPreview}
                  alt="Rotura capturada"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : cameraActive ? (
                // Video en vivo con silueta guía de cilindro
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {/* Silueta SVG guía de probeta */}
                  <svg
                    viewBox="0 0 100 100"
                    style={{
                      position: "absolute",
                      width: "160px",
                      height: "220px",
                      pointerEvents: "none",
                      opacity: 0.65,
                    }}
                  >
                    <ellipse cx="50" cy="15" rx="30" ry="10" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="20" y1="15" x2="20" y2="85" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                    <line x1="80" y1="15" x2="80" y2="85" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                    <ellipse cx="50" cy="85" rx="30" ry="10" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                  </svg>
                </>
              ) : (
                <div style={{ color: "#94a3b8", textAlign: "center", padding: "16px" }}>
                  <p style={{ margin: "0 0 8px 0" }}>{cameraError || "Iniciando visor de cámara…"}</p>
                  <label className="secondary button-compact" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Upload size={14} />
                    <span>Seleccionar foto desde archivo</span>
                    <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFileChange} />
                  </label>
                </div>
              )}

              {/* Botón Flotante para Tomar Foto o Repetir */}
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  display: "flex",
                  gap: "10px",
                }}
              >
                {cameraActive && (
                  <button
                    type="button"
                    className="primary"
                    onClick={captureFrame}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                  >
                    <Camera size={16} />
                    <span>Tomar Fotografía (WebP)</span>
                  </button>
                )}
                {capturedPreview && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={resetCapture}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.9)" }}
                  >
                    <RotateCcw size={16} />
                    <span>Tomar otra foto</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dimensiones y Carga de Rotura */}
          <div className="grid two" style={{ marginBottom: "12px" }}>
            <label className="field">
              <span>Edad real de ensaye (días) *</span>
              <input
                type="number"
                required
                min={1}
                value={edadRealDias}
                disabled={isSaving}
                onChange={(e) => setEdadRealDias(parseInt(e.target.value, 10) || 1)}
              />
            </label>

            <label className="field">
              <span>Carga Máxima de Rotura (kgf) *</span>
              <input
                type="number"
                required
                min={1}
                value={cargaKg}
                disabled={isSaving}
                onChange={(e) => {
                  const kg = parseFloat(e.target.value) || 0;
                  setCargaKg(kg);
                  setCargaKn(Math.round((kg / 101.97162) * 10) / 10);
                }}
              />
            </label>
          </div>

          <div className="grid three" style={{ marginBottom: "12px" }}>
            <label className="field">
              <span>Diámetro (mm)</span>
              <input
                type="number"
                value={diametroMm}
                disabled={isSaving}
                onChange={(e) => setDiametroMm(parseFloat(e.target.value) || 150)}
              />
            </label>

            <label className="field">
              <span>Longitud (mm)</span>
              <input
                type="number"
                value={longitudMm}
                disabled={isSaving}
                onChange={(e) => setLongitudMm(parseFloat(e.target.value) || 300)}
              />
            </label>

            <label className="field">
              <span>Masa / Peso (g)</span>
              <input
                type="number"
                value={masaG || ""}
                disabled={isSaving}
                placeholder="Ej. 12800"
                onChange={(e) => setMasaG(parseFloat(e.target.value) || undefined)}
              />
            </label>
          </div>

          {/* Panel de Cálculo en Tiempo Real */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: cumple ? "var(--ensalia-success-bg, #ecfdf5)" : "var(--ensalia-danger-bg, #fef2f2)",
              border: `1px solid ${cumple ? "var(--ensalia-success-border, #a7f3d0)" : "var(--ensalia-danger-border, #fecaca)"}`,
              borderRadius: "6px",
              padding: "10px 14px",
              marginBottom: "14px",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)" }}>
                Resistencia Calculada f&apos;c
              </span>
              <div style={{ fontSize: "22px", fontWeight: 800, color: cumple ? "#065f46" : "#991b1b" }}>
                {resistenciaCalculada} kg/cm²
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>
                {pctFc}% del f&apos;c diseño ({fcDiseno} kg/cm²)
              </span>
              <div style={{ fontSize: "12px", color: cumple ? "#065f46" : "#991b1b" }}>
                {cumple ? "✓ Cumple especificación" : "⚠ Por debajo del f'c proyectado"}
              </div>
            </div>
          </div>

          {/* Selector de Patrón de Fractura ASTM C39 */}
          <div style={{ marginBottom: "14px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
              Tipo de Fractura / Falla (ASTM C39 / NMX-C-083)
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {[
                { val: "CONO_TIPO_1", label: "Tipo 1: Cono en ambos extremos" },
                { val: "CONO_Y_DIVIDIDO_TIPO_2", label: "Tipo 2: Cono y hendiduras" },
                { val: "COLUMNA_TIPO_3", label: "Tipo 3: Falla columnar" },
                { val: "CIZALLA_TIPO_4", label: "Tipo 4: Cizalla diagonal" },
                { val: "ESQUINA_TIPO_5", label: "Tipo 5: Fractura en esquinas" },
                { val: "PUNTUAL_TIPO_6", label: "Tipo 6: Puntual (Cabeceo)" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setTipoFalla(opt.val as TipoFallaConcreto)}
                  style={{
                    padding: "6px 8px",
                    textAlign: "left",
                    fontSize: "11px",
                    borderRadius: "4px",
                    border: `1px solid ${tipoFalla === opt.val ? "var(--brand, #16734c)" : "var(--line, #cbd5e1)"}`,
                    background: tipoFalla === opt.val ? "var(--ensalia-primary-50, #edf5fd)" : "transparent",
                    color: tipoFalla === opt.val ? "var(--brand-dark, #0e5035)" : "inherit",
                    fontWeight: tipoFalla === opt.val ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <label className="field" style={{ marginBottom: "16px" }}>
            <span>Observaciones del ensayo metrológico</span>
            <input
              type="text"
              placeholder="Notas de cabeceo de azufre/neopreno, humedad o velocidad de carga"
              value={observaciones}
              disabled={isSaving}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </label>

          <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={isSaving}>
              {isSaving ? "Guardando…" : "Registrar Ensaye y Guardar Evidencia"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

