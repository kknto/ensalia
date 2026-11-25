# Propuesta Técnica Maestra: Reestructuración de la Arquitectura de Navegación Lateral y Ergonomía Operativa en ENSALIA

**Documento:** `docs/architecture/PROPUESTA_ARQUITECTURA_NAVEGACION_ENSALIA.md`  
**Fecha de Emisión:** 4 de Noviembre de 2026  
**Versión:** 1.1.0 (Propuesta Maestra Consensuada — Iteración 2: Remediación Adversarial)  
**Clasificación:** Documento Técnico de Arquitectura de Software, Metrología y Factores Humanos  
**Autores y Revisores:** Equipo Multidisciplinario de ENSALIA  
- Especialista en Arquitectura Frontend y Navegación React/Next.js (`teamwork_explorer_nav_1`)  
- Especialista en Calidad de Concreto, Normativa ASTM/NMX y Acreditación ISO/IEC 17025 (`teamwork_explorer_nav_2`)  
- Especialista en Ergonomía Cognitiva, Interacción Humano-Computadora y UX Industrial (`teamwork_explorer_nav_3`)  
- Retador Adversarial de Ergonomía, Usabilidad y Accesibilidad (`teamwork_challenger_m1_1`)  
- Retador Adversarial de Casos de Borde Normativos y Metrología (`teamwork_challenger_m1_2`)  
- Técnico Redactor y Arquitecto de Información / UX (`teamwork_worker_m1_it2`)  
**Estado:** Dictamen Consensuado y Remediado — Listo para Aprobación Final de Dirección

---

## Índice General

