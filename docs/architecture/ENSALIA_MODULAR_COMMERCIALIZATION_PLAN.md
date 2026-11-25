# Plan Maestro de Arquitectura Técnica e Implementación: Plataforma Modular Comercial ENSALIA

- **Documento**: `docs/architecture/ENSALIA_MODULAR_COMMERCIALIZATION_PLAN.md`
- **Versión**: 1.0.0
- **Fecha**: 2026-10-29
- **Estado**: Aprobado para Implementación
- **Autor**: Equipo de Arquitectura Técnica ENSALIA
- **Pila Tecnológica**: Next.js 15.5.4 (App Router), React 19.1.1, Node.js 20+, Prisma ORM v6.16.2, SQLite local, TypeScript 5.9.2 (Strict Mode)

---

## Índice General

1. [Resumen Ejecutivo y Objetivos Comerciales](#1-resumen-ejecutivo-y-objetivos-comerciales)
   - 1.1 Contexto de la Plataforma ENSALIA y Justificación Comercial
   - 1.2 Visión del Producto: De Herramienta de Laboratorio a Plataforma Modular
   - 1.3 Objetivos Técnicos y de Negocio
   - 1.4 Principios Rectores de Arquitectura
2. [Arquitectura de Habilitación y Empaquetado Modular por Suscripción](#2-arquitectura-de-habilitación-y-empaquetado-modular-por-suscripción)
   - 2.1 Definición de los 4 Niveles Comerciales (Tiers)
   - 2.2 Mecanismo de Verificación en Backend
   - 2.3 Mecanismo de Verificación en Frontend
   - 2.4 Esquema de Persistencia Offline de Licencias y Tokens Criptográficos
   - 2.5 Empaquetado Desacoplado mediante Registro de Manifiestos
   - 2.6 Confirmación Explícita de Exclusión de Control de Accesos (RBAC)
3. [Especificación Técnica Detallada de Módulos Funcionales](#3-especificación-técnica-detallada-de-módulos-funcionales)
   - 3.1 Módulo: Inventario de Equipos, Calibraciones y Mantenimiento
   - 3.2 Módulo: Carga y Procesamiento de Hojas de Campo
   - 3.3 Módulo: Muestras a Salir (Logística y Despacho)
   - 3.4 Módulo: Curvas Estadísticas f'c y Registro Fotográfico en Tiempo Real
   - 3.5 Estrategia y Plan de Modularización de Estilos (`globals.css`)
4. [Estrategia de Almacenamiento Local Determinista (%LOCALAPPDATA%/LABSICO)](#4-estrategia-de-almacenamiento-local-determinista-localappdatalabsico)
   - 4.1 Resolución Jerárquica de Rutas Base con Prioridad en Windows Local
   - 4.2 Árbol Determinista de Directorios en Disco
   - 4.3 Persistencia de Rutas Relativas Normalizadas POSIX en SQLite
   - 4.4 Servicio de Almacenamiento y Entrega Vía Route Handlers
   - 4.5 Actualización Crítica del Motor de Respaldos (Formato Manifiesto Versión 4)
   - 4.6 Concurrencia y Rendimiento en SQLite
5. [Compatibilidad Técnica, Coherencia de Tipos e Invarianza](#5-compatibilidad-técnica-coherencia-de-tipos-e-invarianza)
   - 5.1 Compatibilidad con el Stack de Ejecución
   - 5.2 Estrategia de Extensión Aditiva en SQLite
   - 5.3 Invarianza de `src/features/samples/types.ts` y Plantilla Fija de Captura
   - 5.4 Políticas de TypeScript Estricto y Validación Zod
6. [Roadmap de Ejecución por Fases Priorizadas](#6-roadmap-de-ejecución-por-fases-priorizadas)
   - 6.1 Matriz de Dependencias Técnicas y Secuencia Lógica
   - 6.2 Especificación Detallada de las 5 Fases de Implementación
   - 6.3 Matriz de Riesgos y Mitigaciones Técnicas

---

## 1. Resumen Ejecutivo y Objetivos Comerciales

### 1.1 Contexto de la Plataforma ENSALIA y Justificación Comercial

ENSALIA es una solución integral para laboratorios de control de calidad de materiales de construcción y obras civiles, especializada en el muestreo, trazabilidad física, programación de ensayes y emisión de bitácoras de concreto hidráulico. En su versión fundacional, la aplicación opera como una aplicación local de alto rendimiento (Next.js 15 App Router en modo cliente monousuario sobre SQLite y Windows), diseñada para garantizar inmediatez operativa, cálculo síncrono de calendarios de ensaye y generación determinista de documentos oficiales (hojas de campo con códigos QR y folios anuales).

A medida que ENSALIA amplía su alcance hacia laboratorios independientes medianos, plantas concreteras integradas y grandes consorcios de supervisión acreditados bajo normas como **ISO/IEC 17025** y **NMX-EC-17025-IMNC**, las demandas operativas divergen sustancialmente:
- Laboratorios pequeños requieren únicamente la digitalización del muestreo y el control básico de fallas a 28 días.
- Laboratorios acreditados requieren trazabilidad metrológica estricta de sus prensas y moldes, certificados de calibración en PDF auditables y expedientes de mantenimiento preventivo.
- Plantas con flotillas de supervisores demandan gestión logística de recolección en campo (muestras a salir), asistentes offline para captura en obra y control estadístico de variabilidad de mezclas ($f'c$, campana de Gauss, ACI 214R) con evidencia fotográfica forense de las roturas.

Comercializar ENSALIA como una suite monolítica fija limita la penetración en el mercado, imponiendo una barrera de costo a los laboratorios emergentes y desaprovechando el valor agregado exigido por las empresas de alto volumen. Por ende, la **estrategia de comercialización modular activable por suscripción** es el pilar central de esta nueva fase arquitectónica.

### 1.2 Visión del Producto: De Herramienta de Laboratorio a Plataforma Modular

La transformación de ENSALIA busca convertir la plataforma en un ecosistema desacoplado donde:
1. **El núcleo operativo (Core de Muestras y Colados)** permanece inmutable, garantizando cero regresión en los flujos diarios de captura ya probados y certificados.
2. **Los módulos de valor avanzado** (Inventario y Metrología, Asistente de Campo Offline, Tablero Logístico, Analítica Estadística f'c y Captura Fotográfica WebRTC) se empaquetan como capacidades activables mediante un motor local de *Feature Flags*.
3. **La experiencia del usuario es progresiva**: los módulos no contratados o deshabilitados no bloquean de forma tosca al usuario, sino que guían comercialmente a la empresa mediante banners informativos y compuertas de funcionalidad declarativas (`<FeatureGate>`).
4. **La persistencia y el archivo documental** operan bajo un estándar determinista de almacenamiento local (`%LOCALAPPDATA%/LABSICO` o `%LOCALAPPDATA%/Ensalia`), asegurando la integridad de archivos PDF y fotografías sin sobrecargar la base de datos SQLite ni comprometer la velocidad de los respaldos automatizados.

### 1.3 Objetivos Técnicos y de Negocio

| Dimensión | Objetivo Técnico / Comercial | Indicador de Éxito |
| :--- | :--- | :--- |
| **Monetización Flexible** | Habilitar 4 niveles comerciales escalables (Essential, Operational, Pro, Enterprise). | Activación/desactivación de módulos sin recompilar la aplicación ni modificar el código fuente. |
| **Invarianza del Core** | Preservar intacta la plantilla de captura fija (`CONCRETE_CAPTURE_TEMPLATE_V1` de 54 campos). | 0 cambios en el esquema de 54 campos; 100% de tests unitarios de bitácora pasando. |
| **Operación Offline Total** | Garantizar que licencias, módulos y almacenamiento operen sin conexión permanente a internet. | Validación criptográfica local de licencias mediante tokens HMAC/RSA; persistencia local de adjuntos. |
| **Modularización de Estilos** | Detener el crecimiento del monolito `globals.css` (1,287 líneas) y desacoplar estilos. | Adopción de CSS Modules (`*.module.css`) en todos los nuevos módulos; extracción de tokens a `tokens.css`. |
| **Integridad Metrológica** | Vincular cada ensaye y calibración con su evidencia física (PDF o foto WebP) con hash SHA-256. | Verificación forense automática de inmutabilidad en certificados y fotografías de falla. |

### 1.4 Principios Rectores de Arquitectura

1. **Defensa en Profundidad**: Toda restricción de módulo por plan comercial debe verificarse tanto en la interfaz de usuario (ocultamiento en navegación, compuertas UI) como en el servidor (Route Handlers y capa de servicios con código HTTP 403 Forbidden).
2. **Extensiones de Datos Estrictamente Aditivas**: En SQLite, las modificaciones sobre tablas existentes requieren reconstrucciones complejas (`CREATE TABLE new_...; INSERT ...; DROP ...`). Toda extensión a entidades existentes (`Muestra`, `Especimen`, `Equipo`) se modela mediante relaciones 1-a-1 o 1-a-N aditivas con claves foráneas inversas.
3. **Cero BLOBs en SQLite**: La base de datos almacena exclusivamente texto, números, fechas y rutas relativas normalizadas. Todo archivo binario (PDF, JPG, WebP) se almacena en el sistema de archivos del sistema operativo bajo una estructura jerárquica determinista.
4. **Postergación Deliberada del Control de Acceso (RBAC)**: El control de acceso basado en roles por usuario individual queda expresamente postergado para una fase posterior. La gobernanza de módulos y permisos opera a nivel de **licencia de la instalación del laboratorio**.

---

## 2. Arquitectura de Habilitación y Empaquetado Modular por Suscripción

### 2.1 Definición de los 4 Niveles Comerciales (Tiers)

Para estructurar la oferta comercial, se definen cuatro niveles de empaquetado progresivo:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NIVEL 4: EMPRESARIAL / CUSTOM                   │
│   (Todo lo de Pro + Módulos a la Carta + Licencias Multi-Dispositivo)  │
├────────────────────────────────────────────────────────────────────────┤
│                        NIVEL 3: PROFESIONAL (PRO)                      │
│   (Todo lo de Estándar + Curvas Estadísticas f'c + Fotos Rotura        │
│    WebRTC + Inventario Equipos Metrológico + Certificados SHA-256)     │
├────────────────────────────────────────────────────────────────────────┤
│                        NIVEL 2: ESTÁNDAR (OPERATIONAL)                 │
│   (Todo lo de Básico + Programación Diaria Ensayes + Hojas de Campo    │
│    con QR + Tablero Logístico Despacho "Muestras a Salir")             │
├────────────────────────────────────────────────────────────────────────┤
│                        NIVEL 1: BÁSICO (ESSENTIAL)                     │
│   (Captura de Muestras Concreto + Especímenes + Bitácoras + Excel)     │
└────────────────────────────────────────────────────────────────────────┘
```

#### Matriz Detallada de Capacidades por Nivel

| Identificador de Módulo (`CodigoModulo`) | Nombre Comercial | Básico (Essential) | Estándar (Operational) | Profesional (Pro) | Empresarial (Custom) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `CAPTURA_BASE` | Captura de Muestras y Registro de Especímenes | Incluido | Incluido | Incluido | Incluido |
| `REGISTROS_BITACORA` | Bitácora de Obra, Estados y Exportación Excel | Incluido | Incluido | Incluido | Incluido |
| `PERSONALIZACION_PERFIL` | Identidad de Marca (Logotipo, Folios Anuales) | Incluido | Incluido | Incluido | Incluido |
| `PROGRAMACION_ENSAYOS` | Calendario Operativo y Hoja FO-LAB-PE | Excluido | Incluido | Incluido | Incluido |
| `HOJAS_CAMPO` | Asistente de Captura en Campo y Emisión QR | Excluido | Incluido | Incluido | Incluido |
| `LOGISTICA_SALIDAS` | Muestras a Salir, Manifiestos y Check-in | Excluido | Incluido | Incluido | Incluido |
| `INVENTARIO_EQUIPOS` | Inventario Físico de Moldes y Herramientas | Excluido | Excluido | Incluido | Incluido |
| `CALIBRACION_MANTENIMIENTO`| Control Metrológico, Semáforos y Certificados PDF| Excluido | Excluido | Incluido | Incluido |
| `CURVAS_FC_FOTOS` | Curvas f'c (ACI 214R / Gauss) y Fotos WebRTC | Excluido | Excluido | Incluido | Incluido |
| `REPORTES_AVANZADOS` | Informes Estadísticos Multi-Obra y Tendencias | Excluido | Excluido | Incluido | Incluido |
| `DIGITALIZACION_OCR` | Carga e Interpretación de Escaneos de Campo | Excluido | Excluido | Excluido | Opcional |

### 2.2 Mecanismo de Verificación en Backend

La arquitectura de seguridad implementa un esquema de **Defensa en Profundidad** de dos niveles en el servidor:

#### Nivel 1: Route Handler Guard (Protección de Endpoints REST)
Todo manejador de ruta HTTP sensible debe ejecutar la validación previa de licencia antes de procesar la solicitud:

```typescript
// src/lib/licensing/guard.ts
import { NextResponse } from "next/server";
import { isModuleActive } from "./engine";
import { CodigoModulo } from "@prisma/client";

export async function requireModule(modulo: CodigoModulo): Promise<NextResponse | null> {
  const activo = await isModuleActive(modulo);
  if (!activo) {
    return NextResponse.json(
      {
        error: "MODULO_NO_CONTRATADO",
        mensaje: `El módulo '${modulo}' no está habilitado en su nivel de suscripción actual.`,
        moduloRequerido: modulo,
      },
      { status: 403 }
    );
  }
  return null;
}
```

*Ejemplo de uso en un Route Handler:*
```typescript
// src/app/api/equipos/[id]/calibraciones/route.ts
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guardResponse = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (guardResponse) return guardResponse;

  // Ejecución segura de la lógica de negocio...
}
```

#### Nivel 2: Service Layer Assertion (Protección a Nivel Dominio)
Para operaciones internas o llamadas entre librerías:
```typescript
// src/lib/licensing/service-guard.ts
import { isModuleActive } from "./engine";
import { CodigoModulo } from "@prisma/client";

export class LicenseEnforcementError extends Error {
  constructor(public readonly modulo: CodigoModulo) {
    super(`Acceso denegado: El módulo '${modulo}' no está activo.`);
    this.name = "LicenseEnforcementError";
  }
}

export async function assertModuleActive(modulo: CodigoModulo): Promise<void> {
  const activo = await isModuleActive(modulo);
  if (!activo) {
    throw new LicenseEnforcementError(modulo);
  }
}
```

#### Resolución Jerárquica en Dos Niveles (Licencia Comercial ∧ Preferencia Operativa)
Un módulo funcional está efectivamente activo si y solo si la licencia comercial de la instalación lo permite **y** el perfil operativo del laboratorio decide tenerlo visible:

$$\text{isModuleActive}(M) = \text{SuscripcionLocal.permite}(M) \land \text{PerfilCliente.prefiere}(M)$$

```typescript
// src/lib/licensing/engine.ts
import { prisma } from "@/lib/prisma";
import { CodigoModulo } from "@prisma/client";

// Módulos esenciales incluidos en la instalación base (Tier Básico / Free Core)
export const CORE_MODULES: ReadonlySet<CodigoModulo> = new Set([
  CodigoModulo.CAPTURA_BASE,
  CodigoModulo.REGISTROS_BITACORA,
  CodigoModulo.PERSONALIZACION_PERFIL,
]);

export async function isModuleActive(modulo: CodigoModulo): Promise<boolean> {
  const isCore = CORE_MODULES.has(modulo);

  // 1. Verificar Nivel de Licencia Comercial de la Instalación (Fail-Closed / Deny-by-default)
  const suscripcion = await prisma.suscripcionLocal.findFirst({
    where: { estado: { in: ["ACTIVA", "DE_PRUEBA"] } },
    include: { flags: true },
    orderBy: { actualizadoEn: "desc" },
  });

  if (!suscripcion) {
    // Sin suscripción activa: solo los módulos del Core básico están habilitados
    if (!isCore) return false;
  } else {
    // Si la suscripción expiró por fecha de vigencia
    const isExpired = suscripcion.validaHasta && suscripcion.validaHasta < new Date();
    if (isExpired) {
      // Suscripción vencida revierte estrictamente al Core
      if (!isCore) return false;
    } else if (!isCore) {
      // Para módulos comerciales, DEBE existir un flag explícitamente habilitado
      const flag = suscripcion.flags.find((f) => f.modulo === modulo);
      if (!flag || !flag.habilitado) {
        return false;
      }
    }
  }

  // 2. Verificar Preferencia Operativa del Perfil Activo (Tenant)
  const perfil = await prisma.perfilCliente.findFirst({
    where: { activo: true, versionPublicadaId: { not: null } },
    include: { versionPublicada: true },
    orderBy: { actualizadoEn: "desc" },
  });

  if (!perfil?.versionPublicada) return true;
  const config = perfil.versionPublicada.configuracionJson as Record<string, any>;
  const profileModulos = config?.modulos;
  if (!profileModulos) return true;

  // Mapeo retrocompatible y soporte completo para todos los módulos
  const legacyMap: Partial<Record<CodigoModulo, string>> = {
    CAPTURA_BASE: "captura",
    REGISTROS_BITACORA: "bitacora",
    PERSONALIZACION_PERFIL: "personalizacion",
    PROGRAMACION_ENSAYOS: "programacionEnsayos",
    HOJAS_CAMPO: "hojasCampo",
    LOGISTICA_SALIDAS: "muestrasSalir",
    INVENTARIO_EQUIPOS: "inventario",
    CALIBRACION_MANTENIMIENTO: "calibracion",
    CURVAS_FC_FOTOS: "curvasFc",
    REPORTES_AVANZADOS: "reportesAvanzados",
    DIGITALIZACION_OCR: "digitalizacionOcr",
  };

  const preferenceKey = legacyMap[modulo] ?? (modulo as string);
  if (profileModulos[preferenceKey] !== undefined) {
    return Boolean(profileModulos[preferenceKey]);
  }

  return true;
}
```

### 2.3 Mecanismo de Verificación en Frontend

#### Proveedor de Contexto React (`SubscriptionProvider`) y Hook `useSubscription`
El estado de la suscripción se distribuye reactivamente en el árbol de componentes del cliente:

```typescript
// src/features/subscriptions/context/SubscriptionContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CodigoModulo, NivelSuscripcion } from "@prisma/client";

interface SubscriptionContextType {
  tier: NivelSuscripcion;
  isModuleEnabled: (modulo: CodigoModulo) => boolean;
  activeModules: Record<CodigoModulo, boolean>;
  cargando: boolean;
  actualizarSuscripcion: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<NivelSuscripcion>(NivelSuscripcion.STARTER);
  const [activeModules, setActiveModules] = useState<Record<CodigoModulo, boolean>>({
    [CodigoModulo.CAPTURA_BASE]: true,
    [CodigoModulo.REGISTROS_BITACORA]: true,
    [CodigoModulo.PERSONALIZACION_PERFIL]: true,
    [CodigoModulo.PROGRAMACION_ENSAYOS]: false,
    [CodigoModulo.HOJAS_CAMPO]: false,
    [CodigoModulo.LOGISTICA_SALIDAS]: false,
    [CodigoModulo.INVENTARIO_EQUIPOS]: false,
    [CodigoModulo.CALIBRACION_MANTENIMIENTO]: false,
    [CodigoModulo.CURVAS_FC_FOTOS]: false,
    [CodigoModulo.REPORTES_AVANZADOS]: false,
    [CodigoModulo.DIGITALIZACION_OCR]: false,
  });
  const [cargando, setCargando] = useState(true);

  const cargarEstado = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/config/suscripcion");
      if (res.ok) {
        const data = await res.json();
        setTier(data.tier);
        setActiveModules(data.modulos);
      }
    } catch (err) {
      console.error("Error al consultar el estado de la suscripción local:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEstado();
  }, []);

  const isModuleEnabled = (modulo: CodigoModulo): boolean => {
    return Boolean(activeModules[modulo]);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isModuleEnabled,
        activeModules,
        cargando,
        actualizarSuscripcion: cargarEstado,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription debe ser utilizado dentro de un SubscriptionProvider");
  }
  return context;
}
```

#### Componente Compuerta Declarativa (`<FeatureGate>`)
Permite encapsular componentes o vistas completas. Si el plan no contiene el módulo, presenta un banner de actualización en lugar de provocar un error o pantalla blanca:

```typescript
// src/features/subscriptions/components/FeatureGate.tsx
"use client";

import React, { ReactNode } from "react";
import { CodigoModulo } from "@prisma/client";
import { useSubscription } from "../context/SubscriptionContext";
import { UpgradeCtaBanner } from "./UpgradeCtaBanner";

interface FeatureGateProps {
  module: CodigoModulo;
  fallback?: ReactNode;
  children: ReactNode;
}

export function FeatureGate({ module, fallback, children }: FeatureGateProps) {
  const { isModuleEnabled, cargando } = useSubscription();

  if (cargando) {
    return <div className="p-4 text-muted">Verificando licencia del módulo...</div>;
  }

  if (!isModuleEnabled(module)) {
    return fallback ?? <UpgradeCtaBanner module={module} />;
  }

  return <>{children}</>;
}
```

#### Banner de Actualización Comercial (`<UpgradeCtaBanner>`)
Informa con claridad técnica los beneficios de activar el módulo y cómo adquirir la licencia correspondiente:

```typescript
// src/features/subscriptions/components/UpgradeCtaBanner.tsx
"use client";

import React from "react";
import { CodigoModulo } from "@prisma/client";
import { Lock, Sparkles, PhoneCall } from "lucide-react";
import styles from "./subscriptions.module.css";

const MODULO_INFO: Record<CodigoModulo, { titulo: string; descripcion: string; tierRequerido: string }> = {
  [CodigoModulo.INVENTARIO_EQUIPOS]: {
    titulo: "Control Metrológico e Inventario de Equipos",
    descripcion: "Administre moldes, prensas y termómetros con semáforos automáticos de vigencia y certificados PDF con hash SHA-256.",
    tierRequerido: "PROFESIONAL",
  },
  [CodigoModulo.CALIBRACION_MANTENIMIENTO]: {
    titulo: "Calibración y Mantenimiento",
    descripcion: "Cumpla con la acreditación ISO/IEC 17025 y NMX-EC-17025 con control estricto de incertidumbres y alertas preventivas.",
    tierRequerido: "PROFESIONAL",
  },
  [CodigoModulo.HOJAS_CAMPO]: {
    titulo: "Hojas de Campo y Captura Offline",
    descripcion: "Asistente multipaso de 4 etapas para toma en obra con sincronización local y emisión con QR controlado.",
    tierRequerido: "ESTÁNDAR",
  },
  [CodigoModulo.LOGISTICA_SALIDAS]: {
    titulo: "Logística de Despacho y Recolección",
    descripcion: "Tablero Kanban de muestras a salir, manifiesto de ruta para chofer y control de tiempo de curado inicial (<48h).",
    tierRequerido: "ESTÁNDAR",
  },
  [CodigoModulo.CURVAS_FC_FOTOS]: {
    titulo: "Curvas Estadísticas f'c y Fotos WebRTC",
    descripcion: "Cálculos ACI 214R, campana de Gauss y captura fotográfica forense de cilindros con marca de agua indeleble.",
    tierRequerido: "PROFESIONAL",
  },
  [CodigoModulo.PROGRAMACION_ENSAYOS]: {
    titulo: "Programación Diaria de Ensayes",
    descripcion: "Calendario automatizado de fallas y emisión de la hoja de trabajo diario FO-LAB-PE.",
    tierRequerido: "ESTÁNDAR",
  },
  [CodigoModulo.CAPTURA_BASE]: { titulo: "Captura Base", descripcion: "Módulo esencial de muestreo.", tierRequerido: "BÁSICO" },
  [CodigoModulo.REGISTROS_BITACORA]: { titulo: "Bitácora", descripcion: "Registro histórico.", tierRequerido: "BÁSICO" },
  [CodigoModulo.PERSONALIZACION_PERFIL]: { titulo: "Personalización", descripcion: "Identidad institucional.", tierRequerido: "BÁSICO" },
  [CodigoModulo.REPORTES_AVANZADOS]: { titulo: "Reportes Avanzados", descripcion: "Informes ejecutivos multi-obra.", tierRequerido: "PROFESIONAL" },
  [CodigoModulo.DIGITALIZACION_OCR]: { titulo: "Digitalización OCR", descripcion: "Extracción inteligente de datos.", tierRequerido: "EMPRESARIAL" },
};

export function UpgradeCtaBanner({ module }: { module: CodigoModulo }) {
  const info = MODULO_INFO[module] || {
    titulo: "Módulo Comercial",
    descripcion: "Esta funcionalidad requiere un nivel de suscripción superior.",
    tierRequerido: "PROFESIONAL",
  };

  return (
    <div className={styles.upgradeBannerCard}>
      <div className={styles.iconContainer}>
        <Lock className={styles.lockIcon} size={32} />
      </div>
      <div className={styles.textContent}>
        <div className={styles.badgeRow}>
          <span className={styles.tierRequiredBadge}>Plan Requerido: {info.tierRequerido}</span>
          <span className={styles.featureBadge}><Sparkles size={14} /> Módulo Especializado</span>
        </div>
        <h3 className={styles.title}>{info.titulo}</h3>
        <p className={styles.description}>{info.descripcion}</p>
        <div className={styles.actionRow}>
          <a href="mailto:ventas@ensalia.com?subject=Actualizacion%20de%20Plan%20ENSALIA" className={styles.contactBtn}>
            <PhoneCall size={16} /> Solicitar Activación de Módulo
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### Filtrado Reactivo de Navegación Lateral en `src/app/page.tsx`
El menú lateral de la aplicación adapta sus enlaces dinámicamente:
- Si el módulo está activo: se muestra con su icono habitual y navegación inmediata.
- Si el módulo no está contratado: se presenta con un indicador visual (icono de candado o etiqueta sutil "PRO"). Al hacer clic, no interrumpe el formulario activo, sino que muestra la ficha informativa del módulo.

### 2.4 Esquema de Persistencia Offline de Licencias y Tokens Criptográficos

ENSALIA opera habitualmente en laboratorios con PCs locales que pueden carecer de conexión a internet durante semanas. Para asegurar que la licencia sea inviolable pero 100% autónoma, se implementa una arquitectura basada en **tokens de licencia criptográficamente firmados**.

#### Modelo Prisma para Suscripciones Locales
```prisma
model SuscripcionLocal {
  id                    String              @id @default(cuid())
  plan                  NivelSuscripcion    @default(STARTER)
  estado                EstadoSuscripcion   @default(ACTIVA)
  licenciaToken         String?             @unique
  titular               String
  emisor                String              @default("ENSALIA Cloud")
  validaDesde           DateTime            @default(now())
  validaHasta           DateTime?
  dispositivosMaximos   Int                 @default(1)
  firmaDigitalSha256    String?
  creadoEn              DateTime            @default(now())
  actualizadoEn         DateTime            @updatedAt
  flags                 ModuloFeatureFlag[]

  @@index([plan, estado])
}

model ModuloFeatureFlag {
  id               String           @id @default(cuid())
  suscripcionId    String
  modulo           CodigoModulo
  habilitado       Boolean          @default(false)
  limitesJson      Json?
  expiraEn         DateTime?
  actualizadoEn    DateTime         @updatedAt
  suscripcion      SuscripcionLocal @relation(fields: [suscripcionId], references: [id], onDelete: Cascade)

  @@unique([suscripcionId, modulo])
  @@index([modulo, habilitado])
}
```

#### Estructura del Token Criptográfico Offline
El token de licencia emitido para el laboratorio tiene la siguiente carga útil codificada en Base64URL y firmada mediante HMAC-SHA256 con clave secreta maestra o RSA-2048 con clave pública embebida en la compilación:

```json
{
  "licenciaId": "LIC-2026-LAB-0042",
  "titular": "Laboratorio Central de Concretos S.A. de C.V.",
  "plan": "PROFESIONAL",
  "dispositivosMaximos": 3,
  "validaDesde": "2026-01-01T00:00:00Z",
  "validaHasta": "2027-12-31T23:59:59Z",
  "modulosPermitidos": [
    "CAPTURA_BASE",
    "REGISTROS_BITACORA",
    "PERSONALIZACION_PERFIL",
    "PROGRAMACION_ENSAYOS",
    "HOJAS_CAMPO",
    "LOGISTICA_SALIDAS",
    "INVENTARIO_EQUIPOS",
    "CALIBRACION_MANTENIMIENTO",
    "CURVAS_FC_FOTOS"
  ],
  "checksumHardware": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

Al importar un archivo de licencia `.lic` en la interfaz de configuración:
1. El backend verifica la firma criptográfica contra la clave pública del producto.
2. Si la firma es válida y la fecha actual se encuentra dentro del rango de vigencia, actualiza `SuscripcionLocal` e inserta/actualiza las filas correspondientes en `ModuloFeatureFlag` dentro de una transacción de Prisma.

### 2.5 Empaquetado Desacoplado mediante Registro de Manifiestos (`EnsaliaModuleManifest`)

Para evitar que el código de un módulo contamine a los demás o incremente el peso del bundle inicial, cada módulo funcional se declara a través de un manifiesto estandarizado:

```typescript
// src/modules/types.ts
import { LucideIcon } from "lucide-react";
import { CodigoModulo, NivelSuscripcion } from "@prisma/client";
import { ComponentType } from "react";

export interface EnsaliaModuleManifest {
  id: CodigoModulo;
  codigoInterno: string;
  nombre: string;
  descripcion: string;
  tierMinimo: NivelSuscripcion;
  icono: LucideIcon;
  ordenNavegacion: number;
  navegacionKey: string;
  panelComponent: () => Promise<{ default: ComponentType<any> }>;
  rutasApiAsociadas: string[];
}
```

Todos los manifiestos se registran centralmente en `src/modules/registry.ts`:
```typescript
// src/modules/registry.ts
import { CodigoModulo, NivelSuscripcion } from "@prisma/client";
import { Wrench, FileSpreadsheet, Truck, LineChart, Calendar } from "lucide-react";
import { EnsaliaModuleManifest } from "./types";

export const ENSALIA_MODULES_REGISTRY: EnsaliaModuleManifest[] = [
  {
    id: CodigoModulo.INVENTARIO_EQUIPOS,
    codigoInterno: "equipment",
    nombre: "Inventario y Metrología",
    descripcion: "Equipos, calibraciones y certificados PDF",
    tierMinimo: NivelSuscripcion.PROFESIONAL,
    icono: Wrench,
    ordenNavegacion: 40,
    navegacionKey: "inventario",
    panelComponent: () => import("@/features/equipment/components/EquipmentDashboard"),
    rutasApiAsociadas: ["/api/equipos", "/api/equipos/[id]/calibraciones"],
  },
  {
    id: CodigoModulo.HOJAS_CAMPO,
    codigoInterno: "field-sheets",
    nombre: "Hojas de Campo",
    descripcion: "Captura de campo, resiliencia offline y código QR",
    tierMinimo: NivelSuscripcion.ESTANDAR,
    icono: FileSpreadsheet,
    ordenNavegacion: 20,
    navegacionKey: "hojas-campo",
    panelComponent: () => import("@/features/field-sheets/components/FieldSheetWizard"),
    rutasApiAsociadas: ["/api/hojas-campo"],
  },
  {
    id: CodigoModulo.LOGISTICA_SALIDAS,
    codigoInterno: "outgoing-samples",
    nombre: "Muestras a Salir",
    descripcion: "Logística de recolección y tiempos de curado",
    tierMinimo: NivelSuscripcion.ESTANDAR,
    icono: Truck,
    ordenNavegacion: 30,
    navegacionKey: "muestras-salir",
    panelComponent: () => import("@/features/outgoing-samples/components/OutgoingDashboard"),
    rutasApiAsociadas: ["/api/despachos"],
  },
  {
    id: CodigoModulo.CURVAS_FC_FOTOS,
    codigoInterno: "fc-curves",
    nombre: "Curvas f'c y Ensayes",
    descripcion: "Análisis estadístico ACI 214R y fotos WebRTC",
    tierMinimo: NivelSuscripcion.PROFESIONAL,
    icono: LineChart,
    ordenNavegacion: 50,
    navegacionKey: "curvas-fc",
    panelComponent: () => import("@/features/fc-curves/components/FcStatisticalDashboard"),
    rutasApiAsociadas: ["/api/ensayes", "/api/ensayes/fotos"],
  },
];
```

La carga del componente correspondiente a cada vista se ejecuta mediante `React.lazy` / `dynamic` de Next.js, logrando aislamiento de código (*code splitting*) automático sin sobrecargar la memoria del cliente.

### 2.6 Confirmación Explícita de Exclusión de Control de Accesos (RBAC)

Se ratifica formalmente que el **control de accesos individualizado de usuarios (RBAC, autenticación por contraseña, permisos por rol `ADMIN`/`LABORATORISTA`/`CONSULTOR`) queda estrictamente fuera del alcance de esta fase de comercialización modular**.
- Toda la gobernanza de módulos, compuertas y accesos descrita en esta arquitectura opera a nivel de **licencia de la instalación** del software en el laboratorio.
- Las referencias a usuarios en las tablas (`registradoPorId`, `subidoPorId`, `choferOperadorId`) continuarán utilizando el modelo preexistente `Operador` (`schema.prisma:112`) y el encabezado HTTP actual `"x-operator-name"` establecido en el sistema.

---

## 3. Especificación Técnica Detallada de Módulos Funcionales

### 3.1 Módulo: Inventario de Equipos, Calibraciones y Mantenimiento

#### Flujo de Usuario y Cumplimiento Normativo Metrológico (ISO/IEC 17025)
1. **Navegación y Semáforo de Vigencias**: Al entrar a la sección de Inventario, el laboratorista visualiza métricas consolidadas (Total, Disponibles, En Mantenimiento, Por Vencer, Vencidos). Cada equipo con `requiereCalibracion = true` exhibe un badge de alerta metrológica:
   - **Verde (`Vigente`)**: Faltan más de 30 días para el vencimiento ($T > 30\text{d}$).
   - **Ámbar (`Por Vencer`)**: Faltan entre 0 y 30 días ($0 \le T \le 30\text{d}$).
   - **Rojo (`Vencido`)**: Fecha actual posterior a `calibracionVigenteHasta` ($T < 0\text{d}$).
   - **Gris (`Sin Calibrar`)**: No cuenta con registro histórico de calibración.
2. **Calendario Interactivo Mensual**: Conmutable entre vista de tabla y vista de calendario (`CalibrationCalendarView`). Presenta los eventos de calibración programados y vencimientos proyectados por mes para prensas, termómetros, básculas y varillas.
3. **Registro de Calibración y Carga de Certificado**: Mediante `CalibrationModal`, el usuario ingresa la fecha del ensayo metrológico, fecha de expiración, laboratorio acreditador externo, número de acreditación, incertidumbre de medición y adjunta el archivo PDF del certificado.
4. **Visor de Certificados PDF con Verificación de Inmutabilidad**: Al hacer clic en un certificado, se abre `CertificateViewerModal`. El visor embebido permite revisar el documento oficial, muestra el hash **SHA-256** calculado al momento de la carga y valida que el archivo en disco no haya sido alterado.

#### Modelos Prisma Completos (Aditivos)
```prisma
model DocumentoCalibracion {
  id             String            @id @default(cuid())
  calibracionId  String            @unique
  nombreArchivo  String
  nombreSeguro   String
  mimeType       String            @default("application/pdf")
  tamano         Int
  hashSha256     String
  rutaRelativa   String            @unique
  creadoEn       DateTime          @default(now())
  subidoPorId    String
  calibracion    CalibracionEquipo @relation(fields: [calibracionId], references: [id], onDelete: Cascade)
  subidoPor      Operador          @relation(fields: [subidoPorId], references: [id])

  @@index([calibracionId, creadoEn])
}

model MantenimientoEquipo {
  id                   String                 @id @default(cuid())
  equipoId             String
  tipo                 TipoMantenimiento      @default(PREVENTIVO)
  estado               EstadoMantenimiento    @default(PROGRAMADO)
  fechaProgramada      DateTime
  fechaRealizada       DateTime?
  proximoMantenimiento DateTime?
  proveedor            String?
  costo                Decimal?
  descripcion          String
  tareasRealizadas     String?
  piezasReemplazadas   String?
  registradoPorId      String
  creadoEn             DateTime               @default(now())
  actualizadoEn        DateTime               @updatedAt
  equipo               Equipo                 @relation(fields: [equipoId], references: [id], onDelete: Cascade)
  registradoPor        Operador               @relation(fields: [registradoPorId], references: [id])
  documentos           DocumentoMantenimiento[]

  @@index([equipoId, fechaProgramada])
  @@index([estado, fechaProgramada])
}

model DocumentoMantenimiento {
  id              String              @id @default(cuid())
  mantenimientoId String
  nombreArchivo   String
  nombreSeguro    String
  mimeType        String              @default("application/pdf")
  tamano          Int
  hashSha256      String
  rutaRelativa    String              @unique
  creadoEn        DateTime            @default(now())
  subidoPorId     String
  mantenimiento   MantenimientoEquipo @relation(fields: [mantenimientoId], references: [id], onDelete: Cascade)
  subidoPor       Operador            @relation(fields: [subidoPorId], references: [id])

  @@index([mantenimientoId])
}

enum TipoMantenimiento {
  PREVENTIVO
  CORRECTIVO
  AJUSTE
  VERIFICACION
}

enum EstadoMantenimiento {
  PROGRAMADO
  EN_PROCESO
  COMPLETADO
  CANCELADO
}
```

*Extensiones a Modelos Existentes:*
- En `Equipo`: añadir campos opcionales `frecuenciaCalibracionMeses Int?`, `frecuenciaMantenimientoMeses Int?`, `mantenimientoVigenteHasta DateTime?` y relación `mantenimientos MantenimientoEquipo[]`.
- En `CalibracionEquipo`: añadir campos opcionales `laboratorioCalibracion String?`, `numeroAcreditacion String?`, `incertidumbre String?` y relación `documento DocumentoCalibracion?`.

#### Árbol de Componentes (`src/features/equipment/`)
```
src/features/equipment/
├── components/
│   ├── EquipmentDashboard.tsx        // Contenedor principal con conmutador Lista/Calendario
│   ├── EquipmentTable.tsx            // Tabla interactiva con badges y acciones
│   ├── EquipmentFilterBar.tsx        // Filtros por familia, estado y semáforo
│   ├── CalibrationBadge.tsx          // Semáforo dinámico de vigencia (>30d, <=30d, vencido)
│   ├── CalibrationCalendarView.tsx   // Agenda mensual interactiva de calibraciones
│   ├── CalibrationModal.tsx          // Modal de registro y carga de PDF
│   ├── CertificateViewerModal.tsx    // Visor embebido de PDF con hash SHA-256
│   └── MaintenanceRecordModal.tsx    // Formulario de bitácora de mantenimiento
├── hooks/
│   ├── useEquipmentInventory.ts      // Hook para obtención, ordenamiento y mutaciones
│   └── useCalibrationAlerts.ts       // Lógica de cálculo del semáforo metrológico
├── types.ts                          // Interfaces TypeScript estrictas
└── equipment.module.css              // Estilos encapsulados con CSS Modules
```

---

### 3.2 Módulo: Carga y Procesamiento de Hojas de Campo

#### Flujo de Usuario: Asistente Multipaso (Wizard) y Resiliencia Offline
1. **Inicio de Captura en Obra**: El técnico laboratorista accede al asistente en una tablet o laptop en campo.
2. **Wizard de 4 Etapas**:
   - **Etapa 1: Datos de Sitio y Remisión**: Selección de obra, cliente, concretera, planta, camión revolvedora, número de remisión, volumen y elemento estructural colado.
   - **Etapa 2: Parámetros del Concreto en Fresco**: Registro del revenimiento medido (cm), temperatura ambiente (°C), temperatura de la masa (°C), porcentaje de aire atrapado (%) y verificación del equipo de muestreo en sitio.
   - **Etapa 3: Moldeo de Especímenes**: Identificación de los cilindros (típicamente 4 especímenes), asignación de las series de moldes utilizados (validación contra moldes disponibles) y programación de fechas de ruptura esperadas (ej. 3, 7, 14, 28 días).
   - **Etapa 4: Resumen, Firmas y Emisión**: Previsualización de los datos consolidados, captura de nombres de los testigos en obra y confirmación.
3. **Resiliencia Offline Determinista**:
   - Todo cambio en el formulario se guarda síncronamente en `localStorage` o `IndexedDB` bajo la clave `ensalia.field_sheet.draft.[uuid]`.
   - Si la red se interrumpe, se despliega el banner `OfflineSyncIndicator`: *"Modo campo offline: 1 borrador resguardado localmente"*.
   - Al restablecerse la conectividad, el hook `useFieldSheetSync` envía la carga útil al endpoint `/api/hojas-campo`, aplicando resolución de conflictos basada en el timestamp de edición.
4. **Emisión con QR y Vinculación Opcional**:
   - Emisión de la hoja oficial con código QR firmado (HMAC-SHA256) que contiene un hash de auditoría.
   - La hoja puede vincularse opcionalmente a un `Colado` existente y derivar automáticamente la creación de registros en `Muestra`.

#### Modelos Prisma Completos (Aditivos)
```prisma
model HojaCampoCaptura {
  id              String                 @id @default(cuid())
  folio           String                 @unique
  fechaTrabajo    DateTime
  cliente         String
  obra            String
  localizacion    String?
  elemento        String?
  concretera      String?
  planta          String?
  estado          EstadoHojaCampoCaptura @default(BORRADOR)
  observaciones   String?
  coladoId        String?
  laboratoristaId String
  creadoEn        DateTime               @default(now())
  actualizadoEn   DateTime               @updatedAt
  colado          Colado?                @relation(fields: [coladoId], references: [id], onDelete: SetNull)
  laboratorista   Operador               @relation(fields: [laboratoristaId], references: [id])
  tomas           HojaCampoToma[]
  archivos        ArchivoHojaCampoCaptura[]

  @@index([fechaTrabajo])
  @@index([cliente, obra])
  @@index([estado, creadoEn])
}

model HojaCampoToma {
  id                     String           @id @default(cuid())
  hojaCampoId            String
  numeroToma             Int
  remision               String?
  camion                 String?
  volumenM3              Decimal?
  horaSalidaPlanta       DateTime?
  horaLlegadaObra        DateTime?
  horaInicioDescarga     DateTime?
  horaFinDescarga        DateTime?
  revenimientoObtenidoCm Decimal?
  tempAmbienteC          Decimal?
  tempConcretoC          Decimal?
  contenidoAirePct       Decimal?
  cilindrosElaborados    Int              @default(0)
  vigasElaboradas        Int              @default(0)
  observaciones          String?
  muestraId              String?          @unique
  creadoEn               DateTime         @default(now())
  actualizadoEn          DateTime         @updatedAt
  hojaCampo              HojaCampoCaptura @relation(fields: [hojaCampoId], references: [id], onDelete: Cascade)
  muestra                Muestra?         @relation(fields: [muestraId], references: [id], onDelete: SetNull)

  @@unique([hojaCampoId, numeroToma])
}

model ArchivoHojaCampoCaptura {
  id            String           @id @default(cuid())
  hojaCampoId   String
  nombreArchivo String
  nombreSeguro  String
  mimeType      String
  tamano        Int
  hashSha256    String
  rutaRelativa  String           @unique
  creadoEn      DateTime         @default(now())
  subidoPorId   String
  hojaCampo     HojaCampoCaptura @relation(fields: [hojaCampoId], references: [id], onDelete: Cascade)
  subidoPor     Operador         @relation(fields: [subidoPorId], references: [id])

  @@index([hojaCampoId, creadoEn])
}

enum EstadoHojaCampoCaptura {
  BORRADOR
  CAPTURADA
  VALIDADA
  PROCESADA
  ANULADA
}
```

#### Árbol de Componentes (`src/features/field-sheets/`)
```
src/features/field-sheets/
├── components/
│   ├── FieldSheetWizard.tsx          // Orquestador con barra de progreso de 4 pasos
│   ├── StepSiteInfo.tsx              // Paso 1: Obra, cliente, concretera, remisión
│   ├── StepFreshConcrete.tsx         // Paso 2: Revenimiento, temperaturas, aire
│   ├── StepSpecimens.tsx             // Paso 3: Cilindros, edades y números de molde
│   ├── StepReviewSign.tsx            // Paso 4: Revisión técnica y firmas
│   ├── OfflineSyncBanner.tsx         // Indicador visual de conectividad y sincronización
│   └── FieldSheetHistoryTable.tsx    // Histórico de hojas con badges de estado y QR
├── hooks/
│   ├── useFieldSheetDraft.ts         // Auto-guardado en localStorage e IndexedDB
│   └── useFieldSheetSync.ts          // Sincronización y resolución de conflictos
├── types.ts                          // Esquemas Zod y tipado TypeScript
└── field-sheets.module.css           // Estilos optimizados para tablets y touch
```

---

### 3.3 Módulo: Muestras a Salir (Logística y Despacho)

#### Flujo de Usuario y Control de Tiempo Crítico (<48h)
1. **Tablero Logístico Integrado**: Vista conmutable en formato Kanban (3 columnas: *Programadas en Obra*, *En Tránsito hacia Laboratorio*, *Recibidas en Laboratorio*) o lista densa para el supervisor de transporte.
2. **Generación de Manifiesto de Despacho / Ruta**: El despachador agrupa las muestras programadas para un vehículo o chofer determinado y emite el **Manifiesto de Recolección**. Este documento contiene códigos de barra/QR de cada muestra y una lista de cotejo de los moldes metálicos/plásticos que deben regresar físicamente al laboratorio.
3. **Recepción y Check-In en Laboratorio**: Al llegar el vehículo al laboratorio:
   - El laboratorista realiza el check-in rápido mediante `SampleCheckInModal`.
   - Se inspecciona el estado de los especímenes (posibles fisuras durante el transporte o daño en aristas).
   - Los moldes devueltos cambian automáticamente a `EstadoEquipo.DISPONIBLE` en el inventario.
4. **Alerta de Tiempo Crítico de Curado (<48h)**:
   - Conforme a las normas **ASTM C31** y **NMX-C-109**, los cilindros de concreto deben permanecer en sus moldes en obra protegidos de la vibración durante las primeras $24 \pm 8$ horas y ser trasladados y colocados en la pila de curado húmedo o cámara de niebla antes de cumplir **48 horas**.
   - El tablero calcula $\Delta t = \text{FechaHoraActual} - \text{fechaMuestreo}$. Si $\Delta t > 36\text{h}$ y los especímenes no han sido ingresados a curado, se activa un semáforo de alerta crítica ámbar; si supera las 48h, se marca en rojo con advertencia de posible invalidación normativa del ensaye.

#### Modelos Prisma Completos (Aditivos)
```prisma
model DespachoMuestra {
  id               String                @id @default(cuid())
  folio            String                @unique
  tipo             TipoDespacho          @default(RECOLECCION_OBRA)
  estado           EstadoDespacho        @default(PROGRAMADO)
  fechaProgramada  DateTime
  fechaSalida      DateTime?
  fechaRetorno     DateTime?
  choferOperadorId String
  vehiculo         String?
  placas           String?
  origen           String?
  destino          String?
  observaciones    String?
  creadoEn         DateTime              @default(now())
  actualizadoEn    DateTime              @updatedAt
  choferOperador   Operador              @relation(fields: [choferOperadorId], references: [id])
  items            ItemDespachoMuestra[]

  @@index([fechaProgramada, estado])
  @@index([choferOperadorId, estado])
}

model ItemDespachoMuestra {
  id                  String             @id @default(cuid())
  despachoId          String
  muestraId           String
  especimenId         String?
  estadoItem          EstadoItemDespacho @default(PENDIENTE)
  horaRecoleccion     DateTime?
  tempRecoleccionC    Decimal?
  condicionEspecimen  String?
  observaciones       String?
  firmaRecibidoNombre String?
  firmaRecibidoCargo  String?
  creadoEn            DateTime           @default(now())
  actualizadoEn       DateTime           @updatedAt
  despacho            DespachoMuestra    @relation(fields: [despachoId], references: [id], onDelete: Cascade)
  muestra             Muestra            @relation(fields: [muestraId], references: [id], onDelete: Restrict)
  especimen           Especimen?         @relation(fields: [especimenId], references: [id], onDelete: SetNull)

  @@unique([despachoId, muestraId, especimenId])
  @@index([muestraId])
  @@index([despachoId, estadoItem])
}

enum TipoDespacho {
  RECOLECCION_OBRA
  TRASLADO_LABORATORIO
  ENTREGA_CLIENTE
}

enum EstadoDespacho {
  PROGRAMADO
  EN_TRANSITO
  COMPLETADO
  CANCELADO
  INCIDENCIA
}

enum EstadoItemDespacho {
  PENDIENTE
  RECOLECTADO
  NO_LOCALIZADO
  RECHAZADO
  DANADO
}
```

#### Árbol de Componentes (`src/features/outgoing-samples/`)
```
src/features/outgoing-samples/
├── components/
│   ├── OutgoingDashboard.tsx         // Tablero maestro con conmutador Kanban / Lista
│   ├── DispatchKanban.tsx            // Columnas interactivas con drag/click de estado
│   ├── DispatchTable.tsx             // Vista densa de monitoreo logístico
│   ├── CriticalCuringBadge.tsx       // Contador y alerta de tiempo de curado (<48h)
│   ├── DispatchManifestModal.tsx     // Generador de manifiesto de ruta para chofer
│   └── SampleCheckInModal.tsx        // Recepción, desmolde y asignación a pileta
├── hooks/
│   ├── useOutgoingLogistics.ts       // Obtención de muestras y actualización de estados
│   └── useCuringTimer.ts             // Cálculo de horas transcurridas desde el colado
├── types.ts                          // Interfaces de datos y esquemas de ruta
└── outgoing.module.css               // Estilos CSS Modules
```

---

### 3.4 Módulo: Curvas Estadísticas f'c y Registro Fotográfico en Tiempo Real de Cilindros

#### Fundamentación Matemática: Control Estadístico ACI 214R y Gauss
Para evaluar el control de calidad del concreto, el sistema calcula de forma determinista los parámetros estadísticos según el estándar **ACI 214R-11**:
1. **Resistencia Media ($\bar{f}_c$)**:
   $$\bar{f}_c = \frac{1}{n} \sum_{i=1}^{n} f_{c,i}$$
2. **Desviación Estándar de la Muestra ($s$)**:
   $$s = \sqrt{\frac{1}{n - 1} \sum_{i=1}^{n} (f_{c,i} - \bar{f}_c)^2}$$
3. **Coeficiente de Variación ($V$)**:
   $$V = \left( \frac{s}{\bar{f}_c} \right) \times 100\%$$
   *Criterio de Evaluación ACI 214R para ensayos de laboratorio:*
   - $V < 3.0\%$: Control Excelente
   - $3.0\% \le V \le 4.0\%$: Control Muy Bueno
   - $4.0\% < V \le 5.0\%$: Control Bueno
   - $V > 5.0\%$: Control Deficiente (revisar procedimientos de cabeceo o prensa).
4. **Resistencia Media Requerida de Dosificación ($f'_{cr}$)**:
   $$f'_{cr} = \max \left( f'c + 1.34s, \; f'c + 2.33s - 35 \right) \quad (\text{en } kg/cm^2)$$
5. **Función de Densidad de Probabilidad de Gauss (Campana)**:
   $$f(x) = \frac{1}{s \sqrt{2\pi}} \exp \left( -\frac{1}{2} \left( \frac{x - \bar{f}_c}{s} \right)^2 \right)$$

#### Tratamiento Defensivo de Fronteras Matemáticas (Boundary Guards en ACI 214R / Gauss)
Para evitar excepciones en tiempo de ejecución, valores `NaN` / `Infinity` y fallos de renderizado en canvas/SVG de Recharts, las rutinas de cálculo deben implementar guardas defensivas estrictas:
1. **Guarda para Muestras Insuficientes ($n < 2$)**:
   En la desviación estándar muestral, el denominador $(n - 1)$ produce división entre cero cuando $n = 1$, o valor indefinido/negativo cuando $n = 0$.
   - Si $n < 2$: La función debe retornar inmediatamente $s = 0$, $V = 0\%$, $f'_{cr} = \text{null}$ y un arreglo vacío de puntos gaussianos (`gaussianPoints: []`) para prevenir división por cero en $(n - 1)$.
   - Si $n = 1$: La media $\bar{f}_c$ es igual al único valor ensayado ($f_{c,1}$), con $s = 0$ y $V = 0\%$.
2. **Guarda para Desviación Nula ($s = 0$) o Media No Positiva ($\bar{f}_c \le 0$)**:
   En la función de densidad gaussiana $f(x) = \frac{1}{s\sqrt{2\pi}} \exp\left(-\frac{1}{2}\left(\frac{x - \bar{f}_c}{s}\right)^2\right)$, un valor $s = 0$ (todos los cilindros con idéntica resistencia o probeta única) produce división entre cero en $s\sqrt{2\pi} = 0$, generando `Infinity`. Asimismo, si $\bar{f}_c \le 0$, el coeficiente de variación $V = (s / \bar{f}_c) \times 100\%$ incurre en división entre cero.
   - Si $s = 0$ o $\bar{f}_c \le 0$: La función retorna $V = 0\%$, $s = 0$ y valores de respaldo (`gaussianPoints: []` o un pulso unitario discreto), evitando que Recharts reciba coordenadas infinitas que colapsen el renderizado de `<Area>` o `<LineChart>`.
3. **Criterios de Representatividad Muestral según ACI 214R-11**:
   - $n < 15$: Ensayos insuficientes para cálculo de desviación estándar representativa; la dosificación debe basarse en tablas conservadoras de ACI 318 o $s$ supuesta de seguridad.
   - $15 \le n < 30$: Debe aplicarse el factor de modificación $k$ de ACI 214R ($s_{\text{ajustada}} = k \cdot s$, donde $k$ varía entre 1.16 para $n=15$ y 1.02 para $n=29$).
   - $n \ge 30$: El conjunto es estadísticamente confiable para evaluación plena según ACI 214R sin factor de castigo.

#### Componentes de Visualización con Recharts
- **Curva de Evolución Temporal (Edad vs Resistencia)**: Componente `<ScatterChart>` y `<LineChart>` con eje X en escala logarítmica/lineal de días (3, 7, 14, 28) y eje Y en $kg/cm^2$. Traza la curva de madurez del concreto y una línea de referencia horizontal en $f'c$ de diseño con zona sombreada de tolerancia.
- **Histograma y Distribución Gaussiana**: Componente `<BarChart>` de frecuencias agrupadas en intervalos de $10\text{ }kg/cm^2$, con la curva teórica normal superpuesta en un `<Area>` translúcida para visualizar de inmediato asimetrías o sesgos en la producción.

#### Captura Fotográfica WebRTC con Silueta de Alineación y Marca de Agua Forense
1. **Flujo de Captura**: Al registrar la rotura de un cilindro en prensa, se despliega el modal `CylinderBreakCaptureModal`.
2. **Acceso WebRTC**: Solicita el stream de video mediante `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } })`.
3. **Silueta Translúcida de Probeta**: Sobre el `<video>`, el componente `CameraViewfinder` dibuja en un `<canvas>` superior una guía vectorial con la silueta de un cilindro estándar de proporción 1:2 (15x30 cm o 10x20 cm), asegurando que el laboratorista encuadre la probeta verticalmente y capture claramente las líneas de fractura.
4. **Estampado Forense Indeleble**: Al accionar el obturador, el fotograma se congela en un `<canvas>` interno y se sobreimprime en la esquina inferior una franja translúcida de auditoría que contiene:
   - Folio de Muestra y Número de Espécimen (ej. `M-2026-0842 #2`)
   - Resistencia Obtenida y % de f'c (ej. `294.5 kg/cm² (117.8% f'c)`)
   - Fecha y Hora Oficial con zona horaria (ej. `2026-10-29 14:32:10 UTC-5`)
   - Operador de Ensaye y Prensa Utilizada
5. **Compresión Local en WebP**: El canvas se exporta mediante `canvas.toBlob(blob, "image/webp", 0.82)`. Esto reduce el peso de la imagen de ~4 MB a solo 150-250 KB sin pérdida apreciable de detalle en las fisuras.
6. **Fallback para Dispositivos sin WebRTC**: Si el navegador bloquea la cámara (ej. IP sin HTTPS en red local), se ofrece un `<input type="file" accept="image/*" capture="environment">` con procesamiento canvas idéntico.
7. **Selector de Patrones de Fractura (ASTM C39 / NMX-C-083)**:
   - Tipo 1: Cono bien formado en ambos extremos.
   - Tipo 2: Cono en un extremo y hendiduras verticales a través de la otra base.
   - Tipo 3: Fractura columnar vertical a lo largo del cilindro.
   - Tipo 4: Cizallamiento diagonal a través del cilindro.
   - Tipo 5: Fracturas en esquinas / bordes.
   - Tipo 6: Fractura puntual irregular (falla de cabeceo).

#### Modelos Prisma Completos (Aditivos)
```prisma
model EnsayeCompresion {
  id                   String                 @id @default(cuid())
  especimenId          String                 @unique
  equipoPrensaId       String?
  operadorEnsayeId     String
  fechaHoraEnsaye      DateTime
  edadRealDias         Int
  diametroMm           Decimal
  longitudMm           Decimal
  areaCm2              Decimal
  masaG                Decimal?
  densidadKgM3         Decimal?
  cargaMaximaKn        Decimal
  cargaMaximaKg        Decimal
  resistenciaKgCm2     Decimal
  porcentajeFc         Decimal?
  tipoFalla            TipoFallaConcreto      @default(CONO_TIPO_1)
  condicionHumedad     CondicionHumedad       @default(HUMEDO_SATURADO)
  cumpleEspecificacion Boolean                @default(true)
  observaciones        String?
  creadoEn             DateTime               @default(now())
  actualizadoEn        DateTime               @updatedAt
  especimen            Especimen              @relation(fields: [especimenId], references: [id], onDelete: Cascade)
  equipoPrensa         Equipo?                @relation(fields: [equipoPrensaId], references: [id], onDelete: SetNull)
  operadorEnsaye       Operador               @relation(fields: [operadorEnsayeId], references: [id])
  fotos                FotoEnsayeCompresion[]

  @@index([fechaHoraEnsaye])
  @@index([equipoPrensaId])
  @@index([operadorEnsayeId])
}

model FotoEnsayeCompresion {
  id            String            @id @default(cuid())
  ensayeId      String
  tipo          TipoFotoEnsaye    @default(ROTURA_FRACTURA)
  nombreArchivo String
  nombreSeguro  String
  mimeType      String            @default("image/webp")
  tamano        Int
  hashSha256    String
  rutaRelativa  String            @unique
  anchoPx       Int?
  altoPx        Int?
  capturadaEn   DateTime?
  creadoEn      DateTime          @default(now())
  subidoPorId   String
  ensaye        EnsayeCompresion  @relation(fields: [ensayeId], references: [id], onDelete: Cascade)
  subidoPor     Operador          @relation(fields: [subidoPorId], references: [id])

  @@index([ensayeId, tipo])
}

enum TipoFallaConcreto {
  CONO_TIPO_1
  CONO_Y_DIVIDIDO_TIPO_2
  COLUMNA_TIPO_3
  CIZALLA_TIPO_4
  ESQUINA_TIPO_5
  PUNTUAL_TIPO_6
  OTRA
}

enum CondicionHumedad {
  HUMEDO_SATURADO
  SUPERFICIALMENTE_SECO
  SECO_AIRE
}

enum TipoFotoEnsaye {
  PRE_ROTURA
  ROTURA_FRACTURA
  DETALLE_FALLA
  MANOMETRO_PRENSA
}
```

#### Árbol de Componentes (`src/features/fc-curves/`)
```
src/features/fc-curves/
├── components/
│   ├── FcStatisticalDashboard.tsx    // Panel maestro analítico con filtros por mezcla y edad
│   ├── FcEvolutionChart.tsx          // Gráfica de dispersión y tendencia con Recharts
│   ├── FcGaussianChart.tsx           // Histograma y curva normal con Recharts
│   ├── CylinderBreakCaptureModal.tsx // Modal contenedor del flujo de rotura de probeta
│   ├── CameraViewfinder.tsx          // Stream WebRTC con canvas de silueta cilíndrica
│   ├── FractureTypeSelector.tsx      // Selector gráfico de tipos de falla ASTM C39 (1-6)
│   └── BreakPhotoGallery.tsx         // Galería fotográfica con visor ampliado y zoom
├── hooks/
│   ├── useFcStatistics.ts            // Funciones matemáticas ACI 214R y Gauss puras
│   └── useCameraCapture.ts           // Manejo de getUserMedia, canvas y estampado forense
├── types.ts                          // Interfaces para ensayes y estadísticas
└── fc-curves.module.css              // Estilos CSS Modules
```

#### Implementación de Referencia con Guardas Defensivas (`src/features/fc-curves/hooks/useFcStatistics.ts`)
```typescript
export interface GaussianPoint {
  x: number;
  densidad: number;
}

export interface FcStatisticsResult {
  n: number;
  media: number;
  desviacionEstandar: number;
  coeficienteVariacionPct: number;
  fcrKgCm2: number | null;
  calificacionControl: string;
  gaussianPoints: GaussianPoint[];
}

export function calculateFcStatistics(
  resistencias: number[],
  fcDiseno?: number
): FcStatisticsResult {
  const n = resistencias.length;

  // Guarda Defensiva 1: Muestras insuficientes (n < 2)
  // Previene división entre cero en el cálculo muestral de s (n - 1)
  if (n < 2) {
    const media = n === 1 ? Math.max(0, resistencias[0]) : 0;
    return {
      n,
      media,
      desviacionEstandar: 0,
      coeficienteVariacionPct: 0,
      fcrKgCm2: null,
      calificacionControl: "INSUFICIENTE (n < 2)",
      gaussianPoints: [],
    };
  }

  // 1. Resistencia Media
  const suma = resistencias.reduce((acc, val) => acc + val, 0);
  const media = suma / n;

  // 2. Desviación Estándar Muestral con guarda para n - 1
  const varianzaSuma = resistencias.reduce((acc, val) => acc + Math.pow(val - media, 2), 0);
  const s = Math.sqrt(varianzaSuma / (n - 1));

  // Guarda Defensiva 2: Desviación nula (s = 0) o media no positiva (evitar Infinity en Gauss y V)
  if (s <= 0 || media <= 0) {
    return {
      n,
      media: Math.max(0, media),
      desviacionEstandar: 0,
      coeficienteVariacionPct: 0,
      fcrKgCm2: fcDiseno && fcDiseno > 0 ? fcDiseno : null,
      calificacionControl: "HOMOGÉNEA (s = 0)",
      gaussianPoints: [],
    };
  }

  // 3. Coeficiente de Variación V (%)
  const cv = (s / media) * 100;

  // Calificación metrológica según ACI 214R
  let calificacionControl = "DEFICIENTE (V > 5.0%)";
  if (cv < 3.0) calificacionControl = "EXCELENTE (V < 3.0%)";
  else if (cv <= 4.0) calificacionControl = "MUY BUENO (3.0% - 4.0%)";
  else if (cv <= 5.0) calificacionControl = "BUENO (4.0% - 5.0%)";

  // 4. Resistencia Requerida de Dosificación f'cr (ACI 214R / ACI 318)
  let fcr: number | null = null;
  if (fcDiseno && fcDiseno > 0) {
    const fcr1 = fcDiseno + 1.34 * s;
    const fcr2 = fcDiseno + 2.33 * s - 35;
    fcr = Math.max(fcr1, fcr2);
  }

  // 5. Puntos de Densidad Gaussiana para Recharts (evaluación segura sin división entre cero)
  const gaussianPoints: GaussianPoint[] = [];
  const minX = Math.max(0, media - 3.5 * s);
  const maxX = media + 3.5 * s;
  const paso = (maxX - minX) / 60;
  const factor = 1 / (s * Math.sqrt(2 * Math.PI));

  for (let x = minX; x <= maxX; x += paso) {
    const exponente = -0.5 * Math.pow((x - media) / s, 2);
    const densidad = factor * Math.exp(exponente);
    gaussianPoints.push({ x: Number(x.toFixed(1)), densidad });
  }

  return {
    n,
    media: Number(media.toFixed(2)),
    desviacionEstandar: Number(s.toFixed(2)),
    coeficienteVariacionPct: Number(cv.toFixed(2)),
    fcrKgCm2: fcr ? Number(fcr.toFixed(2)) : null,
    calificacionControl,
    gaussianPoints,
  };
}
```

---

### 3.5 Estrategia y Plan de Modularización de Estilos (`globals.css`)

#### Diagnóstico del Archivo Monolítico Actual
- **Volumetría actual**: 1,287 líneas de CSS nativo (28,467 bytes).
- **Problemas detectados**:
  1. *Selectores Universales de Etiquetas sin aislamiento*: Estilos forzados en `input, select, textarea` (líneas 200-211) y `button` (líneas 241-248) que generan efectos colaterales indeseados (*cascade leaks*) en nuevos componentes.
  2. *Clases Genéricas Colisionables*: `.card`, `.hero`, `.field`, `.grid`, `.metric`, `.notice` aplicadas en múltiples contextos con especificidades cruzadas.
  3. *Acumulación Cronológica*: Bloques de Inventario (líneas 604-782), Personalización (líneas 783-963), Configuración (líneas 964-1171) y Calendario (líneas 1209-1272) conviviendo en un único archivo.

#### Estrategia de Migración en 3 Fases

```
ESTADO ACTUAL (Monolito)             ESTADO TRANSITORIO (Fase 1 y 2)         ESTADO FINAL MODULAR (Fase 3)
┌─────────────────────────┐         ┌─────────────────────────┐             ┌─────────────────────────┐
│                         │         │ src/styles/tokens.css   │             │ src/styles/tokens.css   │
│   src/app/globals.css   │  ───►   │ src/styles/base.css     │      ───►   │ src/styles/base.css     │
│       (1,287 líneas)    │         │ src/styles/layout.css   │             │ src/styles/layout.css   │
│                         │         │ src/app/globals.css*    │             │ *.module.css por módulo │
└─────────────────────────┘         │ *.module.css (nuevos)   │             └─────────────────────────┘
                                    └─────────────────────────┘
```

#### Fase 1: Extracción Segura de Tokens y Base (Riesgo Cero)
1. Crear `src/styles/tokens.css` extrayendo las variables `:root` de `globals.css` (líneas 1-14) e incorporando las nuevas variables requeridas para semáforos metrológicos y gráficas:
   ```css
   :root {
     /* Tokens Históricos Inmutables */
     --ink: #17352f;
     --muted: #66766f;
     --line: #dce5df;
     --paper: #fff;
     --wash: #f4f8f5;
     --brand: #16734c;
     --brand-dark: #0e5035;
     --warning: #fff5d9;
     --danger: #9b332c;
     --danger-soft: #fff0ef;
     --success: #e7f7ed;
     --shadow: 0 8px 28px rgba(25, 61, 45, 0.08);

     /* Nuevos Tokens de Módulos Comerciales */
     --status-amber: #b57a18;
     --status-amber-soft: #fef7e6;
     --chart-primary: #16734c;
     --chart-secondary: #0284c7;
     --chart-target: #dc2626;
     --tier-pro: #7c3aed;
     --tier-enterprise: #0f172a;
   }
   ```
2. Crear `src/styles/base.css` (resets, tipografía base) y `src/styles/layout.css` (shell de la app y modales comunes).
3. Modificar `src/app/globals.css` para importar estos archivos al inicio vía `@import`. Los componentes existentes de `src/features/samples/` siguen funcionando exactamente igual, sin modificar una sola clase.

#### Fase 2: Adopción Estricta de CSS Modules para Nuevos Módulos
Todos los nuevos módulos desarrollados (`equipment/`, `field-sheets/`, `outgoing-samples/`, `fc-curves/`, `subscriptions/`) deben utilizar **CSS Modules nativos de Next.js** (`*.module.css`).
- Next.js genera automáticamente nombres de clase con hash único (ej. `equipment_badge__x9f2a`), aislando totalmente las reglas y eliminando cualquier posibilidad de colisión con `src/features/samples/`.
- Los CSS Modules consumen las variables globales de `src/styles/tokens.css` vía `var(--brand)`.

#### Fase 3: Desacoplamiento Gradual de Módulos Heredados
Una vez completados los nuevos módulos, los bloques de estilos antiguos de inventario, colados y calendario se trasladan paulatinamente a sus respectivos `module.css`, reduciendo `globals.css` a un archivo ultra-delgado menor a 150 líneas.

#### Matriz de Riesgos y Garantía de Cero Regresión en Muestras
| Riesgo de Estilos | Causa Potencial | Estrategia de Mitigación Obligatoria |
| :--- | :--- | :--- |
| **Alteración de inputs en muestras** | Selectores de input globales sobreescritos | Nuevos módulos usan `.inputControl` en su CSS Module; prohibido redefinir etiquetas nativas. |
| **Colisión en modales** | Estilos de `.modal` y `.modal-backdrop` | Se conserva la estructura estructural en `layout.css`; solo el interior del modal se estiliza con CSS Module. |
| **Inconsistencia de colores de marca** | Clases CSS con colores hardcodeados | Uso estricto de variables CSS de `src/styles/tokens.css`. |

---

## 4. Estrategia de Almacenamiento Local Determinista (%LOCALAPPDATA%/LABSICO)

### 4.1 Resolución Jerárquica de Rutas Base con Prioridad en Windows Local

En laboratorios de obra civil, ENSALIA corre localmente en estaciones de trabajo con Windows. La resolución de rutas del sistema de archivos debe priorizar el directorio local del usuario sin depender de rutas relativas al directorio de ejecución:

```typescript
// src/lib/storage/resolver.ts
import path from "node:path";
import { existsSync } from "node:fs";

export function getEnsaliaStorageRoot(): string {
  // 1. Variable de entorno explícita (mayor prioridad)
  if (process.env.ENSALIA_DOCUMENTS_DIR) {
    return path.resolve(process.env.ENSALIA_DOCUMENTS_DIR);
  }

  // 2. Windows LOCALAPPDATA
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const nativeDir = path.join(localAppData, "Ensalia", "documents");
    const legacyDir = path.join(localAppData, "LABSICO", "documents");
    const legacyDb = path.join(localAppData, "LABSICO", "data", "labsico.db");
    const nativeDb = path.join(localAppData, "Ensalia", "data", "ensalia.db");

    // Modo compatibilidad: si existe la base histórica de LABSICO y no la nativa
    if (existsSync(legacyDb) && !existsSync(nativeDb)) {
      return legacyDir;
    }
    return nativeDir;
  }

  // 3. Fallback para entornos no-Windows o desarrollo local
  return path.resolve(process.cwd(), ".data", "documents");
}
```

### 4.2 Árbol Determinista de Directorios en Disco

Para prevenir la degradación de rendimiento en sistemas de archivos NTFS cuando un único directorio contiene más de 10,000 archivos, la estructura física se particiona temporalmente por año y mes:

```
%LOCALAPPDATA%\Ensalia\documents\
├── certificates\
│   └── {YYYY}\
│       └── {MM}\
│           └── {equipoCodigo}_{calibracionId}_{hash8}.pdf
├── maintenance\
│   └── {YYYY}\
│       └── {MM}\
│           └── {equipoCodigo}_{mantenimientoId}_{hash8}.pdf
├── break_photos\
│   └── {YYYY}\
│       └── {MM}\
│           └── {muestraId}\
│               └── esp_{numero}_{uuidShort}.webp
└── field-sheets\
    └── {emisionId}\
        ├── original.pdf
        └── scans\
            └── {uuid}.pdf
```

### 4.3 Persistencia de Rutas Relativas Normalizadas POSIX en SQLite

**Regla de Oro de Portabilidad**: Queda terminantemente prohibido almacenar rutas absolutas de Windows (ej. `C:\Users\ccanto\AppData\...`) en la base de datos SQLite. Si la máquina cambia de usuario, se traslada a otra PC o se restaura un respaldo, las rutas absolutas quedan inmediatamente rotas.
- En la base de datos se guarda **estrictamente la ruta relativa normalizada con pleca POSIX (`/`)**.
- Ejemplo: `certificates/2026/10/PRENSA-01_cuid1234_a1b2c3d4.pdf`.
- Cada registro almacena adicionalmente: `tamano` (bytes), `mimeType` y `hashSha256` (64 caracteres hexadecimales) para comprobación forense de inmutabilidad.

### 4.4 Servicio de Almacenamiento y Entrega Vía Route Handlers

#### Implementación Completa de `src/lib/storage/document-storage.ts`
```typescript
import path from "node:path";
import { existsSync, createReadStream } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { getEnsaliaStorageRoot } from "./resolver";

// Expresión regular con flag /i (insensible a mayúsculas/minúsculas para extensiones generadas por cámaras móviles y escáneres: .PDF, .JPG, .WEBP)
// Incluye soporte integral para hojas de campo, certificados de calibración, comprobantes de mantenimiento y fotos de rotura f'c
const VALID_RELATIVE_PATH_PATTERN = /^(?:field-sheets\/[A-Za-z0-9_-]+\/(?:scans\/)?[A-Za-z0-9_.-]+\.(?:pdf|png|jpg|webp)|certificates\/\d{4}\/\d{2}\/[A-Za-z0-9_.-]+\.pdf|maintenance\/\d{4}\/\d{2}\/[A-Za-z0-9_.-]+\.pdf|break_photos\/\d{4}\/\d{2}\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp))$/i;

export function validateAndResolvePath(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/");

  if (!VALID_RELATIVE_PATH_PATTERN.test(normalized)) {
    throw new Error(`Ruta documental inválida o patrón no administrado: '${relativePath}'`);
  }

  const root = getEnsaliaStorageRoot();
  const resolved = path.resolve(root, ...normalized.split("/"));

  // Verificación estricta contra Path Traversal (evitar secuencias ../)
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Violación de seguridad: Intento de Path Traversal detectado.");
  }

  return resolved;
}

export async function stageManagedFile(relativePath: string, bytes: Uint8Array) {
  const destination = validateAndResolvePath(relativePath);
  const temporary = `${destination}.incoming`;

  await mkdir(path.dirname(destination), { recursive: true });
  await rm(temporary, { force: true });
  await writeFile(temporary, bytes, { flag: "wx" });

  return {
    commit: async () => {
      await rename(temporary, destination);
    },
    rollback: async () => {
      await rm(temporary, { force: true });
      await rm(destination, { force: true });
    },
  };
}

export function streamManagedFile(relativePath: string) {
  const absolutePath = validateAndResolvePath(relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`El archivo solicitado no existe en el almacenamiento: ${relativePath}`);
  }
  return createReadStream(absolutePath);
}
```

#### Route Handler para Servicio Seguro con Caché Inmutable
Los archivos jamás se exponen en la carpeta `public/`. Se entregan mediante Route Handlers con cabeceras estrictas:
```typescript
// src/app/api/archivos/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateAndResolvePath } from "@/lib/storage/document-storage";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const relativePath = params.path.join("/");
    const resolvedPath = validateAndResolvePath(relativePath);
    const fileStats = await stat(resolvedPath);
    const bytes = await readFile(resolvedPath);

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".webp": "image/webp",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeMap[ext] || "application/octet-stream",
        "Content-Length": String(fileStats.size),
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Archivo no encontrado o acceso no permitido." }, { status: 404 });
  }
}
```

### 4.5 Actualización Crítica del Motor de Respaldos (Formato Manifiesto Versión 4)

#### Diagnóstico del Fallo en Scripts de Respaldo Actuales
La inspección de `scripts/Ensalia.Common.ps1` (línea 124) y `scripts/Restore-Ensalia.ps1` (líneas 24, 28, 34, 49, 63) reveló que la validación documental actual admite **únicamente** la estructura histórica de hojas de campo en Formato v3:
```powershell
# Expresión regular actual (Formato v3) que FALLA con certificados, mantenimientos y fotos:
'^field-sheets/[A-Za-z0-9_-]+/(?:scans/)?[A-Za-z0-9_.-]+\.(?:pdf|png|jpg|webp)$'
```
Si se guardan certificados metrológicos, comprobantes de mantenimiento o fotos de rotura f'c en disco, la función `New-EnsaliaBackupArchive` arroja inmediatamente la excepción:
`"La carpeta documental contiene una ruta no administrada."`

Asimismo, en `scripts/Restore-Ensalia.ps1`, las verificaciones de versión están restringidas a `@(1, 2, 3)` (línea 24), `@(2, 3)` (líneas 28 y 49) y `-eq 3` (líneas 34 y 63). Si no se actualizan todas estas líneas, la restauración de un archivo con Formato Versión 4 abortará con excepción de ruta no permitida y omitirá la extracción tanto de `assets` como de `documents`.

#### Modificación Obligatoria para Formato v4

1. **Actualización en `scripts/Ensalia.Common.ps1` (Preservación del Contrato Plano del Manifiesto)**:
En la función `New-EnsaliaBackupArchive`, se actualiza la expresión regular para admitir las nuevas rutas documentales (incluyendo `maintenance/`) y se **preserva estrictamente la estructura canónica plana** del manifiesto requerida por el motor de restauración en `Restore-Ensalia.ps1`:

```powershell
# En scripts/Ensalia.Common.ps1 (función New-EnsaliaBackupArchive):
$docPattern = '^(?:field-sheets/[A-Za-z0-9_-]+/(?:scans/)?[A-Za-z0-9_.-]+\.(?:pdf|png|jpg|webp)|certificates/\d{4}/\d{2}/[A-Za-z0-9_.-]+\.pdf|maintenance/\d{4}/\d{2}/[A-Za-z0-9_.-]+\.pdf|break_photos/\d{4}/\d{2}/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp))$'

