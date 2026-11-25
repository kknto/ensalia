"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  PressBrand,
  PressConnectionStatus,
  PressReading,
  PressTelemetryClient,
} from "@/lib/hardware/press-telemetry";

export interface UsePressTelemetryOptions {
  initialBrand?: PressBrand;
  specimenDiameterMm?: number;
  specimenLengthMm?: number;
  onBreakDetected?: (reading: PressReading) => void;
}

export function usePressTelemetry(options?: UsePressTelemetryOptions) {
  const [brand, setBrand] = useState<PressBrand>(options?.initialBrand || "CONTROLS");
  const [status, setStatus] = useState<PressConnectionStatus>("DISCONNECTED");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [currentReading, setCurrentReading] = useState<PressReading | null>(null);
  const [peakReading, setPeakReading] = useState<PressReading | null>(null);
  const [history, setHistory] = useState<PressReading[]>([]);
  const [isBreakDetected, setIsBreakDetected] = useState(false);

  const clientRef = useRef<PressTelemetryClient | null>(null);
  const onBreakDetectedRef = useRef(options?.onBreakDetected);
  const latestReadingRef = useRef<PressReading | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    onBreakDetectedRef.current = options?.onBreakDetected;
  }, [options?.onBreakDetected]);

  // Inicializar cliente con rAF throttling para dispositivos móviles
  useEffect(() => {
    const client = new PressTelemetryClient({
      brand,
      specimenDiameterMm: options?.specimenDiameterMm || 150,
      specimenLengthMm: options?.specimenLengthMm || 300,
      onReading: (reading) => {
        latestReadingRef.current = reading;

        // Ruptura o pico: despacho síncrono inmediato (cero latencia)
        if (reading.breakDetected || reading.isPeak) {
          setCurrentReading(reading);
          if (reading.isPeak) setPeakReading(reading);
          if (reading.breakDetected) {
            setIsBreakDetected(true);
            if (onBreakDetectedRef.current) {
              onBreakDetectedRef.current(reading);
            }
          }
          return;
        }

        // Lectura continua: throttle vía requestAnimationFrame para optimizar batería y GPU móvil
        if (rafIdRef.current === null && typeof window !== "undefined") {
          rafIdRef.current = window.requestAnimationFrame(() => {
            if (latestReadingRef.current) {
              const r = latestReadingRef.current;
              setCurrentReading(r);
              setHistory((prev) => [...prev.slice(-100), r]);
            }
            rafIdRef.current = null;
          });
        }
      },
      onStatusChange: (newStatus, msg) => {
        setStatus(newStatus);
        if (msg) setStatusMessage(msg);
      },
    });

    clientRef.current = client;

    return () => {
      if (rafIdRef.current !== null && typeof window !== "undefined") {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      client.disconnect();
    };
  }, []);

  // Actualizar geometría si cambia
  useEffect(() => {
    if (clientRef.current && options?.specimenDiameterMm) {
      clientRef.current.setSpecimenDiameter(options.specimenDiameterMm);
    }
  }, [options?.specimenDiameterMm]);

  // Cambiar marca
  const changeBrand = useCallback((newBrand: PressBrand) => {
    setBrand(newBrand);
    if (clientRef.current) {
      clientRef.current.setBrand(newBrand);
    }
  }, []);

  // Iniciar conexión Web Serial
  const connectSerial = useCallback(async () => {
    if (!clientRef.current) return false;
    setIsBreakDetected(false);
    setPeakReading(null);
    setHistory([]);
    return await clientRef.current.connectSerial();
  }, []);

  // Iniciar conexión WebSocket
  const connectWebSocket = useCallback((url?: string) => {
    if (!clientRef.current) return false;
    setIsBreakDetected(false);
    setPeakReading(null);
    setHistory([]);
    return clientRef.current.connectWebSocket(url);
  }, []);

  // Iniciar simulación metrológica
  const startSimulation = useCallback((targetStrengthMpa = 30.0, durationSec = 12) => {
    if (!clientRef.current) return;
    setIsBreakDetected(false);
    setPeakReading(null);
    setHistory([]);
    clientRef.current.startMetrologicalSimulation(targetStrengthMpa, durationSec);
  }, []);

  // Desconectar o detener simulación
  const disconnect = useCallback(() => {
    if (!clientRef.current) return;
    clientRef.current.disconnect();
  }, []);

  // Reiniciar estado de telemetría (para nuevo ensayo)
  const resetTest = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.getEngine().reset();
    }
    setCurrentReading(null);
    setPeakReading(null);
    setHistory([]);
    setIsBreakDetected(false);
  }, []);

  return {
    brand,
    status,
    statusMessage,
    currentReading,
    peakReading,
    history,
    isBreakDetected,
    changeBrand,
    connectSerial,
    connectWebSocket,
    startSimulation,
    disconnect,
    resetTest,
  };
}