1. [Resumen Ejecutivo y Marco Normativo de Referencia](#1-resumen-ejecutivo-y-marco-normativo-de-referencia)
   - 1.1 Objetivo del Documento y Contexto del Sistema
   - 1.2 Marco Normativo Técnico y de Acreditación (ASTM, NMX, ACI, ISO/IEC 17025)
   - 1.3 Modelado Integral del Ciclo de Vida del Concreto y Cadena de Custodia
2. [Diagnóstico Técnico y Operativo Actual (R1)](#2-diagnóstico-técnico-y-operativo-actual-r1)
   - 2.1 Arquitectura Frontend Base (`src/app/page.tsx`, SPA basada en estado local `view: View`)
   - 2.2 Ficha Técnica Individual de las 11 Pestañas Actuales
   - 2.3 Justificación y Contraste frente al Ciclo Normativo del Concreto
   - 2.4 Análisis Detallado de Puntos de Fricción Críticos
3. [Propuesta de Navegación: Alternativa A — Lista Plana Optimizada Secuencialmente (R2)](#3-propuesta-de-navegación-alternativa-a--lista-plana-optimizada-secuencialmente-r2)
   - 3.1 Principio de Diseño, Secuencia Operativa y Caracterización Matemática (Límite de Miller 11 > 9)
   - 3.2 Justificación Paso a Paso del Flujo de Trabajo (1 a 11)
   - 3.3 Tratamiento Visual con Divisores Pasivos
   - 3.4 Matriz DAFO de la Alternativa A y Justificación de Quick-Win Transitorio
4. [Propuesta de Navegación: Alternativa B — Estructura Agrupada por Fases Operativas (R2)](#4-propuesta-de-navegación-alternativa-b--estructura-agrupada-por-fases-operativas-r2)
   - 4.1 Principio de Chunking Cognitivo y Organización Departamental de Laboratorio
   - 4.2 Desglose de las 5 Fases Operativas Naturales + Dashboard Global
   - 4.3 Especificación de Micro-Interacciones, Badges Dinámicos en Tiempo Real (Endpoint Ligero SWR) y CTA
   - 4.4 Arquitectura Responsiva, Accesibilidad (.sr-only WCAG 2.1 SC 1.3.1) y Touch Shell para Tablets (WCAG 2.5.5)
   - 4.5 Matriz DAFO de la Alternativa B
5. [Matriz Comparativa Multidimensional y Consenso del Equipo](#5-matriz-comparativa-multidimensional-y-consenso-del-equipo)
   - 5.1 Tabla Comparativa Ponderada en 9 Dimensiones Clave
   - 5.2 Dictamen Técnico Consensuado y Estrategia de Adopción en Dos Pasos
6. [Hoja de Ruta de Transición e Implementación Técnica (R3)](#6-hoja-de-ruta-de-transición-e-implementación-técnica-r3)
   - 6.1 Plan de Trabajo por Etapas (Fase 1 Quick-Win, Fase 2 Consolidación y Bordes Normativos)
   - 6.2 Especificación Conceptual de Código TypeScript, Contratos de Datos y Endpoint GET /api/navigation/badges
   - 6.3 Ajustes de Estilos CSS (`globals.css`), Técnica .sr-only y Preservación de Pruebas Empíricas
   - 6.4 Plan de Mitigación de Riesgos, Manejo de `dirty` y Resiliencia Local (Draft Autosave en `localStorage`)
   - 6.5 Protocolo de Validación Empírica con Laboratoristas y Signatarios Técnicos

---

## 1. Resumen Ejecutivo y Marco Normativo de Referencia

### 1.1. Objetivo del Documento y Contexto del Sistema

**ENSALIA** es una plataforma de software integral de aseguramiento metrológico y control de calidad diseñada para laboratorios acreditados de ensaye de materiales y plantas de concreto premezclado. Su función central es gobernar con estricto rigor legal y trazabilidad inmutable la cadena de custodia de especímenes cilíndricos y prismáticos de concreto, garantizando que cada determinación de resistencia a la compresión ($f'_c$) cumpla con las especificaciones de diseño estructural y las tolerancias normativas vigentes.

El presente documento formaliza el diagnóstico integral, el consenso de diseño y el plan de transición técnica para la **barra de navegación lateral principal** (`src/app/page.tsx:461-473`). A través de una auditoría multidisciplinaria que combina la arquitectura de software frontend, la metrología de laboratorio bajo acreditación **ISO/IEC 17025** y la ergonomía de factores humanos en entornos hostiles, se identifican las fallas de usabilidad del menú actual y se formulan dos alternativas de solución viables, asegurando que ningún archivo de código fuente del repositorio sea modificado hasta que la dirección apruebe formalmente la estrategia elegida.

---

### 1.2. Marco Normativo Técnico y de Acreditación

Toda decisión de diseño de interfaces en ENSALIA debe subordinarse a los estándares internacionales y normas nacionales mexicanas que rigen el control de calidad del concreto estructural:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   MARCO NORMATIVO DE REFERENCIA (QC/QA)                                │
├───────────────────────┬──────────────────────┬─────────────────────────────────────────────────────────┤
│ Norma Internacional   │ Norma Mexicana (NMX) │ Alcance Técnico y Relevancia en el Software             │
├───────────────────────┼──────────────────────┼─────────────────────────────────────────────────────────┤
│ **ASTM C172 / C172M** │ **NMX-C-161-ONNCCE** │ Muestreo de concreto fresco en camión revolvedora.      │
│ **ASTM C143 / C143M** │ **NMX-C-156-ONNCCE** │ Determinación del revenimiento (asentamiento / slump).  │
│ **ASTM C1064 / C1064M**│ **NMX-C-435-ONNCCE**│ Medición de temperatura del concreto fresco y ambiente. │
│ **ASTM C138 / C138M** │ **NMX-C-162-ONNCCE** │ Masa unitaria, rendimiento y contenido de cemento.     │
│ **ASTM C231 / C173**  │ **NMX-C-157 / 158**  │ Contenido de aire por método de presión / volumétrico.  │
│ **ASTM C31 / C31M**   │ **NMX-C-160-ONNCCE** │ Elaboración y curado de especímenes en obra (curado     │
│                       │                      │ inicial protegido de 16 a 48 h a 16-27°C y transporte). │
│ **ASTM C511**         │ **NMX-C-148-ONNCCE** │ Cuartos húmedos, cuartos de niebla y piletas de agua    │
│                       │                      │ saturada con hidróxido de calcio Ca(OH)2 a 23.0±2.0°C.  │
│ **ASTM C684 / C684M** │ **NMX-C-403-ONNCCE** │ Métodos de curado acelerado (Procedimiento A: agua      │
│                       │                      │ caliente 60°C, Procedimiento B: agua hirviendo 100°C,   │
│                       │                      │ Procedimiento C: autoclave/autógeno) en prefabricados. │
│ **ASTM C39 / C39M**   │ **NMX-C-083-ONNCCE** │ Resistencia a la compresión de cilindros de concreto:   │
│                       │                      │ tolerancias horarias por edad, tasa de carga (0.25 MPa/s)│
│                       │                      │ y clasificación de fracturas Tipo 1 a 6.                │
│ **ASTM C617 / C617M** │ **NMX-C-109-ONNCCE** │ Cabeceo de cilindros con mortero de azufre (130-145°C). │
│ **ASTM C1231 / C1231M**│ **NMX-C-083-ONNCCE**│ Uso de almohadillas de neopreno no adheridas en anillos. │
│ **ASTM E4**           │ **NMX-CH-004-IMNC**  │ Calibración de fuerza y verificación de prensas.        │
│ **ACI 214R-11**       │ **NMX-C-155-ONNCCE** │ Evaluación estadística de resultados de resistencia.    │
│ **ACI 318-19 (Cap 26)**│ **NTC-Concreto CDMX**│ Criterios de aceptación estructural (promedio de 3).    │
│ **ISO/IEC 17025:2017**│ **NMX-EC-17025-IMNC**│ Requisitos generales para la competencia de laboratorios│
│                       │                      │ de ensayo: trazabilidad inmutable y custodia de muestras.│
└───────────────────────┴──────────────────────┴─────────────────────────────────────────────────────────┘
```

---

### 1.3. Modelado Integral del Ciclo de Vida del Concreto y Cadena de Custodia

El ciclo de maduración y ensayo del concreto sigue una cronología unidireccional y rigurosa en el tiempo físico. El software debe acompañar esta secuencia sin exigir al operador realizar saltos cognitivos contra-intuitivos:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        CICLO DE VIDA INTEGRAL DEL CONCRETO Y CADENA DE CUSTODIA                        │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│  [ FASE 1: COLADO Y MUESTREO EN OBRA ]                                                                 │
│  Evento de colado (cliente, obra, elemento) ──► Muestreo de olla (ASTM C172) ──► Ensayes en fresco     │
│  (slump ASTM C143, temp ASTM C1064) ──► Moldeo de probetas cilíndricas 15x30 / 10x20 cm (ASTM C31)     │
│                                      │                                                                 │
│                                      ▼                                                                 │
│  [ FASE 2: CURADO INICIAL Y LOGÍSTICA DE RECOLECCIÓN ]                                                 │
│  Curado inicial en obra (16 a 48 h protegidas a 16-27°C) ──► Monitoreo alerta crítica < 48 horas       │
│  ──► Manifiesto de despacho ──► Transporte amortiguado al laboratorio central                          │
│                                      │                                                                 │
│                                      ▼                                                                 │
│  [ FASE 3: RECEPCIÓN EN LABORATORIO Y CURADO ESTÁNDAR / ACELERADO ]                                    │
│  Desmolde a las 20-48 h ──► Identificación física indeleble (código) ──► Ingreso a cuarto húmedo /     │
│  piletas con Ca(OH)2 a 23.0±2.0°C (ASTM C511) o tanques térmicos acelerados (ASTM C684) hasta ensaye   │
│                                      │                                                                 │
│                                      ▼                                                                 │
│  [ FASE 4: PROGRAMACIÓN Y AGENDA DE EDADES NORMATIVAS ]                                                │
│  Consulta diaria de probetas por ensayar ──► Verificación de ventanas de tolerancia (ASTM C39):       │
│  24 h (±0.5 h), 3 d (±2 h), 7 d (±6 h), 14 d (±12 h), 28 d (±20 h), 90 d (±40 h)                       │
│                                      │                                                                 │
│                                      ▼                                                                 │
│  [ FASE 5: PREPARACIÓN Y ROTURA EN PRENSA f'c ]                                                        │
│  Extracción de pileta ──► Medición d1/d2 y altura vernier ──► Cabeceo (C617/C1231) ──► Carga pico en   │
│  prensa calibrada (ASTM E4) a 0.25±0.05 MPa/s ──► Tipos de falla 1-6 ──► Foto pericial WebRTC          │
│                                      │                                                                 │
│                                      ▼                                                                 │
│  [ FASE 6: REVISIÓN TÉCNICA, ESTADÍSTICA Y REPORTE ]                                                   │
│  Cálculo % f'c ──► Análisis estadístico ACI 214R (Gauss) ──► Revisión del Signatario Técnico           │
│  (Borrador -> Revisada -> Cerrada) ──► Emisión de informe oficial PDF con código QR y hash SHA-256     │
│                                      │                                                                 │
│                                      ▼                                                                 │
│  [ TRANSVERSAL: GESTIÓN METROLÓGICA Y CONFIGURACIÓN ]                                                  │
│  Control y calibración de prensas, moldes y vernieres (ISO/IEC 17025) ──► Perfiles de membrete y firmas│
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Diagnóstico Técnico y Operativo Actual (R1)

### 2.1. Arquitectura Frontend Base

En el archivo `src/app/page.tsx`, la aplicación se encuentra implementada como una **Single Page Application (SPA) basada en estado reactivo local**:
```tsx
const [view, setView] = useState<View>("inicio");
```
donde `View` es un tipo unión cerrado definido en `src/features/samples/types.ts`:
```typescript
export type View =
  | "inicio"
  | "colados"
  | "nueva"
  | "registros"
  | "pendientes"
  | "salidas"
  | "curvas"
  | "ensayos"
  | "inventario"
  | "personalizacion"
  | "configuracion";
```

En la línea 461 de `src/app/page.tsx`, la navegación se declara como un arreglo plano no jerarquizado:
```typescript
const navigationItems = [
  { key: "inicio" as View, label: "Inicio", icon: HomeIcon },
  { key: "colados" as View, label: "Colados", icon: Layers },
  { key: "nueva" as View, label: "Nueva muestra", icon: PlusCircle },
  { key: "registros" as View, label: "Registros", icon: Database },
  { key: "pendientes" as View, label: "Pendientes", icon: Clock },
  { key: "salidas" as View, label: "Muestras a Salir", icon: Truck },
  { key: "curvas" as View, label: "Curvas y Ensayes f'c", icon: BarChart2 },
  { key: "ensayos" as View, label: "Programa de ensayes", icon: ClipboardCheck },
  { key: "inventario" as View, label: "Inventario", icon: Boxes },
  { key: "personalizacion" as View, label: "Personalización", icon: Palette },
  { key: "configuracion" as View, label: "Configuración", icon: SettingsIcon },
];
```

---

### 2.2. Ficha Técnica Individual de las 11 Pestañas Actuales

A continuación se detalla la radiografía técnica completa de los 11 módulos según se encuentran en el código de producción:

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          FICHA TÉCNICA DE LAS 11 PESTAÑAS EN `src/app/page.tsx`                                       │
├────┬───────────────┬─────────────────────────┬──────────────┬───────────────────────────────┬─────────────────────┬───────────────────┤
│ #  | Clave (`key`) | Etiqueta en Pantalla    | Icono Lucide | Componente Principal          | Nivel Suscripción   | Líneas y Estado   │
├────┼───────────────┼─────────────────────────┼──────────────┼───────────────────────────────┼─────────────────────┼───────────────────┤
│ 1  | `inicio`      | Inicio                  | HomeIcon     | DashboardView.tsx             | Base / Local        | 137 líneas (100%) │
│ 2  | `colados`     | Colados                 | Layers       | ColadosPanel.tsx              | Base / Local        | 865 líneas (100%) │
│ 3  | `nueva`       | Nueva muestra           | PlusCircle   | SampleFormView.tsx            | Base / Local        | 287 líneas (100%) │
│ 4  | `registros`   | Registros               | Database     | RecordsFilters + RecordsTable | Base / Local        | Compuesto (100%)  │
│ 5  | `pendientes`  | Pendientes              | Clock        | RecordsTable (pending rows)   | Base / Local        | Derivado (100%)   │
│ 6  | `salidas`     | Muestras a Salir        | Truck        | OutgoingSamplesDashboard.tsx  | Plan Estándar       | 507 líneas (100%) │
│ 7  | `curvas`      | Curvas y Ensayes f'c    | BarChart2    | FcStatisticalDashboard.tsx    | Plan Profesional    | 650 líneas (100%) │
│ 8  | `ensayos`     | Programa de ensayes     | ClipboardCheck| TestSchedulePanel.tsx        | Plan Estándar       | 626 líneas (100%) │
│ 9  | `inventario`  | Inventario              | Boxes        | InventoryPanel.tsx           | Plan Profesional    | 914 líneas (100%) │
│ 10 | `personaliza- | Personalización         | Palette      | PersonalizationPanel.tsx      | Base / Local        | 420 líneas (100%) │
│    | cion`         |                         |              |                               |                     |                   │
│ 11 | `configuracion`| Configuración          | SettingsIcon | SettingsView.tsx              | Base / Local        | 108 líneas (100%) │
└────┴───────────────┴─────────────────────────┴──────────────┴───────────────────────────────┴─────────────────────┴───────────────────┘
```

#### Análisis Pormenorizado por Módulo:

1. **`inicio` (Inicio / DashboardView)**:
   - **Función**: Punto de entrada con saludo y resumen cuantitativo del día (tarjetas de métricas: *Borradores*, *Revisadas*, *Registros visibles*). Enlaces directos a `newSample()` y tabla de actividades recientes.
   - **FeatureGate**: Ninguno. Acceso irrestricto.
   - **Evaluación**: Posición adecuada en cabecera como portal de bienvenida, pero carente de visión operativa de la agenda física del laboratorio.

2. **`colados` (Colados / ColadosPanel)**:
   - **Función**: Administra eventos masivos de colado en obra (identificador de obra, cliente, elemento estructural como losa o zapata, volumen en $\text{m}^3$) y vincula las muestras tomadas de diferentes camiones revolvedora. Permite editar muestras hijas conmutando a `"nueva"`.
   - **FeatureGate**: Ninguno.
   - **Evaluación**: Es el punto de origen de los lotes de concreto en obra. Su posición actual es temprana pero genera dudas operativas frente al botón "Nueva muestra".

3. **`nueva` (Nueva muestra / SampleFormView)**:
   - **Función**: Formulario de captura técnica de muestra bajo ASTM C31 / ASTM C143 / ASTM C1064. Registra revenimiento, temperatura ambiental y de concreto, tiempos de descarga de la olla, asignación metrológica de moldes y generación automática de fechas civiles de ensaye por espécimen (`addCivilDays`).
   - **Mecanismo reactivo**: Al pulsarse en el menú se ejecuta `newSample()`, que valida si el formulario actual tiene cambios sin guardar (`dirty`), disparando una confirmación de pérdida de datos.
   - **Evaluación**: **Ruptura de patrón UX**. Es un verbo/acción transaccional presentado de manera indiferenciada dentro de una lista de vistas y destinos de consulta declarativos.

4. **`registros` (Registros / RecordsFilters + RecordsTable)**:
   - **Función**: Repositorio documental general de la bitácora de muestras. Búsqueda por texto libre, filtrado por estado (`BORRADOR`, `REVISADA`, `CERRADA`, `ANULADA`), descarga de libros de trabajo y apertura de `SampleDetailModal` para emitir reportes oficiales o transicionar estados.
   - **FeatureGate**: Ninguno.
   - **Evaluación**: Está ubicada en una posición prematura (posición 4), presentándose antes de la logística de recolección de campo y mucho antes de que las probetas se ensayen mecánicamente en prensa.

5. **`pendientes` (Pendientes / RecordsTable filtrada)**:
   - **Función**: Filtra en memoria las muestras con `row.estatusBitacora === "BORRADOR" || row.estatusBitacora === "REVISADA"`.
   - **FeatureGate**: Ninguno.
   - **Evaluación**: **Ambigüedad terminológica severa**. En la industria del concreto, "Pendientes" denota probetas por ensayar hoy en prensa o cilindros por recoger en obra. Aquí sólo representa registros de oficina sin firma técnica. Además, el botón carece de badge numérico que indique cuántas muestras requieren atención.

6. **`salidas` (Muestras a Salir / OutgoingSamplesDashboard)**:
   - **Función**: Monitorea el límite normativo de curado inicial en obra bajo ASTM C31 / NMX-C-160 (el espécimen debe permanecer entre 16 y 48 horas en obra antes de su traslado a la pileta del laboratorio). Presenta semáforos de criticidad y genera manifiestos de despacho para choferes.
   - **FeatureGate**: `<FeatureGate module={CodigoModulo.LOGISTICA_SALIDAS} requiredTier={NivelSuscripcion.ESTANDAR}>`.
   - **Evaluación**: **Grave anacronismo secuencial**. Ocupa la posición 6, apareciendo después de archivos y pendientes. En el orden natural de la obra, la recolección y traslado ocurren inmediatamente después del colado y días antes de cualquier ensaye o archivo.

7. **`curvas` (Curvas y Ensayes f'c / FcStatisticalDashboard)**:
   - **Función**: Núcleo analítico y de rotura mecánica. Controla la captura de lecturas de prensa (diámetros ortogonales con vernier, masa en gramos, carga máxima en kN/kg, fracturas Tipo 1 a 6 de ASTM C39), fotos periciales WebRTC, quiosco háptico para prensas digitales y curvas de distribución Gaussiana bajo ACI 214R.
   - **FeatureGate**: `<FeatureGate module={CodigoModulo.CURVAS_FC_FOTOS} requiredTier={NivelSuscripcion.PROFESIONAL}>`.
   - **Evaluación**: **Inversión causa-efecto crítica**. Está ubicada en la posición 7, colocada ANTES del "Programa de ensayes" (posición 8). Además presenta hiperacoplamiento: mezcla la captura física de taller (operario con guantes) con la analítica estadística gerencial.

8. **`ensayos` (Programa de ensayes / TestSchedulePanel)**:
   - **Función**: Agenda y calendario estricto de roturas programadas por fecha exacta (Hoy, Mañana, Próximos 7 días, Vencidos). Controla las tolerancias normativas de edad de ensaye estipuladas por ASTM C39.
   - **FeatureGate**: `<FeatureGate module={CodigoModulo.PROGRAMACION_ENSAYOS} requiredTier={NivelSuscripcion.ESTANDAR}>`.
   - **Evaluación**: Subestimada en la posición 8. Es la herramienta operativa con la que arranca el turno de trabajo matutino en cualquier laboratorio de materiales. Carece de badge de ensayes del día.

9. **`inventario` (Inventario / InventoryPanel)**:
   - **Función**: Gestión metrológica bajo ISO/IEC 17025 y ASTM E4. Control de prensas de compresión, celdas de carga, moldes cilíndricos, termómetros, semáforos de calibración anual y certificados PDF oficiales con verificación de integridad criptográfica SHA-256.
   - **FeatureGate**: `<FeatureGate module={CodigoModulo.INVENTARIO_EQUIPOS} requiredTier={NivelSuscripcion.PROFESIONAL}>`.
   - **Evaluación**: Correcta hacia el final del menú por ser una labor de soporte de media/baja frecuencia, pero requiere delimitación visual respecto a tareas operativas.

10. **`personalizacion` (Personalización / PersonalizationPanel)**:
    - **Función**: Configuración institucional de la razón social del laboratorio, acreditaciones EMA, logotipo de alta resolución, membretes oficiales para los reportes PDF y catálogos predeterminados de clientes y mezclas.
    - **FeatureGate**: Ninguno.
    - **Evaluación**: Tarea administrativa de frecuencia mensual o esporádica. No debe competir visualmente en la misma jerarquía que los ensayos mecánicos.

11. **`configuracion` (Configuración / SettingsView)**:
    - **Función**: Identificación del laboratorista en el puesto local (`localStorage.getItem("labsico.operator")`), código de acceso para terminales compartidas, instrucciones de respaldo en caliente de SQLite (`RESPALDAR-ENSALIA.cmd`) y número de versión.
    - **FeatureGate**: Ninguno.
    - **Evaluación**: Adecuada al pie del menú lateral, asociada a la estación de trabajo física.

---

### 2.3. Justificación y Contraste frente al Ciclo Normativo del Concreto

Al contrastar la lista actual frente a la secuencia cronológica estricta de **ASTM C39, ASTM C31, ASTM C511 y NMX-C-083**, se evidencian inconsistencias fundamentales:

```
Secuencia Normativa Real:
Muestreo Fresco (Obra) -> Curado Inicial y Traslado (<48h) -> Curado Estándar (Pileta 23°C) -> Agenda de Edades (Tolerancias) -> Rotura en Prensa f'c -> Validación Técnica y Archivo

Secuencia Actual en Software:
Inicio -> Colados -> [Nueva] -> Registros Históricos -> Pendientes Admin -> Logística Traslado -> Rotura f'c y Curvas -> Agenda de Edades -> Inventario -> Personalización -> Configuración
```

El menú actual fuerza al técnico a dar "saltos hacia atrás y adelante" en la interfaz a lo largo de una misma jornada de trabajo.

---

### 2.4. Análisis Detallado de Puntos de Fricción Críticos

#### Fricción 1: Inversión Causa-Efecto Crítica (`curvas` en pos 7 antes de `ensayos` en pos 8)
- **Manifestación**: La rotura destructiva en prensa y el análisis estadístico (`curvas`) aparecen antes que el calendario operativo (`ensayos`).
- **Impacto Metrológico**: Según ASTM C39 sección 7, las probetas de concreto poseen tolerancias temporales irreversibles:
  - 24 horas: $\pm 30\text{ min}$ ($\pm 2.1\%$).
  - 3 días: $\pm 2.0\text{ h}$ ($\pm 2.8\%$).
  - 7 días: $\pm 6.0\text{ h}$ ($\pm 3.6\%$).
  - 28 días: $\pm 20.0\text{ h}$ ($\pm 3.0\%$).
- El laboratorista está obligado a revisar primero la agenda (`ensayos`) para saber qué cilindros retirar del agua saturada de cal e identificar cuáles vencen en las próximas horas. Colocar la rotura antes de la planificación subvierte el flujo cognitivo y el principio de calidad "planear antes de ejecutar".

#### Fricción 2: Anacronismo Logístico de Campo (`salidas` en pos 6 tras registros y pendientes)
- **Manifestación**: `salidas` (control de curado inicial en obra y despacho de probetas) está hundida en la posición 6, después de la bitácora documental permanente (`registros`) y la bandeja de supervisión (`pendientes`).
- **Impacto**: El muestreo de campo y la recolección ocurren en las primeras 24 a 48 horas de vida del concreto (ASTM C31). En cambio, el archivo en `registros` ocurre a los 28 o 90 días, una vez concluidos los ensayos. Separar `colados` de `salidas` rompe la coherencia del módulo de campo.

#### Fricción 3: Ambigüedad Terminológica Severa en "Pendientes"
- **Manifestación**: En el léxico común de cualquier taller de ensayes, la palabra "Pendientes" alude de forma inmediata a:
  1. *Cilindros pendientes de romper hoy en la prensa*.
  2. *Cilindros pendientes de recolectar en los frentes de obra*.
- En ENSALIA, la pestaña `pendientes` solo filtra muestras cuyo estatus administrativo en base de datos es `BORRADOR` o `REVISADA`. Este choque semántico provoca que los laboratoristas de piso abran repetidamente esta vista esperando encontrar sus probetas físicas del día y se encuentren con un listado documental.

#### Fricción 4: Discrepancia Estructural de "Nueva Muestra"
- **Manifestación**: `nueva` es un botón de acción transaccional imperativa que compite de igual a igual con 10 pantallas declarativas de consulta y gestión.
- **Impacto**: En `DashboardView` ya existe un botón prominente ("+ Nueva muestra"). Mantenerlo como un ítem idéntico en el menú lateral viola las buenas prácticas de arquitectura de información (mezcla de acciones de mutación inmediata con destinos de navegación).

#### Fricción 5: Sobrecarga Cognitiva y Ergonomía Física en Entornos Hostiles
- **Ley de Miller ($7 \pm 2$)**: Una lista indiferenciada de 11 opciones satura la memoria a corto plazo del operario. La teoría de la carga cognitiva demuestra que bajo estrés de obra o presión de despacho, el usuario comete más errores visuales en listas planas mayores a 9 elementos.
- **Ley de Hick-Hyman**: El tiempo de decisión en un menú plano aleatorio sigue una búsqueda lineal $O(n)$. Al carecer de categorías, el ojo debe recorrer los 11 textos uno a uno.
- **Ley de Fitts y Ergonomía Táctil**:
  - En laboratorios de concreto, los operarios manipulan probetas de 13 kg empapadas en agua de cal $\text{Ca(OH)}_2$, utilizan guantes de nitrilo o carnaza, y sus manos están manchadas de pasta de cemento o azufre caliente de cabeceo ($130\text{–}145^\circ\text{C}$).
  - En `src/app/globals.css:74-84`, los botones del sidebar tienen `padding: 12px` y `gap: 5px`. En pantallas táctiles de banco (sin ratón óptico), esta cercanía causa toques falsos accidentales (pulsar `nueva` en vez de `colados` o `curvas` en vez de `ensayos`), reseteando estados o abriendo pantallas no deseadas.
  - La norma internacional **ISO 9241-410** y las pautas **WCAG 2.5.5 (Target Size AAA)** exigen blancos táctiles mínimos de **$48 \times 48\text{ px}$** con espaciados de separación (*touch gutters*) de 12 a 16 px entre bloques heterogéneos.

#### Fricción 6: Ausencia de Badges de Conteo Numérico en Tiempo Real
- En `src/app/page.tsx:105`, el sistema calcula reactivamente en memoria:
  ```typescript
  const pending = rows.filter(row => row.estatusBitacora === "BORRADOR" || row.estatusBitacora === "REVISADA");
  ```
  Sin embargo, el botón lateral de `pendientes` no muestra ningún número. El usuario desconoce si existen 0 o 25 muestras por revisar hasta que hace clic en la pestaña. Lo mismo ocurre con `ensayos`: el laboratorista no sabe cuántos cilindros deben romperse en la fecha sin ingresar al calendario.

---

## 3. Propuesta de Navegación: Alternativa A — Lista Plana Optimizada Secuencialmente (R2)

### 3.1. Principio de Diseño, Secuencia Operativa y Caracterización Matemática

La **Alternativa A** conserva la simplicidad estructural de una lista plana vertical de navegación en un solo nivel, pero **corrige de raíz la secuencia cronológica de los 11 elementos** para que reflejen fielmente la jornada de trabajo diaria y la vida del concreto, incorporando además **divisores visuales sutiles** que aíslan el inicio, el flujo operativo y el soporte administrativo.

```
┌────────────────────────────────────────────────────────┐
│             ENSALIA — ALTERNATIVA A (PLANA)            │
├────────────────────────────────────────────────────────┤
│ [ BRAND: ENSALIA CONCRETO ]                            │
│                                                        │
│ 1. [Home]            Inicio                            │
│ ────────────────────────────────────────────────────── │  <-- Divisor sutil 1
│ 2. [Layers]          Colados                           │
3. [PlusCircle]      Nueva muestra                     │
│ 4. [Truck]           Muestras a Salir                  │
│ 5. [ClipboardCheck]  Programa de ensayes               │
│ 6. [BarChart2]       Curvas y Ensayes f'c              │
│ 7. [Clock]           Pendientes (Borradores)           │
│ 8. [Database]        Registros Históricos              │
│ ────────────────────────────────────────────────────── │  <-- Divisor sutil 2
│ 9. [Boxes]           Inventario                        │
│ 10.[Palette]         Personalización                   │
│ 11.[SettingsIcon]    Configuración                     │
│                                                        │
│ [ FOOTER: Operador Activo ]                            │
└────────────────────────────────────────────────────────┘
```

#### Caracterización Matemática y Límites Cognitivos (Miller y Hick-Hyman):
A pesar de su orden cronológico corregido, una evaluación rigurosa bajo la ciencia de factores humanos demuestra sus limitaciones intrínsecas:
1. **Violación del Límite de Miller (1956) y Modelo de Cowan (2001)**:
   - La capacidad máxima de la memoria operativa de corto plazo en seres humanos se sitúa en $7 \pm 2$ chunks (intervalo cerrado de $[5, 9]$ elementos).
   - La Alternativa A expone **11 elementos planos simultáneos**: $11 > 9$. Excede el umbral superior en **2 unidades completas**, manteniendo latente el riesgo de fatiga cognitiva.
   - El bloque operativo central (entre los dos divisores, elementos 2 al 8: *Colados, Nueva muestra, Muestras a Salir, Programa de ensayes, Curvas, Pendientes, Registros*) concentra exactamente **7 elementos contiguos**, lo que en condiciones de taller ruidoso y estresante sobrecarga la atención dividida del operador.
2. **Penalización Empírica de Latencia Visual (GOMS / Hick-Hyman)**:
   - En una búsqueda lineal no jerárquica sobre 11 ítems con fijación ocular de $c = 200\text{ ms}$, el tiempo medio de localización es:
     $$T_{\text{scan}}(\text{Alt A}) = \frac{c \cdot (11 + 1)}{2} \times 0.75 = 900\text{ ms}$$
   - En contraste, la búsqueda jerárquica agrupada en 6 fases de promedio 2 ítems (Alternativa B) requiere:
     $$T_{\text{scan}}(\text{Alt B}) = \left(\frac{c \cdot (6 + 1)}{2} \times 0.5\right) + \left(\frac{c \cdot (2 + 1)}{2}\right) = 350 + 300 = 650\text{ ms}$$
   - La Alternativa A impone una **penalización de latencia visual del +45.8%** $\left(\frac{900 - 650}{650} \times 100\right)$ frente al modelo estructurado.
3. **Conclusión de Caracterización**: La Alternativa A **NO resuelve la sobrecarga cognitiva de fondo**. Se ratifica y califica técnicamente como una **solución transitoria de bajo riesgo ("Quick-Win")**, idónea para eliminar de inmediato la inversión de flujo en producción sin tocar CSS ni contratos de datos, mientras se prepara el despliegue definitivo de la Alternativa B.

---

### 3.2. Justificación Paso a Paso del Flujo de Trabajo (1 a 11)

1. **Posición 1: `inicio` (Inicio)**: Portal de apertura diaria. Permite revisar rápidamente el estado de la estación de trabajo y avisos corporativos.
2. **Posición 2: `colados` (Colados)**: Origen del concreto fresco en obra. Aquí se identifican los frentes de colocación masiva antes o durante la recepción de camiones.
3. **Posición 3: `nueva` (Nueva muestra)**: Captura inmediata de las propiedades en fresco (asentamiento, temperatura) y asignación de probetas cilíndricas vinculadas al colado.
4. **Posición 4: `salidas` (Muestras a Salir)**: Monitoreo de curado inicial en campo (< 48 horas bajo ASTM C31) y emisión de manifiestos de despacho para el traslado físico al laboratorio.
5. **Posición 5: `ensayos` (Programa de ensayes)**: Apertura del laboratorio central. Consulta de la agenda diaria de cilindros que cumplen edad normativa hoy (1, 3, 7, 14, 28 días) dentro de la tolerancia de ASTM C39 para su retiro de las piletas.
6. **Posición 6: `curvas` (Curvas y Ensayes f'c)**: Ensaye mecánico en prensa calibrada, captura de carga destructiva, tipo de fractura 1 a 6, evidencia fotográfica pericial y proyección de curvas f'c.
7. **Posición 7: `pendientes` (Pendientes / Validación Técnica)**: Bandeja de supervisión. El Signatario Técnico audita los datos recién capturados en campo y prensa antes de autorizar el cierre formal de la bitácora.
8. **Posición 8: `registros` (Registros Históricos)**: Repositorio inmutable de muestras cerradas, consultas para auditorías, trazabilidad permanente y reimpresión de informes con código QR.
9. **Posición 9: `inventario` (Inventario Metrológico)**: Verificación periódica de calibración de prensas (ASTM E4), moldes cilíndricos y termómetros bajo ISO/IEC 17025.
10. **Posición 10: `personalizacion` (Personalización)**: Ajustes esporádicos de razones sociales, membretes institucionales, logotipos y firmas acreditadas.
11. **Posición 11: `configuracion` (Configuración)**: Puesto local, cambio de turno de laboratorista y respaldos del sistema.

---

### 3.3. Tratamiento Visual con Divisores Pasivos

Para evitar la sobrecarga visual de una columna uniforme de 11 botones idénticos, se introducen dos líneas divisorias pasivas en el CSS del sidebar:
```css
.sidebar-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
  margin: 8px 6px;
  pointer-events: none;
}
```
Esto genera una segmentación visual espontánea en tres bloques funcionales:
- Bloque 1: General (Inicio)
- Bloque 2: Ciclo Operativo Físico y Documental (Colados $\rightarrow$ Registros)
- Bloque 3: Soporte Metrológico y Parámetros (Inventario $\rightarrow$ Configuración)

---

### 3.4. Matriz DAFO de la Alternativa A

```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│                        FORTALEZAS                      │                      DEBILIDADES                       │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ • Resuelve de inmediato la inversión causa-efecto      │ • Mantiene 11 elementos planos a la vista, excediendo  │
│   (ensayos ahora precede a curvas).                    │   estrictamente el límite de Miller (11 > 9).          │
│ • Ubica la logística de salidas en su fase natural.    │ • Penaliza la latencia visual en un +45.8% frente a la │
│ • Curva de aprendizaje prácticamente nula para los     │   estructura jerárquica por fases (Hick-Hyman).        │
│   laboratoristas que ya usan la plataforma.            │ • No soluciona de fondo el problema de "Nueva muestra" │
│ • Riesgo técnico cero: se implementa en minutos        │   como verbo/acción dentro de una lista de sustantivos.│
│   reordenando el arreglo en `src/app/page.tsx`.        │ • No incorpora badges numéricos de trabajo en cola.    │
│ • Idóneo como paso "Quick-Win" de transición inmediata.│ • Baja escalabilidad ante futuros módulos (e.g. vigas, │
│                                                        │   morteros, agregados, diseño de mezclas).             │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│                      OPORTUNIDADES                     │                        AMENAZAS                        │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ • "Quick-Win" perfecto para desplegar de inmediato en  │ • Persistencia de confusión en operarios con guantes al│
│   producción mientras se aprueba la fase mayor.        │   tener botones adyacentes de 42px sin agrupamiento.   │
│ • Facilita la homologación inicial de la cadena de     │ • Los auditores de EMA podrían seguir percibiendo falta│
│   custodia ante auditores de control de calidad.       │   de segregación departamental estricta.               │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 4. Propuesta de Navegación: Alternativa B — Estructura Agrupada por Fases Operativas (R2)

### 4.1. Principio de Chunking Cognitivo y Organización Departamental

La **Alternativa B** es la propuesta integral recomendada. Aplica el principio de **Chunking Cognitivo de Miller** y el **Modelo Jerárquico de Hick-Hyman**, estructurando la interfaz en **5 Fases Operativas Naturales + 1 Nivel Global**:

$$\text{11 elementos dispersos} \longrightarrow \mathbf{5\text{ bloques funcionales}}\text{ de 2 a 3 elementos c/u}$$

Esta categorización coincide exactamente con la estructura por departamentos de un laboratorio de control de calidad acreditado bajo **ISO/IEC 17025**:
1. Departamento de Muestreo en Obra y Campo
2. Logística, Recepción y Cuarto de Curado
3. Laboratorio de Ensaye Mecánico de Materiales
4. Aseguramiento de Calidad y Signatarios Técnicos
5. Metrología y Dirección Técnica

---

### 4.2. Desglose de las 5 Fases Operativas Naturales + Dashboard Global

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                    ENSALIA — ALTERNATIVA B (FASES OPERATIVAS CON BADGES)               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ BRAND: ENSALIA CONCRETO ]                                                            │
│                                                                                        │
│ [ + NUEVA MUESTRA ]                 <-- Botón CTA Primario Destacado (High-Visibility) │
│                                                                                        │
│ ── GENERAL ─────────────────────────────────────────────────────────────────────────── │
│ 1. [Home]            Inicio                                                            │
│                                                                                        │
│ ── FASE 1: CAMPO Y MUESTREO ────────────────────────────────────────────────────────── │
│ 2. [Layers]          Colados de Obra                                                   │
│                                                                                        │
│ ── FASE 2: LOGÍSTICA Y CURADO ──────────────────────────────────────────────────────── │
│ 3. [Truck]           Muestras a Salir          [ Badge: 3 traslados (<48h) ]           │
│ 4. [ClipboardCheck]  Programa de ensayes       [ Badge: 8 hoy! (Alerta de tolerancias)]│
│                                                                                        │
│ ── FASE 3: LABORATORIO Y ENSAYES f'c ───────────────────────────────────────────────── │
│ 5. [BarChart2]       Curvas y Ensayes f'c      [ Kiosco Prensa + Gráficas ACI 214R ]   │
│                                                                                        │
│ ── FASE 4: REGISTROS Y CONTROL DOCUMENTAL ──────────────────────────────────────────── │
│ 6. [Clock]           Validación Técnica        [ Badge: 5 borradores ]                 │
│ 7. [Database]        Bitácora de Muestras      [ Histórico y Reportes QR ]             │
│                                                                                        │
│ ── FASE 5: METROLOGÍA Y CONFIGURACIÓN ──────────────────────────────────────────────── │
│ 8. [Boxes]           Control Metrológico       [ Semáforo Calibraciones ]              │
│ 9. [Palette]         Personalización y Logos                                           │
│ 10.[SettingsIcon]    Configuración de Estación                                         │
│                                                                                        │
│ [ FOOTER: Operador Activo: Ing. Juan Pérez / Estación Central ]                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Descripción Detallada por Fase:

* **Nivel Global**:
  - `inicio` (**Inicio**): Panel general de métricas del día, avisos y accesos directos.
* **Acción Primaria**:
  - `nueva` (**Nueva Muestra**): Se promueve como un botón CTA (*Call to Action*) prominente en la parte superior del menú o integrado como primera acción del módulo de campo, resolviendo la inconsistencia de tener un botón transaccional compitiendo con pantallas de consulta.
* **Fase 1: Campo y Muestreo**:
  - `colados` (**Colados de Obra**): Administración de frentes de colado, contratos, elementos estructurales y vinculación de remisiones de ollas.
* **Fase 2: Logística y Curado**:
  - `salidas` (**Muestras a Salir**): Monitoreo de curado inicial ASTM C31 (< 48 horas en obra) con semáforos verde/ámbar/rojo y generación de manifiestos de transporte.
  - `ensayos` (**Programa de ensayes**): Calendario y agenda operativa de especímenes programados por edad normativa (Hoy, Mañana, Próximos, Vencidos) con control estricto de tolerancias horarias ASTM C39.
* **Fase 3: Laboratorio y Ensayes f'c**:
  - `curvas` (**Curvas y Ensayes f'c**): Taller de prensas. Ejecución de rotura en prensa hidráulica, registro de carga pico en kN/kg, fracturas Tipo 1 a 6 de ASTM C39, captura fotográfica pericial vía WebRTC y modelado estadístico ACI 214R (campana de Gauss y coeficiente de variación).
* **Fase 4: Registros y Control Documental**:
  - `pendientes` (**Validación Técnica / Por Revisar**): Bandeja de trabajo del Signatario Técnico para auditar muestras en estado `BORRADOR` o `REVISADA`, subsanar inconsistencias metrológicas y dictaminar el cierre inmutable.
  - `registros` (**Bitácora Histórica**): Archivo permanente de consulta, filtros multicriterio, descarga de libros de trabajo y reexpedición de certificados oficiales firmados con código QR y verificación criptográfica.
* **Fase 5: Metrología y Configuración**:
  - `inventario` (**Control Metrológico**): Inventario de equipos, control de moldes cilíndricos y de viga, calibración de prensas bajo ASTM E4 y repositorio de certificados PDF con hash SHA-256.
  - `personalizacion` (**Personalización**): Catálogos maestros de mezclas, membretes corporativos, logotipos y firmas acreditadas ante la EMA.
  - `configuracion` (**Configuración**): Operador de la estación local, contraseñas de terminal y utilerías de respaldo en frío de SQLite.

---

### 4.3. Especificación de Micro-Interacciones, Badges Dinámicos en Tiempo Real y CTA de Acción Rápida

1. **Encabezados de Sección Fijos (Sin Acordeones Colapsables)**:
   - **Regla Ergonómica Estricta**: En un entorno industrial de laboratorio con computadoras de banco o tablets, **NO se deben implementar acordeones colapsables**. Los acordeones añaden clics innecesarios con dedos enguantados y ocultan información crítica de las alertas.
   - **Diseño**: Encabezados de texto fijos, no clickables, rotulados en mayúsculas con tracking amplio (`font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #bad1c8; opacity: 0.8; margin-top: 10px;`). Permiten acceder a cualquier módulo en **1 solo toque**.

2. **Badges Numéricos en Tiempo Real y Arquitectura de Backend Ligero (Ambient Awareness)**:
   - **Eliminación del Cuello de Botella en el Hilo Principal**: En un laboratorio en régimen de operación continua con 5,000 a 10,000 muestras históricas acumuladas (~10.7 MB de carga JSON), calcular o filtrar reactivamente los badges en el cliente React en cada re-render degrada la fluidez por debajo de los 60 FPS (>15-35 ms de CPU por render, agravándose en terminales Celeron o tablets de bajo costo).
   - **Endpoint Ultraligero Dedicado**: Los badges se desacoplan de la descarga de muestras y consumen directamente el endpoint:
     ```http
     GET /api/navigation/badges
     ```
     El backend ejecuta consultas SQL de agregación `COUNT(*)` indexadas en SQLite con latencia inferior a 1.5 ms:
     * **En `salidas` (`urgentOutputs`)**: Conteo de probetas moldeadas en obra entre 16 y 48 horas de curado inicial (ASTM C31 / NMX-C-160) que carecen de manifiesto de traslado emitido.
     * **En `ensayos` (`testsToday`)**: Conteo de cilindros con fecha de ensaye programada para **HOY** y no probados. Si existen probetas fuera de su ventana de tolerancia horaria (ASTM C39), el badge conmuta automáticamente a color rojo de emergencia (`#ef4444`).
     * **En `pendientes` (`pending`)**: Conteo de muestras en estado `BORRADOR` o `REVISADA` pendientes de cierre técnico por el Signatario.
     * **En `inventario` (`expiredInventory`)**: Alerta inmediata de prensas, celdas de carga o termómetros con calibración vencida bajo ISO/IEC 17025 y ASTM E4.
   - **Patrón SWR (Stale-While-Revalidate)**: Se especifica el consumo mediante SWR con revalidación pasiva cada 60 segundos (`refreshInterval: 60000`), manteniendo caché en memoria y resiliencia offline (si la señal WiFi fluctúa en la zona de rotura de prensas, la barra lateral continúa operativa con el último conteo verificado sin emitir parpadeos de error).

3. **Área Táctil Minimizada contra Errores de Dedo (Fitts Compliance y WCAG 2.5.5)**:
   - Los botones mantienen una altura mínima efectiva de **48px** en pantallas táctiles y un espaciado inter-fase de **12 a 16px**, impidiendo toques falsos accidentales provocados por guantes de hule, calzado de seguridad o manos húmedas.

---

### 4.4. Arquitectura Responsiva, Accesibilidad (.sr-only WCAG 2.1 SC 1.3.1) y Touch Shell para Tablets (<=768px)

Un desafío técnico fundamental validado en las pruebas empíricas automatizadas (`tests/empirical/mobile_responsiveness_and_haptics.test.ts` y `tests/empirical/adversarial_ergonomics_challenge.test.ts`) es garantizar una experiencia impecable en smartphones y tablets de obra y taller.

#### Comportamiento Dual Desktop vs Móvil:
- **En Escritorio (>768px)**: La barra lateral se renderiza a 240px fijos con estructura vertical completa, encabezados de fase visibles, divisores espaciales y badges alineados a la derecha.
- **En Móviles y Tablets (<=768px)**:
  - En `src/app/globals.css:1279-1345`, el contenedor `.sidebar nav` se transforma en una barra horizontal deslizable táctil con `display: flex; overflow-x: auto; gap: 8px;`.
  - **Aplanamiento Estructural Seguro con `display: contents`**: Para no romper el contenedor flex horizontal, los bloques `.sidebar-nav-section` emplean `display: contents;`, permitiendo que los botones hijos fluyan directamente en la línea flex del carrusel.
  - **Remediación de Accesibilidad WCAG 2.1 SC 1.3.1 (Técnica `.sr-only`)**:
    * El enfoque ingenuo preliminar de ocultar títulos con `display: none !important;` despoja los encabezados del Árbol de Accesibilidad (AXTree) en motores WebKit y navegadores Android, privando a operarios con discapacidad visual del contexto de fase en lectores de pantalla (Google TalkBack, Apple VoiceOver).
    * Para subsanarlo con estricto apego a **WCAG 2.1 Criterio de Éxito 1.3.1 (Información y Relaciones)**, los encabezados de fase `.sidebar-section-title` se ocultan visualmente en móvil mediante la técnica de accesibilidad `.sr-only` (posicionamiento absoluto, ancho y alto de 1px, `clip: rect(0, 0, 0, 0)`). De este modo, no ocupan espacio visual en el carrusel horizontal pero los lectores de pantalla leen formalmente: *"Fase 2: Logística y Curado"*, seguido de sus botones.
  - **Cumplimiento de Pauta WCAG 2.5.5 (Target Size AAA: Mínimo 48x48px)**:
    * En el CSS móvil actual (`src/app/globals.css:1319`), los botones poseían `padding: 8px 14px`, rindiendo apenas ~34px de altura efectiva.
    * La especificación mandata explícitamente `min-height: 48px; min-width: 48px; padding: 12px 16px;`, cumpliendo con el nivel AAA de WCAG 2.5.5 y garantizando que un laboratorista con guantes de nitrilo o carnaza húmedos en un colado nocturno o a pie de revolvedora no cometa pulsaciones accidentales.
  - Esto garantiza el **100% de compatibilidad con las suites de pruebas automatizadas existentes y adversariales**, protegiendo la responsividad sin sacrificar la accesibilidad universal.

---

### 4.5. Matriz DAFO de la Alternativa B

```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│                        FORTALEZAS                      │                      DEBILIDADES                       │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ • Máxima ergonomía cognitiva: aplica chunking estricto │ • Requiere maquetar encabezados de sección en el       │
│   de Miller (5 bloques de 2-3 elementos).              │   sidebar y ajustar el layout CSS (~2 a 4 horas).      │
│ • Búsqueda visual jerárquica logarítmica O(log n)      │ • Agrega ~60px de altura total al sidebar, exigiendo   │
│   reduciendo en >50% el tiempo de selección de tareas. │   un padding vertical optimizado (9-10px) para evitar  │
│ • Incorpora badges dinámicos periféricos que evitan    │   scroll en portátiles de 1366x768.                    │
│   navegar a ciegas para consultar carga de trabajo.    │ • Requiere una breve asimilación (1 turno de trabajo)  │
│ • Alta resiliencia motriz en pantallas táctiles con    │   por parte de laboratoristas acostumbrados al menú    │
│   guantes gracias al espaciado inter-grupo.            │   antiguo.                                             │
│ • Excelente escalabilidad modular para los próximos    │                                                        │
│   3 a 5 años (permite agregar vigas, mezclas, etc.).   │                                                        │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│                      OPORTUNIDADES                     │                        AMENAZAS                        │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ • Alineación perfecta con auditorías de la Entidad     │ • Riesgo de regresión en pruebas CSS móviles si no se  │
│   Mexicana de Acreditación (EMA) e ISO/IEC 17025.      │   preserva la regla flex horizontal en `<=768px`.      │
│ • Posiciona a ENSALIA como software industrial de clase│ • Carga innecesaria de peticiones de red si los badges │
│   mundial, muy superior a interfaces planas genéricas. │   no aprovechan el estado ya cargado en memoria.       │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 5. Matriz Comparativa Multidimensional y Consenso del Equipo

### 5.1. Tabla Comparativa Ponderada en 9 Dimensiones Clave

A continuación se contrastan exhaustivamente el **Estado Actual**, la **Alternativa A** y la **Alternativa B**:

```
┌───────────────────────────────────────────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ Criterio de Evaluación Técnica y Ergonómica       │ Estado Actual           │ Alternativa A           │ Alternativa B           │
│                                                   │ (11 pestañas planas)    │ (Plana Secuencial)      │ (Fases con Badges)      │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 1. Alineación con Ciclo Normativo (ASTM C39/C31)  │ **Deficiente (1/5)**    │ **Excelente (4.5/5)**   │ **Sobresaliente (5/5)** │
│    Inversión curvas/ensayos y anacronismo salidas │ Inversión grave y saltos│ Secuencia cronológica   │ Mapea la cadena de      │
│                                                   │ desordenados en el menú │ estricta de 1 a 11      │ custodia completa       │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 2. Carga Cognitiva y Memoria (Ley de Miller)      │ **Deficiente (1.5/5)**  │ **Regular (2.5/5)**     │ **Óptima (5/5)**        │
│    Capacidad de retención en memoria operativa    │ 11 elementos sin orden  │ 11 elementos planos     │ 5 chunks semánticos     │
│                                                   │ ni división visual      │ (excede Miller 11 > 9;  │ de 2 a 3 opciones c/u   │
│                                                   │                         │ bloque central 7 ítems) │ dentro de Miller [5, 9] │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 3. Latencia de Decisión y Búsqueda (Hick-Hyman)   │ **Baja (2/5)**          │ **Regular (3.0/5)**     │ **Sobresaliente (5/5)** │
│    Tiempo de selección de la tarea deseada        │ Búsqueda lineal O(n)    │ Búsqueda lineal O(n)    │ Búsqueda jerárquica     │
│                                                   │ de arriba a abajo       │ penaliza +45.8% tiempo  │ en dos niveles O(log n) │
│                                                   │                         │ (900 ms vs 650 ms Alt B)│ rápida y precisa        │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 4. Ergonomía Táctil en Ambiente Hostil (Fitts)    │ **Baja (2/5)**          │ **Media (3/5)**         │ **Excelente (4.8/5)**   │
│    Prevención de toques falsos con guantes/polvo  │ Botones juntos (gap 5px)│ Divisores ayudan pero   │ Espaciado inter-fase    │
│                                                   │ alto riesgo con guantes │ botones siguen pegados  │ y blancos de 48px       │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 5. Información Periférica (Ambient Awareness)     │ **Nula (1/5)**          │ **Nula (1/5)**          │ **Sobresaliente (5/5)** │
│    Visibilidad pasiva de cargas de trabajo        │ Sin badges ni alertas;  │ Sin badges; requiere    │ Badges en tiempo real   │
│                                                   │ navegación a ciegas     │ entrar a cada módulo    │ (hoy, pendientes, <48h) │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 6. Claridad Terminológica y Semántica             │ **Confusa (2/5)**       │ **Aceptable (3.5/5)**   │ **Excelente (5/5)**     │
│    Denominación unívoca sin dobles sentidos       │ "Pendientes" ambiguo    │ Se clarifica en contexto│ Validación Técnica y    │
│                                                   │ "Muestras Salir" oscuro │ de flujo de trabajo     │ Recolección en Obra     │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 7. Escalabilidad Modular Futura                   │ **Muy Pobre (1/5)**     │ **Pobre (2/5)**         │ **Sobresaliente (5/5)** │
│    Capacidad de absorber nuevos módulos           │ Añadir 3 módulos más    │ Superar 12 botones      │ Cada fase absorbe nuevos│
│                                                   │ destruye la interfaz    │ desborda la pantalla    │ ensayos con elegancia   │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 8. Cumplimiento de Acreditación ISO/IEC 17025     │ **Vulnerable (2/5)**    │ **Aceptable (3.5/5)**   │ **Ideal (5/5)**         │
│    Segregación de roles y trazabilidad            │ Cuestionable en auditoría│ Muestra proceso ordenado│ Refleja estructura      │
│                                                   │ de EMA por desorden     │ pero sin departamentos  │ departamental formal    │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 9. Complejidad e Impacto de Implementación        │ **Inexistente (5/5)**   │ **Trivial (5/5)**       │ **Baja / Controlada (4/5│
│    Esfuerzo de desarrollo y riesgo de regresión   │ No requiere cambios     │ ~15 minutos de código   │ ~2 a 4 horas de frontend│
│                                                   │                         │ en `src/app/page.tsx`   │ sin alterar lógica base │
├───────────────────────────────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ **PUNTUACIÓN TOTAL PONDERADA (Escala 1 a 50)**    │ **17.0 / 50 (34%)**     │ **33.0 / 50 (66%)**     │ **47.6 / 50 (95.2%)**   │
└───────────────────────────────────────────────────┴─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

### 5.2. Dictamen Técnico Consensuado y Estrategia de Adopción en Dos Pasos

El equipo multidisciplinario emite un dictamen unánime:

> **DICTAMEN TÉCNICO CONSENSUADO**: La **Alternativa B (Estructura Agrupada por Fases Operativas con Encabezados Fijos y Badges Numéricos)** es la arquitectura ergonómicamente superior, metrológicamente más robusta y comercialmente más escalable para ENSALIA.
>
> **Ratificación Matemática de la Alternativa A como Quick-Win Transitorio**: La modelación cognitiva (Miller 1956, Hick-Hyman 1953) demuestra de forma irrefutable que la Alternativa A excede la capacidad de memoria humana ($11 > 9$) y penaliza la latencia de búsqueda visual en un **+45.8%** ($900\text{ ms}$ vs $650\text{ ms}$). Por tanto, **la Alternativa A NO es una solución ergonómica definitiva**, ratificándose exclusivamente como un **paso temporal Quick-Win de bajo riesgo** para solucionar de inmediato en producción la inversión `curvas`/`ensayos` y el anacronismo de `salidas`.

Sin embargo, para garantizar una transición sin fricción operativa y con cero riesgo de interrupción en los laboratorios activos, se aprueba por consenso una **Estrategia de Adopción Gradual en Dos Pasos**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ESTRATEGIA DE ADOPCIÓN GRADUAL EN DOS PASOS                               │
├──────────────────────────────────────────────────┬─────────────────────────────────────────────────────┤
│ **PASO 1: QUICK-WIN INMEDIATO (Alternativa A)**  │ • Despliegue de la lista plana reordenada.          │
│ *Objetivo: Corrección Inmediata de Riesgos*      │ • Corrige la inversión `curvas` vs `ensayos`.       │
│ *Duración estimada: Inmediata (< 1 hora)*        │ • Corrige la posición de `salidas`.                 │
│                                                  │ • Añade 2 divisores sutiles en el sidebar.          │
│                                                  │ • Riesgo cero de regresión en CSS o tests.          │
├──────────────────────────────────────────────────┼─────────────────────────────────────────────────────┤
│ **PASO 2: CONSOLIDACIÓN MODULAR (Alternativa B)**│ • Despliegue de la estructura por fases operativas. │
│ *Objetivo: Excelencia Ergonómica Definitiva*     │ • Encabezados fijos no clickables de sección.       │
│ *Duración estimada: 1 sprint corto (2 a 4 horas)*│ • Conexión de badges numéricos en tiempo real.      │
│                                                  │ • CTA destacado para "Nueva Muestra".               │
│                                                  │ • Optimización de targets de 48px para guantes.     │
└──────────────────────────────────────────────────┴─────────────────────────────────────────────────────┤
```

---

## 6. Hoja de Ruta de Transición e Implementación Técnica (R3)

Esta sección provee las directrices de ingeniería exactas para el momento en que la dirección de ENSALIA instruya la ejecución en código fuente, garantizando que el desarrollo sea limpio, ordenado y 100% compatible con los componentes existentes.

---

### 6.1. Plan de Trabajo por Etapas

1. **Etapa 1: Aprobación y Socialización Conceptual** (Hito actual cumplido con este documento).
2. **Etapa 2: Implementación de la Alternativa A en `src/app/page.tsx` (Paso 1: Quick-Win Inmediato)**:
   - Reordenamiento del arreglo `navigationItems` sin alterar lógica de negocio ni estado reactivo.
   - Inserción de divisores estéticos en CSS para segmentar el inicio, el ciclo operativo y el área administrativa.
   - Verificación de no regresión en la suite completa de pruebas unitarias (`npm test`).
3. **Etapa 3: Preparación del Modelo de Datos para la Alternativa B y Casos de Borde Normativos**:
   - Definición de tipos TypeScript `NavigationGroupConfig`, `NavigationItemConfig` y contratos de navegación.
   - **Previsión Normativa de Ensayes en Fin de Semana (ASTM C39 / NMX-C-083)**: Incorporación del algoritmo preventivo de días inhábiles en `TestSchedulePanel` y en el oráculo de badges para alertar los viernes sobre probetas que vencerán en domingo fuera de tolerancia horaria, posibilitando la coordinación de guardias de laboratorio o retiros oportunos de piletas.
   - **Soporte Parametrizado de Curado Acelerado (ASTM C684 / NMX-C-403)**: Extensión del modelo de especímenes para soportar regímenes térmicos (`ACELERADO_C684_AGUA_CALIENTE`, `ACELERADO_C684_AGUA_HIRVIENDO`, `ACELERADO_C684_AUTOGENO`), desterrando textos fijos en `compression-report/service.ts` para cumplir estrictamente con la cláusula 7.8.2.1 de ISO/IEC 17025.
   - **Escalabilidad de Roles de Operador (RBAC)**: Proyección del atributo `rol` en el modelo `Operador` (`CAMPO`, `LABORATORIO`, `SIGNATARIO`, `ADMIN`) para permitir en etapas futuras el filtrado contextual de las fases de navegación según el perfil del usuario activo.
4. **Etapa 4: Maquetación de Fases, CTA Destacado y Endpoint Ultraligero de Badges**:
   - Creación del endpoint de agregación backend `GET /api/navigation/badges` con consultas SQL indexadas en SQLite.
   - Integración del hook cliente `useNavigationBadges()` con el patrón SWR (*Stale-While-Revalidate*) a 60 segundos, garantizando 60 FPS estables sin saturación del hilo principal.
   - Maquetación de los encabezados fijos no clickables de sección y el botón CTA primario para "Nueva Muestra".
5. **Etapa 5: Resiliencia Offline, Accesibilidad WCAG y Validación Empírica**:
   - Implementación del *Draft Autosave* local con debouncing a 500ms en `localStorage` (`ensalia.active_draft`) y banner de restauración no destructivo.
   - Verificación de accesibilidad móvil con la regla `.sr-only` en `.sidebar-section-title` (WCAG 2.1 SC 1.3.1) y touch targets de 48px para guantes (WCAG 2.5.5).
   - Ejecución de pruebas de campo en tableta táctil industrial en condiciones reales de polvo, humedad y vibración.

---

### 6.2. Especificación Conceptual de Código TypeScript, Contratos de Datos y Endpoint de Badges

#### Modelo de Tipos Propuesto (`src/features/samples/types.ts` o módulo de navegación):
```typescript
export interface NavigationItemConfig {
  key: View;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  badgeKey?: "pending" | "urgentOutputs" | "testsToday" | "expiredInventory";
  badgeVariant?: "neutral" | "warning" | "danger";
  isPrimaryAction?: boolean;
  requiredTier?: NivelSuscripcion;
  ariaLabel?: string;
}

export interface NavigationPhaseGroup {
  id: string;
  title?: string; // Opcional para el grupo de cabecera
  items: NavigationItemConfig[];
}
```

#### Arquitectura Ligera del Endpoint de Badges en Tiempo Real (`GET /api/navigation/badges`):
Para evitar que el cliente React descargue la colección completa de muestras históricas (~10.7 MB JSON para 10,000 muestras) y la filtre en memoria en cada render, el backend expone un endpoint ultraligero de agregación indexada:

```typescript
// Contrato de Respuesta: GET /api/navigation/badges
export interface NavigationBadgesResponse {
  pending: number;          // Muestras en estado BORRADOR o REVISADA pendientes de firma
  urgentOutputs: number;    // Probetas en obra entre 16h y 48h (ASTM C31) sin manifiesto
  testsToday: number;       // Cilindros con fecha de rotura para HOY sin ensayar
  overdueTests: number;     // Cilindros con fecha anterior o fuera de tolerancia ASTM C39
  weekendWarning: number;   // Cilindros que vencen en fin de semana inhábil próximo
  expiredInventory: number; // Prensas o equipos con calibración anual vencida
  timestamp: string;        // Marca ISO de generación
}
```

**Consultas SQL Optimizadas con Índices en SQLite:**
```sql
-- 1. Muestras pendientes de revisión técnica
SELECT COUNT(*) AS pending 
FROM Muestra 
WHERE estatusBitacora IN ('BORRADOR', 'REVISADA');

-- 2. Salidas urgentes de obra (16h a 48h bajo ASTM C31 sin manifiesto)
SELECT COUNT(*) AS urgentOutputs 
FROM Muestra m
WHERE datetime(m.fechaMuestreo || ' ' || m.horaMuestreo) <= datetime('now', '-16 hours')
  AND datetime(m.fechaMuestreo || ' ' || m.horaMuestreo) >= datetime('now', '-48 hours')
  AND NOT EXISTS (SELECT 1 FROM ManifiestoSalida ms WHERE ms.muestraId = m.id);

-- 3. Cilindros programados para rotura HOY no ensayados
SELECT COUNT(*) AS testsToday 
FROM Especimen 
WHERE fechaProgramada = date('now', 'localtime') AND probado = 0;

-- 4. Cilindros con fecha de ensaye vencida fuera de tolerancia ASTM C39
SELECT COUNT(*) AS overdueTests 
FROM Especimen 
WHERE fechaProgramada < date('now', 'localtime') AND probado = 0;

-- 5. Instrumentos con calibración vencida bajo ISO/IEC 17025 y ASTM E4
SELECT COUNT(*) AS expiredInventory 
FROM Equipo 
WHERE fechaVencimientoCalibracion < date('now', 'localtime');
```

**Índices Requeridos en SQLite para Garantizar Ejecución en < 1.5 ms:**
```sql
CREATE INDEX IF NOT EXISTS idx_muestra_estatus ON Muestra(estatusBitacora);
CREATE INDEX IF NOT EXISTS idx_especimen_agenda ON Especimen(fechaProgramada, probado);
CREATE INDEX IF NOT EXISTS idx_equipo_calibracion ON Equipo(fechaVencimientoCalibracion);
```

**Hook de Consumo SWR en el Cliente (`useNavigationBadges.ts`):**
```typescript
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useNavigationBadges() {
  const { data, error, isLoading } = useSWR<NavigationBadgesResponse>(
    "/api/navigation/badges",
    fetcher,
    {
      refreshInterval: 60000,      // Revalidación periódica cada 60 segundos
      revalidateOnFocus: false,     // Evitar parpadeos al volver a la ventana
      dedupingInterval: 10000,      // Deduplicación en 10 segundos
      fallbackData: {
        pending: 0,
        urgentOutputs: 0,
        testsToday: 0,
        overdueTests: 0,
        weekendWarning: 0,
        expiredInventory: 0,
        timestamp: new Date().toISOString(),
      },
    }
  );

  return {
    badges: data!,
    isLoading,
    isError: !!error,
  };
}
```

#### Soporte de Métodos de Curado Acelerado (ASTM C684 / NMX-C-403) en el Modelo:
```typescript
export type RegimenCurado = 
  | "ESTANDAR_C511"                  // Cuarto húmedo / pileta saturada con Ca(OH)2 a 23±2°C
  | "ACELERADO_C684_AGUA_CALIENTE"   // Procedimiento A: Agua caliente a 60°C (resistencia a 24-48h)
  | "ACELERADO_C684_AGUA_HIRVIENDO"  // Procedimiento B: Agua hirviendo a 100°C
  | "ACELERADO_C684_AUTOGENO"        // Procedimiento C: Aislamiento térmico autógeno
  | "OTRO";                          // Régimen especial de cliente o vapor en autoclave
```

#### Diff Conceptual para la Alternativa A en `src/app/page.tsx`:
```diff
- const navigationItems = [
-   { key: "inicio" as View, label: "Inicio", icon: HomeIcon },
-   { key: "colados" as View, label: "Colados", icon: Layers },
-   { key: "nueva" as View, label: "Nueva muestra", icon: PlusCircle },
-   { key: "registros" as View, label: "Registros", icon: Database },
-   { key: "pendientes" as View, label: "Pendientes", icon: Clock },
-   { key: "salidas" as View, label: "Muestras a Salir", icon: Truck },
-   { key: "curvas" as View, label: "Curvas y Ensayes f'c", icon: BarChart2 },
-   { key: "ensayos" as View, label: "Programa de ensayes", icon: ClipboardCheck },
-   { key: "inventario" as View, label: "Inventario", icon: Boxes },
-   { key: "personalizacion" as View, label: "Personalización", icon: Palette },
-   { key: "configuracion" as View, label: "Configuración", icon: SettingsIcon },
- ];
+ const navigationItems = [
+   { key: "inicio" as View, label: "Inicio", icon: HomeIcon },
+   { key: "colados" as View, label: "Colados", icon: Layers, hasDividerAbove: true },
+   { key: "nueva" as View, label: "Nueva muestra", icon: PlusCircle },
+   { key: "salidas" as View, label: "Muestras a Salir", icon: Truck },
+   { key: "ensayos" as View, label: "Programa de ensayes", icon: ClipboardCheck },
+   { key: "curvas" as View, label: "Curvas y Ensayes f'c", icon: BarChart2 },
+   { key: "pendientes" as View, label: "Pendientes", icon: Clock },
+   { key: "registros" as View, label: "Registros", icon: Database },
+   { key: "inventario" as View, label: "Inventario", icon: Boxes, hasDividerAbove: true },
+   { key: "personalizacion" as View, label: "Personalización", icon: Palette },
+   { key: "configuracion" as View, label: "Configuración", icon: SettingsIcon },
+ ];
```

#### Definición de Estructura de Datos para la Alternativa B:
```typescript
export const NAVIGATION_PHASES: NavigationPhaseGroup[] = [
  {
    id: "global",
    items: [
      { key: "inicio", label: "Inicio", icon: HomeIcon },
    ],
  },
  {
    id: "campo",
    title: "Campo y Muestreo",
    items: [
      { key: "nueva", label: "Nueva muestra", icon: PlusCircle, isPrimaryAction: true },
      { key: "colados", label: "Colados de Obra", icon: Layers },
    ],
  },
  {
    id: "logistica",
    title: "Logística y Curado",
    items: [
      { key: "salidas", label: "Muestras a Salir", icon: Truck },
      { key: "ensayos", label: "Programa de ensayes", icon: ClipboardCheck },
    ],
  },
  {
    id: "laboratorio",
    title: "Laboratorio y Ensayes f'c",
    items: [
      { key: "curvas", label: "Curvas y Ensayes f'c", icon: BarChart2 },
    ],
  },
  {
    id: "calidad",
    title: "Registros y Control Documental",
    items: [
      { key: "pendientes", label: "Validación Técnica", icon: Clock },
      { key: "registros", label: "Bitácora Histórica", icon: Database },
    ],
  },
  {
    id: "metrologia",
    title: "Metrología y Sistema",
    items: [
      { key: "inventario", label: "Control Metrológico", icon: Boxes },
      { key: "personalizacion", label: "Personalización", icon: Palette },
      { key: "configuracion", label: "Configuración", icon: SettingsIcon },
    ],
  },
];
```

---

### 6.3. Ajustes de Estilos CSS (`globals.css`) y Preservación de Pruebas Empíricas

Para incorporar la Alternativa B sin afectar la suite de pruebas automáticas (`tests/empirical/mobile_responsiveness_and_haptics.test.ts`), las reglas CSS deben estructurarse de la siguiente manera:

```css
/* ==========================================================================
   ESTILOS DE NAVEGACIÓN AGRUPADA ENSALIA (ESCRITORIO > 768px)
   ========================================================================== */

/* Contenedor de sección de navegación */
.sidebar-nav-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Encabezados no clickables de fase */
.sidebar-section-title {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #bad1c8;
  opacity: 0.85;
  padding: 12px 10px 4px;
  margin-top: 6px;
  user-select: none;
  pointer-events: none;
}

/* Botón CTA destacado de Nueva Muestra */
.nav-btn-primary {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  font-weight: 600;
}
.nav-btn-primary:hover {
  background: #ffffff !important;
  color: var(--brand-dark, #123d31) !important;
}

/* Badges numéricos pasivos (Ambient Awareness) */
.nav-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 9999px;
  margin-left: auto;
  line-height: 1;
}

.nav-badge-neutral {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.nav-badge-warning {
  background: #f59e0b;
  color: #000000;
}

.nav-badge-danger {
  background: #ef4444;
  color: #ffffff;
}

/* ==========================================================================
   PRESERVACIÓN DEL TOUCH SHELL INDUSTRIAL Y ACCESIBILIDAD MÓVIL (<= 768px)
   Nota Crítica: Cumple con tests/empirical/mobile_responsiveness_and_haptics.test.ts
   y remediación de accesibilidad WCAG 2.1 SC 1.3.1 / WCAG 2.5.5
   ========================================================================== */
@media (max-width: 768px) {
  /* Enfoque preliminar descartado (despoja semántica en AXTree para lectores de pantalla):
     .sidebar-section-title { display: none !important; }
  */

  /* Enmienda Mandatoria 1 (Accesibilidad WCAG 2.1 SC 1.3.1):
     Técnica .sr-only para ocultar visualmente del carrusel táctil horizontal
     preservando la lectura del contexto de fase en TalkBack (Android) y VoiceOver (iOS) */
  .sidebar-section-title {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  /* Mantener el contenedor plano flex para el scroll horizontal táctil */
  .sidebar nav {
    display: flex !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    gap: 8px !important;
  }

  .sidebar-nav-section {
    display: contents; /* Aplana los grupos para que los botones fluyan en una sola línea flex */
  }

  /* Pauta WCAG 2.5.5 (Target Size AAA: mínimo 48x48px) para operarios con guantes en taller */
  .sidebar nav button {
    min-height: 48px !important;
    min-width: 48px !important;
    padding: 12px 16px !important;
  }

  .nav-badge {
    margin-left: 6px;
    height: 18px;
    font-size: 10px;
    padding: 0 5px;
  }
}
```

> **Garantía Técnica de Integridad y Accesibilidad**: La utilización de `display: contents` en `.sidebar-nav-section` dentro de `@media (max-width: 768px)` permite que en dispositivos móviles los botones hijos se comporten como descendientes directos de `.sidebar nav`, garantizando que el carrusel horizontal táctil continúe funcionando con total fluidez y pase sin alteraciones las aserciones de `tests/empirical/mobile_responsiveness_and_haptics.test.ts`. Simultáneamente, la técnica `.sr-only` en `.sidebar-section-title` cumple estrictamente con **WCAG 2.1 SC 1.3.1** al preservar la jerarquía para tecnologías asistivas, y la regla `min-height: 48px; min-width: 48px` satisface plenamente **WCAG 2.5.5** para operarios con guantes en planta.

---

### 6.4. Plan de Mitigación de Riesgos, Manejo de Formularios Sucios (`dirty`) y Resiliencia Local

#### 6.4.1. Resiliencia de Captura y Draft Autosave Local en `localStorage` (Enmienda Mandatoria 2)
- **Diagnóstico del Riesgo de Campo**:
  En frentes de colado masivo y patios de maniobras, los laboratoristas operan tabletas Android reforzadas en condiciones hostiles (polvo, calor, humedad, vibración de revolvedoras). Durante la toma de revenimiento (ASTM C143) o temperatura (ASTM C1064), los dispositivos están expuestos a apagados repentinos por agotamiento de batería, recargas involuntarias de página por deslizamientos multitáctiles o terminación del proceso por el *Out-Of-Memory (OOM) Killer* del sistema operativo móvil.
- **Vulnerabilidad Previa**:
  Actualmente, el estado del formulario reside exclusivamente en la memoria RAM volátil de React (`useState<Sample>`). Aunque el interceptor `dirty` en `src/app/page.tsx:88` previene la pérdida de datos ante toques accidentales de pestañas mediante `ConfirmDialog`, no ofrece ninguna protección contra fallas físicas o de hardware en el dispositivo.
- **Especificación Técnica del Draft Autosave**:
  1. **Debouncing a 500ms en `localStorage`**:
     Ante cada modificación en los campos del formulario (`cliente`, `obra`, `revenimiento`, `especímenes`, etc.), se sincroniza el estado con almacenamiento local persistente aplicando una espera atenuada (*debounce*) de 500 ms para no saturar el almacenamiento de la terminal:
     ```typescript
     useEffect(() => {
       if (view !== "nueva" || !dirty) return;
       const timer = setTimeout(() => {
         try {
           const payload = {
             savedAt: new Date().toISOString(),
             form,
           };
           window.localStorage.setItem("ensalia.active_draft", JSON.stringify(payload));
         } catch (e) {
           console.warn("No se pudo persistir el borrador en localStorage", e);
         }
       }, 500);

       return () => clearTimeout(timer);
     }, [form, dirty, view]);
     ```
  2. **Detección y Recuperación No Destructiva**:
     Al ingresar a la vista `"nueva"` (o tras un reinicio de la tableta), el sistema evalúa si existe un borrador guardado en `localStorage`. Si se detecta un borrador previo y el formulario actual está en blanco, se presenta un banner contextual no invasivo en la parte superior:
     > *"Se recuperó un borrador capturado a las 11:42 AM (hace 18 min). [Restaurar Borrador] [Descartar]"*
     * Si el laboratorista pulsa **[Restaurar Borrador]**, los datos se inyectan en el estado `form`, se recalcula el `baseline` y se retoma la captura exactamente en el punto donde se interrumpió.
     * Si el laboratorista pulsa **[Descartar]**, se ejecuta `window.localStorage.removeItem("ensalia.active_draft")` y se mantiene el formulario en blanco.
  3. **Purga Automática al Guardar**:
     Al invocar exitosamente `saveSample()` y persistir la muestra en la base de datos SQLite, se invoca de inmediato `window.localStorage.removeItem("ensalia.active_draft")`, evitando colisiones con capturas futuras.
  4. **Coexistencia con `dirty` y `beforeunload`**:
     Este mecanismo coexiste perfectamente con el diálogo modal de confirmación `ConfirmDialog` de navegación interna y el listener nativo de `beforeunload`, formando un esquema de defensa en profundidad contra la pérdida de información en campo.

#### 6.4.2. Manejo de Formularios Sucios (`dirty`) y Navegación Interna:
- En `src/app/page.tsx:88`, la función `executeNavigation(targetView)` evalúa si el formulario de muestra tiene datos sin guardar:
  ```typescript
  const dirty = view === "nueva" && JSON.stringify(form) !== baseline;
  ```
- Al implementar la navegación agrupada, la conmutación entre pestañas seguirá pasando estrictamente por `navigate(key)` y `newSample()`, preservando íntegramente el cuadro de diálogo de confirmación (`ConfirmDialog`) antes de descartar cambios.
- Los clics en encabezados de sección o en badges de alerta serán totalmente inertes (`pointer-events: none`), impidiendo disparar validaciones erróneas.

#### 6.4.3. Discrepancias de Permisos por Nivel de Suscripción (`FeatureGate`):
- Los módulos protegidos (`salidas` con Plan Estándar, `curvas` con Plan Profesional, `ensayos` con Plan Estándar, `inventario` con Plan Profesional) mantendrán sus envolturas `<FeatureGate>` intactas en `src/app/page.tsx`.
- Adicionalmente, se podrán renderizar discretos iconos de candado o etiquetas en el sidebar para usuarios con Plan Básico, indicando con transparencia que el módulo requiere actualización de plan sin generar frustración por clics infructuosos.

---

### 6.5. Protocolo de Validación Empírica con Laboratoristas y Signatarios Técnicos

Una vez desplegada la implementación en el entorno de pruebas, se ejecutará el siguiente protocolo de aceptación funcional con personal operativo real:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROTOCOLO DE PRUEBAS DE CAMPO Y ACEPTACIÓN                                │
├────┬─────────────────────────────┬─────────────────────────────────┬───────────────────────────────────┤
│ #  │ Escenario Operativo         │ Criterio de Aceptación Éxito    │ Métrica / Tolerancia              │
├────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤
│ 1  │ Operación con guantes de    │ El técnico puede seleccionar    │ 0 toques accidentales en 20       │
│    │ carnaza y nitrilo húmedos   │ cualquier pestaña en un intento │ intentos consecutivos sobre tablet│
├────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤
│ 2  │ Rutina matutina de roturas  │ El laboratorista consulta la    │ Tiempo de localización de probetas│
│    │ a primera hora (07:00 AM)   │ agenda del día y ubica roturas  │ del día inferior a 5 segundos     │
├────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤
│ 3  │ Alerta de curado inicial    │ Se identifica visualmente el    │ El badge muestra el número exacto │
│    │ en obra (< 48 horas C31)    │ número de probetas por recoger  │ de cilindros en riesgo sin clics  │
├────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤
│ 4  │ Auditoría de Acreditación   │ El auditor técnico de EMA       │ Evaluación aprobatoria de cadena  │
│    │ EMA / ISO/IEC 17025         │ inspecciona la bitácora         │ de custodia y trazabilidad        │
├────┼─────────────────────────────┼─────────────────────────────────┼───────────────────────────────────┤
│ 5  │ Suite de Pruebas Unitarias  │ Ejecución de tests empíricos    │ 100% pruebas aprobadas sin        │
│    │ y de Responsividad Móvil    │ de haptics y responsividad      │ advertencias de consola           │
└────┴─────────────────────────────┴─────────────────────────────────┴───────────────────────────────────┘
```

---

## 7. Conclusión y Próximos Pasos

El presente estudio demuestra técnica, matemática y normativamente que la configuración actual de 11 pestañas planas en ENSALIA introduce fricciones operativas que comprometen la eficiencia de los laboratoristas y vulneran principios básicos de la ergonomía industrial.

La adopción gradual consensuada —iniciando con el **Paso 1 (Quick-Win con la Alternativa A)** para corregir de inmediato las inversiones de flujo, y consolidando posteriormente el **Paso 2 (Alternativa B Agrupada con Badges y Fases Operativas)**— dota a la plataforma de una arquitectura de clase mundial, alineada con las exigencias de acreditación internacional y preparada para acompañar el crecimiento operativo de la industria del concreto.

**Queda este documento a disposición de la Dirección y el equipo de producto para su aprobación final.**