if (($relative -replace '\\', '/') -notmatch $docPattern) {
    throw "La carpeta documental contiene una ruta no administrada: $relative"
}

# Preservar el contrato canónico plano de manifest.json (Formato Versión 4)
# Todos los archivos administrados (base de datos, assets y documents) se documentan como entradas en el array $files:
$manifest = [ordered]@{
    formatVersion = 4
    product       = 'ENSALIA'
    createdAt     = (Get-Date).ToString('o')
    reason        = $Reason
    databaseFile  = $databaseFile
    sha256        = $files[0].sha256
    files         = $files
    sourceLayout  = $Paths.CompatibilityMode
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage 'manifest.json') -Encoding UTF8
```

2. **Actualización en `scripts/Restore-Ensalia.ps1` (Actualización Multi-Línea para Versión 4)**:
Para que la restauración de respaldos con Formato v4 funcione con éxito sin romper la compatibilidad hacia atrás con respaldos v1, v2 y v3, se especifican las 5 modificaciones críticas en `scripts/Restore-Ensalia.ps1`:

- **Línea 24 (Compatibilidad de Formato)**: Ampliar la comprobación de versiones válidas para admitir la versión 4:
  ```powershell
  # Línea 24:
  if (-not $validProduct -or $manifest.formatVersion -notin @(1, 2, 3, 4) -or -not $validDatabaseFile) {
      throw 'El formato del respaldo no es compatible.'
  }
  ```

- **Línea 28 (Validación de Lista de Archivos y Hashes SHA-256)**: Incluir la versión 4 en el bucle de verificación de integridad:
  ```powershell
  # Línea 28:
  if ($manifest.formatVersion -in @(2, 3, 4)) {
      if ($null -eq $manifest.files -or @($manifest.files).Count -lt 1) { throw 'El manifiesto no contiene la lista de archivos.' }
      foreach ($entry in @($manifest.files)) {
          ...
  ```

- **Línea 34 (Validación de Rutas Documentales Administradas)**: Evaluar la versión 4 y actualizar el patrón regex para incluir `certificates`, `maintenance` y `break_photos`:
  ```powershell
  # Línea 34:
  $docPattern = '^documents/(?:field-sheets/[A-Za-z0-9_-]+/(?:scans/)?[A-Za-z0-9_.-]+\.(?:pdf|png|jpg|webp)|certificates/\d{4}/\d{2}/[A-Za-z0-9_.-]+\.pdf|maintenance/\d{4}/\d{2}/[A-Za-z0-9_.-]+\.pdf|break_photos/\d{4}/\d{2}/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp))$'
  $isManagedDocument = ($manifest.formatVersion -in @(3, 4)) -and ($relative -match $docPattern)
  if (-not $isDatabase -and -not $isManagedAsset -and -not $isManagedDocument) { throw 'El respaldo contiene una ruta de recurso no permitida.' }
  ```

- **Línea 49 (Restauración del Directorio de Assets)**: Incluir la versión 4 en la restauración atómica de la carpeta `assets`:
  ```powershell
  # Línea 49:
  if ($manifest.formatVersion -in @(2, 3, 4)) {
      $incomingAssets = Join-Path $stage 'assets'
      ...
  ```

- **Línea 63 (Restauración del Directorio de Documents)**: Incluir la versión 4 en la restauración atómica de la carpeta `documents`:
  ```powershell
  # Línea 63:
  if ($manifest.formatVersion -in @(3, 4)) {
      $incomingDocuments = Join-Path $stage 'documents'
      ...
  ```

### 4.6 Concurrencia y Rendimiento en SQLite

1. **Configuración Obligatoria de WAL Mode**:
   Por defecto, SQLite opera en modo `DELETE`, donde una escritura bloquea todas las lecturas de los usuarios. Para permitir lecturas concurrentes sin esperas durante la subida de fotos o generación de bitácoras, se debe configurar Write-Ahead Logging y timeout de concurrencia:
   ```sql
   PRAGMA journal_mode = WAL;
   PRAGMA busy_timeout = 5000;
   PRAGMA synchronous = NORMAL;
   PRAGMA foreign_keys = ON;
   ```
   Esta configuración debe inyectarse en el script de arranque `scripts/Start-Ensalia.ps1` y en la inicialización del cliente Prisma en `src/lib/prisma.ts`.
2. **Prohibición Terminante de BLOBs en Base de Datos**:
   Almacenar fotos y PDFs en SQLite degradaría el tamaño del archivo `.db` en cientos de megabytes en pocas semanas, volviendo lentas las operaciones de backup y duplicando el uso de memoria RAM. Los binarios residen exclusivamente en disco.

---

## 5. Compatibilidad Técnica, Coherencia de Tipos e Invarianza

### 5.1 Compatibilidad con el Stack de Ejecución
- **Next.js 15.5.4 (App Router)**: Compatibilidad plena garantizada mediante Route Handlers dedicados, componentes cliente con directiva `"use client"` y carga dinámica vía `dynamic()`.
- **React 19.1.1**: Plena compatibilidad con hooks nativos (`useContext`, `useState`, `useCallback`, `useTransition`) sin dependencias de paquetes incompatibles con React 19.
- **Prisma ORM v6.16.2**: Compatible con SQLite, manejando números con tipo `Decimal` (mapeado a numeric/float por Prisma en SQLite y validado estrictamente en cliente con Zod).
- **TypeScript 5.9.2 (Strict Mode)**: Cero uso de `any`, validación estricta de nulabilidad y uniones discriminadas.

### 5.2 Estrategia de Extensión Aditiva en SQLite
En SQLite, alterar o eliminar columnas existentes en tablas pobladas requiere reconstruir toda la tabla. La arquitectura propuesta garantiza que **ninguna tabla existente sea alterada**:
- `Especimen` no se modifica en base de datos. El nuevo modelo `EnsayeCompresion` contiene `especimenId String @unique` con clave foránea inversa.
- `Muestra` no se modifica en base de datos. `HojaCampoToma` contiene `muestraId String? @unique` y `ItemDespachoMuestra` referencia `muestraId`.
- `Equipo` mantiene sus columnas existentes y solo recibe la relación hija `mantenimientos MantenimientoEquipo[]`.
- **Eficiencia y Depuración de Índices Prisma en SQLite**: En el modelo `HojaCampoToma`, la columna `muestraId String? @unique` genera de forma nativa e intrínseca un índice único B-Tree (`HojaCampoToma_muestraId_key`). Por lo tanto, se descarta formalmente cualquier declaración redundante `@@index([muestraId])`, evitando duplicar índices idénticos sobre la misma columna en SQLite y optimizando los tiempos de escritura y consumo de almacenamiento.

### 5.3 Invarianza de `src/features/samples/types.ts` y Plantilla Fija de Captura
La plantilla oficial `CONCRETE_CAPTURE_TEMPLATE_V1` de 54 campos congelada con `Object.freeze` (`src/lib/templates/capture-template.ts`) permanece **completamente intacta**:
- Las 89 pruebas unitarias de exportación e importación de bitácoras siguen pasando con éxito.
- La interfaz `Specimen` en `src/features/samples/types.ts` se extiende únicamente con un campo opcional no destructivo:
  ```typescript
  export interface SpecimenTestResultSummary {
    ensayeId: string;
    resistenciaKgCm2: number;
    porcentajeFc: number | null;
    tipoFalla: string;
    fechaHoraEnsaye: string;
    fotoPrincipalRuta?: string | null;
  }

  export interface Specimen {
    id?: string;
    numero: number;
    edadDias: number | null;
    tipo: string;
    fechaEnsaye: string | null;
    // Extensión puramente aditiva:
    ensaye?: SpecimenTestResultSummary | null;
  }
  ```

### 5.4 Políticas de TypeScript Estricto y Validación Zod
- Toda petición entrante a los Route Handlers debe validarse con esquemas Zod antes de procesarse.
- Las funciones matemáticas de cálculo f'c y ACI 214R deben tiparse como funciones puras sin efectos secundarios para facilitar su prueba unitaria automatizada.
- Ejecución periódica obligatoria de `npm run typecheck` (`tsc --noEmit`), manteniendo el estado de 0 errores en todo momento.

---

## 6. Roadmap de Ejecución por Fases Priorizadas

### 6.1 Matriz de Dependencias Técnicas y Secuencia Lógica

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Fundaciones, Almacenamiento Seguro v4, Motor de Suscripciones & Tokens   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────────┐
│ FASE 2: Módulos Operativos            │ │ FASE 3: Logística y Ensayes           │
│ - Inventario & Calibraciones PDF      │ │ - Muestras a Salir (Logística/Curado) │
│ - Hojas de Campo & Captura Offline    │ │ - Ensayes de Compresión (ASTM C39)    │
└───────────────────┬───────────────────┘ └───────────────────┬───────────────────┘
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ FASE 4: Analítica Avanzada f'c (ACI 214R / Gauss) & Captura WebRTC con Marca     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ FASE 5: Consolidación, Auditoría de Rendimiento, WAL Mode & Cierre de Estilos    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.2 Especificación Detallada de las 5 Fases de Implementación

#### FASE 1: Fundaciones de Suscripción, Almacenamiento Seguro v4 y Tokens CSS
- **Duración estimada**: Semanas 1 a 2.
- **Dependencias**: Ninguna (fase inicial).
- **Entregables Técnicos**:
  1. Creación de `src/styles/tokens.css`, `base.css` y `layout.css`, integrados mediante `@import` en `globals.css`.
  2. Implementación de `src/lib/storage/document-storage.ts` con validación de rutas y streaming.
  3. Actualización de `scripts/Ensalia.Common.ps1` y `scripts/Restore-Ensalia.ps1` al Formato Manifiesto Versión 4.
  4. Modelos Prisma `SuscripcionLocal` y `ModuloFeatureFlag`; migración inicial aditiva.
  5. Proveedor `SubscriptionProvider`, hook `useSubscription` y componente `<FeatureGate>`.
- **Criterio de Aceptación**:
  - `npm run typecheck` limpio (0 errores).
  - Pruebas de respaldo y restauración en PowerShell exitosas con archivos de prueba simulados en `certificates/` y `break_photos/`.
  - Simulador de suscripción permitiendo conmutar planes (Essential, Pro) y verificando la reacción de `<FeatureGate>`.

#### FASE 2: Módulos Operativos (Inventario, Calibraciones y Hojas de Campo)
- **Duración estimada**: Semanas 3 a 5.
- **Dependencias**: Fase 1 completada.
- **Entregables Técnicos**:
  1. Modelos Prisma: `DocumentoCalibracion`, `MantenimientoEquipo`, `DocumentoMantenimiento`, `HojaCampoCaptura`, `HojaCampoToma`, `ArchivoHojaCampoCaptura`.
  2. Componentes de Inventario: `EquipmentDashboard`, `EquipmentTable`, semáforo dinámico `CalibrationBadge`, modal de carga `CalibrationModal` y visor PDF `CertificateViewerModal` con hash SHA-256.
  3. Calendario interactivo `CalibrationCalendarView`.
  4. Asistente multipaso de hojas de campo `FieldSheetWizard` (4 etapas) con persistencia local en `localStorage` y detector de estado offline.
  5. Endpoints REST bajo `/api/equipos/[id]/calibraciones` y `/api/hojas-campo`.
- **Criterio de Aceptación**:
  - Carga y visualización exitosa de certificados PDF con cálculo correcto de SHA-256.
  - Semáforos metrológicos cambiando de color conforme a las fechas simuladas (>30d verde, <=30d ámbar, <0d rojo).
  - Captura de hoja de campo sin conexión y sincronización exitosa al restablecer la red.

#### FASE 3: Logística de Salidas y Registro de Ensayes de Compresión
- **Duración estimada**: Semanas 6 a 7.
- **Dependencias**: Fase 1 y Fase 2 completadas.
- **Entregables Técnicos**:
  1. Modelos Prisma: `DespachoMuestra`, `ItemDespachoMuestra`, `EnsayeCompresion`.
  2. Tablero logístico `OutgoingDashboard` con vistas conmutables Kanban y Lista densa.
  3. Contador de tiempo crítico `CriticalCuringBadge` con alerta para cilindros con más de 36h/48h sin ingresar a curado estándar.
  4. Generador de manifiesto de ruta para chofer con lista de cotejo de moldes.
  5. Modal de check-in y desmolde de especímenes en laboratorio.
  6. Formulario de captura de datos de ensaye a compresión (diámetro, altura, carga máxima en kN/kg, $kg/cm^2$, selector de patrón de falla ASTM C39).
- **Criterio de Aceptación**:
  - Transición fluida de muestras en el tablero logístico.
  - Alerta de curado activándose oportunamente en muestras con más de 48h desde el colado.
  - Cálculo automático del esfuerzo $f'c = P/A$ con precisión decimal.

#### FASE 4: Analítica Avanzada f'c y Captura WebRTC con Marca Forense
- **Duración estimada**: Semanas 8 a 9.
- **Dependencias**: Fase 3 completada.
- **Entregables Técnicos**:
  1. Modelo Prisma: `FotoEnsayeCompresion`.
  2. Módulo matemático puro `useFcStatistics.ts` con fórmulas ACI 214R (media, desviación estándar, coeficiente de variación $V$, $f'_{cr}$) y función de densidad de Gauss.
  3. Gráficas interactivas con Recharts: `FcEvolutionChart` (Edad vs Resistencia) y `FcGaussianChart` (Histograma y Campana de Gauss).
  4. Componente de captura WebRTC `CameraViewfinder` con silueta translúcida de probeta (proporción 1:2).
  5. Mecanismo de estampado forense indeleble sobre `<canvas>` (datos de muestra, operador, fecha/hora y resistencia) y exportación comprimida WebP local.
  6. Fallback de captura de archivo para navegadores sin acceso a cámara.
- **Criterio de Aceptación**:
  - Pruebas unitarias matemáticas validando cálculos de desviación estándar y ACI 214R contra datos de referencia conocidos.
  - Captura y guardado de fotografía WebP con peso entre 150 y 250 KB en `%LOCALAPPDATA%/Ensalia/documents/break_photos/`.
  - Marca de agua forense claramente legible en la fotografía guardada.

#### FASE 5: Consolidación, Auditoría de Rendimiento y Migración Final de Estilos
- **Duración estimada**: Semanas 10 a 11.
- **Dependencias**: Fases 1 a 4 completadas.
- **Entregables Técnicos**:
  1. Configuración de `PRAGMA journal_mode = WAL;` y `PRAGMA busy_timeout = 5000;` en SQLite.
  2. Desacoplamiento gradual final de los estilos heredados de inventario y colados hacia sus respectivos CSS Modules, reduciendo `globals.css` a su mínima expresión.
  3. Auditoría integral de tipos TypeScript (`npm run typecheck`).
  4. Suite de pruebas de integración completa cubriendo los 4 niveles comerciales y persistencia documental.
  5. Generación de manuales técnicos de instalación y licenciamiento offline.
- **Criterio de Aceptación**:
  - 100% de pruebas unitarias e integrales pasando.
  - Cero bloqueos de base de datos (`SQLITE_BUSY`) bajo simulación de lecturas y escrituras concurrentes.
  - `globals.css` con menos de 150 líneas.

---

### 6.3 Matriz de Riesgos y Mitigaciones Técnicas

| Riesgo Técnico / Operativo | Impacto | Probabilidad | Estrategia de Mitigación Obligatoria |
| :--- | :---: | :---: | :--- |
| **Bloqueo de base de datos en Windows (`SQLITE_BUSY`)** | Crítico | Media | Activar `PRAGMA journal_mode = WAL;` y `PRAGMA busy_timeout = 5000;`. Prohibir BLOBs en SQLite. |
| **Bloqueo de cámara WebRTC en red local (HTTP sin SSL)** | Alto | Alta | Implementar fallback automático con `<input type="file" accept="image/*" capture="environment">`. |
| **Corrupción de rutas en respaldos** | Crítico | Media | Actualización estricta al Formato Manifiesto v4 en `scripts/Ensalia.Common.ps1` y `Restore-Ensalia.ps1`. |
| **Colisión de estilos CSS con bitácora existente** | Medio | Media | Aislamiento obligatorio de todos los nuevos módulos con CSS Modules (`*.module.css`). |
| **Saturación de almacenamiento en disco NTFS** | Medio | Baja | Compresión WebP en cliente (peso <250 KB) y particionamiento en carpetas YYYY/MM. |
| **EPERM al ejecutar `prisma generate` en Windows** | Medio | Alta | Documentar SOP: detener dev servers (`next dev`) antes de ejecutar migraciones en SQLite. |

---

## 7. Dictamen de Aprobación Arquitectónica

El presente plan maestro establece una arquitectura técnica de clase industrial, completamente alineada con la realidad operativa de los laboratorios de materiales de construcción y el stack de software existente de ENSALIA. Garantiza la monetización escalable en 4 niveles comerciales, la preservación inmutable del núcleo de muestras de concreto y la máxima rigurosidad metrológica bajo estándares internacionales.

**Aprobado para ejecución de la Fase 1.**
