"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  Maximize2,
  Minimize2,
  Moon,
  QrCode,
  RotateCcw,
  Sun,
  Volume2,
  VolumeX,
  X,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Zap,
  List,
  Sliders,
  Grid,
} from "lucide-react";
import { TipoFallaConcreto } from "../../types";
import { GiantVirtualNumpad } from "./GiantVirtualNumpad";
import { FracturePatternSelector } from "./FracturePatternSelector";
import { kioskAudio } from "./PressKioskAudio";
import { PressKioskHaptics } from "./PressKioskHaptics";
import { calculateDimensionsAndArea, calculateSlendernessCorrection } from "@/lib/pdf/compression-report/metrology";
import { usePressTelemetry } from "../../hooks/usePressTelemetry";
import { PressBrand } from "@/lib/hardware/press-telemetry";

export interface PendingSpecimenItem {
  id: string;
  numero: number;
  edadDias: number;
  muestraId: string;
  idMuestra: string;
  cliente: string;
  obra: string;
  fcKgCm2: number;
}

interface PressKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  especimenesPendientes: PendingSpecimenItem[];
  initialEspecimenId?: string;
  onSaveEnsaye: (payload: {
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
  }) => Promise<void>;
  isSaving?: boolean;
}

type ActiveField = "cargaKn" | "cargaKg" | "diametro" | "longitud" | "masa";
type MobileTab = "test" | "specimens" | "numpad" | "camera";

