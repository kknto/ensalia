"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { CodigoModulo, NivelSuscripcion } from "@prisma/client";

export interface SubscriptionInfo {
  plan: NivelSuscripcion;
  titular: string;
  activa: boolean;
  diasRestantes: number | null;
  validaHasta: string | null;
}

interface SubscriptionContextType {
  tier: NivelSuscripcion;
  info: SubscriptionInfo | null;
  activeModules: Partial<Record<CodigoModulo, boolean>>;
  isModuleEnabled: (modulo: CodigoModulo) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<NivelSuscripcion>(NivelSuscripcion.PROFESIONAL);
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [activeModules, setActiveModules] = useState<Partial<Record<CodigoModulo, boolean>>>({
    [CodigoModulo.CAPTURA_BASE]: true,
    [CodigoModulo.REGISTROS_BITACORA]: true,
    [CodigoModulo.PERSONALIZACION_PERFIL]: true,
    [CodigoModulo.PROGRAMACION_ENSAYOS]: true,
    [CodigoModulo.HOJAS_CAMPO]: true,
    [CodigoModulo.LOGISTICA_SALIDAS]: true,
    [CodigoModulo.INVENTARIO_EQUIPOS]: true,
    [CodigoModulo.CALIBRACION_MANTENIMIENTO]: true,
    [CodigoModulo.CURVAS_FC_FOTOS]: true,
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setTier(data.subscription.plan);
          setInfo(data.subscription);
          setActiveModules(data.activeModules);
        }
      }
    } catch (e) {
      console.warn("No se pudo sincronizar la suscripción en línea, usando valores locales.", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  const isModuleEnabled = useCallback(
    (modulo: CodigoModulo): boolean => {
      // Si aún está cargando o no hay registro, los módulos básicos siempre están disponibles
      if (
        modulo === CodigoModulo.CAPTURA_BASE ||
        modulo === CodigoModulo.REGISTROS_BITACORA ||
        modulo === CodigoModulo.PERSONALIZACION_PERFIL
      ) {
        return true;
      }
      return Boolean(activeModules[modulo]);
    },
    [activeModules]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        info,
        activeModules,
        isModuleEnabled,
        loading,
        refresh: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription debe usarse dentro de un SubscriptionProvider.");
  }
  return context;
}

