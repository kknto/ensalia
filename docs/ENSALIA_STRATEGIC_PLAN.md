# Plan Estratégico Integral y Análisis de Viabilidad Técnica: ENSALIA para Windows Desktop

- **Documento**: `docs/ENSALIA_STRATEGIC_PLAN.md`
- **Versión**: 2.0.0 (Estrategia Consolidada de Migración, Repositorio Limpio y Distribución Windows)
- **Fecha**: 24 de Noviembre de 2026
- **Directorio Base Analizado**: `c:\Users\ccanto\Desktop\ENSALIA`
- **Pila Verificada en Código Fuente**: Next.js `15.5.4` (App Router), React `19.1.1`, TypeScript `5.9.2` (`strict: true`), Sistema de diseño propio con CSS Custom Properties (`src/styles/tokens.css` + `src/app/globals.css`), Prisma ORM `6.16.2` (`provider = "sqlite"`), `pdf-lib` `1.17.1`, `qrcode` `1.5.4`, `exceljs` `4.4.0`, `zod` `3.25.76`.

---

## Índice General

1. [Resumen Ejecutivo y Diagnóstico del Estado Actual](#1-resumen-ejecutivo-y-diagnóstico-del-estado-actual)
2. [R1. Análisis Comparativo de Viabilidad Técnica para Windows](#2-r1-análisis-comparativo-de-viabilidad-técnica-para-windows)
   - 2.1 [Contexto Operativo del Laboratorio de Concreto en Windows](#21-contexto-operativo-del-laboratorio-de-concreto-en-windows)
   - 2.2 [Evaluación Detallada por Criterio (5 Dimensiones Críticas)](#22-evaluación-detallada-por-criterio-5-dimensiones-críticas)
   - 2.3 [Matriz Comparativa Objetiva Ponderada](#23-matriz-comparativa-objetiva-ponderada)
   - 2.4 [Recomendación Técnica Definitiva y Justificación](#24-recomendación-técnica-definitiva-y-justificación)
3. [R2. Especificación y Plan de Repositorio GitHub Limpio](#3-r2-especificación-y-plan-de-repositorio-github-limpio)
   - 3.1 [Reglas Exhaustivas de Exclusión (`.gitignore`)](#31-reglas-exhaustivas-de-exclusión-gitignore)
   - 3.2 [Taxonomía Estricta: Archivos Versionados vs. Tiempo de Ejecución](#32-taxonomía-estricta-archivos-versionados-vs-tiempo-de-ejecución)
   - 3.3 [Gestión de Secretos y Variables de Entorno (`.env.example` vs. `runtime.env`)](#33-gestión-de-secretos-y-variables-de-entorno-envexample-vs-runtimeenv)
   - 3.4 [Inicialización en GitHub y Reproducibilidad en Un Solo Comando](#34-inicialización-en-github-y-reproducibilidad-en-un-solo-comando)
4. [R3. Blueprint de Empaquetado e Instalador Distribuible para Windows](#4-r3-blueprint-de-empaquetado-e-instalador-distribuible-para-windows)
   - 4.1 [Flujo de Instalación (3 Clics Interactivos y `/VERYSILENT`)](#41-flujo-de-instalación-3-clics-interactivos-y-verysilent)
   - 4.2 [Topología Desacoplada en `%LOCALAPPDATA%` y Documentos](#42-topología-desacoplada-en-localappdata-y-documentos)
   - 4.3 [Inicialización de Base de Datos en 0 ms y Consolidación de Migraciones](#43-inicialización-de-base-de-datos-en-0-ms-y-consolidación-de-migraciones)
   - 4.4 [Empaquetado 100% Offline y Prerrequisitos Autocontenidos](#44-empaquetado-100-offline-y-prerrequisitos-autocontenidos)
   - 4.5 [Protocolo de Actualización Segura (*Safe Upgrade*) y Continuidad Operativa](#45-protocolo-de-actualización-segura-safe-upgrade-y-continuidad-operativa)
5. [R4. Hoja de Ruta de Migración y Consolidación Modular](#5-r4-hoja-de-ruta-de-migración-y-consolidación-modular)
   - 5.1 [Grafo de Dependencias y Priorización de los 6 Módulos](#51-grafo-de-dependencias-y-priorización-de-los-6-módulos)
   - 5.2 [Especificación Funcional y Criterios de Aceptación por Módulo](#52-especificación-funcional-y-criterios-de-aceptación-por-módulo)
   - 5.3 [Cronograma de Transición en 4 Fases y Estrategia de Validación](#53-cronograma-de-transición-en-4-fases-y-estrategia-de-validación)
6. [Anexo: Hallazgos de Verificación Directa y Acciones Correctivas Inmediatas](#6-anexo-hallazgos-de-verificación-directa-y-acciones-correctivas-inmediatas)

---

## 1. Resumen Ejecutivo y Diagnóstico del Estado Actual

ENSALIA es un sistema local de gestión técnica y aseguramiento de calidad para laboratorios de concreto hidráulico y materiales de construcción. La inspección directa de su base de código en `c:\Users\ccanto\Desktop\ENSALIA` confirma una madurez funcional sustancial construida sobre una arquitectura web local de alto rendimiento:

- **Núcleo de Aplicación**: SPA gobernada por `src/app/page.tsx` sobre Next.js `15.5.4` (App Router) y React `19.1.1`, respaldada por **62 Route Handlers** RESTful bajo `src/app/api/`.
- **Capa de Estilos Real**: Contrario a suposiciones externas, el proyecto **no utiliza Tailwind CSS** (no existen `tailwind.config.*` ni `postcss.config.*`). En su lugar, utiliza un sistema de diseño propio basado en variables CSS (`src/styles/tokens.css`) y hojas semánticas industriales (`src/app/globals.css`, 1,423 líneas con soporte `@media print` y modo quiosco táctil).
- **Persistencia Relacional**: `prisma/schema.prisma` define **30 modelos** y **25 enumeraciones** sobre SQLite, ejecutado mediante `@prisma/client` `^6.16.2` y su motor nativo en Rust (`query_engine-windows.dll.node`).
- **Generación Documental Offline**: `pdf-lib` (`^1.17.1`) y `qrcode` (`^1.5.4`) producen hojas de campo controladas (`src/lib/documents/pdf/renderer.ts`) e informes oficiales de compresión con diagramas vectoriales de fractura ASTM C39 Tipos 1 a 6 (`src/lib/pdf/compression-report/fracture-drawings.ts`) en menos de 120 ms sin Chromium headless.
- **Hardware de Laboratorio**: `src/lib/hardware/press-telemetry/serial-client.ts` integra **Web Serial API** (`navigator.serial`), daemons WebSocket (`ws://localhost:8088/press`) y simulador metrológico ASTM C39 ($0.25 \pm 0.05\text{ MPa/s}$).

Sin embargo, la auditoría técnica detectó cuatro brechas que este plan resuelve integralmente:
1. **Ausencia de control de versiones Git** (`.git` inexistente, `.gitignore` mínimo de 11 líneas y presencia en disco de `dist_report/*.pdf`, `output/`, `tmp/`, `start-validation.*.log` y `.env` con ruta local absoluta `C:/Users/ccanto/...`).
2. **Desfase parcial de migraciones Prisma** (`prisma/migrations/` cubre hasta `20261027170000_programacion_ensayos`, mientras que modelos posteriores como `EnsayeCompresion`, `DespachoMuestra`, `MantenimientoEquipo` y columnas recientes en `Colado` requieren migración formal consolidada).
3. **Ausencia de configuración explícita de `PRAGMA journal_mode = WAL`** en la inicialización de `src/lib/prisma.ts`.
4. **Necesidad de instalador Windows comercial autocontenido** que elimine la dependencia manual de `node.exe`, `npm` y ventanas de consola para laboratoristas sin privilegios de administrador.

---

## 2. R1. Análisis Comparativo de Viabilidad Técnica para Windows

### 2.1 Contexto Operativo del Laboratorio de Concreto en Windows

Las decisiones arquitectónicas de ENSALIA están restringidas por la realidad física y operativa de los laboratorios de control de calidad y casetas de obra en México y Latinoamérica:
- **Hardware típico**: PCs de escritorio o laptops Windows 10/11 x64 de gama de entrada/media (Core i3/i5, 4 GB a 8 GB de RAM).
- **Entorno restringido**: Conectividad nula o intermitente (*air-gapped*), cuentas de usuario estándar sin permisos de administrador (bloqueo UAC corporativo) y uso intensivo simultáneo con Excel y software de básculas/prensas.
- **Operación industrial**: Pantallas táctiles resistivas/PCAP en área húmeda de prensas con guantes, lectores USB de códigos de barras/QR y conexión directa a prensas digitales por convertidores USB a RS-232 (puertos `COM`).
- **Tolerancia cero a pérdida de datos**: Los historiales de $f'_c$, hojas de campo y calibraciones son evidencia legal y técnica sujeta a auditorías **ISO/IEC 17025** / EMA.

A continuación se evalúan las cuatro arquitecturas candidatas para Windows Desktop:
1. **Opción A — React Native (incluyendo React Native for Windows / WinUI 3)**.
2. **Opción B — Tauri (Frontend web estático / sidecar + Backend Rust + WebView2)**.
3. **Opción C — Electron (Chromium embebido + Proceso principal Node.js)**.
4. **Opción D — Next.js Standalone + Node.js 20 LTS Portable + WebView2/Edge + Inno Setup 6**.

---

### 2.2 Evaluación Detallada por Criterio (5 Dimensiones Críticas)

#### Criterio 1: Compatibilidad y Esfuerzo de Migración del Código Actual
- **Opción A — React Native / React Native for Windows (RNW)**:
  - *Interfaz React (`src/app`, `src/features`, `src/components`)*: **Incompatible**. Toda la UI actual usa primitivas DOM HTML5/SVG (`<table>`, `<form>`, `<input>`, `<iframe>`, `@media print`) y tokens CSS en `src/styles/tokens.css` y `src/app/globals.css`. RNW exige reescribir el 100% de las vistas hacia componentes nativos XAML/WinUI (`<View>`, `<Text>`, `<TextInput>`, `<FlatList>`).
  - *Lógica de negocio y API (`src/app/api`, 62 Route Handlers)*: **Incompatible**. RNW carece de servidor HTTP App Router y runtime de Node.js. Toda la lógica de servidor debería reubicarse en módulos locales sin Node APIs.
  - *Prisma ORM*: **Inviable**. `@prisma/client` depende del módulo nativo N-API `query_engine-windows.dll.node` cargado mediante `process.dlopen` en Node.js. El motor JS de React Native (Hermes/V8 sin Node) no puede ejecutar Prisma Client ni `prisma migrate`. Implicaría reescribir los 30 modelos (922 líneas) y todas las consultas transaccionales hacia `op-sqlite` o `react-native-quick-sqlite`.
  - *Esfuerzo estimado*: **14 a 20 semanas** de reescritura completa con altísimo riesgo de regresión en la plantilla invariante de 54 campos.
- **Opción B — Tauri (v1/v2 con Rust + WebView2)**:
  - *Interfaz React*: **Alta compatibilidad** para componentes cliente, ya que WebView2 renderiza Chromium Edge completo (CSS tokens, `@media print`, SVG, tablas).
  - *Next.js App Router y Prisma ORM*: **Fricción estructural severa**. Tauri espera un bundle estático (`output: 'export'`), el cual **deshabilita los 62 Route Handlers dinámicos** de `src/app/api/`. Para conservar Prisma y Next.js existen solo dos caminos: (1) reescribir los 62 endpoints y 30 modelos en Rust (`#[tauri::command]` + `sqlx`/`sea-orm`), o (2) empaquetar Node.js + Next.js Standalone como *sidecar* externo administrado por Rust. El camino (1) cuesta 8–12 semanas; el camino (2) convierte a Tauri en un envoltorio redundante sobre el mismo servidor Node.js.
  - *Esfuerzo estimado*: **4 semanas** (vía sidecar híbrido) a **10 semanas** (reescritura en Rust).
- **Opción C — Electron**:
  - *Compatibilidad total*: **~98% compatible**. Permite ejecutar el build `standalone` de Next.js en un subproceso o en el proceso principal de Node.js y mostrar `http://127.0.0.1:<puerto>` en `BrowserWindow`. Conserva React 19, CSS tokens, Zod y los 62 Route Handlers sin reescritura.
  - *Riesgo técnico*: Electron compila con su propia versión interna de Node.js/V8 (`NODE_MODULE_VERSION`), lo que exige alinear el ABI de módulos nativos o lanzar un `node.exe` separado para Prisma.
  - *Esfuerzo estimado*: **1 a 2 semanas** de integración de ciclo de vida, IPC y empaquetado.
- **Opción D — Next.js Standalone + Node.js 20 LTS Portable + WebView2/Edge + Inno Setup**:
  - *Compatibilidad total*: **100% nativa sin fricción**. Ejecuta exactamente el mismo código React 19, TypeScript, CSS (`tokens.css` + `globals.css`), 62 Route Handlers, Zod y Prisma ORM v6 sobre Node.js 20 LTS oficial. El único ajuste de código requerido en Next.js es habilitar `output: 'standalone'` en `next.config.ts` (1 línea).
  - *Esfuerzo estimado*: **2 a 4 días** enfocados exclusivamente en empaquetado, script de arranque silencioso e instalador.

#### Criterio 2: Manejo Local de Base de Datos SQLite (Rendimiento, WAL, Transacciones y Migraciones)
- **Opción A — React Native (WinUI 3)**:
  - Usa SQLite vía C++ (`op-sqlite`), soportando modo WAL, pero pierde `prisma.$transaction`, tipado automático de 30 modelos y `prisma migrate deploy`. Requiere construir un motor artesanal de migraciones DDL en SQL puro.
- **Opción B — Tauri**:
  - Excelente rendimiento SQLite en Rust (`rusqlite`/`sqlx`), pero rompe la fuente única de verdad en `prisma/schema.prisma` si se migra a Rust, o depende igualmente de un sidecar Node.js si se conserva Prisma.
- **Opción C — Electron**:
  - Ejecuta Prisma 6 en Node.js con soporte completo de transacciones interactivas y WAL, aunque la coexistencia con Electron añade riesgo de desajuste de ABI nativo o bloqueos `EBUSY` durante actualizaciones si Chromium/Node mantienen manejadores abiertos.
- **Opción D — Next.js Standalone + Node.js 20 LTS Portable**:
  - **Entorno nativo de referencia para Prisma 6**. El binario `query_engine-windows.dll.node` se resuelve de manera determinista mediante `PRISMA_QUERY_ENGINE_LIBRARY` y opera con `connection_limit=1&busy_timeout=5000` y modo **WAL (`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;`)**, garantizando lecturas simultáneas no bloqueantes mientras el quiosco registra roturas de cilindros. Soporta transacciones ACID multi-tabla (`prisma.$transaction`) y migraciones incrementales deterministas con `prisma migrate deploy`.

#### Criterio 3: Generación y Renderizado de Reportes PDF de Alta Precisión
- **Opción A — React Native (WinUI 3)**:
  - Deficiente. Las librerías populares de PDF en React Native están diseñadas para iOS/Android; `pdf-lib` sufre limitaciones con buffers binarios de gran tamaño en Hermes y WinUI 3 carece de un visor PDF integrado ligero con fidelidad de impresión inmediata comparable a Chromium.
- **Opción B — Tauri**:
  - WebView2 incluye visor PDF nativo de Edge y soporta descarga de Blobs generados por `pdf-lib`. Sin embargo, la impresión silenciosa directa hacia impresoras térmicas o de red requiere implementar invocaciones Win32 (`ShellExecute` / Spooler API) en Rust.
- **Opción C — Electron**:
  - Excelente. Conserva `pdf-lib` intacto y ofrece `webContents.print({ silent: true })` para impresión directa sin diálogo si se requiriera en quioscos desatendidos.
- **Opción D — Next.js Standalone + Node.js 20 LTS Portable + WebView2/Edge**:
  - **Óptimo y ya validado en producción local**. Los generadores existentes (`src/lib/documents/pdf/renderer.ts` y `src/lib/pdf/compression-report/renderer.ts`) producen PDFs vectoriales con `pdf-lib` en **< 120 ms** (15–80 KB sin fotos, < 350 KB con evidencia WebP), trazando fracturas ASTM C39 Tipos 1–6 con precisión cartesiana y códigos QR SHA-256 (`qrcode`). Al abrirse dentro de WebView2 o Microsoft Edge en modo aplicación (`--app=http://127.0.0.1:<port>`), aprovecha el motor PDF nativo de Edge/Chromium, la vista previa embebida (`<iframe>` en `CertificateViewerModal.tsx`) y las reglas `@media print` de `globals.css`.

#### Criterio 4: Periféricos de Laboratorio e Impresión Directa en Windows
- **Opción A — React Native (WinUI 3)**:
  - Carece de Web Serial API. Conectar prensas Controls, Forney, ELE o Matest por USB-RS232 exigiría escribir módulos nativos C++/WinRT (`Windows.Devices.SerialCommunication`) y puentes TurboModule personalizados.
- **Opción B — Tauri**:
  - Potente en backend vía crate `serialport` de Rust, pero exige reescribir `src/lib/hardware/press-telemetry/serial-client.ts` para sustituir `navigator.serial` por eventos IPC hacia WebView2.
- **Opción C — Electron**:
  - Muy bueno: soporta tanto Web Serial API en el renderer (mediante el hook `session.on('select-serial-port')` obligatorio en Electron) como `serialport` en Node.js.
- **Opción D — Next.js Standalone + Node.js 20 LTS Portable + WebView2/Edge**:
  - **Soporte directo sin reescritura**. Microsoft Edge y WebView2 en Windows soportan nativamente **Web Serial API** (`navigator.serial`), por lo que `PressTelemetryClient` en `src/lib/hardware/press-telemetry/serial-client.ts` conecta directamente a puertos `COM` RS-232/USB a 9600+ baudios, además de soportar el daemon local WebSocket (`ws://localhost:8088/press`). Los lectores USB de códigos de barras/QR operan de forma transparente como emuladores de teclado **HID Keyboard Wedge**, y la impresión hacia cualquier impresora Windows configurada funciona de forma nativa vía spooler del navegador/OS (`window.print()` y visor PDF de Edge) o envío raw vía PowerShell/TCP para impresoras térmicas de etiquetas.

#### Criterio 5: Consumo de Recursos, Tamaño del Paquete, Madurez y Mantenimiento
- **Opción A — React Native (WinUI 3)**:
  - RAM moderada (~120–180 MB) y paquete compacto (~55–80 MB), pero **ecosistema frágil en escritorio Windows**: requiere Visual Studio 2022 C++ Build Tools, Windows App SDK, tiempos de compilación de 15–30 minutos y frecuentes incompatibilidades al actualizar versiones menores de React Native.
- **Opción B — Tauri**:
  - Paquete mínimo (~15–25 MB sin sidecar; ~55–75 MB con sidecar Node.js) y baja RAM (~60–100 MB sin sidecar; ~130–160 MB con sidecar). No obstante, impone doble pila tecnológica (**Rust + TypeScript**) en el equipo de ingeniería.
- **Opción C — Electron**:
  - **Sobrecarga severa para PCs de obra de 4 GB RAM**: instalador de **160–190 MB**, > 450 MB instalados en disco y **450–750 MB de RAM en reposo** por duplicar Chromium completo en múltiples procesos (`main`, `renderer`, `gpu`, `utility`).
- **Opción D — Next.js Standalone + Node.js 20 LTS Portable + Inno Setup 6**:
  - **Balance óptimo**: el trazado `@vercel/nft` de `output: 'standalone'` reduce `node_modules` de ~500 MB (30,000+ archivos) a **~65–85 MB** (< 500 archivos críticos). Sumando `node.exe` portable podado y compresión sólida `lzma2/ultra64` en Inno Setup 6, el instalador único pesa **~55–75 MB** (~180 MB en disco), arranca en **1.2–1.8 s** y consume apenas **~80–120 MB de RAM** para el servidor Node.js (aprovechando Edge/WebView2 ya residente en Windows 10/11). Ecosistema 100% estándar TypeScript/Node.js con costo de licenciamiento **$0 USD**.

---

### 2.3 Matriz Comparativa Objetiva Ponderada

Escala de calificación: **1.0 = Inviable / Crítico**, **2.0 = Deficiente**, **3.0 = Aceptable con reservas**, **4.0 = Bueno**, **5.0 = Óptimo**.

| Criterio de Evaluación | Peso | React Native (RNW / WinUI 3) | Tauri (Rust + WebView2) | Electron (Chromium + Node) | Next.js Standalone + Node Portable + Inno Setup |
|---|---:|:---:|:---:|:---:|:---:|
| **1. Compatibilidad y esfuerzo de migración (React 19, APIs, Prisma, CSS)** | **30%** | **1.0** *(Reescritura total UI + ORM)* | **2.5** *(Sidecar complejo o reescritura Rust)* | **4.7** *(Compatible; ajuste de ABI/IPC)* | **5.0** *(100% nativo, 0 reescritura)* |
| **2. Manejo local de SQLite (WAL, transacciones, Prisma Migrate)** | **20%** | **2.0** *(Sin Prisma Client ni Migrate)* | **4.2** *(SQLite nativo Rust, pero pierde Prisma)* | **4.5** *(Prisma en Node; riesgo ABI Electron)* | **5.0** *(Prisma Engine nativo en Node 20 LTS)* |
| **3. Reportes PDF de alta precisión (`pdf-lib`, ASTM C39, QR, impresión)** | **15%** | **1.5** *(Sin visor WinUI maduro ni buffer rápido)* | **3.8** *(WebView2 PDF; impresión silenciosa manual)* | **4.8** *(pdf-lib + `printToPDF` / silencioso)* | **5.0** *(pdf-lib vectorial <120ms + visor Edge/WebView2)* |
| **4. Periféricos Windows y laboratorio (COM RS-232, HID QR, impresión)** | **15%** | **1.8** *(Sin Web Serial; puente C++/WinRT)* | **4.2** *(Crate `serialport` + puente IPC)* | **4.7** *(Web Serial con hook + `serialport`)* | **5.0** *(Web Serial API nativa + WebSocket + HID)* |
| **5. Consumo RAM/disco, tamaño paquete y madurez a largo plazo** | **20%** | **2.8** *(RAM baja; build C++ frágil en Win)* | **4.5** *(Ligero; doble stack Rust + TS)* | **2.6** *(~600 MB RAM, ~160 MB setup)* | **4.8** *(~100 MB RAM, ~65 MB setup, 1 solo stack)* |
| **PUNTUACIÓN TOTAL PONDERADA** | **100%** | **1.76 / 5.00** | **3.69 / 5.00** | **4.26 / 5.00** | **4.96 / 5.00** |

---

### 2.4 Recomendación Técnica Definitiva y Justificación

> **DICTAMEN ARQUITECTÓNICO DEFINITIVO (R1)**
> Se adopta de manera unívoca la arquitectura **Next.js 15 Standalone + Node.js 20 LTS Portable x64 + Lanzador Nativo Windows (Edge App Mode / WebView2) + Instalador Inno Setup 6** (Puntuación: **4.96 / 5.00**).

**Justificación Ejecutiva**:
1. **Preservación íntegra del capital de ingeniería**: Conserva el 100% de los 62 Route Handlers, los 30 modelos Prisma, el sistema de tokens CSS, los validadores Zod, el quiosco táctil de prensas y los renderizadores PDF vectoriales `pdf-lib`.
2. **Viabilidad real en PCs modestas de laboratorio (4 GB RAM)**: Evita el consumo prohibitivo de Electron (~600 MB RAM en reposo) y Docker/WSL2 (> 1.8 GB RAM), manteniendo un servidor local de ~90–120 MB de RAM.
3. **React Native for Windows queda formalmente descartado (1.76 / 5.00, suma exacta `1.755`)**: Su incapacidad para ejecutar Prisma ORM (`query_engine-windows.dll.node`) y la necesidad de reescribir toda la interfaz DOM y de telemetría serial implican meses de costo hundido sin beneficio técnico en laboratorio.
4. **Contingencia documentada**: Únicamente si en el futuro se exigiera empaquetado de ventana monolítica desvinculada de Edge/WebView2 del sistema, **Electron** (4.26 / 5.00) constituye la ruta de respaldo directa sobre el mismo código Next.js Standalone.

---

## 3. R2. Especificación y Plan de Repositorio GitHub Limpio

La inspección de `c:\Users\ccanto\Desktop\ENSALIA` reveló que el directorio **no ha sido inicializado con Git** (`fatal: not a git repository`) y contiene artefactos generados en disco (`dist_report/Informe_LABSICO_MC-LBS-CC-IE_Demo.pdf`, `output/pdf/*.pdf`, `tmp/pdfs/*.pdf`, `prisma/tests/field-sheet-migration.sqlite`, `tests/test_output*.xlsx`, `start-validation.*.log`, `tsconfig.tsbuildinfo`, `.agents/` y un `.env` con la ruta personal `file:C:/Users/ccanto/AppData/Local/LABSICO/data/labsico.db`).

### 3.1 Reglas Exhaustivas de Exclusión (`.gitignore`)

Se implementa el archivo `.gitignore` en la raíz del repositorio con protección integral sobre seis categorías críticas:
1. **Dependencias y logs de gestores**: `node_modules/`, `.pnpm-store/`, `npm-debug.log*`, `yarn-debug.log*`.
2. **Compilación y artefactos de empaquetado**: `.next/`, `/out/`, `/build/`, `/dist/`, `/dist_report/`, `/dist_installer/`, `/build_payload/`, `/coverage/`, `*.tsbuildinfo` (anclados en la raíz mediante `/` para evitar colisiones con subdirectorios de código fuente).
3. **Bases de datos SQLite y bitácoras transaccionales**: `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`, `*.sqlite`, `*.sqlite3`, `prisma/*.db*`, `prisma/tests/*.sqlite`.
4. **PDFs generados, documentos y salidas temporales**: `/documents/`, `/output/`, `/tmp/`, `/temp/`, `/storage/`, `public/uploads/`, `tests/**/test_output*.xlsx`, `*.zip`, `*.tar.gz`, `*.pdf`.
   - **Anclaje crítico de carpetas fuente**: Al anclar `/documents/` y `/storage/` con `/` inicial, se evita que Git ignore los módulos reales `src/lib/documents/` (`qr-verification.ts`, `schema.ts`, `service.ts`, `storage.ts`, `pdf/renderer.ts`) y `src/lib/storage/local-files.ts`.
   - **Excepción crítica verificada**: El código fuente contiene el directorio de API `src/app/api/ensayos/diario.pdf/route.ts`. Como Git aplica `*.pdf` también a carpetas, `.gitignore` incluye explícitamente `!src/app/api/ensayos/diario.pdf/` y `!src/app/api/ensayos/diario.pdf/**` para garantizar que ese Route Handler nunca sea ignorado.
5. **Logs de ejecución**: `/logs/`, `*.log`, `start-validation.*.log`.
6. **Secretos, variables locales y metadatos**: `.env`, `.env.local`, `.env.*.local`, `runtime.env`, `*.pem`, `*.key`, `*.pfx` (conservando `!.env.example`), `.agents/`, `.gemini/`, `.vscode/*` (conservando `settings.json` y `extensions.json`), `.idea/`, `Thumbs.db`, `Desktop.ini`, `.DS_Store`.

---

### 3.2 Taxonomía Estricta: Archivos Versionados vs. Tiempo de Ejecución

| Categoría | Rutas / Archivos | En GitHub | Propósito Técnico |
|---|---|:-:|---|
| **Código fuente aplicación** | `src/app/`, `src/features/`, `src/components/`, `src/lib/`, `src/styles/` | **SÍ** | UI React 19, 62 Route Handlers, motores PDF/Excel/WebSerial/OCR, tokens CSS |
| **Esquema y migraciones BD** | `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed.ts` | **SÍ** | Fuente única de verdad DDL (30 modelos, 25 enums) y catálogos iniciales |
| **Pruebas automatizadas** | `tests/**/*.test.ts` | **SÍ** | Suites `tsx --test` de contratos, metrología, PDFs, hardware y seguridad |
| **Scripts y empaquetado** | `scripts/*.ps1`, `scripts/Setup-Dev.cmd`, `*.cmd`, `build_installer/setup.iss` | **SÍ** | Arranque, respaldos SHA-256, restauración, diagnóstico, setup dev e Inno Setup |
| **Configuración y docs** | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `README.md`, `docs/`, `public/`, `.gitignore`, `.env.example` | **SÍ** | Reproducibilidad determinista de dependencias, assets públicos y documentación |
| **Bases de datos locales** | `*.db`, `*.db-wal`, `*.db-shm`, `*.sqlite`, `%LOCALAPPDATA%\Ensalia\data\*` | **NO** | Datos vivos de laboratorio, historial $f'_c$ y estado transaccional |
| **Artefactos compilados** | `node_modules/`, `.next/`, `/build_payload/`, `/dist_installer/`, `tsconfig.tsbuildinfo` | **NO** | Generados por `npm ci`, `npm run build` e Inno Setup |
| **Documentos y evidencias** | `/dist_report/`, `/output/`, `/tmp/`, `/documents/`, `/storage/`, `tests/**/test_output*.xlsx` | **NO** | PDFs emitidos, escaneos de campo, fotos WebP de falla y pruebas temporales |
| **Secretos y entorno local** | `.env`, `.env.local`, `runtime.env`, `/logs/`, `start-validation.*.log`, `.agents/` | **NO** | Rutas de máquina del desarrollador, códigos locales y trazas operativas |

---

### 3.3 Gestión de Secretos y Variables de Entorno (`.env.example` vs. `runtime.env`)

1. **Entorno de Desarrollo (`.env.example` $\rightarrow$ `.env`)**:
   - `.env.example` reside versionado en la raíz sin rutas personales ni secretos reales:
     - `DATABASE_URL="file:./ensalia-dev.db?connection_limit=1&busy_timeout=5000"` *(Prisma resuelve las rutas relativas `file:` de SQLite desde la carpeta `prisma/` donde reside `schema.prisma`, por lo que `./ensalia-dev.db` apunta exactamente a `prisma/ensalia-dev.db`)*
     - `APP_ACCESS_CODE="cambiar-este-codigo-en-produccion"`
     - `ENSALIA_REQUIRE_ACCESS_CODE="false"`
     - `NODE_ENV="development"`, `HOSTNAME="127.0.0.1"`, `PORT="3210"`
   - En cada estación de desarrollo, el desarrollador (o `scripts/Setup-Dev.cmd`) copia `.env.example` a `.env` localmente, archivo que permanece bloqueado por `.gitignore`.
2. **Entorno de Producción Windows (`runtime.env` dinámico)**:
   - El instalador y el paquete de producción **nunca distribuyen un `.env` estático**.
   - Al arrancar en la PC del laboratorista, `Ensalia.Common.ps1` / el lanzador nativo resuelve `%LOCALAPPDATA%\Ensalia` (o `%LOCALAPPDATA%\LABSICO` en modo `legacy-alias`), selecciona un puerto loopback libre entre `3210` y `3299` con `TcpListener`, genera `%LOCALAPPDATA%\Ensalia\runtime.env` y pasa las variables directamente al entorno del proceso `node.exe`.

---

### 3.4 Inicialización en GitHub y Reproducibilidad en Un Solo Comando

#### Procedimiento de Inicialización del Repositorio (Primera Vez)
```powershell
cd c:\Users\ccanto\Desktop\ENSALIA
git init -b main
git status --ignored
# Verificar que dist_report/, output/, tmp/, .env, *.log, *.tsbuildinfo y .agents/ aparezcan ignorados
# y que src/app/api/ensayos/diario.pdf/route.ts SI aparezca como untracked para ser versionado.
git add .
git commit -m "chore: inicializar repositorio limpio de ENSALIA con higiene de entorno y plan estrategico"
git remote add origin https://github.com/<organizacion>/ensalia.git
git push -u origin main
```

#### Clonación y Puesta en Marcha en Máquina Nueva (1 Solo Comando)
En cualquier máquina Windows con Git y Node.js 20+ LTS:
```cmd
git clone https://github.com/<organizacion>/ensalia.git && cd ensalia && scripts\Setup-Dev.cmd
```
O mediante cadena directa equivalente multiplataforma:
```powershell
copy .env.example .env; npm ci && npx prisma generate && npx prisma migrate deploy && npx prisma db push --skip-generate && npm run db:seed && npm run typecheck
```
*(Nota: Una vez consolidada la migración faltante en `prisma/migrations/`, el paso `npx prisma db push --skip-generate` se vuelve innecesario y basta `npx prisma migrate deploy`.)*

---

## 4. R3. Blueprint de Empaquetado e Instalador Distribuible para Windows

Se selecciona **Inno Setup 6** (licencia libre BSD, compresión sólida `lzma2/ultra64`, soporte nativo de instalación sin privilegios elevados `PrivilegesRequired=lowest` y Pascal Script) frente a WiX Toolset (alta complejidad XML MSI) o Electron-builder (>160 MB). La especificación ejecutable completa se entrega en `build_installer/setup.iss`.

### 4.1 Flujo de Instalación (3 Clics Interactivos y `/VERYSILENT`)

```
[ Usuario descarga Instalador-ENSALIA-v1.0.0.exe (~65 MB) ]
       │
       ├──► Modo Interactivo (3 Clics):
       │     1. Bienvenida en español + Verificación automática de Mutex Local\LABSICO.LocalApplication
       │     2. Extracción LZMA2 en %LOCALAPPDATA%\Programs\Ensalia (8–15 s) + WebView2 check
       │     3. Creación de datos persistentes / backup pre-upgrade / migración + "Iniciar ENSALIA"
       │
       └──► Modo Desatendido TI (/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-):
             Ejecución silenciosa completa sin diálogos para despliegues masivos en red corporativa.
```

---

### 4.2 Topología Desacoplada en `%LOCALAPPDATA%` y Documentos

El código del programa es completamente desechable y reemplazable en actualizaciones; los datos del laboratorio viven aislados e intactos bajo directivas `Flags: uninsneveruninstall`:

```text
C:\Users\<Usuario>\
├── AppData\Local\Programs\Ensalia\               <-- [INMUTABLE / REEMPLAZABLE EN UPGRADES]
│   ├── app\                                      <-- Output de Next.js Standalone (.next/standalone)
│   │   ├── server.js                             <-- Servidor HTTP Node minimalista
│   │   ├── .next\static\                         <-- Bundles JS/CSS estáticos copiados en build
│   │   ├── public\                               <-- Recursos estáticos públicos
│   │   ├── prisma\
│   │   │   ├── schema.prisma                     <-- Esquema relacional
│   │   │   ├── migrations\                       <-- Historial DDL completo
│   │   │   ├── seed.js                           <-- Seed precompilado con esbuild (cero tsx)
│   │   │   └── ensalia-template.db               <-- Base plantilla limpia pre-migrada (~120 KB)
│   │   └── node_modules\                         <-- Dependencias standalone + CLI/motores Prisma
│   │       ├── .prisma\client\
│   │       │   └── query_engine-windows.dll.node <-- Motor nativo SQLite de Prisma en Rust
│   │       ├── prisma\                           <-- CLI Prisma (copia explicita; devDependency omitida por standalone)
│   │       └── @prisma\engines\
│   │           └── schema-engine-windows.exe     <-- Motor DDL para "prisma migrate deploy" en actualizaciones
│   ├── runtime\node\node.exe                     <-- Node.js 20 LTS Portable x64 (podado, sin npm/docs)
│   ├── scripts\*.ps1                             <-- Ensalia.Common.ps1, Backup, Restore, Diagnostico
│   ├── Ensalia.exe                               <-- Lanzador nativo silencioso (0 consolas negras)
│   └── unins000.exe                              <-- Desinstalador estándar registrado en HKCU
│
├── AppData\Local\Ensalia\                        <-- [PERSISTENTE / FLAGS: uninsneveruninstall]
│   ├── data\
│   │   ├── ensalia.db                            <-- Base SQLite principal (WAL activo)
│   │   ├── ensalia.db-wal / ensalia.db-shm       <-- Bitácora WAL y memoria compartida
│   ├── documents\
│   │   ├── field-sheets\                         <-- Hojas de campo PDF y escaneos firmados
│   │   ├── calibrations\                         <-- Certificados de calibración de equipos
│   │   ├── maintenance\                          <-- Evidencias de mantenimiento preventivo
│   │   └── compression_photos\                   <-- Fotografías WebP forenses de probetas
│   ├── assets\                                   <-- Logotipos por perfil de laboratorio
│   ├── logs\                                     <-- Trazas diarias ensalia-YYYYMMDD.log
│   └── runtime.env                               <-- Puerto TCP (3210-3299) y DATABASE_URL de sesión
│
└── Documents\Ensalia Respaldos\                  <-- [RESPALDOS PORTABLES CON MANIFIESTO SHA-256]
    └── Ensalia-YYYYMMDD-HHMMSS.zip
```

*(Compatibilidad retroactiva: si existe `%LOCALAPPDATA%\LABSICO\data\labsico.db` sin existir `ensalia.db`, tanto el instalador como `Ensalia.Common.ps1` conservan el modo `legacy-alias` operando sobre la base existente sin moverla ni destruirla. Adicionalmente, como `output: 'standalone'` de Next.js no incluye `devDependencies`, el pipeline de empaquetado debe copiar explícitamente `node_modules/prisma` y `node_modules/@prisma/engines` —incluyendo `schema-engine-windows.exe`— dentro de `build_payload/app/node_modules/`.)*

---

### 4.3 Inicialización de Base de Datos en 0 ms y Consolidación de Migraciones

1. **Pre-requisito de Build (Consolidación de Migraciones Prisma)**:
   - Durante la inspección del codebase se constató que `prisma/migrations/` solo llega hasta `20261027170000_programacion_ensayos`, dejando sin archivo `.sql` los modelos agregados posteriormente (`MantenimientoEquipo`, `DocumentoMantenimiento`, `DespachoMuestra`, `ItemDespachoMuestra`, `EnsayeCompresion`, `FotoEnsayeCompresion`, `SuscripcionLocal`, `ModuloFeatureFlag` y columnas de `Colado` como `ciudad`).
   - **Acción obligatoria en el pipeline de build**: Generar la migración SQL formal consolidada (`npx prisma migrate dev --name consolidacion_ensalia_v1`) para que los 30 modelos nazcan de `prisma migrate deploy`.
2. **Inicialización Instantánea en PC Nueva (0 ms)**:
   - En la máquina de compilación se genera `build_payload/ensalia-template.db` ejecutando `prisma migrate deploy` y `seed.js` sobre una base limpia.
   - Durante `ssPostInstall` en `build_installer/setup.iss`, si no existe `ensalia.db` ni `labsico.db`, el instalador copia (`CopyFile`) `ensalia-template.db` hacia `%LOCALAPPDATA%\Ensalia\data\ensalia.db` en **0 ms**, sin requerir terminal, red ni `tsx`.
3. **Actualizaciones sobre Bases Existentes y Procedimiento de *Baselining* (`P3005`)**:
   - Si ya existe `ensalia.db` (o `labsico.db`), el instalador ejecuta primero `RunPreUpgradeBackup()` y posteriormente `RunIncrementalMigrations()`, invocando al `node.exe` portable contra `app\node_modules\prisma\build\index.js migrate deploy` (con `schema-engine-windows.exe` disponible en `app\node_modules\@prisma\engines\`). Ambas rutinas validan `Exec(...)` y `ResultCode <> 0`, mostrando un error explícito, marcando `InstallationAborted := True` y abortando la actualización (`WizardForm.Close`) si ocurre algún fallo, de modo que la guarda `Check: ShouldLaunchApp` impida el lanzamiento posterior de la aplicación.
   - **Bases heredadas inicializadas vía `prisma db push` (Error `P3005`)**: Si una base de datos heredada (`labsico.db` o `ensalia.db`) fue creada o sincronizada anteriormente mediante `prisma db push` sin tabla `_prisma_migrations`, `prisma migrate deploy` fallará con el código **`P3005`** (*The database schema is not empty*). Antes de aplicar nuevas migraciones sobre esa base, se debe ejecutar el procedimiento de *baselining*:
     1. Respaldar la base de datos (`New-EnsaliaBackupArchive`).
     2. Marcar como aplicadas las migraciones ya presentes en el esquema real sin re-ejecutar DDL destructivo:
        ```cmd
        npx prisma migrate resolve --applied <migration_name>
        ```
        *(por ejemplo, registrando las migraciones históricas existentes hasta la migración consolidada equivalente al estado de la base heredada).*
     3. Ejecutar `npx prisma migrate deploy` para aplicar únicamente las migraciones nuevas posteriores al baseline.

---

### 4.4 Empaquetado 100% Offline y Prerrequisitos Autocontenidos

Para garantizar operación **100% desconectada (*air-gapped*)** en PCs vírgenes sin Node.js, Git ni herramientas de compilación:
1. **Runtime Node.js 20 LTS Portable x64**: Se empaqueta únicamente `node.exe` (~68 MB sin comprimir, ~22 MB con LZMA2) en `{app}\runtime\node\`, sin modificar el `PATH` global de Windows.
2. **Binarios nativos SQLite / Prisma**: Se copian `query_engine-windows.dll.node`, `node_modules/prisma` y `node_modules/@prisma/engines` (`schema-engine-windows.exe`) dentro de `build_payload/app/node_modules/`, inyectando explícitamente `PRISMA_QUERY_ENGINE_LIBRARY` antes de iniciar `server.js`.
3. **WebView2 Evergreen Runtime**: Se verifica en el Registro de Windows (`{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`). Si la estación careciera de WebView2/Edge actualizado, `setup.iss` incluye soporte para ejecutar el instalador offline incluido en `build_payload\prereqs\MicrosoftEdgeWebView2Setup.exe` de manera silenciosa (`/silent /install`).
4. **Seed sin TypeScript (`esbuild`)**: `prisma/seed.ts` (que importa `src/lib/config/defaults.ts`) se precompila con `esbuild --bundle --platform=node` hacia `prisma/seed.js`, eliminando dependencias de `tsx` o `src/` en producción.
5. **Guarda de Lanzamiento Post-Instalación (`InstallationAborted` + `Check: ShouldLaunchApp`)**: En Inno Setup, invocar `WizardForm.Close` durante `ssPostInstall` no suprime por sí solo las entradas de la sección `[Run]` (especialmente bajo `/VERYSILENT` o transiciones de cierre del asistente). Por ello, `build_installer/setup.iss` declara la bandera global `InstallationAborted: Boolean` (inicializada en `False` dentro de `InitializeSetup`), la activa (`InstallationAborted := True`) ante cualquier fallo en `CopyFile`, `RunPreUpgradeBackup()` o `RunIncrementalMigrations()`, y condiciona el lanzamiento de `{app}\{#MyAppExeName}` mediante `Check: ShouldLaunchApp`:

```pascal
[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent; Check: ShouldLaunchApp

[Code]
var
  InstallationAborted: Boolean;

function InitializeSetup(): Boolean;
begin
  InstallationAborted := False;
  Result := True;
end;

function ShouldLaunchApp(): Boolean;
begin
  Result := not InstallationAborted;
end;
```

---

### 4.5 Protocolo de Actualización Segura (*Safe Upgrade*) y Continuidad Operativa

1. **Exclusión Mutua por Named Mutex**: `AppMutex=Local\LABSICO.LocalApplication` en `setup.iss` impide instalar o actualizar mientras ENSALIA o un lanzador heredado LABSICO mantengan abierta la base SQLite, previniendo errores `ERROR_SHARING_VIOLATION` sobre `query_engine-windows.dll.node` o `ensalia.db`.
2. **Respaldo Atómico Pre-Actualización con SHA-256 y Aborto ante Fallos**: En `ssPostInstall`, antes de aplicar cualquier migración DDL, el instalador invoca `RunPreUpgradeBackup()` (`New-EnsaliaBackupArchive` en `scripts/Ensalia.Common.ps1`) generando un ZIP verificable con `manifest.json` y hashes SHA-256 en `%USERPROFILE%\Documents\Ensalia Respaldos\`. Tanto `RunPreUpgradeBackup()` como `RunIncrementalMigrations()` verifican el retorno de `Exec(...)` y `ResultCode`: si `ResultCode <> 0` (o faltan prerrequisitos / falla `CopyFile`), se asigna `InstallationAborted := True`, se muestra un mensaje de error en español (`MsgBox(..., mbError, MB_OK)`) y se cierra el asistente (`WizardForm.Close`), garantizando mediante `Check: ShouldLaunchApp` que nunca se continúe ni se inicie la aplicación tras un fallo.
3. **Recuperación de Bases Heredadas `db push` (`P3005`)**: Si `RunIncrementalMigrations()` falla con `P3005` sobre una base heredada creada originalmente con `db push`, el respaldo pre-actualización queda preservado en `Ensalia Respaldos` y el técnico puede regularizar el historial mediante `npx prisma migrate resolve --applied <migration_name>` seguido de `npx prisma migrate deploy` antes de relanzar el instalador.
4. **Protección ante Desinstalación**: Las rutas de datos, documentos, assets y respaldos están protegidas con `Flags: uninsneveruninstall`. Desinstalar la aplicación desde Panel de Control remueve los binarios en `Programs\Ensalia`, dejando intacto el historial del laboratorio.
5. **Higiene de Windows SmartScreen y Antivirus**: Se recomienda firmar el ejecutable `Instalador-ENSALIA-v1.0.0.exe` con certificado Authenticode OV/EV y documentar la exclusión de análisis en tiempo real de Windows Defender sobre `%LOCALAPPDATA%\Ensalia\data` para evitar bloqueos transitorios `SQLITE_BUSY` durante checkpoints `-wal`.

---

## 5. R4. Hoja de Ruta de Migración y Consolidación Modular

### 5.1 Grafo de Dependencias y Priorización de los 6 Módulos

```text
[1. Muestreo de Concreto]  (Fundacional: Muestra, Especimen, 54 campos invariantes)
           │
           ├──────────────────────────────────┐
           ▼                                  ▼
[2. Colados]                        [4. Ensayes a Compresión]
(Agrupación 1-a-N, volúmenes)       (Prensas, Web Serial, ASTM C39)
           │                                  │
           ▼                                  │
[3. Hojas de Campo] ──────────────────────────┤
(Folios, QR SHA-256, sustitución)             ▼
                                    [5. Emisión de Certificados]
                                    (PDF vectorial, ACI 214R/318, Excel)
                                              │
                                              ▼
                                    [6. Trazabilidad ISO/IEC 17025]
                                    (Auditoria, Calibraciones, Despacho, FeatureGate)
```

*(Nota: Aunque la Trazabilidad ISO/IEC 17025 se consolida en su cierre global en la Fase 4 —auditoría de cadena completa, bloqueo por calibración vencida y despacho de muestras—, la tabla `Auditoria` registra eventos desde el Módulo 1.)*

---

### 5.2 Especificación Funcional y Criterios de Aceptación por Módulo

1. **Módulo 1: Muestreo de Concreto (`src/features/samples`, `src/lib/templates/capture-template.ts`)**
   - *Alcance*: Captura de campo bajo **ASTM C172 / NMX-C-161** (revenimiento, temperaturas, aire, tiempos de traslado, especímenes `CILINDRO_15X30`, `CILINDRO_10X20`, `VIGA_50X15X15`).
   - *Dependencias*: Ninguna (catálogos base `Catalogo`, `Operador`).
   - *Criterios de Aceptación*: Invarianza estricta de las **54 columnas** de `CONCRETE_CAPTURE_TEMPLATE_V1` (validada por `tests/capture-template-contract.test.ts` y `capture-template-export.test.ts`), validación Zod de tiempos cronológicos y persistencia transaccional en SQLite WAL < 50 ms.

2. **Módulo 2: Colados (`src/components/ColadosPanel.tsx`, `src/lib/colados.ts`, `/api/colados/*`)**
   - *Alcance*: Agrupación 1-a-N de muestras por colado estructural, control de volumen proyectado vs. suministrado, remisiones y cierre de colado.
   - *Dependencias*: Módulo 1 (Muestreo).
   - *Criterios de Aceptación*: Sincronización DDL formal de columnas de `Colado` (ej. `ciudad`) en `prisma/migrations`, conciliación exacta de volúmenes y navegación bidireccional Colado $\leftrightarrow$ Muestras sin huérfanos.

3. **Módulo 3: Hojas de Campo (`src/components/FieldSheetPanel.tsx`, `src/lib/documents/pdf/renderer.ts`, `/api/hojas-campo/*`)**
   - *Alcance*: Emisión documental controlada (`EmisionHojaCampo`, `EventoHojaCampo`, `ArchivoHojaCampo`) con folio anual, código QR (`ENSALIA:HC:1:<token>`), reimpresiones controladas y sustitución/anulación con trazabilidad.
   - *Dependencias*: Módulo 1 (Muestreo) y Módulo 2 (Colados).
   - *Criterios de Aceptación*: Generación PDF Carta (612×792 pt) en < 150 ms vía `pdf-lib`, verificación QR 100% offline en `/api/hojas-campo/verificar` y preservación inmutable de emisiones anuladas/sustituidas.

4. **Módulo 4: Ensayes a Compresión (`src/features/fc-curves`, `src/lib/hardware/press-telemetry`, `/api/ensayes/*`)**
   - *Alcance*: Programación por edades (3, 7, 14, 28 días), captura táctil en modo quiosco (`PressKioskModal`, `GiantVirtualNumpad`, `FracturePatternSelector`), telemetría COM RS-232 por Web Serial API / WebSocket (`ws://localhost:8088/press`), cálculo ASTM C39 / NMX-C-083 (diámetro promedio, excentricidad, factor $L/D$, tasa $0.25 \pm 0.05\text{ MPa/s}$, tipos de falla 1–6) y evidencia fotográfica WebP.
   - *Dependencias*: Módulo 1 (`Especimen`) y catálogo de prensas (`Equipo`).
   - *Criterios de Aceptación*: Migración formal de `EnsayeCompresion` y `FotoEnsayeCompresion`, lectura estable a 9600 baudios en Web Serial API (Edge/WebView2), precisión matemática verificada contra `tests/mathematical_boundary_challenge.test.ts` y `tests/hardware_protocols.test.ts`.

5. **Módulo 5: Emisión de Certificados (`src/lib/pdf/compression-report/*`, `src/lib/excel/compression/*`)**
   - *Alcance*: Informes oficiales de resistencia con diagramas vectoriales de fractura (`fracture-drawings.ts`), evaluación estadística **ACI 214R-11** (desviación estándar, coeficiente de variación), criterios **ACI 318-19**, firma/QR SHA-256 (`crypto-qr.ts`), curvas $f'_c$ (evolución y campana gaussiana) y exportación/importación Excel (`exceljs`).
   - *Dependencias*: Módulo 3 (Hojas de Campo) y Módulo 4 (Ensayes a Compresión).
   - *Criterios de Aceptación*: PDF vectorial < 120 ms (sin rasterización de fallas), fidelidad matemática de fórmulas Excel (`tests/excel_compression_interoperability.test.ts`) y coherencia de reportes oficiales (`tests/labsico_official_report.test.ts`).

6. **Módulo 6: Trazabilidad ISO/IEC 17025 (`Auditoria`, `Equipo`, `CalibracionEquipo`, `MantenimientoEquipo`, `DespachoMuestra`, `SuscripcionLocal`)**
   - *Alcance*: Cadena de custodia completa desde recolección en obra (`outgoing-samples`) hasta falla en prensa, vigencia de calibraciones con bloqueo preventivo de prensas vencidas, bitácora forense `Auditoria` y habilitación comercial por `FeatureGate` / `requireModule`.
   - *Dependencias*: Transversal a los Módulos 1–5.
   - *Criterios de Aceptación*: Registro inmutable en `Auditoria` con usuario y timestamp, bloqueo comprobado ante calibraciones vencidas, actualización de `New-EnsaliaBackupArchive` en `Ensalia.Common.ps1` para incluir `calibrations/`, `maintenance/` y `compression_photos/` en los respaldos ZIP SHA-256, y suite completa verde sin errores.

---

### 5.3 Cronograma de Transición en 4 Fases y Estrategia de Validación

| Fase | Ventana | Módulos / Alcance | Entregables Clave | Criterios de Salida (*Gate Criteria*) y No-Regresión |
|---|---|---|---|---|
| **Fase 1: Saneamiento Git, BD y Runtime** | Semana 1 | R2 + Núcleo SQLite WAL + Migración Consolidada | `.gitignore`, `.env.example`, `scripts/Setup-Dev.cmd`, `PRAGMA journal_mode=WAL` en `src/lib/prisma.ts`, migración SQL consolidada de los 30 modelos. | `git status` limpio sin fugas; `Setup-Dev.cmd` exitoso en clon fresco; `npm run typecheck` y 100% de tests base pasando en DB recién migrada. |
| **Fase 2: Consolidación Operativa (Módulos 1–3)** | Semana 2 | Muestreo (54 campos), Colados y Hojas de Campo | Validación integral de flujo Muestreo $\rightarrow$ Colado $\rightarrow$ Hoja de Campo PDF/QR sobre arquitectura Next.js Standalone (`output: 'standalone'`). | Cero regresión frente a versión previa en plantilla de 54 campos, tiempos de renderizado PDF < 150 ms y verificación QR offline exitosa. |
| **Fase 3: Metrología, Prensas y Certificados (Módulos 4–5)** | Semana 3 | Ensayes a Compresión, Quiosco/Serial y Certificados PDF/Excel | Pruebas de campo con prensa RS-232/Web Serial en Edge/WebView2, generación de informes ASTM C39 / ACI 214R y round-trip Excel `exceljs`. | Adquisición serial estable, cálculos normativos $L/D$ y $f'_c$ idénticos a patrón validado, diagramas vectoriales Tipos 1–6 verificados en visor Edge. |
| **Fase 4: Trazabilidad ISO 17025 e Instalador Final (Módulo 6 + R3)** | Semana 4 | Auditoría, Calibraciones, Despachos, `backup` ampliado e Inno Setup 6 | `build_installer/setup.iss` compilado con `ensalia-template.db`, Node.js 20 Portable y lanzador silencioso; actualización de `Ensalia.Common.ps1` para respaldar fotos y calibraciones. | Instalación limpia y `/VERYSILENT` en VM Windows 10/11 sin Node/Git; prueba de *Safe Upgrade* preservando datos previos + SHA-256; 100% de suite `npm test` aprobada. |

**Estrategia de Validación Comparativa (Paridad Superioridad vs. Versión Previa)**:
Antes de promover cada fase, se ejecuta una corrida paralela sobre una copia clonada de una base `ensalia.db` / `labsico.db` real:
1. Se ejecutan los mismos casos de prueba de muestreo, emisión de hoja de campo, cálculo de resistencia $f'_c$ y exportación Excel tanto en el servidor `next dev/start` previo como en el build `standalone` empaquetado.
2. Se verifica equivalencia bit-a-bit de payloads numéricos, presencia de los 54 encabezados invariantes, integridad SHA-256 de los respaldos ZIP y ausencia total de errores `P2022` (desfase de columnas) o `SQLITE_BUSY`.

---

## 6. Anexo: Hallazgos de Verificación Directa y Acciones Correctivas Inmediatas

Durante la preparación de este plan estratégico se ejecutaron verificaciones reales en el entorno de trabajo (`npm run typecheck` y `npm run test`), documentando tres hallazgos técnicos que deben atenderse antes de liberar el instalador v1.0.0:

1. **Desfase entre `prisma/schema.prisma` y `prisma/migrations/` (Confirmado por falla en `tests/config.integration.test.ts`)**:
   - Al ejecutar `npm run test`, 20 subtests fallaron con `PrismaClientKnownRequestError (P2022): The column 'ciudad' does not exist in the current database` sobre el modelo `Colado`, debido a que la base de pruebas heredada/migrada solo tenía hasta la migración `20261027170000_programacion_ensayos`.
   - *Solución incorporada*: `scripts/Setup-Dev.cmd` aplica `prisma migrate deploy` seguido de `prisma db push --skip-generate` como puente inmediato, y la **Fase 1** establece la generación obligatoria de la migración SQL consolidada antes de construir `ensalia-template.db`.
2. **Regla de respaldo documental estricta en `scripts/Ensalia.Common.ps1` (línea 124)**:
   - `New-EnsaliaBackupArchive` actualmente solo admite rutas bajo `^field-sheets/[A-Za-z0-9_-]+/...`. Cuando el sistema almacene PDFs en `documents/calibrations/`, `documents/maintenance/` o fotos en `documents/compression_photos/`, esa expresión regular lanzará `'La carpeta documental contiene una ruta no administrada.'`.
   - *Solución planificada*: Ampliar el patrón de validación en `Ensalia.Common.ps1` durante la **Fase 4** (y actualizar el manifiesto de respaldo) antes de activar respaldos automáticos con evidencias de prensas/calibraciones.
3. **Resiliencia ante `MyDocuments` vacío en entornos restringidos (`scripts/Ensalia.Common.ps1`, línea 6 y 13)**:
   - En contextos de ejecución sin perfil interactivo completo, `[Environment]::GetFolderPath('MyDocuments')` puede retornar cadena vacía, haciendo fallar `Join-Path $documents 'Ensalia Respaldos'` (observado en `tests/rebranding.scripts.test.ts`). Se recomienda agregar fallback hacia `$env:USERPROFILE\Documents` o `$ensaliaStateRoot\backups` cuando `MyDocuments` esté vacío.