export function PressKioskModal({
  isOpen,
  onClose,
  especimenesPendientes,
  initialEspecimenId,
  onSaveEnsaye,
  isSaving = false,
}: PressKioskModalProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Detección responsiva de pantalla móvil (< 900px)
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("test");

  // Espécimen seleccionado
  const [selectedEspId, setSelectedEspId] = useState<string>(initialEspecimenId || "");

  // Campos de metrología
  const [activeField, setActiveField] = useState<ActiveField>("cargaKn");
  const [cargaKnStr, setCargaKnStr] = useState<string>("450.0");
  const [cargaKgStr, setCargaKgStr] = useState<string>("45887");
  const [diametroStr, setDiametroStr] = useState<string>("150.0");
  const [longitudStr, setLongitudStr] = useState<string>("300.0");
  const [masaStr, setMasaStr] = useState<string>("12850");
  const [tipoFalla, setTipoFalla] = useState<TipoFallaConcreto>("CONO_TIPO_1");
  const [condicionHumedad, setCondicionHumedad] = useState<
    "HUMEDO_SATURADO" | "SUPERFICIALMENTE_SECO" | "SECO_AIRE"
  >("HUMEDO_SATURADO");

  // Notificación de escáner USB / Cámara
  const [scannerToast, setScannerToast] = useState<string | null>(null);

  // Cámara WebRTC móvil
  const [cameraActive, setCameraActive] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeScanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Buffer para lector de código de barras USB HID
  const barcodeBufferRef = useRef<string>("");
  const barcodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDark = theme === "dark";

  // Listener de resize para alternar modo móvil / escritorio
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sincronizar selección inicial
  useEffect(() => {
    if (initialEspecimenId) {
      setSelectedEspId(initialEspecimenId);
    } else if (especimenesPendientes.length > 0 && !selectedEspId) {
      setSelectedEspId(especimenesPendientes[0].id);
    }
  }, [initialEspecimenId, especimenesPendientes, selectedEspId]);

  const currentEsp = useMemo(() => {
    return especimenesPendientes.find((e) => e.id === selectedEspId) || especimenesPendientes[0];
  }, [especimenesPendientes, selectedEspId]);

  // Cálculos metrológicos instantáneos ASTM C39
  const diametroMm = parseFloat(diametroStr) || 150.0;
  const longitudMm = parseFloat(longitudStr) || 300.0;

  // Integración de Telemetría Serial de Prensa con Háptica Móvil
  const {
    brand: pressBrand,
    status: pressStatus,
    statusMessage: pressStatusMsg,
    currentReading,
    peakReading,
    isBreakDetected,
    changeBrand: setPressBrand,
    connectSerial,
    connectWebSocket,
    startSimulation,
    disconnect: disconnectPress,
    resetTest: resetPressTest,
  } = usePressTelemetry({
    specimenDiameterMm: diametroMm,
    specimenLengthMm: longitudMm,
    onBreakDetected: (reading) => {
      PressKioskHaptics.concreteBreak();
      kioskAudio.playSuccessChime();
      const peakKn = reading.peakLoadKn || reading.currentLoadKn;
      setCargaKnStr(peakKn.toFixed(1));
      const kg = Math.round(peakKn * 101.9716);
      setCargaKgStr(kg.toString());
      setScannerToast(`¡Ruptura detectada! Carga pico congelada: ${peakKn.toFixed(1)} kN`);
      setTimeout(() => setScannerToast(null), 4000);
    },
  });

  const cargaKn = parseFloat(cargaKnStr) || 0;
  const cargaKg = parseFloat(cargaKgStr) || cargaKn * 101.9716;

  const dim = useMemo(() => calculateDimensionsAndArea(diametroMm), [diametroMm]);
  const slenderness = useMemo(
    () => calculateSlendernessCorrection(longitudMm, dim.diametroPromedioMm),
    [longitudMm, dim.diametroPromedioMm]
  );

  const resNominal = dim.areaCm2 > 0 ? cargaKg / dim.areaCm2 : 0;
  const resistenciaCorregida = Number((resNominal * slenderness.factorLd).toFixed(1));
  const fcDiseno = currentEsp ? currentEsp.fcKgCm2 : 250;
  const pctFc = fcDiseno > 0 ? Number(((resistenciaCorregida / fcDiseno) * 100).toFixed(1)) : 0;
  const cumple = resistenciaCorregida >= fcDiseno;

  // Manejo de valores del numpad para el campo activo
  const activeFieldValue = useMemo(() => {
    switch (activeField) {
      case "cargaKn":
        return cargaKnStr;
      case "cargaKg":
        return cargaKgStr;
      case "diametro":
        return diametroStr;
      case "longitud":
        return longitudStr;
      case "masa":
        return masaStr;
    }
  }, [activeField, cargaKnStr, cargaKgStr, diametroStr, longitudStr, masaStr]);

  const handleNumpadChange = (newVal: string) => {
    switch (activeField) {
      case "cargaKn": {
        setCargaKnStr(newVal);
        const kn = parseFloat(newVal) || 0;
        setCargaKgStr(kn > 0 ? Math.round(kn * 101.9716).toString() : "0");
        break;
      }
      case "cargaKg": {
        setCargaKgStr(newVal);
        const kg = parseFloat(newVal) || 0;
        setCargaKnStr(kg > 0 ? (kg * 0.00980665).toFixed(1) : "0.0");
        break;
      }
      case "diametro":
        setDiametroStr(newVal);
        break;
      case "longitud":
        setLongitudStr(newVal);
        break;
      case "masa":
        setMasaStr(newVal);
        break;
    }
  };

  // Identificador de código de barras
  const matchSpecimenCode = useCallback((code: string) => {
    const clean = code.trim().toLowerCase();
    const match = especimenesPendientes.find(
      (esp) =>
        clean.includes(esp.idMuestra.toLowerCase()) ||
        clean.includes(esp.id.toLowerCase()) ||
        clean.includes(`c${esp.numero}`) ||
        clean.includes(`cilindro ${esp.numero}`)
    );
    if (match) {
      setSelectedEspId(match.id);
      setScannerToast(`Espécimen identificado: ${match.idMuestra} - C${match.numero}`);
      PressKioskHaptics.scanned();
      kioskAudio.playSuccessChime();
      setTimeout(() => setScannerToast(null), 3000);
      return true;
    }
    return false;
  }, [especimenesPendientes]);

  // Listener global para Escáner USB HID y Pedal USB (F12)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        PressKioskHaptics.keyPress();
        kioskAudio.playSuccessChime();
        setActiveField("cargaKn");
        return;
      }

      if (e.key === "Enter") {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode.length >= 3) {
          if (!matchSpecimenCode(scannedCode)) {
            PressKioskHaptics.alert();
            kioskAudio.playAlertTone();
          }
          barcodeBufferRef.current = "";
          return;
        }

        if (cargaKn > 0) {
          handleSaveAndNext();
        }
        return;
      }

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = "";
        }, 150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (barcodeTimerRef.current) clearTimeout(barcodeTimerRef.current);
    };
  }, [isOpen, matchSpecimenCode, cargaKn]);

  // Pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Cámara WebRTC y Escaneo
  const toggleCamera = async () => {
    if (cameraActive) {
      if (barcodeScanIntervalRef.current) {
        clearInterval(barcodeScanIntervalRef.current);
        barcodeScanIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setTorchActive(false);
      setHasTorch(false);
    } else {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: isMobile ? 1280 : 1920 },
            height: { ideal: isMobile ? 720 : 1080 },
          },
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Comprobar soporte de linterna (torch) en móviles
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const cap: any = track.getCapabilities();
          if (cap.torch) {
            setHasTorch(true);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
        PressKioskHaptics.keyPress();

        // Iniciar escáner BarcodeDetector si está disponible en el navegador
        // @ts-ignore
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          // @ts-ignore
          const barcodeDetector = new BarcodeDetector({ formats: ["qr_code", "code_128", "code_39"] });
          barcodeScanIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawVal = barcodes[0].rawValue;
                  if (matchSpecimenCode(rawVal)) {
                    // Detener cámara al identificar probeta
                    toggleCamera();
                  }
                }
              } catch {
                // Silenciar errores de detección de frames
              }
            }
          }, 400);
        }
      } catch {
        PressKioskHaptics.alert();
        kioskAudio.playAlertTone();
      }
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !torchActive;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchActive(next);
        PressKioskHaptics.keyPress();
      } catch {
        // Silenciar si no se puede activar
      }
    }
  };

  const takePhotoSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
        setCapturedPreview(URL.createObjectURL(blob));
        PressKioskHaptics.scanned();
        kioskAudio.playSuccessChime();
        toggleCamera();
        if (isMobile) {
          setMobileTab("test");
        }
      }
    }, "image/webp", 0.85);
  };

  const handleSaveAndNext = async () => {
    if (!currentEsp || cargaKg <= 0) {
      PressKioskHaptics.alert();
      kioskAudio.playAlertTone();
      return;
    }

    try {
      PressKioskHaptics.success();
      kioskAudio.playSuccessChime();
      await onSaveEnsaye({
        especimenId: currentEsp.id,
        fechaHoraEnsaye: new Date().toISOString(),
        edadRealDias: currentEsp.edadDias || 28,
        diametroMm,
        longitudMm,
        masaG: parseFloat(masaStr) || undefined,
        cargaMaximaKn: cargaKn,
        cargaMaximaKg: cargaKg,
        tipoFalla,
        condicionHumedad,
        fotoBlob: capturedBlob || undefined,
      });

      const currentIndex = especimenesPendientes.findIndex((e) => e.id === currentEsp.id);
      if (currentIndex >= 0 && currentIndex + 1 < especimenesPendientes.length) {
        setSelectedEspId(especimenesPendientes[currentIndex + 1].id);
      }
      setCapturedBlob(null);
      setCapturedPreview(null);
      if (isMobile) {
        setMobileTab("test");
      }
    } catch {
      PressKioskHaptics.alert();
      kioskAudio.playAlertTone();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: isDark ? "#000000" : "#F8FAFC",
        color: isDark ? "#FFFFFF" : "#0F172A",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* 1. Barra Superior Adaptable */}
      <header
        style={{
          height: isMobile ? "54px" : "64px",
          padding: isMobile ? "0 12px" : "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF",
          borderBottom: isDark ? "2px solid #222222" : "2px solid #E2E8F0",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              fontSize: isMobile ? "15px" : "18px",
              fontWeight: "900",
              letterSpacing: "0.5px",
              color: isDark ? "#00E676" : "#16734C",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ShieldCheck size={isMobile ? 20 : 24} />
            <span>ENSALIA {isMobile ? "MÓVIL" : "PRESS KIOSK"}</span>
          </div>

          {!isMobile && currentEsp && (
            <div
              style={{
                fontSize: "13px",
                fontWeight: "600",
                backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                padding: "4px 12px",
                borderRadius: "8px",
                border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
              }}
            >
              Muestra: <strong>{currentEsp.idMuestra}</strong> | C#{currentEsp.numero} ({currentEsp.edadDias}d)
            </div>
          )}

          {scannerToast && (
            <div
              style={{
                backgroundColor: "#065F46",
                color: "#A7F3D0",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {scannerToast}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => {
              PressKioskHaptics.keyPress();
              setTheme(isDark ? "light" : "dark");
            }}
            style={{
              height: isMobile ? "38px" : "42px",
              padding: "0 10px",
              borderRadius: "8px",
              border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
              backgroundColor: isDark ? "#171717" : "#FFFFFF",
              color: isDark ? "#FFFFFF" : "#0F172A",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
            }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {!isMobile && <span>{isDark ? "Día" : "Noche"}</span>}
          </button>

          {!isMobile && (
            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                height: "42px",
                padding: "0 10px",
                borderRadius: "8px",
                border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                backgroundColor: isDark ? "#171717" : "#FFFFFF",
                color: isDark ? "#FFFFFF" : "#0F172A",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
              }}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>Pantalla Completa</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              height: isMobile ? "38px" : "42px",
              width: isMobile ? "38px" : "42px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: isDark ? "#450A0A" : "#FEE2E2",
              color: isDark ? "#F87171" : "#991B1B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Salir"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* 2. Barra de Navegación Móvil (Tabs inferiores o superiores) */}
      {isMobile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF",
            borderBottom: isDark ? "1px solid #222222" : "1px solid #E2E8F0",
            padding: "4px",
            gap: "4px",
          }}
        >
          {[
            { id: "test", label: "Rotura", icon: Zap },
            { id: "specimens", label: "Cilindros", icon: List },
            { id: "numpad", label: "Teclado", icon: Grid },
            { id: "camera", label: "Cámara", icon: Camera },
          ].map((tab) => {
            const isTabActive = mobileTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  PressKioskHaptics.keyPress();
                  setMobileTab(tab.id as MobileTab);
                  if (tab.id === "camera" && !cameraActive) {
                    toggleCamera();
                  }
                }}
                style={{
                  height: "40px",
                  borderRadius: "8px",
                  border: isTabActive
                    ? isDark
                      ? "1px solid #00E676"
                      : "1px solid #16734C"
                    : "none",
                  backgroundColor: isTabActive
                    ? isDark
                      ? "#064E3B"
                      : "#DCFCE7"
                    : "transparent",
                  color: isTabActive
                    ? isDark
                      ? "#00E676"
                      : "#166534"
                    : isDark
                    ? "#94A3B8"
                    : "#64748B",
                  fontSize: "12px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  cursor: "pointer",
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Contenido Principal: Móvil (Tabs) o Escritorio (Grid 3 columnas) */}
      <div
        style={{
          flex: 1,
          display: isMobile ? "flex" : "grid",
          flexDirection: isMobile ? "column" : undefined,
          gridTemplateColumns: isMobile ? undefined : "340px 1fr 320px",
          gap: isMobile ? "12px" : "18px",
          padding: isMobile ? "12px" : "18px",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* SECCIÓN 1: Selección de Especímenes y Parámetros */}
        {(!isMobile || mobileTab === "specimens") && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              backgroundColor: isDark ? "#0D0D0D" : "#FFFFFF",
              padding: isMobile ? "12px" : "16px",
              borderRadius: "14px",
              border: isDark ? "2px solid #222222" : "2px solid #E2E8F0",
              height: isMobile ? "100%" : "auto",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: "800", color: isDark ? "#94A3B8" : "#64748B" }}>
              CILINDROS PENDIENTES ({especimenesPendientes.length})
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: isMobile ? "280px" : "220px" }}>
              {especimenesPendientes.map((esp) => {
                const isSelected = esp.id === currentEsp?.id;
                return (
                  <button
                    key={esp.id}
                    type="button"
                    onClick={() => {
                      PressKioskHaptics.keyPress();
                      kioskAudio.playKeyClick();
                      setSelectedEspId(esp.id);
                      if (isMobile) setMobileTab("test");
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      border: isSelected
                        ? isDark
                          ? "2px solid #00E676"
                          : "2px solid #16734C"
                        : isDark
                        ? "1px solid #262626"
                        : "1px solid #E2E8F0",
                      backgroundColor: isSelected
                        ? isDark
                          ? "#064E3B"
                          : "#DCFCE7"
                        : isDark
                        ? "#171717"
                        : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      fontSize: "13px",
                      fontWeight: isSelected ? "700" : "500",
                    }}
                  >
                    <span>
                      {esp.idMuestra} - C#{esp.numero}
                    </span>
                    <span style={{ fontSize: "11px", color: isDark ? "#A7F3D0" : "#166534" }}>
                      {esp.edadDias}d (f'c {esp.fcKgCm2})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selector de Campo Activo */}
            <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: "800", color: isDark ? "#94A3B8" : "#64748B" }}>
              CAMPOS DE ENTRADA
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { id: "cargaKn", label: "Carga (kN)", val: `${cargaKnStr} kN` },
                { id: "cargaKg", label: "Carga (kgf)", val: `${cargaKgStr} kg` },
                { id: "diametro", label: "Diámetro (mm)", val: `${diametroStr} mm` },
                { id: "longitud", label: "Longitud (mm)", val: `${longitudStr} mm` },
              ].map((f) => {
                const isSelected = activeField === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      PressKioskHaptics.keyPress();
                      kioskAudio.playKeyClick();
                      setActiveField(f.id as ActiveField);
                      if (isMobile) setMobileTab("numpad");
                    }}
                    style={{
                      height: "56px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      textAlign: "left",
                      cursor: "pointer",
                      border: isSelected
                        ? isDark
                          ? "2px solid #00E676"
                          : "2px solid #16734C"
                        : isDark
                        ? "1px solid #262626"
                        : "1px solid #CBD5E1",
                      backgroundColor: isSelected
                        ? isDark
                          ? "#064E3B"
                          : "#DCFCE7"
                        : isDark
                        ? "#171717"
                        : "#FFFFFF",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                    }}
                  >
                    <div style={{ fontSize: "10px", color: isDark ? "#94A3B8" : "#64748B" }}>{f.label}</div>
                    <div style={{ fontSize: "14px", fontWeight: "900", marginTop: "2px" }}>{f.val}</div>
                  </button>
                );
              })}
            </div>

            {/* Botón de Cámara en Panel Lateral si no es móvil */}
            {!isMobile && (
              <div style={{ marginTop: "auto" }}>
                <button
                  type="button"
                  onClick={toggleCamera}
                  style={{
                    width: "100%",
                    height: "50px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: cameraActive ? "#DC2626" : isDark ? "#1E293B" : "#E2E8F0",
                    color: cameraActive ? "#FFFFFF" : isDark ? "#FFFFFF" : "#0F172A",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Camera size={18} />
                  <span>{cameraActive ? "Detener Cámara" : capturedBlob ? "Foto Capturada ✓" : "Abrir Cámara WebRTC"}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 2: Monitor Digital Central, Telemetría y Patrón de Falla */}
        {(!isMobile || mobileTab === "test") && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              justifyContent: "space-between",
            }}
          >
            {/* Tarjeta de Resumen del Espécimen Activo en Móvil */}
            {isMobile && currentEsp && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  backgroundColor: isDark ? "#0E0E0E" : "#F1F5F9",
                  border: isDark ? "1px solid #222222" : "1px solid #CBD5E1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "13px",
                }}
              >
                <div>
                  <strong>{currentEsp.idMuestra}</strong> - Cilindro #{currentEsp.numero}
                </div>
                <div style={{ color: isDark ? "#00E676" : "#16734C", fontWeight: "800" }}>
                  {currentEsp.edadDias} días | f'c {currentEsp.fcKgCm2}
                </div>
              </div>
            )}

            {/* Barra de Telemetría Serial de Prensa */}
            <div
              style={{
                padding: isMobile ? "10px 12px" : "12px 18px",
                borderRadius: "12px",
                backgroundColor: isDark ? "#0E0E0E" : "#F8FAFC",
                border: isDark ? "2px solid #222222" : "2px solid #E2E8F0",
                display: "flex",
                flexWrap: isMobile ? "wrap" : "nowrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: isDark ? "#94A3B8" : "#64748B" }}>
                  PRENSA:
                </span>
                <select
                  value={pressBrand}
                  onChange={(e) => setPressBrand(e.target.value as PressBrand)}
                  disabled={pressStatus === "STREAMING"}
                  style={{
                    height: "32px",
                    padding: "0 8px",
                    borderRadius: "6px",
                    border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    color: isDark ? "#FFFFFF" : "#0F172A",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  <option value="CONTROLS">Controls (C01)</option>
                  <option value="FORNEY">Forney (Imperial)</option>
                  <option value="ELE">ELE ADR-Touch</option>
                  <option value="MATEST">Matest S.p.A.</option>
                </select>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 8px",
                    borderRadius: "16px",
                    fontSize: "10px",
                    fontWeight: "800",
                    backgroundColor:
                      pressStatus === "STREAMING"
                        ? isBreakDetected
                          ? "#065F46"
                          : "#047857"
                        : pressStatus === "ERROR"
                        ? "#7F1D1D"
                        : isDark
                        ? "#1E293B"
                        : "#E2E8F0",
                    color:
                      pressStatus === "STREAMING"
                        ? "#A7F3D0"
                        : pressStatus === "ERROR"
                        ? "#FCA5A5"
                        : isDark
                        ? "#94A3B8"
                        : "#64748B",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor:
                        pressStatus === "STREAMING"
                          ? "#10B981"
                          : pressStatus === "ERROR"
                          ? "#EF4444"
                          : "#94A3B8",
                    }}
                  />
                  <span>
                    {pressStatus === "STREAMING"
                      ? isBreakDetected
                        ? "ROTURA"
                        : "EN VIVO"
                      : pressStatus === "CONNECTING"
                      ? "CONECTANDO"
                      : "EN ESPERA"}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {pressStatus === "STREAMING" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        PressKioskHaptics.keyPress();
                        resetPressTest();
                      }}
                      style={{
                        height: "32px",
                        padding: "0 10px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: isDark ? "#334155" : "#E2E8F0",
                        color: isDark ? "#FFFFFF" : "#0F172A",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Reiniciar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        PressKioskHaptics.alert();
                        disconnectPress();
                      }}
                      style={{
                        height: "32px",
                        padding: "0 10px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#DC2626",
                        color: "#FFFFFF",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Detener
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        PressKioskHaptics.keyPress();
                        connectSerial();
                      }}
                      style={{
                        height: "32px",
                        padding: "0 10px",
                        borderRadius: "6px",
                        border: isDark ? "1px solid #00E676" : "1px solid #16734C",
                        backgroundColor: isDark ? "#064E3B" : "#DCFCE7",
                        color: isDark ? "#00E676" : "#166534",
                        fontSize: "11px",
                        fontWeight: "800",
                        cursor: "pointer",
                      }}
                    >
                      🔌 USB Serial
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        PressKioskHaptics.keyPress();
                        startSimulation(currentEsp?.fcKgCm2 ? currentEsp.fcKgCm2 * 0.1 : 32.5, 12);
                      }}
                      style={{
                        height: "32px",
                        padding: "0 10px",
                        borderRadius: "6px",
                        border: isDark ? "1px solid #334155" : "1px solid #CBD5E1",
                        backgroundColor: isDark ? "#171717" : "#FFFFFF",
                        color: isDark ? "#94A3B8" : "#475569",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      🧪 Simular
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Monitor Digital Gigante de Carga y Resistencia Adaptable */}
            <div
              style={{
                padding: isMobile ? "16px" : "22px",
                borderRadius: "14px",
                backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF",
                border: isBreakDetected
                  ? "3px solid #00E676"
                  : isDark
                  ? "2px solid #262626"
                  : "2px solid #CBD5E1",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? "16px" : "24px",
                alignItems: "center",
                boxShadow: isBreakDetected ? "0 0 25px rgba(0, 230, 118, 0.3)" : "none",
              }}
            >
              {/* Carga Aplicada */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: isMobile ? "12px" : "14px", fontWeight: "800", color: isDark ? "#94A3B8" : "#64748B" }}>
                    {isBreakDetected ? "CARGA PICO REGISTRADA (CONGELADA)" : "CARGA PICO / EN TIEMPO REAL"}
                  </div>
                  {pressStatus === "STREAMING" && currentReading && (
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: "800",
                        color: currentReading.rateCompliant ? "#10B981" : "#F59E0B",
                        backgroundColor: currentReading.rateCompliant ? "#064E3B" : "#78350F",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {currentReading.currentRateMpaS?.toFixed(2)} MPa/s (ASTM C39)
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: isMobile ? "38px" : "50px",
                    fontWeight: "900",
                    fontVariantNumeric: "tabular-nums",
                    color: isDark ? "#00E676" : "#16734C",
                    lineHeight: 1.1,
                    margin: "4px 0",
                  }}
                >
                  {pressStatus === "STREAMING" && !isBreakDetected && currentReading
                    ? currentReading.currentLoadKn.toFixed(1)
                    : cargaKn.toFixed(1)}{" "}
                  <span style={{ fontSize: isMobile ? "20px" : "24px" }}>kN</span>
                </div>
                <div style={{ fontSize: isMobile ? "13px" : "15px", color: isDark ? "#CBD5E1" : "#475569" }}>
                  Equivalente: <strong>{Math.round(cargaKg).toLocaleString()} kgf</strong>
                </div>
              </div>

              {/* Resistencia Calculada y Semáforo % f'c */}
              <div
                style={{
                  borderLeft: isMobile ? "none" : isDark ? "2px solid #262626" : "2px solid #E2E8F0",
                  borderTop: isMobile ? (isDark ? "1px solid #222222" : "1px solid #E2E8F0") : "none",
                  paddingLeft: isMobile ? "0" : "24px",
                  paddingTop: isMobile ? "12px" : "0",
                }}
              >
                <div style={{ fontSize: isMobile ? "12px" : "14px", fontWeight: "800", color: isDark ? "#94A3B8" : "#64748B" }}>
                  RESISTENCIA A COMPRESIÓN (f'c)
                </div>
                <div
                  style={{
                    fontSize: isMobile ? "38px" : "50px",
                    fontWeight: "900",
                    fontVariantNumeric: "tabular-nums",
                    color: cumple ? (isDark ? "#00E676" : "#16734C") : "#EF4444",
                    lineHeight: 1.1,
                    margin: "4px 0",
                  }}
                >
                  {resistenciaCorregida.toFixed(1)}{" "}
                  <span style={{ fontSize: isMobile ? "18px" : "22px" }}>kg/cm²</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontWeight: "900",
                      fontSize: "13px",
                      backgroundColor: cumple ? "#065F46" : "#991B1B",
                      color: "#FFFFFF",
                    }}
                  >
                    {pctFc}% f'c
                  </span>
                  <span style={{ fontSize: "12px", color: isDark ? "#94A3B8" : "#64748B" }}>
                    Diseño: {fcDiseno} kg/cm²
                  </span>
                </div>
              </div>
            </div>

            {/* Selector de Patrones de Fractura ASTM C39 */}
            <div
              style={{
                padding: "12px",
                borderRadius: "12px",
                backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF",
                border: isDark ? "2px solid #222222" : "2px solid #E2E8F0",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: "800", marginBottom: "8px", color: isDark ? "#94A3B8" : "#64748B" }}>
                PATRÓN DE FRACTURA ASTM C39 (FIGURA 2)
              </div>
              <FracturePatternSelector
                value={tipoFalla}
                onChange={(f) => setTipoFalla(f)}
                theme={theme}
              />
            </div>

            {/* Botones de Acción */}
            <div style={{ display: "flex", gap: "10px", marginTop: "auto" }}>
              <button
                type="button"
                disabled={isSaving || cargaKg <= 0}
                onClick={handleSaveAndNext}
                style={{
                  flex: 1,
                  height: isMobile ? "64px" : "76px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: isDark ? "#00E676" : "#16734C",
                  color: isDark ? "#000000" : "#FFFFFF",
                  fontSize: isMobile ? "17px" : "20px",
                  fontWeight: "900",
                  cursor: isSaving || cargaKg <= 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: isDark
                    ? "0 0 20px rgba(0, 230, 118, 0.4)"
                    : "0 10px 15px -3px rgba(22, 115, 76, 0.3)",
                  touchAction: "manipulation",
                }}
              >
                <Check size={isMobile ? 22 : 26} />
                <span>{isSaving ? "GUARDANDO..." : "GUARDAR Y CONTINUAR"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: isMobile ? "90px" : "140px",
                  height: isMobile ? "64px" : "76px",
                  borderRadius: "12px",
                  border: isDark ? "2px solid #334155" : "2px solid #CBD5E1",
                  backgroundColor: isDark ? "#171717" : "#F1F5F9",
                  color: isDark ? "#94A3B8" : "#475569",
                  fontSize: isMobile ? "13px" : "15px",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                SALIR
              </button>
            </div>
          </div>
        )}

        {/* SECCIÓN 3: Teclado Numérico Gigante o Cámara Móvil */}
        {(!isMobile || mobileTab === "numpad") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {isMobile && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
                  fontSize: "12px",
                  fontWeight: "800",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Editando: {activeField}</span>
                <span>Valor: {activeFieldValue}</span>
              </div>
            )}
            <GiantVirtualNumpad
              value={activeFieldValue}
              onChange={handleNumpadChange}
              onEnter={handleSaveAndNext}
              theme={theme}
              disabled={isSaving}
              compact={isMobile}
            />

            {!isMobile && (
              <div
                style={{
                  marginTop: "auto",
                  padding: "12px",
                  borderRadius: "10px",
                  backgroundColor: isDark ? "#0D0D0D" : "#F1F5F9",
                  fontSize: "11px",
                  color: isDark ? "#64748B" : "#64748B",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div>⚡ <strong>Pedal USB / F12:</strong> Captura carga</div>
                <div>⚡ <strong>Enter:</strong> Guarda espécimen y avanza</div>
                <div>⚡ <strong>Escáner 2D:</strong> Escanea código QR/128</div>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 4: Cámara en Tab Móvil */}
        {isMobile && mobileTab === "camera" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              height: "100%",
            }}
          >
            <div
              style={{
                position: "relative",
                height: "320px",
                borderRadius: "12px",
                overflow: "hidden",
                border: "2px solid #00E676",
                backgroundColor: "#000000",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    backgroundColor: torchActive ? "#FACC15" : "rgba(0,0,0,0.6)",
                    color: torchActive ? "#000000" : "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Linterna"
                >
                  <Zap size={22} />
                </button>
              )}

              <button
                type="button"
                onClick={takePhotoSnapshot}
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "12px 28px",
                  backgroundColor: "#00E676",
                  color: "#000000",
                  fontSize: "16px",
                  fontWeight: "900",
                  borderRadius: "30px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 15px rgba(0,230,118,0.5)",
                }}
              >
                📸 TOMAR FOTO
              </button>
            </div>

            {capturedPreview && (
              <div style={{ textAlign: "center", fontSize: "12px", color: "#10B981" }}>
                ✓ Fotografía forense lista para adjuntar al informe
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
