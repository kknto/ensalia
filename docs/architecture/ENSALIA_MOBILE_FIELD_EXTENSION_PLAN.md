# Plan Maestro de Arquitectura y Extensión Móvil de Campo (Offline-First) para ENSALIA

- **Documento:** `docs/architecture/ENSALIA_MOBILE_FIELD_EXTENSION_PLAN.md`
- **Fecha de Emisión:** 2026-11-25
- **Versión:** 1.0.0
- **Clasificación:** Documento Interno de Evaluación Tecnológica, Diseño de Sincronización y Planificación por Fases
- **Alcance de Modificación (R5):** Exclusivamente documental. No modifica código fuente, esquemas Prisma, scripts ni configuraciones de producción actuales.
- **Convención de Trazabilidad:**
  - Los elementos verificados en el código actual se citan con ruta exacta y número de línea o símbolo.
  - Todo componente, campo, endpoint, paquete o capacidad ausente se etiqueta explícitamente como **`[NO EXISTE EN REPO]`**, **`[PROPUESTO]`** o **`[SUPUESTO]`**.

---

## Índice General

1. [Resumen Ejecutivo y Contexto Real de ENSALIA](#1-resumen-ejecutivo-y-contexto-real-de-ensalia)
   - 1.1 [Baseline Técnico Verificado del Repositorio](#11-baseline-técnico-verificado-del-repositorio)
   - 1.2 [Capacidades de Campo Requeridas y Brechas Actuales](#12-capacidades-de-campo-requeridas-y-brechas-actuales)
2. [R1 — Evaluación y Contraste de Opciones Tecnológicas (Android, Web e iOS Opcional)](#2-r1--evaluación-y-contraste-de-opciones-tecnológicas-android-web-e-ios-opcional)
   - 2.1 [Opción 1: React Native / Expo (Offline-First Nativo)](#21-opción-1-react-native--expo-offline-first-nativo)
   - 2.2 [Opción 2: PWA (Progressive Web App sobre Next.js o SPA Desacoplada)](#22-opción-2-pwa-progressive-web-app-sobre-nextjs-o-spa-desacoplada)
   - 2.3 [Opción 3: Capacitor / Ionic sobre React / Next.js Existente](#23-opción-3-capacitor--ionic-sobre-react--nextjs-existente)
   - 2.4 [Matrices Comparativas Multidimensionales](#24-matrices-comparativas-multidimensionales)
   - 2.5 [Recomendación Arquitectónica Fundamentada](#25-recomendación-arquitectónica-fundamentada)
3. [R2 — Estrategia de Compartición de Código y Contratos](#3-r2--estrategia-de-compartición-de-código-y-contratos)
   - 3.1 [Inventario Clasificado de Módulos Existentes (A, B y C)](#31-inventario-clasificado-de-módulos-existentes-a-b-y-c)
   - 3.2 [Análisis de la Frontera HTTP/JSON y Contratos de API Existentes](#32-análisis-de-la-frontera-httpjson-y-contratos-de-api-existentes)
   - 3.3 [Estructura Propuesta de Paquetes Compartidos y Compatibilidad con Windows Standalone](#33-estructura-propuesta-de-paquetes-compartidos-y-compatibilidad-con-windows-standalone)
4. [R3 — Arquitectura de Sincronización Segura Offline-First](#4-r3--arquitectura-de-sincronización-segura-offline-first)
   - 4.1 [Almacenamiento Offline Local en Dispositivo Móvil](#41-almacenamiento-offline-local-en-dispositivo-móvil)
   - 4.2 [Protocolo de Sincronización, Idempotencia y Resolución de Conflictos](#42-protocolo-de-sincronización-idempotencia-y-resolución-de-conflictos)
   - 4.3 [Concurrencia SQLite en el Servidor Windows](#43-concurrencia-sqlite-en-el-servidor-windows)
   - 4.4 [Transferencia de Fotos Forenses y Remediación de Almacenamiento/Respaldo](#44-transferencia-de-fotos-forenses-y-remediación-de-almacenamientorespaldo)
   - 4.5 [Captura de Coordenadas GPS Estructuradas](#45-captura-de-coordenadas-gps-estructuradas)
   - 4.6 [Seguridad, Autenticación de Dispositivos, RBAC y Licenciamiento](#46-seguridad-autenticación-de-dispositivos-rbac-y-licenciamiento)
   - 4.7 [Conectividad con el Servidor Windows de Laboratorio](#47-conectividad-con-el-servidor-windows-de-laboratorio)
5. [R4 — Plan de Desarrollo por Fases (Modular, Secuencial y Viable)](#5-r4--plan-de-desarrollo-por-fases-modular-secuencial-y-viable)
   - 5.1 [Mapa de Dependencias entre Fases](#51-mapa-de-dependencias-entre-fases)
   - 5.2 [Especificación Detallada de Fases (Fase 0 a Fase 5)](#52-especificación-detallada-de-fases-fase-0-a-fase-5)
   - 5.3 [Checklist Global de Verificación y Gates de Calidad](#53-checklist-global-de-verificación-y-gates-de-calidad)

---

## 1. Resumen Ejecutivo y Contexto Real de ENSALIA

**ENSALIA** opera actualmente como una aplicación monolítica local para Windows orientada a laboratorios de control de calidad de concreto y materiales de construcción bajo normas ASTM/NMX/ACI e ISO/IEC 17025. Para extender su operación hacia brigadas de campo (muestreo de concreto fresco, revenimiento, temperatura, moldeo de especímenes, evidencia fotográfica forense, coordenadas GPS y recolección logística en obra sin conexión estable a internet), es necesario evaluar opciones tecnológicas realistas y diseñar una arquitectura de sincronización que respete el núcleo existente sin comprometer la integridad de la base de datos SQLite ni el empaquetado actual en Windows.

### 1.1 Baseline Técnico Verificado del Repositorio

La inspección directa del repositorio en `c:\Users\ccanto\Desktop\ENSALIA` confirma las siguientes condiciones reales de partida:

| Dimensión | Estado Verificado en el Repositorio | Evidencia / Archivo Exacto |
|---|---|---|
| **Control de versiones** | El directorio de trabajo **no** contiene un repositorio `.git` inicializado (`git status` reporta ausencia de `.git`). | Raíz `c:\Users\ccanto\Desktop\ENSALIA` |
| **Framework Web y UI** | Next.js `^15.5.4` (App Router), React `^19.1.1`, TypeScript `^5.9.2` (`strict: true`, `allowJs: false`, alias `@/* -> ./src/*`). **No usa Tailwind CSS**, PostCSS ni configuración ESLint; utiliza CSS puro con variables en `tokens.css` (96 líneas) y `globals.css` (1,423 líneas). | `package.json:16-35`, `tsconfig.json:1-21`, `src/styles/tokens.css`, `src/app/globals.css:1` |
| **Frontera API / Frontend** | **62** Route Handlers (`route.ts`) bajo `src/app/api/**`, **0** Server Actions (`"use server"`), **0** consultas a BD en Server Components. La UI (`src/app/page.tsx`, `ColadosPanel.tsx`, etc.) es `"use client"` y consume `/api/**` vía `fetch()`. | `src/app/page.tsx:1-904`, `src/app/api/**` |
| **Validación y Librerías** | Zod `^3.25.76`, `lucide-react` `^1.64.0`, `exceljs` `^4.4.0`, `pdf-lib` `^1.17.1`, `qrcode` `^1.5.4`, `tsx` `^4.19.2`. Sin librerías cliente de caché/estado offline (sin TanStack Query, Dexie, Workbox ni Serwist). | `package.json:16-35` |
| **ORM y Base de Datos** | Prisma `^6.16.2` con SQLite (`30` modelos, `25` enums, `10` migraciones hasta `20261125120000_ensalia_core_consolidation`). `.env` apunta a `C:/Users/ccanto/AppData/Local/LABSICO/data/labsico.db`; `.env.example` usa `file:./ensalia-dev.db?connection_limit=1&busy_timeout=5000`; `scripts/Ensalia.Common.ps1:10-44` resuelve `%LOCALAPPDATA%\LABSICO\data\labsico.db` (`legacy-alias`) o `%LOCALAPPDATA%\Ensalia\data\ensalia.db` (`native`). | `prisma/schema.prisma:1-922`, `.env:1-2`, `.env.example:9`, `scripts/Ensalia.Common.ps1:10-44` |
| **Concurrencia SQLite** | `src/lib/prisma.ts:1-5` instancia `new PrismaClient()` sin ejecutar `PRAGMA journal_mode = WAL` ni `busy_timeout`. `Get-EnsaliaDatabaseUrl` (`scripts/Ensalia.Common.ps1:54-57`) genera `file:<ruta>` **sin** `?connection_limit=1&busy_timeout=5000` (solo `build_installer/setup.iss:201` lo agrega durante migraciones). | `src/lib/prisma.ts:1-5`, `scripts/Ensalia.Common.ps1:54-57`, `build_installer/setup.iss:201` |
| **Build Standalone y Empaquetado Windows** | `next.config.ts:1-7` únicamente define `{ poweredByHeader: false }`; **`output: "standalone"` aún no está habilitado** a pesar de que `build_installer/setup.iss:71-78` asume su existencia junto con `build_payload/` (aún ausente en disco). | `next.config.ts:1-7`, `build_installer/setup.iss:68-95` |
| **Red Local y Seguridad** | `scripts/Start-Ensalia.ps1:19-52` busca puerto libre en `127.0.0.1:3210..3299`, levanta HTTP plano (`http://127.0.0.1:$port`) y fuerza `$env:ENSALIA_REQUIRE_ACCESS_CODE = 'false'` (`línea 26`). `src/lib/auth.ts:4-25` confía en `x-operator-name` (auto-upsert en `Operador`), no existe `src/middleware.ts`, ni cookies, ni JWT, ni RBAC, ni CORS. | `scripts/Start-Ensalia.ps1:19-52`, `src/lib/auth.ts:4-25` |
| **PWA / Offline Actual** | `public/manifest.json` (624 B) y meta etiquetas en `src/app/layout.tsx:14-35`, pero `icon-192.png` y `icon-512.png` no existen en `public/` y no hay Service Worker ni IndexedDB. | `public/manifest.json:1-25`, `src/app/layout.tsx:14-35` |
| **Divergencia Almacenamiento vs Respaldo** | `src/lib/documents/storage.ts:10` restringe a `^field-sheets/...` y lee `ENSALIA_DOCUMENTS_DIR`; `src/lib/storage/local-files.ts:5-22` ignora `ENSALIA_DOCUMENTS_DIR` y escribe `calibrations`, `compression_photos`, `field_sheets`, `scans`; mientras `scripts/Ensalia.Common.ps1:127` y `scripts/Restore-Ensalia.ps1:34` lanzan error si cualquier archivo bajo `DocumentsDir` no coincide con `^field-sheets/...`. | `src/lib/documents/storage.ts:4-15`, `src/lib/storage/local-files.ts:5-65`, `scripts/Ensalia.Common.ps1:124-133`, `scripts/Restore-Ensalia.ps1:34` |

### 1.2 Capacidades de Campo Requeridas y Brechas Actuales

El flujo operativo de campo abarca:
1. Consulta y apertura de `Colado` en obra, captura de `Muestra` (cliente, obra, elemento, remisión, camión, horarios cronológicos de descarga, revenimiento, temperatura ambiente/concreto, aire, equipo utilizado) y registro de hasta 4 `Especimen` (`CILINDRO_15X30`, `CILINDRO_10X20`, `VIGA_50X15X15`).
2. Control de asignación de moldes y equipo portátil (`Equipo` / `AsignacionEquipo`) y monitoreo logístico de recolección antes del límite de 48 horas de curado inicial (`DespachoMuestra` / `ItemDespachoMuestra`).
3. Capacidades móviles esenciales: operación **offline prolongada en obra**, **fotos forenses** con integridad verificable y metadatos de captura, y **geolocalización GPS** estructurada.

A continuación se explicitan las brechas respecto al estado actual del repositorio:

- **GPS Estructurado `[NO EXISTE EN REPO]`**: Solo existe el campo de texto libre `coordenadasColado String?` en `Muestra` (`prisma/schema.prisma:163`) y `Colado` (`prisma/schema.prisma:253`). No existen columnas numéricas (`latitud`, `longitud`, `precisionM`, `altitudM`, `gpsCapturadoEn`, `gpsEstado`) ni llamadas a APIs de ubicación.
- **Fotos Forenses de Muestreo/Campo `[NO EXISTE EN REPO]`**: El modelo `FotoEnsayeCompresion` (`prisma/schema.prisma:880-899`) y `CylinderBreakCaptureModal.tsx` aplican únicamente a roturas de compresión en laboratorio. No existe un modelo `FotoMuestra` o `FotoDespacho`, ni extracción/validación de EXIF, ni hash SHA-256 calculado en el dispositivo antes del envío.
- **Persistencia Offline y Cola de Mutaciones `[NO EXISTE EN REPO]`**: No existe Service Worker, IndexedDB, SQLite embebido en cliente ni cola outbox.
- **Protocolo de Sincronización e Idempotencia `[NO EXISTE EN REPO]`**: Aunque `Muestra`, `Colado` y `Equipo` poseen `version Int @default(0)` para concurrencia optimista y existe `Auditoria`, no existen endpoints `/api/sync/*`, ni `clientMutationId` en entidades de campo (solo `CargaInventario.idempotencyKey` en `prisma/schema.prisma:537`), ni `deviceId`, ni borrado lógico (*tombstones*).
- **Autenticación Remota y Control por Dispositivo `[NO EXISTE EN REPO]`**: `src/lib/auth.ts` está diseñado exclusivamente para `127.0.0.1` monousuario; no soporta tokens firmados, enrollment de tabletas/teléfonos ni roles (`CAMPO` vs `LABORATORIO`).
- **Habilitación Comercial para Extensión Móvil `[NO EXISTE EN REPO]`**: `CodigoModulo` (`prisma/schema.prisma:662-674`) contempla `HOJAS_CAMPO`, `LOGISTICA_SALIDAS`, `DIGITALIZACION_OCR`, etc., y `SuscripcionLocal.dispositivosMaximos` existe (`prisma/schema.prisma:685`), pero no hay un módulo específico ni registro de dispositivos vinculados (`DispositivoMovil`).

---

## 2. R1 — Evaluación y Contraste de Opciones Tecnológicas (Android, Web e iOS Opcional)

Se evalúan tres alternativas arquitectónicas para habilitar el trabajo en campo de ENSALIA en **Android** (tabletas y teléfonos de obra como plataforma primaria) y **Web** (navegadores en tabletas, laptops de laboratorio u obra conectada), manteniendo **iOS** como objetivo opcional a mediano plazo.

### 2.1 Opción 1: React Native / Expo (Offline-First Nativo)

Consiste en desarrollar una aplicación móvil dedicada en **React Native + Expo SDK** (`[PROPUESTO]`) alojada dentro de un monorepo junto al servidor Next.js 15 existente. Para campo utiliza almacenamiento nativo persistente (`expo-sqlite` o `WatermelonDB` sobre SQLite + `expo-file-system` para fotos binarias), estado reactivo/red con `TanStack Query` (o gestor propio de outbox transaccional), `expo-camera`, `expo-location`, `expo-crypto` y `expo-secure-store`. La compilación para Android se ejecuta con **EAS Build** o compilación local Gradle (`expo prebuild --platform android`) generando APK/AAB instalable directamente en flotillas de campo.

**Cómo cubre Web e iOS:**
- **Web:** Se conserva la aplicación **Next.js 15 existente** para oficina, laboratorio, prensas, reportes PDF y uso web conectado (con mejoras progresivas responsivas), o bien Expo Web únicamente si se quisiera unificar vistas de campo. En la práctica, mantener Next.js 15 como portal Web evita reescribir 11 vistas complejas de laboratorio (`FcStatisticalDashboard`, `FieldSheetPanel`, configuración de perfiles, impresión PDF).
- **iOS (opcional):** El mismo código React Native/Expo compila para iOS mediante EAS Build sin reescribir lógica ni interfaz de campo, requiriendo únicamente cuenta Apple Developer y provisión de perfiles.

**Ventajas clave en el contexto de ENSALIA:**
- Persistencia offline real e inmune a políticas de limpieza del navegador: SQLite nativo y sistema de archivos sandbox no sufren evicción de caché tras días sin abrir la app en obra.
- Acceso directo y confiable a hardware: GNSS nativo (`expo-location` con precisión en metros, proveedor y tiempo de fijación), cámara nativa (`expo-camera` con control de resolución y escritura directa a disco sin saturar memoria JS/WebView) y almacenamiento seguro de tokens en Keystore de Android (`expo-secure-store`).
- Reutilización directa de TypeScript (`strict: true`), `zod ^3.25.76` y reglas puras NMX/ASTM en paquetes compartidos, sin depender de Tailwind CSS (que tampoco existe en ENSALIA).
- **Sin requerir HTTPS público obligatorio para operar offline**: a diferencia de una PWA, el cliente nativo no depende de Secure Context del navegador para activar Service Workers, cámara o GPS; aunque sobre red sí usará HTTPS/VPN hacia el servidor.

**Desventajas y riesgos:**
- Introduce un segundo runtime UI (React Native primitives `View`/`Text`/`Pressable` en lugar de DOM HTML/CSS de `globals.css`), por lo que las vistas de pantalla se construyen específicamente para móvil (si bien optimizadas para uso táctil bajo sol y guantes, lo cual es deseable frente a la UI densa de escritorio).
- Requiere toolchain Android/EAS en CI o equipo de desarrollo y gestión de actualizaciones de binarios APK en dispositivos de obra (mitigable con canales internos/MDM o Expo Updates para parches JS).

### 2.2 Opción 2: PWA (Progressive Web App sobre Next.js o SPA Desacoplada)

Consiste en extender el `manifest.json` actual (`public/manifest.json`) agregando un **Service Worker** (Serwist o Workbox) y almacenamiento offline en navegador mediante **IndexedDB / Dexie.js** (`[PROPUESTO]`), sirviendo rutas móviles desde Next.js 15 o desde un shell SPA estático.

**Impacto crítico del baseline actual de ENSALIA sobre una PWA:**
1. **Bloqueo estricto de Contexto Seguro (HTTPS obligatorio):** En `scripts/Start-Ensalia.ps1:23,50`, ENSALIA corre sobre `http://127.0.0.1:<puerto>`. Los navegadores Android Chrome e iOS Safari permiten Service Workers, `navigator.geolocation` y `navigator.mediaDevices.getUserMedia` en `http://127.0.0.1` **solo en el mismo equipo**; en cuanto una tableta Android se conecta por red local (`http://192.168.x.x:3210`), **el navegador bloquea por completo Service Worker, Cámara WebRTC y GPS** hasta configurar un certificado TLS confiable (CA privada instalada manualmente en cada Android o dominio público con Let's Encrypt).
2. **Riesgo de evaporación de datos en Android Chrome / iOS:** Bajo presión de almacenamiento del teléfono o tras ~7 días de inactividad en Safari/WebKit (iOS) o limpieza de datos de navegación en Chrome, el sistema operativo puede purgar IndexedDB y CacheStorage (`navigator.storage.persist()` es heurístico y no garantiza retención absoluta si el usuario borra caché de Chrome). Perder muestras o fotos de concreto frescas no sincronizadas en obra implica una **falla grave de trazabilidad ISO/IEC 17025**.
3. **Almacenamiento binario pesado en IndexedDB:** Guardar decenas de fotografías forenses de alta resolución como `Blob` dentro de IndexedDB provoca fragmentación, lentitud al serializar y cuotas variables en dispositivos Android económicos.
4. **Incompatibilidad parcial con Next.js SSR/App Shell offline:** Aunque ENSALIA no usa Server Actions, precachear el shell de `src/app/page.tsx` (904 líneas + `globals.css` de 1,423 líneas) exige configurar Serwist/Workbox cuidadosamente sobre `output: "standalone"` o construir un sub-app SPA separada, además de carecer de Background Sync fiable cuando el usuario bloquea la pantalla o Android Doze suspende Chrome.

**Ventajas:**
- Despliegue instantáneo vía URL sin compilar APK ni distribuir por Play Store / sideloading.
- Cobertura simultánea de Web escritorio, Android e iOS desde un único árbol DOM/CSS si la conectividad y TLS están resueltos.

### 2.3 Opción 3: Capacitor / Ionic sobre el React / Next.js Existente

Consiste en envolver una aplicación web React dentro de un contenedor nativo **Capacitor** (`@capacitor/core`, `@capacitor/android`, `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor-community/sqlite`, `@capacitor/filesystem`) para distribuir un APK Android (y opcionalmente IPA iOS) manteniendo UI web.

**Restricción arquitectónica crítica en ENSALIA:**
- Capacitor empaqueta activos web estáticos locales (`webDir`) dentro del APK para funcionar offline. Sin embargo, el proyecto Next.js actual contiene **62 Route Handlers en `src/app/api/**`** y Prisma (`@prisma/client` con motor nativo SQLite de Windows). Next.js **no permite** usar `output: "export"` mientras existan Route Handlers dinámicos en el mismo build, y el empaquetador Windows (`build_installer/setup.iss`) necesita la aplicación servidor (`output: "standalone"`).
- Por tanto, usar Capacitor **no permite "envolver tal cual" el Next.js actual**; obliga igualmente a separar un bundle SPA estático (p. ej. Vite + React o un workspace cliente dedicado) del backend Next.js servidor.
- Adicionalmente, reutilizar `src/app/page.tsx` y `src/app/globals.css` (1,423 líneas diseñadas para escritorio) dentro de un WebView Android genera deuda de rendimiento, desplazamiento pesado y fricción táctil en campo, o bien obliga a introducir Ionic UI / CSS móvil nuevo — reduciendo la promesa de "cero esfuerzo de UI".

**Ventajas:**
- Usa plugins nativos reales (`@capacitor-community/sqlite`, `@capacitor/filesystem`, `@capacitor/camera`, `@capacitor/geolocation`) que evitan la evaporación de IndexedDB y las restricciones de Contexto Seguro de PWA para hardware.
- Permite reutilizar conocimientos de HTML/CSS estándar sin aprender primitivas de React Native, y exportar el mismo paquete para Web.

**Desventajas:**
- Exige desacoplar el frontend estático del proyecto Next.js actual (o mantener doble configuración de build para `output: "export"` vs `standalone`).
- Puente WebView–Nativo más pesado que React Native al manipular flujos binarios de cámara/EXIF/hashing de múltiples fotos y listas grandes en tabletas Android de gama media/baja.
- Mantiene dependencia de WebView de Android (versiones heterogéneas en tabletas económicas de campo).

### 2.4 Matrices Comparativas Multidimensionales

#### Matriz A — Cobertura de Plataformas, Offline, Hardware Forense y Compatibilidad con ENSALIA

| Criterio Evaluado | 1. React Native / Expo (+ Next.js Web existente) | 2. PWA (Next.js + SW + Dexie/IndexedDB) | 3. Capacitor / Ionic (SPA desacoplada + Plugins) |
|---|---|---|---|
| **Android en campo (tabletas/móviles)** | **Óptimo.** Binario nativo APK/AAB, rendimiento fluido en gama media-baja. | **Medio-Bajo.** Depende de Chrome actualizado, TLS válido y gestión de batería/Doze. | **Bueno.** APK nativo sobre Android System WebView; latencia de puente en carga pesada. |
| **Web (oficina / campo conectado)** | **Óptimo.** Mantiene Next.js 15 actual en laboratorio/oficina sin degradación; código de dominio compartido. | **Óptimo.** Nativo en cualquier navegador moderno. | **Bueno.** El shell SPA corre en Web, aunque con adaptadores `Capacitor.isNativePlatform()`. |
| **iOS (opcional a futuro)** | **Alto.** Mismo codebase Expo/RN; requiere build en macOS/EAS. | **Limitado.** Safari purga Storage tras ~7 días sin uso; cámara/background sync restringidos. | **Alto.** Mismo codebase + plugins iOS; requiere Xcode/EAS. |
| **Offline prolongado (días en obra)** | **Óptimo.** `expo-sqlite` + sandbox persistente; cero evicción por el SO. | **Riesgoso.** Sujeto a cuotas de navegador y evicción de IndexedDB/CacheStorage. | **Óptimo.** `@capacitor-community/sqlite` + `@capacitor/filesystem` nativos. |
| **Fotos forenses (EXIF, SHA-256, resolución)** | **Óptimo.** `expo-camera` + `expo-file-system` + `expo-crypto` en disco sin saturar RAM. | **Limitado.** WebRTC/input file pierden o sanitizan EXIF en Android; Blobs pesados en IndexedDB. | **Bueno.** `@capacitor/camera` lee archivo nativo; hashing requiere WebCrypto/plugin. |
| **GPS fiable en campo** | **Óptimo.** `expo-location` con `Accuracy.High/BestForNavigation` y metadatos de precisión. | **Medio-Bajo.** `navigator.geolocation` bloqueado sin HTTPS; falla frecuente en segundo plano. | **Óptimo.** `@capacitor/geolocation` usa FusedLocationProvider en Android. |
| **Compatibilidad con stack ENSALIA** | **Alta en lógica/contratos.** Comparte TS 5.9 + Zod 3.25 + reglas NMX/ASTM; Next.js sigue intacto para Windows standalone. | **Alta en código web, pero choca en red.** Choca con `127.0.0.1` HTTP (`Start-Ensalia.ps1`) y falta `output: "standalone"` / Tailwind. | **Media.** Next.js actual con 62 `/api/**` no soporta `output: "export"`; exige extraer SPA aparte y mantener doble build. |
| **Experiencia de equipo (DX) y mantenimiento** | **Medio-Alto.** Requiere disciplina en monorepo y ciclo de builds Expo/Android, compensado por tipado único TS/Zod. | **Alto al inicio, alto riesgo operativo después.** Depurar cache invalidation de SW y TLS en campo es costoso. | **Medio.** Mantiene HTML/CSS, pero exige mantener wrappers de plataforma y sincronización de plugins nativos. |
| **Costo total de propiedad (TCO) 24 meses** | **Óptimo.** Menor costo de soporte en campo (cero pérdida de datos/fotos) y UI de escritorio intacta. | **Alto oculto.** Incidentes por TLS en PCs de laboratorio y pérdida de muestras offline. | **Medio-Alto.** Costo de desacoplar UI actual + mantener WebView/plugins + Next.js separado. |

#### Matriz B — Ponderación Técnica para Decisión Arquitectónica (Escala 1 a 5)

| Dimensión (Peso) | React Native / Expo | PWA | Capacitor / Ionic |
|---|:---:|:---:|:---:|
| Confiabilidad offline y cero pérdida de datos (25%) | **5** (1.25) | **2** (0.50) | **4.5** (1.13) |
| Captura forense de fotos + GPS fiable (20%) | **5** (1.00) | **2** (0.40) | **4** (0.80) |
| Compatibilidad con servidor Windows HTTP/SQLite/Inno Setup (20%) | **4.5** (0.90) | **2** (0.40) | **3.5** (0.70) |
| Reutilización de código TS/Zod/NMX/API (15%) | **4.5** (0.68) | **5** (0.75) | **4.5** (0.68) |
| Cobertura Android + Web + iOS opcional (10%) | **4.5** (0.45) | **3.5** (0.35) | **4.5** (0.45) |
| Mantenibilidad y ergonomía táctil en obra (10%) | **4.5** (0.45) | **3.5** (0.35) | **3.5** (0.35) |
| **Puntaje Ponderado Total** | **4.73 / 5.00** | **2.75 / 5.00** | **4.11 / 5.00** |

### 2.5 Recomendación Arquitectónica Fundamentada

**Decisión recomendada:** Adoptar una **arquitectura de doble cliente con núcleo compartido**:
1. **Cliente Nativo de Campo en React Native / Expo (`apps/mobile`, `[PROPUESTO]`)** como aplicación primaria para brigadas en obra sobre **Android** (con compatibilidad estructural para **iOS opcional**).
2. **Continuidad del Portal Web Next.js 15 existente (`src/` / `apps/web`)** como consola de laboratorio, administración, reportes PDF, curvas $f'_c$, digitalización y operación web conectada (en PC de laboratorio, laptops y tabletas dentro de la red), sin destruir su diseño ni el empaquetado `build_installer/setup.iss`.
3. **Paquetes Isomórficos Compartidos (`packages/*`, `[PROPUESTO]`)** para concentrar en un solo punto de verdad los tipos, esquemas Zod, validaciones NMX/ASTM y contratos de sincronización consumidos tanto por Expo como por Next.js.

**Justificación técnica frente a las alternativas descartadas:**
- **Por qué no PWA como app principal de campo:** En un laboratorio que opera sobre PC Windows local (`http://127.0.0.1:3210..3299`, sin infraestructura TI ni PKI propia), obligar a instalar certificados raíz TLS en cada teléfono Android solo para desbloquear Service Workers, cámara y GPS introduce un fallo operativo constante; además, el riesgo de evicción de IndexedDB con fotografías forenses sin sincronizar es inaceptable bajo acreditación ISO/IEC 17025. (Una PWA ligera o caché de lectura en Next.js Web puede agregarse después de forma complementaria para tablets conectadas en laboratorio, pero **no** como motor offline de obra).
- **Por qué no Capacitor sobre el Next.js actual:** El repositorio tiene 62 API Routes en el mismo proyecto Next.js que además debe compilarse con `output: "standalone"` para `build_installer/setup.iss`. Capacitor exigiría extraer una SPA estática independiente de todos modos, heredando además la pesada hoja `globals.css` (1,423 líneas) orientada a escritorio sin ofrecer ventajas frente a Expo en manejo nativo de cámara, archivos binarios y SQLite.

---

## 3. R2 — Estrategia de Compartición de Código y Contratos

La inspección del código fuente demuestra que ENSALIA ya posee una separación de capas favorable para compartir lógica: **no utiliza Server Actions** ni **consultas directas a Prisma desde Server Components**, sino que toda la interfaz se comunica vía HTTP/JSON (`fetch`) con `/api/**`.

### 3.1 Inventario Clasificado de Módulos Existentes (A, B y C)

#### (A) Reutilizable Directamente (Sin Refactor Funcional)

Módulos en TypeScript estricto con cero dependencias de Node.js (`node:*`), Next.js (`next/*`), DOM o `@prisma/client`:

| Archivo Verificado | Símbolos Clave | Dependencias | Uso en Móvil / Compartido |
|---|---|---|---|
| `src/features/samples/types.ts` (1–243) | `View`, `Status`, `Specimen`, `Sample`, `textFields`, `numberFields`, `dateTimeFields`, `states`, `localDate()`, `emptySample()`, `dateOnly()`, `dateTime()`, `inputDateTime()`, `statusLabel()`, `prepareForForm()` | Solo `@/lib/civil-date` + `Intl.DateTimeFormat("America/Cancun")`. **Nota:** NO contiene esquemas Zod. | Reutilizable en formularios móviles, formateo de fechas civiles y mapeo de etiquetas. (`View` solo aplica a navegación web). |
| `src/lib/civil-date.ts` | `addCivilDays()` y utilidades de fechas civiles | JS estándar (`Date.UTC`, `Intl`) | Reutilizable 100% para cálculo local de fechas de ensaye (3, 7, 14, 28 días). |
| `src/lib/validation.ts` (1–139) | `specimenSchema`, `muestraSchema` (`.superRefine()` cronología `[salidaPlanta, llegadaObra, inicioDescarga, finDescarga]` y números únicos de espécimen), `validateRanges()` (`revenimientoCm` `0..40`, `contenidoAirePct` `0..100`, `tempAmbienteC`/`tempConcretoC` `-30..80`, `numeroEspecimenes === especimenes.length`), `transitionBodySchema`, `tipoEquipoSchema`, `equipoSchema`, `equipoPatchSchema`, `cambioEstadoEquipoSchema`, `calibracionEquipoSchema`, `asignarEquiposSchema`, `devolverEquiposSchema`, `coladoSchema`, `coladoPatchSchema`, `crearMuestrasColadoSchema`, `vincularMuestraColadoSchema` | Solo `zod` (`^3.25.76`) | **Núcleo de validación compartido** entre formulario offline móvil y Route Handlers `/api/muestras`, `/api/colados`, `/api/equipos`. |
| `src/features/fc-curves/types.ts` (1–70) | `TipoFallaConcreto`, `FotoEnsaye`, `EnsayeItem`, `EstadisticasFc` | Ninguna (0 imports) | Tipos compartidos para consulta de resultados $f'_c$. |
| `src/features/outgoing-samples/types.ts` (1–62) | `EstadoCurado`, `PendingSample`, `DispatchItem`, `DispatchManifest` | Ninguna (0 imports) | Contratos compartidos para módulo logístico de recolección en campo. |
| `src/lib/config/schema.ts` (1–110) | `profileConfigurationSchema`, `catalogValueSchema`, `createProfileSchema`, `createVersionSchema`, `importProfileSchema`, `EXPORTABLE_COLUMN_KEYS` | Solo `zod` | Permite cachear en móvil el `ProfileConfiguration` activo para validar campos obligatorios y reglas de equipos offline. |
| `src/lib/documents/schema.ts` (1–15) | `issueFieldSheetSchema`, `cancelFieldSheetSchema`, `reprintFieldSheetSchema` | Solo `zod` | Validación de payload en emisión/verificación de hojas de campo. |
| `src/lib/field-document-control.ts` (1–107) | `FIELD_DOCUMENT_STATES`, `canTransitionFieldDocument()`, `validateFieldDocumentIdentity()`, `validateFieldCorrection()`, `ocrEvidenceRequiresReview()`, `validateOcrEvidence()`, `reprintLabel()` | Ninguna | Reglas de control documental y QR de hojas de campo en móvil. |
| `src/lib/ocr/quality.ts` (1–34) y `review.ts` (1–48) | `evaluateImageQuality()` (resolución `>= 1200x1600`, nitidez, contraste, reflejo, cobertura, sesgo), `createReviewSession()`, `reviewField()`, `confirmReview()` | Solo `./types` | Permite pre-evaluar en el teléfono la calidad de un escaneo/foto de hoja de campo antes de sincronizarla. |
| `src/lib/hardware/press-telemetry/engine.ts` (1–170) | Motor de telemetría ASTM C39 §7.5.1 (`0.25 MPa/s`, detección de rotura `< 85%` pico) | `performance.now()` | Reutilizable en futuras integraciones Bluetooth/WebSocket de prensa o tablet de laboratorio. |

#### (B) Requiere Adaptación o Desacoplamiento Ligero

Módulos con lógica de negocio valiosa actualmente acoplada a `@prisma/client`, `node:crypto` o incrustada dentro de rutas API:

| Archivo / Ubicación Verificada | Acoplamiento Detectado | Estrategia de Desacoplamiento `[PROPUESTO]` |
|---|---|---|
| `src/lib/pdf/compression-report/metrology.ts` (línea 2) y `types.ts` (línea 1) | Importan `TipoFallaConcreto` desde `@prisma/client` (`metrology.ts` contiene cálculos ASTM C39 §6.2 excentricidad `<= 2.0%`, factor L/D Tabla 1 `1.00..2.00`, tolerancias de edad NMX-C-083 y estadísticas ACI 214R / 318-19). | Reemplazar el import de `@prisma/client` por un tipo/constante pura en `packages/domain-core` (idéntico al ya definido en `src/features/fc-curves/types.ts`). |
| `src/lib/config/operational.ts` (1–64) | Mezcla helpers puros (`readProfileConfiguration`, `validateConfiguredFields`, `validateSpecimenRules`, `equipmentRuleError`) con `nextSampleFolio(tx: Prisma.TransactionClient, ...)` (líneas 1 y 31–39). | Mover `nextSampleFolio` a un archivo servidor (`src/lib/config/folios.server.ts`) y exportar las funciones puras hacia `packages/domain-core` para validar reglas de perfil en el móvil offline. |
| `src/features/subscriptions/context/SubscriptionContext.tsx` y `FeatureGate.tsx` (línea 4) | Importan `CodigoModulo` y `NivelSuscripcion` desde `@prisma/client`. | Definir los enums como `const` / uniones TypeScript en `packages/domain-core` (agregando el futuro módulo de campo móvil) y re-exportarlos tanto en Web como en Expo. |
| `src/app/api/despachos/pendientes/route.ts` (líneas 34–46) | Regla normativa ASTM C31 / NMX-C-109 de 48h (`NORMAL` `<24h`, `ADVERTENCIA` `24-36h`, `CRITICO` `36-48h`, `VENCIDO` `>48h`) implementada inline dentro del Route Handler. | Extraer a función pura `evaluateCuringAlertWindow(fechaMuestreo, now)` en `packages/domain-core` para mostrar semáforos idénticos offline en la app de choferes/campo. |
| `src/app/api/ensayes/route.ts` (líneas 64–106, 146–196) | Duplica inline el cálculo de área, conversión `KN <-> KGF` (`101.97162`), resistencia (sin factor L/D) y umbrales ACI 214R. | Unificar en el módulo puro `metrology` extraído a `packages/domain-core` y eliminar duplicación. |
| Esquemas Zod inline en rutas API (`ensayes/route.ts:9-22`, `despachos/route.ts:9-23`, `despachos/[id]/route.ts:13-29`, `catalogos/route.ts:9`, `colados/[id]/[accion]/route.ts:9`, `ensayos/schedule.ts:8-24`) | Usan `z.nativeEnum(...)` importado de `@prisma/client` y no están exportados para clientes. | Reemplazar `z.nativeEnum(PrismaEnum)` por `z.enum([...])` respaldados por constantes puras en `packages/api-contracts`, manteniendo compatibilidad de tipos con Prisma en el servidor. |
| `src/lib/inventory/bulk.ts` (1–62) | Sus esquemas exportados (`bulkInventoryRowSchema`, `bulkInventorySchema` en líneas 6–23) usan `z.enum(...)`, pero el módulo acopla `node:crypto` (`línea 1`) y `Prisma.TransactionClient` (`líneas 2, 27`). | Extraer `bulkInventoryRowSchema` y `bulkInventorySchema` a `packages/api-contracts` sin refactorizar su lógica Zod, dejando `bulkInventoryHash` y `validateBulkInventory` en servidor. |
| `src/lib/ocr/files.ts` (1–88) y `src/lib/documents/qr-verification.ts` | Importan `node:crypto` (`createHash`, `randomUUID`). | En móvil no se valida PDF servidor ni `node:crypto`; abstraer interfaz `Hasher` (`sha256Hex(bytes)`) implementada con `node:crypto` en servidor y `expo-crypto` / `crypto.subtle` en clientes. |

#### (C) No Reutilizable en Nativo (Exclusivo de Capa Web o Servidor)

| Categoría | Archivos Representativos | Motivo |
|---|---|---|
| **Hojas de estilo y diseño DOM** | `src/styles/tokens.css`, `src/app/globals.css` (1,423 líneas), ausencia de Tailwind | React Native usa `StyleSheet` / tokens JS; solo pueden compartirse valores numéricos/hex de color como tokens de marca si se exportan a TS. |
| **Componentes UI Web** | `src/app/page.tsx`, `src/components/ColadosPanel.tsx`, `FieldSheetPanel.tsx`, `OutgoingSamplesDashboard.tsx`, `FcStatisticalDashboard.tsx`, `CylinderBreakCaptureModal.tsx` | Dependen de DOM HTML (`div`, `input`, `localStorage`, `window`, WebRTC `canvas`). |
| **Route Handlers y Capa Prisma/FS** | `src/app/api/**/route.ts` (62 rutas), `src/lib/prisma.ts`, `src/lib/auth.ts`, `src/lib/documents/storage.ts`, `src/lib/storage/local-files.ts`, `src/lib/pdf/**` (`pdf-lib`, `node:fs`) | Exclusivos del runtime Node.js en el servidor Windows. |

### 3.2 Análisis de la Frontera HTTP/JSON y Contratos de API Existentes

Debido a que todas las operaciones cliente pasan por Route Handlers REST bajo `src/app/api/**`, la superficie de contratos existentes es clara y reutilizable:

| Grupo de Endpoints | Rutas Verificadas | Comportamiento Actual Relevante para Móvil | Brechas para Operación Offline/Móvil |
|---|---|---|---|
| **Colados** | `/api/colados` (`GET`, `POST`), `/api/colados/[id]` (`GET`, `PATCH`), `/api/colados/[id]/muestras` (`GET`, `POST`), `/api/colados/[id]/muestras/vincular` (`POST`), `/api/colados/[id]/[accion]` (`POST` `cerrar`/`anular`), `/api/colados/[id]/hoja-campo/pdf` (`GET`) | Usa transacciones Prisma `$transaction`, bloqueo optimista con `version`, generación de folio con `nextSampleFolio`, y registro en `Auditoria`. | Falta `clientMutationId` en `POST` (reintentos crearían colados/muestras duplicados), falta filtro incremental `updatedSince` para sincronización delta. |
| **Muestras y Equipos** | `/api/muestras` (`GET`, `POST`), `/api/muestras/[id]` (`GET`, `PATCH`), `/api/muestras/[id]/[accion]` (`POST` `revisar`/`cerrar`/`anular`), `/api/muestras/[id]/equipos` y `/devolver`, `/api/muestras/[id]/hoja-campo/emisiones` | `POST /api/muestras` crea un `Colado` sintético (`esSintetico: true`) + `Muestra` + `Especimen[]` en una transacción; `PATCH /api/muestras/[id]` bloquea si el colado no está abierto, si la muestra es `CERRADA`/`ANULADA` o si tiene equipo activo (`route.ts:51-53`), reabre `REVISADA -> BORRADOR` (`EDITADA_Y_REABIERTA`, `líneas 68, 85`) y lee `current.version` internamente en el servidor (`línea 62`) sin exigir `version` en `muestraSchema` (a diferencia de `coladoPatchSchema` y `equipoPatchSchema`). | Exigir `version`/`baseVersion` desde el cliente en mutaciones de muestra móvil/sync es `[PROPUESTO]`; no soporta folios temporales offline reconciliados; no acepta GPS estructurado ni fotos de campo; `GET` no exige autenticación (`getOperator`). |
| **Digitalización y QR** | `/api/hojas-campo/verificar` (`POST`), `/api/digitalizacion/analizar` (`POST` `multipart/form-data`, max 15 MB, SHA-256) | Verifica hash SHA-256 del token QR `ENSALIA:HC:1:<43-char-token>` y persiste escaneos en `field-sheets/<id>/scans/`. | Útil tal cual para escanear QR de hojas de campo físicas desde el móvil y verificar emisión vigente. |
| **Despachos (Logística)** | `/api/despachos` (`GET`, `POST`), `/api/despachos/pendientes` (`GET`), `/api/despachos/[id]` (`GET`, `PATCH`) | Protegido por `requireModule(CodigoModulo.LOGISTICA_SALIDAS)`; `PATCH` con `COMPLETADO` actualiza `Muestra.estatusRecoleccion = "RECOLECTADA"`. | `DespachoMuestra` no tiene campo `version` de concurrencia optimista ni `clientMutationId` ni coordenadas GPS del punto de recolección. |
| **Ensayes y Fotos de Rotura** | `/api/ensayes` (`GET`, `POST`), `/api/ensayes/[id]/fotos` (`GET`, `POST` multipart), `/api/ensayes/fotos/[fotoId]` (`GET` binario + `X-Sha256`) | Patrón probado de upload binario multipart + SHA-256 + `rutaRelativa`, protegido por `CURVAS_FC_FOTOS`. | Sirve como referencia arquitectónica para el nuevo endpoint de fotos de campo (`FotoMuestra`), pero no debe mezclarse con el modelo de rotura de prensa. |
| **Soporte y Catálogos** | `/api/equipos`, `/api/catalogos`, `/api/subscription`, `/api/health` | `/api/health` valida conectividad ejecutando `SELECT 1`; `/api/catalogos` entrega clientes, obras, localizaciones, concreteras, cementos, tipos de concreto. | `/api/catalogos` y `/api/equipos` requieren soporte de paginación o `updatedSince`/etag para caché offline en móvil. |

### 3.3 Estructura Propuesta de Paquetes Compartidos y Compatibilidad con Windows Standalone

Para evitar una refactorización disruptiva del directorio `src/` actual y preservar el funcionamiento de `build_installer/setup.iss`, se propone habilitar **npm workspaces** en la raíz (`package.json` `[PROPUESTO]`) manteniendo la aplicación Next.js en la raíz (o en `apps/web` en una etapa posterior) y extrayendo el código compartido a `packages/`:

```text
c:\Users\ccanto\Desktop\ENSALIA\          (Monorepo npm workspaces [PROPUESTO])
├── packages/
│   ├── domain-core/                      # [PROPUESTO] TS puro + Zod (sin Prisma/Node/DOM)
│   │   ├── src/samples/                  # types.ts, validation.ts, civil-date.ts
│   │   ├── src/colados/                  # coladoSchema, reglas multi-toma
│   │   ├── src/config/                   # profileConfigurationSchema, validateConfiguredFields
│   │   ├── src/metrology/                # ASTM C39/C31, NMX-C-083/109, ACI 214R desacoplado
│   │   ├── src/documents/                # field-document-control.ts, ocr/quality.ts
│   │   └── src/licensing/                # Enums puros CodigoModulo, NivelSuscripcion
│   ├── api-contracts/                    # [PROPUESTO] DTOs REST, errores tipados, esquemas Sync
│   │   ├── src/sync.ts                   # SyncPullResponse, SyncPushRequest, ConflictItem
│   │   ├── src/auth.ts                   # DeviceEnrollRequest, TokenPair, Role
│   │   └── src/field-media.ts            # FotoMuestraMetadataSchema, GpsCaptureSchema
│   └── sync-engine/                      # [PROPUESTO] Cola outbox, backoff, máquina de estados
├── apps/
│   └── mobile/                           # [PROPUESTO] App Expo / React Native (Android + iOS opc.)
├── src/                                  # Next.js 15 existente (se conserva en raíz para cero ruptura)
│   └── ...
├── next.config.ts                        # Agregar output: "standalone" + transpilePackages
├── prisma/                               # Esquema SQLite y migraciones
└── build_installer/setup.iss             # Empaquetado Windows sin cambios de ruta de entrada
```

**Compatibilidad con `next.config.ts` y `build_installer/setup.iss`:**
1. Mantener la app Next.js en la raíz (en lugar de mover `src/` a `apps/web/`) garantiza que `tsconfig.json` (`"@/*": ["./src/*"]`), `scripts/Start-Ensalia.ps1` y `build_installer/setup.iss` sigan operando sobre las mismas rutas relativas.
2. En `next.config.ts`, se deberá agregar `output: "standalone"` (ya asumido por `build_installer/setup.iss:71-78`) y `transpilePackages: ["@ensalia/domain-core", "@ensalia/api-contracts"]` (`[PROPUESTO]`) para que el *file tracer* de Next.js empaquete los paquetes internos dentro de `.next/standalone` hacia `build_payload/app/`.
3. El pipeline de ensamblaje de `build_payload/app/` deberá seguir copiando explícitamente `node_modules/prisma`, `node_modules/@prisma/engines` y `node_modules/.prisma/client/query_engine-windows.dll.node` tal como documenta `build_installer/setup.iss:72-77`.

---

## 4. R3 — Arquitectura de Sincronización Segura Offline-First

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                 ARQUITECTURA DE SINCRONIZACIÓN OFFLINE-FIRST ENSALIA [PROPUESTO]         │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  [ DISPOSITIVO MÓVIL EN OBRA (Expo / Android) ]                                          │
│   ├── expo-sqlite: local_colados, local_muestras, local_especimenes, local_catalogos     │
│   ├── sync_outbox (transaccional): clientMutationId + baseVersion + payloadJson          │
│   ├── expo-file-system (sandbox): fotos JPEG/WebP inmutables + hash SHA-256 (expo-crypto)│
│   └── expo-location + expo-secure-store (JWT + Refresh Token + deviceId)                 │
│             │                                         │                                  │
│             │ 1. POST /api/sync/push (JSON ligero)    │ 2. POST /api/fotos-muestra       │
│             │ 3. GET  /api/sync/pull?cursor=...       │    (multipart/form-data + SHA256)│
│             ▼                                         ▼                                  │
│  [ TRANSPORTE SEGURO: LAN+TLS (Caddy) / VPN Mesh (Tailscale) / Túnel Saliente ]          │
│             │                                                                            │
│             ▼                                                                            │
│  [ SERVIDOR WINDOWS ENSALIA (Next.js Standalone, puerto estable 3210) ]                  │
│   ├── Middleware Auth/RBAC (JWT dispositivo + Operador + SuscripcionLocal)               │
│   ├── Sync Engine (/api/sync/*): Idempotencia (SyncMutationLog) + Bloqueo Optimista      │
│   ├── SQLite (ensalia.db / labsico.db): PRAGMA journal_mode=WAL, busy_timeout=5000       │
│   └── Storage Unificado (%LOCALAPPDATA%\Ensalia\documents\field-photos\...) + Backup v4  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Almacenamiento Offline Local en Dispositivo Móvil

En el cliente móvil (`apps/mobile`, `[PROPUESTO]`), toda operación de captura se escribe primero en **SQLite local (`expo-sqlite`)** dentro de una transacción atómica que actualiza tanto las tablas espejo como la cola de salida (`sync_outbox`):

1. **Caché de Lectura y Referencia (`pull`):**
   - `local_catalogos` (clientes, obras, localizaciones, concreteras, cementos, tipos de concreto).
   - `local_perfil_activo` (snapshot `ProfileConfiguration` vigente para validar campos obligatorios y reglas de especímenes sin red).
   - `local_equipos` (moldes, conos, varillas, termómetros con su estado y vigencia de calibración).
   - `local_colados`, `local_muestras`, `local_especimenes`, `local_despachos` (ventana deslizante configurable, p. ej. últimos 30 días o colados `ABIERTO` + despachos asignados al dispositivo).
2. **Tablas de Mutación y Cola Transaccional (`sync_outbox` `[PROPUESTO]`):**
   - Columnas sugeridas: `id`, `clientMutationId` (UUID v4), `entityType` (`COLADO` | `MUESTRA` | `ESPECIMEN` | `DESPACHO_ITEM` | `FOTO_META`), `entityLocalId`, `operation` (`CREATE` | `UPDATE` | `TRANSITION`), `payloadJson`, `baseVersion` (entero de la versión conocida por el cliente), `createdAt`, `status` (`PENDING` | `IN_FLIGHT` | `CONFLICT` | `FAILED_PERMANENT` | `APPLIED`), `retryCount`, `lastError`.
3. **Almacenamiento Binario de Fotos (`expo-file-system` `[PROPUESTO]`):**
   - Las fotografías capturadas se mueven inmediatamente desde la ruta temporal de cámara hacia `FileSystem.documentDirectory + "ensalia-media/<localSampleId>/<photoUuid>.jpg"` (directorio persistente protegido contra limpieza de caché del SO).
   - La tabla `local_fotos_muestra` guarda `localPhotoId`, `muestraLocalId`, `clientMutationId`, `localUri`, `sha256`, `byteSize`, `width`, `height`, `capturedAt`, `latitud`, `longitud`, `precisionM`, `uploadStatus` (`PENDING` | `UPLOADED` | `FAILED`).

### 4.2 Protocolo de Sincronización, Idempotencia y Resolución de Conflictos

Para garantizar consistencia entre múltiples tabletas en obra y el operador de escritorio en el laboratorio:

1. **Extensiones Aditivas de Esquema en Servidor (`prisma/schema.prisma`, `[PROPUESTO]`):**
   - Agregar modelo `SyncMutationLog` (`id`, `clientMutationId String @unique`, `deviceId String`, `entityType String`, `entityId String`, `responseJson Json`, `createdAt DateTime`) para garantizar idempotencia estricta ante reintentos por cortes de red 4G.
   - Agregar a `Muestra`, `Colado`, `DespachoMuestra` e `ItemDespachoMuestra`: `actualizadoEn` (ya existe en los 4 modelos; en `DespachoMuestra` también agregar `version Int @default(0)` `[NO EXISTE EN REPO]`), `dispositivoOrigenId String?`, `eliminadoEn DateTime?` (*soft-delete tombstone* para propagar anulaciones en `pull`).
   - Índices compuestos sobre `(actualizadoEn, id)` para paginación por cursor sin saltos.

2. **Ciclo de Sincronización en 3 Pasos (`[PROPUESTO]`):**
   - **Paso 1 — `POST /api/sync/push`:** El móvil envía un lote ordenado causalmente (`Colado` -> `Muestra` + `Especimen[]` -> `AsignacionEquipo` -> `ItemDespachoMuestra` -> metadatos de `FotoMuestra`). Cada ítem lleva `clientMutationId` y `baseVersion`.
     - Si `clientMutationId` ya existe en `SyncMutationLog`, el servidor devuelve exactamente el resultado previo sin re-ejecutar la transacción ni incrementar folios.
   - **Paso 2 — `POST /api/fotos-muestra` (Subida de Binarios Separada):** Una vez que las muestras tienen `serverId` definitivo (o usando el mapeo del Paso 1), las fotos pendientes se suben una a una por `multipart/form-data` con cabecera `Idempotency-Key: <clientMutationId>`.
   - **Paso 3 — `GET /api/sync/pull?cursor=<iso_o_seq>&deviceId=<id>`:** Descarga cambios incrementales (incluidos `eliminadoEn != null`) y actualizaciones de catálogos/perfiles posteriores al último cursor confirmado.

3. **Reconciliación de IDs, Folios de `Muestra` y `Colado.folio` Offline:**
   - **Separación `localId` vs `serverId` (CUID v1 vs CUID2/UUID):** Los esquemas Zod existentes (`src/lib/validation.ts:8,64,93,102,126`) validan IDs de servidor mediante `z.string().cuid()` (CUID v1 generado por Prisma `@default(cuid())`), el cual rechaza cadenas UUID v4 o CUID2. Por ello, los DTOs de sincronización (`[PROPUESTO]`) mantienen `localId` (UUID v4 o CUID2 generado offline en el dispositivo) **separado** de `serverId?: string` (`z.string().cuid()` opcional), evitando pasar `localId` por campos `.cuid()`.
   - **Folios provisionales y `Colado.folio` (`src/lib/colados.ts:7-9`):** En campo sin red, una nueva muestra recibe un folio provisional visible (`LOCAL-<aliasDispositivo>-<seq>`, p. ej. `LOCAL-TAB02-0014`) y un nuevo `Colado` offline recibe un folio provisional (`LOCAL-COL-<aliasDispositivo>-<seq>`). Durante `POST /api/sync/push`, el servidor ejecuta `nextSampleFolio(tx, ...)` para `Muestra.idMuestra` y `nextColadoFolio()` (`src/lib/colados.ts:7-9`, que hoy usa `node:crypto` `randomUUID()`) para `Colado.folio` dentro de la misma transacción SQLite.
   - **Resolución causal `idMapping` en un lote atómico:** Dentro de la transacción de `POST /api/sync/push`, el motor mantiene un mapa en memoria (`localId -> serverId`) para resolver referencias dependientes en el mismo lote (`localColadoId -> coladoId`, `localMuestraId -> muestraId`, `localSpecimenId -> especimenId`) antes de crear `Especimen`, `AsignacionEquipo` o registrar `FotoMuestra`. La respuesta devuelve `idMapping: { [localId]: { serverId, officialFolio, version } }`, actualizando en una sola transacción local de `expo-sqlite` los colados, muestras, especímenes y fotos pendientes asociados.

4. **Política Explícita de Conflictos (`409 Conflict`):**
   - **Baseline real vs regla nueva `[PROPUESTO]`:** ENSALIA ya posee `version Int @default(0)` en `Muestra` (`prisma/schema.prisma:215`), `Colado` (`línea 268`) y `Equipo` (`línea 518`). Sin embargo, `PATCH /api/muestras/[id]` (`src/app/api/muestras/[id]/route.ts:52, 62, 68, 85`) actualmente rechaza **únicamente** `CERRADA`/`ANULADA` (`409`), lee `current.version` internamente en el servidor (sin exigir `version` en `muestraSchema`), y **permite** editar muestras en `REVISADA` reabriéndolas automáticamente a `BORRADOR` (`EDITADA_Y_REABIERTA`). En consecuencia, exigir `baseVersion` en el cliente y **bloquear/rechazar mutaciones sobre muestras `REVISADA` con `409 SAMPLE_LOCKED_BY_LAB`** constituye una **regla nueva `[PROPUESTO]`** para el endpoint móvil de sincronización.
   - **Consistencia de política Desktop vs Móvil (`[PROPUESTO]`):** Para evitar regresiones operativas y huecos de auditoría ISO/IEC 17025:
     - En **móvil (`POST /api/sync/push`)**, cualquier muestra ya en `REVISADA`, `CERRADA` o `ANULADA` se bloquea con `409 SAMPLE_LOCKED_BY_LAB` para impedir que una brigada en obra reabra o sobrescriba una muestra ya revisada por laboratorio.
     - En **escritorio (`PATCH /api/muestras/[id]`)**, se mantiene la reapertura explícita `REVISADA -> BORRADOR` (`EDITADA_Y_REABIERTA`) únicamente para operadores autorizados en laboratorio (`SIGNATARIO` / `ADMIN_LAB` con motivo auditado), o bien se alinea para exigir transición explícita de reapertura antes de editar.
   - **Regla de Oro ISO/IEC 17025 (Nunca sobrescribir silenciosamente registros revisados o cerrados):**
     - Si el móvil envía un `UPDATE` con `baseVersion < server.version` y la muestra sigue en `BORRADOR`, el servidor devuelve `409` con el estado actual del servidor; la app muestra diff por campo al operador para decidir *mantener servidor* o *reaplicar cambios de campo sobre la nueva versión*.
     - Si la muestra ya pasó a **`REVISADA`, `CERRADA` o `ANULADA`** en laboratorio, `POST /api/sync/push` **`[PROPUESTO]`** **rechaza la mutación con `409 SAMPLE_LOCKED_BY_LAB`**, registra el intento en `Auditoria` con el payload completo enviado por campo para no perder evidencia ni trazabilidad, y el móvil mueve el ítem de outbox a estado `CONFLICT_NEEDS_REVIEW` notificando al brigadista y al signatario técnico.
     - **Conflicto de `AsignacionEquipo` (`src/app/api/muestras/[id]/equipos/route.ts:49-50`):** Debido a que asignar moldes o termómetros exige `Equipo.estado = "DISPONIBLE"` y bloqueo optimista sobre `Equipo.version` (y dos brigadas offline pueden seleccionar el mismo `MOLDE-01` o `TERM-01` desde `local_equipos`), `POST /api/sync/push` **confirma `Muestra` + `Especimen[]` de forma independiente** a `AsignacionEquipo` (nunca descarta ni bloquea mediciones reguladas de concreto fresco) y, ante fallo de disponibilidad/versión/calibración del equipo, registra `EQUIPMENT_CONFLICT` en `Auditoria` y marca únicamente la mutación de equipo en `CONFLICT_NEEDS_REVIEW` para regularización en laboratorio.
     - Para `FotoMuestra` (evidencia *append-only*): si la muestra está `BORRADOR` o `REVISADA` (y el laboratorio habilita adjuntar evidencia tardía), se permite anexar sin conflicto de versión, manteniendo el sello real de captura en dispositivo (`capturadaEnDispositivo`) junto a `sincronizadaEnServidor`.

### 4.3 Concurrencia SQLite en el Servidor Windows

Actualmente, `src/lib/prisma.ts:4` crea `new PrismaClient()` sin configurar SQLite para concurrencia, y `scripts/Ensalia.Common.ps1:54-57` construye `DATABASE_URL` sin parámetros de bloqueo. Al recibir peticiones simultáneas desde el operador local en escritorio y 2–5 tabletas sincronizando, SQLite arrojará errores `SQLITE_BUSY (code 5)` salvo que se apliquen **ambas** medidas obligatorias:

1. **Serialización de escrituras en Prisma (`scripts/Ensalia.Common.ps1` + `.env`):** Estandarizar `Get-EnsaliaDatabaseUrl` para emitir `?connection_limit=1&busy_timeout=5000` (coherente con `build_installer/setup.iss:201` y `.env.example:9`).
2. **PRAGMAs de inicio en `src/lib/prisma.ts` (`[PROPUESTO]`):** Al inicializar el singleton `prisma`, ejecutar una sola vez:
   ```sql
   PRAGMA journal_mode = WAL;
   PRAGMA synchronous = NORMAL;
   PRAGMA busy_timeout = 5000;
   PRAGMA foreign_keys = ON;
   ```
   El modo `WAL` (*Write-Ahead Logging*) permite múltiples lecturas concurrentes (`GET /api/sync/pull`, consultas web, generación de PDFs) sin bloquear la cola secuencial de escritura (`connection_limit=1`). Adicionalmente, `New-EnsaliaBackupArchive` (`scripts/Ensalia.Common.ps1:106`) deberá usar la API de respaldo en línea de SQLite (`VACUUM INTO` o checkpoint WAL previo) en lugar de un `Copy-Item` simple sobre `.db` cuando el servidor esté atendiendo dispositivos móviles en paralelo.

### 4.4 Transferencia de Fotos Forenses y Remediación de Almacenamiento/Respaldo

**Modelo de Datos Propuesto (`FotoMuestra`, `[NO EXISTE EN REPO / PROPUESTO]`):**
A diferencia de `FotoEnsayeCompresion` (`prisma/schema.prisma:880-899`, exclusiva de rotura en prensa), las fotos de campo requieren relación aditiva con `Muestra` (y opcionalmente `ItemDespachoMuestra`):
- Campos clave `[PROPUESTO]`: `id`, `muestraId`, `itemDespachoId?`, `clientMutationId String @unique`, `categoria` (`MUESTREO_OLLA` | `CONO_REVENIMIENTO` | `PROBETAS_MOLDEADAS` | `REMISION_CONCRETERA` | `CONDICION_CURADO_OBRA` | `RECOLECCION_DESPACHO`), `nombreSeguro`, `mimeType`, `tamanoBytes`, `hashSha256`, `rutaRelativa String @unique`, `anchoPx`, `altoPx`, `latitud?`, `longitud?`, `precisionM?`, `exifJson?`, `capturadaEnDispositivo DateTime`, `sincronizadaEn DateTime @default(now())`, `dispositivoId?`, `subidoPorId`.

**Flujo Forense de Captura y Subida:**
1. **En el dispositivo:** Captura directa en cámara nativa (resolución recomendada 1600×1200 / ~300–600 KB en JPEG/WebP de alta nitidez), lectura/conservación de metadatos (timestamp, orientación, modelo de cámara, coordenadas GPS del instante), cálculo inmediato de **`SHA-256`** con `expo-crypto` antes de encolar. (Opcional: marca de agua visual *solo* sobre una copia derivada, preservando el archivo original con su hash íntegro).
2. **Transferencia resiliente:** Envío binario uno a uno por `POST /api/fotos-muestra` con `multipart/form-data`, verificación del hash SHA-256 en el servidor (`422` si hay corrupción en tránsito; reintento automático con *backoff* exponencial en el móvil). Tamaño máximo sugerido: `15 MB` (consistente con `/api/digitalizacion/analizar`).

**Remediación Crítica del Almacenamiento y Motor de Respaldos:**
El análisis del repositorio detectó una incompatibilidad activa que **rompería los respaldos** si se guardan fotos de campo bajo `DocumentsDir`:
- `src/lib/documents/storage.ts:10` exige la ruta `^field-sheets/[A-Za-z0-9_-]+/(?:scans/)?[A-Za-z0-9_.-]+\.(?:pdf|png|jpg|webp)$` (con guion medio `field-sheets` y `scans/` anidado).
- `src/lib/storage/local-files.ts:5-26` ignora `ENSALIA_DOCUMENTS_DIR` y declara categorías con guion bajo y raíz separada: `calibrations`, `compression_photos`, `field_sheets` y `scans` (raíz).
- `build_installer/setup.iss:58-62` crea carpetas persistentes para `field-sheets`, `calibrations`, `maintenance` y `compression_photos` (sin incluir `scans` ni `field-photos`).
- `scripts/Ensalia.Common.ps1:127` y `scripts/Restore-Ensalia.ps1:34` lanzan la excepción `'La carpeta documental contiene una ruta no administrada.'` si encuentran cualquier subcarpeta distinta de `field-sheets/...` dentro de `DocumentsDir`.

**Solución obligatoria previa al despliegue móvil (`[PROPUESTO]`):**
1. Unificar la resolución de raíz documental en `local-files.ts` y `documents/storage.ts` respetando `ENSALIA_DOCUMENTS_DIR` y escritura atómica `.incoming -> rename`, y **reconciliar `field_sheets` vs `field-sheets` y `scans/`**: estandarizar las hojas de campo y sus escaneos en `field-sheets/<id>/scans/...` (migrando cualquier carpeta heredada `field_sheets/` o `scans/` en raíz si existiera en disco).
2. Establecer la ruta determinista `field-photos/<muestraId>/<uuid>.(jpg|webp|png)` bajo `%LOCALAPPDATA%\Ensalia\documents\field-photos\`.
3. Actualizar `scripts/Ensalia.Common.ps1`, `scripts/Restore-Ensalia.ps1` y `build_installer/setup.iss:58-62` introduciendo `formatVersion = 4` en el manifiesto ZIP de respaldo para aceptar explícitamente `documents/field-sheets/...` (incluyendo `field-sheets/<id>/scans/...`), `documents/scans/...` (compatibilidad con `local-files.ts`), `documents/field-photos/...`, `documents/compression_photos/...`, `documents/calibrations/...` y `documents/maintenance/...`.

### 4.5 Captura de Coordenadas GPS Estructuradas

Manteniendo el principio aditivo para SQLite y compatibilidad total con los reportes existentes:
- **Extensión de esquema `[PROPUESTO]`** en `Muestra`, `Colado` e `ItemDespachoMuestra`:
  - `latitud Float?`, `longitud Float?`, `precisionM Float?`, `altitudM Float?`, `gpsCapturadoEn DateTime?`, `gpsEstado Enum('VALIDO', 'BAJA_PRECISION', 'SIN_SENAL', 'OMITIDO_MANUAL')?`.
  - Se conserva `coordenadasColado String?` (`prisma/schema.prisma:163,253`), poblándola automáticamente desde el móvil con formato legible (p. ej. `"21.161908, -86.851528 (±8 m)"`) para que PDFs y vistas de escritorio actuales sigan mostrándola sin cambios destructivos.
- **Política operativa ante baja precisión o sótanos/interiores:**
  - En muestreo de concreto fresco existen ventanas normativas estrictas (15 minutos para ensayos de revenimiento/temperatura tras tomar la muestra compuesta, ASTM C172). **El GPS nunca debe bloquear el guardado de una muestra en obra.**
  - Umbrales propuestos: `<= 25 m` -> `VALIDO`; `25 m < precision <= 100 m` -> `BAJA_PRECISION` (permite guardar con advertencia visual); sin señal GNSS tras timeout de 8 s -> `SIN_SENAL` (permite continuar tomando el último fix conocido con timestamp o marcando selección manual/referencia de obra en `Auditoria`).

### 4.6 Seguridad, Autenticación de Dispositivos, RBAC y Licenciamiento

Exponer ENSALIA fuera de `127.0.0.1` sin corregir `src/lib/auth.ts` representaría una vulnerabilidad crítica (hoy `Start-Ensalia.ps1:26` desactiva `ENSALIA_REQUIRE_ACCESS_CODE` y `getOperator()` confía ciegamente en `x-operator-name`, permitiendo suplantación de identidad y lectura libre en endpoints `GET`).

**Arquitectura de Seguridad Propuesta (`[PROPUESTO]`):**
1. **Enrolamiento Seguro de Dispositivos (`DispositivoMovil` `[NO EXISTE EN REPO]`):**
   - El administrador del laboratorio genera en ENSALIA escritorio un **QR de enrolamiento de un solo uso** (expiración 5 minutos, firma HMAC/token aleatorio de 256 bits) asociado a la URL del servidor y a la instalación.
   - Al escanearlo, la app móvil llama a `POST /api/auth/enroll` enviando `deviceUuid`, `nombreDispositivo`, `plataforma` (`ANDROID` | `IOS`) y `appVersion`.
   - El servidor valida el cupo contra `SuscripcionLocal.dispositivosMaximos` (`prisma/schema.prisma:685`, actualmente default 1 o 3 en semilla Pro) y contra el módulo licenciado (nuevo enum `EXTENSION_CAMPO_MOVIL` en `CodigoModulo`), crea el registro `DispositivoMovil (estado: ACTIVO)` y emite un par de credenciales al dispositivo.
2. **Autenticación de Operador y Tokens Revocables:**
   - El operador en campo inicia sesión en su dispositivo enrolado mediante **PIN personal o contraseña** (hash `scrypt` / `argon2id` en `Operador` `[NO EXISTE EN REPO]`).
   - El servidor emite un **Access Token JWT** firmado (vida corta: 15 min) + **Refresh Token opaco** (rotatorio, hasheado en SQLite, vida configurable 14–30 días, almacenado en `expo-secure-store` en Android/iOS).
   - Un nuevo `src/middleware.ts` (`[NO EXISTE EN REPO]`) y wrapper `requireAuth()` protegen **todas** las rutas `/api/**` (tanto `GET` como `POST/PATCH/DELETE`). **Regla crítica anti-bypass en reverse proxy:** cuando Caddy, Tailscale o `cloudflared` (Sección 4.7) corren en el mismo host Windows, todo tráfico externo proxied llega al socket TCP de Next.js desde `127.0.0.1`. Por tanto, `src/middleware.ts` **NO DEBE** eximir ni omitir autenticación por IP de origen (`127.0.0.1` / `::1`) cuando existan cabeceras de proxy (`X-Forwarded-For`, `Forwarded`, `X-Forwarded-Host`, `CF-Connecting-IP`) ni cuando esté habilitado el módulo `EXTENSION_CAMPO_MOVIL` o el modo servidor/sync en red. Se debe exigir obligatoriamente **autenticación unificada de operador** (sesión/cookie JWT o token efímero de arranque local generado por el lanzador únicamente en modo aislado offline) **o aislamiento de listener/secreto inyectado por el proxy** (p. ej., cabecera interna `X-Ensalia-Proxy-Secret` sobrescrita por Caddy o puerto dedicado para tráfico externo donde todo request requiera JWT/RBAC sin excepciones), de modo que ningún cliente externo proxied pueda heredar privilegios locales sin autenticar.
3. **RBAC Mínimo Viable (`RolOperador` `[PROPUESTO]`):**
   - `OPERADOR_CAMPO`: crea/edita `Colado`, `Muestra` en `BORRADOR`, sube `FotoMuestra`, consulta catálogos y equipos asignados. **No** puede cerrar muestras, alterar ensayes de prensa ni modificar configuración de perfiles.
   - `CHOFER_LOGISTICA`: consulta `DespachoMuestra` asignado, registra recolección en obra y fotos de entrega.
   - `SIGNATARIO` / `LABORATORIO`: revisa, aprueba/cierra muestras, resuelve conflictos `409`, captura ensayes de compresión y emite PDFs oficiales.
   - `ADMIN_LAB`: gestiona operadores, enrola/revoca dispositivos (`DispositivoMovil`) y licencias.
4. **CORS, Límites y Auditoría:**
   - Cabeceras CORS estrictas (permitiendo orígenes configurados; clientes nativos Expo no dependen de CORS, pero el portal Web o WebViews sí).
   - Límite de payload por lote de sync (p. ej. 2 MB JSON) y por foto (15 MB), *rate limiting* en `/api/auth/*`, y registro de `dispositivoId` en `Auditoria`.

### 4.7 Conectividad con el Servidor Windows de Laboratorio

En el despliegue actual (`scripts/Start-Ensalia.ps1:19-52`), la app corre como proceso de usuario en Windows escuchando únicamente en `127.0.0.1` sobre un puerto variable `3210..3299` en HTTP plano, y puede suspenderse si el usuario cierra sesión o la PC entra en hibernación. Para conectar dispositivos móviles de campo de forma práctica sin obligar a los laboratorios a contratar servidores en la nube, se comparan tres topologías sobre el mismo runtime Windows standalone:

| Topología | Cómo Funciona sobre Windows ENSALIA | Pros | Contras / Requisitos | Perfil Recomendado |
|---|---|---|---|---|
| **A. Red Local (LAN / Wi-Fi) + Reverse Proxy TLS Local (Caddy)** | ENSALIA escucha en `127.0.0.1:3210` (puerto fijo en modo servidor); Caddy local escucha en `0.0.0.0:8443` / `443` con TLS interno y redirige a `127.0.0.1:3210`. | Latencia mínima, cero costo recurrente, 100% dentro de la oficina. | Solo sincroniza cuando la brigada regresa al laboratorio; requiere IP fija local, regla en Firewall de Windows y confiar en certificado TLS interno. | Laboratorios pequeños donde el muestreador captura todo el día offline en obra y sincroniza al volver al laboratorio. |
| **B. VPN Mesh (Tailscale / WireGuard) + TLS** | El PC Windows y las tabletas Android corren Tailscale/WireGuard; la app apunta a la IP/nombre mágico Tailscale (`https://servidor-lab.ts.net`). | **Cero apertura de puertos en el router**, atraviesa CGNAT/4G/5G, cifrado WireGuard nativo, sincronización en tiempo real desde la obra cuando hay señal celular. | Requiere instalar cliente Tailscale en el PC Windows y en las tabletas (y cuenta gratuita/corporativa Tailscale o coordinador propio). | **Recomendación principal** para laboratorios con 2+ brigadas que requieren visibilidad diaria desde obra sin personal de TI. |
| **C. Túnel Saliente HTTPS (Cloudflare Tunnel / frp)** | Servicio ligero `cloudflared` en Windows abre conexión saliente hacia dominio HTTPS público válido (`lab-xyz.ensalia.app`). | Certificado TLS público válido automáticamente (ideal si además se usa navegador Web desde fuera), sin VPN en cliente. | Requiere dominio/infraestructura relay en internet y endurecimiento estricto de `middleware.ts` + WAF/rate-limit al estar expuesto públicamente. | Consorcios con múltiples obras, supervisores externos vía Web o integración futura con nube ENSALIA. |

**Ajustes obligatorios del host Windows independientemente de la topología elegida:**
1. **Puerto determinista y aislamiento de proxy:** En modo servidor multi-dispositivo, fijar puerto (p. ej. `PORT=3210` por defecto con fallo explícito si está ocupado, en lugar de rotar silenciosamente `3210..3299` lo cual rompería la configuración del proxy/túnel) y aplicar estrictamente la regla de la Sección 4.6 (el proxy inverso Caddy/`cloudflared`/Tailscale no hereda confianza de `127.0.0.1`; `middleware.ts` exige autenticación ante cabeceras `X-Forwarded-*`/`Forwarded`/`CF-Connecting-IP` o modo sync activo).
2. **Modo Servicio Windows o Bandeja Persistente (`[PROPUESTO]`) y Mutex `Global\`:** Ofrecer ejecución como Servicio Windows (NSSM / WinSW) o tarea programada al arranque para no depender de que la sesión interactiva de escritorio permanezca abierta (`Start-Ensalia.ps1` actual usa `Wait-Process` en ventana de usuario), junto con perfil de energía que evite suspensión automática durante el horario laboral. **Importante (aislamiento de sesiones Windows):** `Enter-EnsaliaMutex` (`scripts/Ensalia.Common.ps1:64`) utiliza actualmente `'Local\LABSICO.LocalApplication'`, el cual tiene alcance por sesión de Terminal Services; si el servidor corre en **Session 0** (Servicio Windows) y un usuario abre el acceso directo en **Session 1+**, un mutex `Local\` no impediría lanzar un segundo proceso Node/Prisma sobre la misma base SQLite. Por ello, se debe migrar el mutex a **`'Global\LABSICO.LocalApplication'`** (con ACLs para sesión de usuario) **y/o** hacer que el lanzador de escritorio detecte primero un servicio activo vía `GET /api/health` en el puerto fijo y abra únicamente el navegador/WebView2 sin arrancar otra instancia de servidor.

---

## 5. R4 — Plan de Desarrollo por Fases (Modular, Secuencial y Viable)

El plan se divide en **6 fases modulares (Fase 0 a Fase 5)** diseñadas para entregar valor incremental sin detener la operación actual del laboratorio en escritorio ni introducir regresiones sobre la plantilla de captura de muestras.

### 5.1 Mapa de Dependencias entre Fases

```text
[FASE 0: Cimientos Servidor Windows]
  (SQLite WAL + Unificación Storage/Backup v4 + Puerto Fijo + Standalone)
         │
         ▼
[FASE 1: Núcleo Compartido, Esquema Aditivo y Seguridad]
  (Workspaces packages/domain-core & api-contracts + Auth JWT/QR + FotoMuestra/GPS)
         │
         ▼
[FASE 2: Motor de Sincronización Servidor + Conectividad]
  (/api/sync/pull & push + Idempotencia + /api/fotos-muestra + Caddy/Tailscale)
         │
         ├───────────────────────────────────────────┐
         ▼                                           ▼
[FASE 3: App Móvil Campo MVP (Expo Android)]   (Portal Web Next.js sigue operativo
  (expo-sqlite + Outbox + Colados/Muestras      consumiendo paquetes compartidos)
   + Validación NMX/ASTM Offline)
         │
         ▼
[FASE 4: Forense, GPS Estructurado y Logística]
  (Cámara/EXIF/SHA-256 + GPS + Subida Fotos + Despachos 48h + UI Conflictos)
         │
         ▼
[FASE 5: Empaquetado Productivo, Web/iOS Opcional y Piloto en Obra]
  (setup.iss + APK/AAB + Mejoras Web Conectado + Piloto ISO 17025)
```

### 5.2 Especificación Detallada de Fases (Fase 0 a Fase 5)

---

#### Fase 0 — Endurecimiento del Servidor Local, Almacenamiento y Concurrencia SQLite
- **Alcance:** Preparar la infraestructura existente de Windows, Prisma/SQLite, respaldo y compilación standalone antes de exponer cualquier endpoint a dispositivos externos.
- **Entregables Técnicos Concretos:**
  1. Actualización de `src/lib/prisma.ts` para ejecutar `PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;`, `PRAGMA busy_timeout = 5000;` y `PRAGMA foreign_keys = ON;` al arrancar, y actualización de `Get-EnsaliaDatabaseUrl` en `scripts/Ensalia.Common.ps1` para incluir `?connection_limit=1&busy_timeout=5000`.
  2. Unificación de `src/lib/documents/storage.ts` y `src/lib/storage/local-files.ts` respetando `ENSALIA_DOCUMENTS_DIR`, escritura atómica `.incoming`, soporte para `field-photos/` y reconciliación de `field_sheets` (guion bajo) / `scans` en raíz (`local-files.ts:5,26`) hacia `field-sheets/<id>/scans/...` (`documents/storage.ts:10` y `build_installer/setup.iss:59`).
  3. Actualización de `scripts/Ensalia.Common.ps1` (`New-EnsaliaBackupArchive`, además de transición `Local\` -> `Global\LABSICO.LocalApplication` en `Enter-EnsaliaMutex` cuando aplique modo servicio), `scripts/Restore-Ensalia.ps1` y `build_installer/setup.iss:58-62` al manifiesto `formatVersion = 4` (respaldo compatible con SQLite WAL mediante checkpoint/copia segura y validación de rutas `field-sheets/` —incluyendo `field-sheets/<id>/scans/...`—, `scans/`, `field-photos/`, `compression_photos/`, `calibrations/`, `maintenance/`).
  4. Habilitación de `output: "standalone"` en `next.config.ts` y opción de puerto estable (`-FixedPort` / `ENSALIA_SERVER_PORT`) en `scripts/Start-Ensalia.ps1`.
  5. Completar iconos faltantes (`public/icon-192.png`, `public/icon-512.png`, `public/icon.ico`).
- **Dependencias:** Ninguna (base sobre el código actual).
- **Riesgos y Mitigaciones:**
  - *Riesgo:* Respaldos antiguos (`formatVersion 1..3`) de clientes existentes fallen al restaurar. *Mitigación:* Mantener retrocompatibilidad en `Restore-Ensalia.ps1` aceptando `formatVersion -in @(1,2,3,4)`.
  - *Riesgo:* Corrupción de respaldo si se copia `.db` sin incluir `-wal`. *Mitigación:* Ejecutar `PRAGMA wal_checkpoint(TRUNCATE)` o `VACUUM INTO` previo al archivado ZIP.
- **Criterios de Avance / Verificación (Gate 0):**
  - `npm run build` genera `.next/standalone` sin errores y `npm test` pasa al 100%.
  - Prueba de respaldo/restauración (`RESPALDAR-ENSALIA.cmd` / `Restore-Ensalia.ps1`) exitosa conteniendo archivos en `scans/`, `compression_photos/` y `field-photos/` sin error de ruta no administrada.
  - Prueba de estrés local con escrituras paralelas simuladas sin errores `SQLITE_BUSY`.

---

#### Fase 1 — Extracción de Contratos Compartidos, Esquema Aditivo y Seguridad/Enrolamiento
- **Alcance:** Desacoplar el dominio puro en paquetes compartidos, extender `prisma/schema.prisma` de manera aditiva para soporte móvil/GPS/fotos/sync, e implementar autenticación real de operadores y dispositivos.
- **Entregables Técnicos Concretos:**
  1. Configuración de npm workspaces y creación de `packages/domain-core` y `packages/api-contracts` con la migración de los módulos (A) y el desacoplamiento de los módulos (B) listados en la Sección 3.1 (`metrology.ts`, `operational.ts`, alertas de curado 48h de `despachos/pendientes`, esquemas Zod sin `z.nativeEnum(@prisma/client)`).
  2. Nueva migración Prisma aditiva (`[PROPUESTO]`):
     - Modelos `DispositivoMovil`, `RefreshTokenDispositivo`, `SyncMutationLog`, `FotoMuestra`.
     - Campos GPS estructurados (`latitud`, `longitud`, `precisionM`, `altitudM`, `gpsCapturadoEn`, `gpsEstado`) en `Muestra`, `Colado`, `ItemDespachoMuestra`.
     - Campos de sincronización (`dispositivoOrigenId`, `eliminadoEn`) y `version Int @default(0)` en `DespachoMuestra`.
     - Credenciales de usuario (`pinHash` / `passwordHash`, `rol`) en `Operador`, y nuevo `CodigoModulo.EXTENSION_CAMPO_MOVIL`.
  3. Reemplazo seguro de `src/lib/auth.ts` + creación de `src/middleware.ts`: emisión de JWT + Refresh Token, endpoint `POST /api/auth/enroll` (QR), `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, verificación RBAC y vínculo con `SuscripcionLocal.dispositivosMaximos`.
- **Dependencias:** Fase 0 completada.
- **Riesgos y Mitigaciones:**
  - *Riesgo:* Romper el flujo de usuarios actuales en PC local que hoy entran sin contraseña, o exponer el servidor por error si un proxy inverso reenvía peticiones externas vía `127.0.0.1`. *Mitigación:* Reemplazar la confianza por IP `127.0.0.1` mediante asistente de creación de PIN inicial para el operador local (o token efímero de sesión local inyectado por el lanzador únicamente cuando el modo red/proxy está deshabilitado) y prohibir explícitamente en `src/middleware.ts` cualquier exención de auth si existen cabeceras `X-Forwarded-*` / `Forwarded` / `CF-Connecting-IP` o si `EXTENSION_CAMPO_MOVIL` está activo.
  - *Riesgo:* Divergencia de tipos entre `@prisma/client` y `packages/domain-core`. *Mitigación:* Pruebas de verificación de tipos (`tsc --noEmit`) cruzadas en CI/build que garanticen igualdad estructural entre enums Prisma y constantes de `domain-core`.
- **Criterios de Avance / Verificación (Gate 1):**
  - `npm run typecheck` y `npm test` pasan en raíz y en `packages/*`.
  - Migración Prisma ejecuta limpiamente sobre copia real de `ensalia.db` / `labsico.db` sin pérdida de datos.
  - Pruebas de integración verifican que un request sin token válido a `/api/muestras` o `/api/colados` (tanto desde origen externo como simulando reverse proxy local sobre `127.0.0.1` con `X-Forwarded-For` / `Forwarded` / `CF-Connecting-IP`) retorna `401`, y que un operador `OPERADOR_CAMPO` recibe `403` al intentar cerrar una muestra o alterar un perfil.

---

#### Fase 2 — Motor de Sincronización Servidor y Conectividad Segura Windows
- **Alcance:** Implementar los endpoints de sincronización delta, idempotencia, reconciliación de folios, subida de fotos forenses y empaquetar las guías/scripts de conectividad LAN/VPN.
- **Entregables Técnicos Concretos:**
  1. Endpoints `POST /api/sync/push` y `GET /api/sync/pull` con ordenamiento causal, resolución atómica `idMapping` (`localId` UUID/CUID2 -> `serverId` CUID v1 en `Colado`, `Muestra`, `Especimen`, `AsignacionEquipo`, `FotoMuestra`), `SyncMutationLog`, reconciliación de `Muestra.idMuestra` (`nextSampleFolio`) y `Colado.folio` (`nextColadoFolio`), y respuestas tipadas de conflicto `409` (`BORRADOR` vs `SAMPLE_LOCKED_BY_LAB` `[PROPUESTO]` en `REVISADA`/`CERRADA`, más aislamiento no bloqueante `EQUIPMENT_CONFLICT` para `AsignacionEquipo`).
  2. Endpoints `POST /api/fotos-muestra` (subida multipart idempotente con validación MIME, tamaño <= 15 MB, verificación SHA-256 contra header/campo cliente y almacenamiento en `field-photos/<muestraId>/`) y `GET /api/fotos-muestra/[id]`.
  3. Endpoints de soporte para caché móvil: soporte `updatedSince` / `cursor` en `/api/catalogos`, `/api/equipos`, `/api/config/perfiles` (con filtro de versión publicada activa `[PROPUESTO]`; alternativamente `GET /api/config/profiles/active` `[NO EXISTE EN REPO / PROPUESTO]`) y `/api/despachos`.
  4. Documentación y scripts auxiliares de conectividad Windows (`[PROPUESTO]`): plantilla `Caddyfile` para TLS en LAN y guía de despliegue sobre **Tailscale/WireGuard** + ejecución persistente en Windows (Servicio Session 0 con mutex `'Global\LABSICO.LocalApplication'` o detección vía `/api/health`, sin suspensión).
- **Dependencias:** Fase 1 completada.
- **Riesgos y Mitigaciones:**
  - *Riesgo:* Lotes `push` muy grandes bloqueando el único escritor SQLite. *Mitigación:* Limitar tamaño de lote (p. ej. máx. 50 mutaciones por `push`) y procesar fotos binarias fuera de la transacción de BD (escribir archivo primero a `.incoming`, transacción rápida en SQLite, `rename` atómico).
- **Criterios de Avance / Verificación (Gate 2):**
  - Suite de pruebas automatizadas (`tests/sync/*.test.ts`) probando: (a) reenvío doble del mismo `clientMutationId` sin duplicar muestra ni incrementar folio; (b) conflicto `409 SAMPLE_LOCKED_BY_LAB` al intentar modificar muestra `REVISADA`/`CERRADA` preservando payload en `Auditoria`; (c) conflicto `EQUIPMENT_CONFLICT` conservando íntegros `Muestra` + `Especimen[]`; (d) subida y descarga de `FotoMuestra` con verificación de SHA-256.
  - Prueba end-to-end de conectividad desde un dispositivo Android en red externa vía Tailscale/LAN TLS contra el servidor Windows standalone.

---

#### Fase 3 — App Móvil de Campo MVP (React Native / Expo Android)
- **Alcance:** Construir el cliente móvil Android offline-first con flujo completo de enrolamiento, consulta de catálogos, creación/edición de colados y muestras con especímenes, y sincronización delta básica.
- **Entregables Técnicos Concretos:**
  1. Proyecto `apps/mobile` con Expo SDK + TypeScript estricto consumiendo `@ensalia/domain-core`, `@ensalia/api-contracts` y `packages/sync-engine`.
  2. Base local `expo-sqlite` + migraciones locales + cola transaccional `sync_outbox` + almacenamiento seguro de credenciales en `expo-secure-store`.
  3. Pantallas optimizadas para obra (alto contraste, objetivos táctiles >= 48dp):
     - Enrolamiento por escáner QR y login de operador con PIN.
     - Lista/detalle de `Colados` abiertos y creación de `Muestra` con cálculo automático de fechas de ensaye y validaciones en vivo de `muestraSchema` + `validateRanges` + perfil activo (`ProfileConfiguration`).
     - Registro de equipos/herramientas utilizados y asignación básica de moldes.
     - Panel de estado de sincronización (indicador de conectividad, pendientes en outbox, botón "Sincronizar ahora" y mapeo visible `LOCAL-* -> Folio Oficial`).
- **Dependencias:** Fase 2 completada.
- **Riesgos y Mitigaciones:**
  - *Riesgo:* Versiones de `zod` o compilación Metro en monorepo fallen por resolución de symlinks. *Mitigación:* Configurar `metro.config.js` con `watchFolders` y `nodeModulesPaths` estándar de Expo para monorepos npm.
- **Criterios de Avance / Verificación (Gate 3):**
  - En modo avión completo en dispositivo Android físico: crear 1 `Colado` y 3 `Muestras` con 4 especímenes cada una, validar errores NMX/ASTM offline, cerrar y reabrir la app verificando persistencia íntegra en `expo-sqlite`.
  - Al reconectar, sincronización automática completa en < 10 segundos reflejando los folios oficiales en el portal Web de ENSALIA.

---

#### Fase 4 — Evidencia Forense en Campo, GPS Estructurado y Logística de Recolección
- **Alcance:** Integrar las capacidades diferenciales de campo: captura fotográfica forense con cola binaria resiliente, telemetría GPS estructurada, resolución visual de conflictos y flujo logístico móvil de `DespachoMuestra`.
- **Entregables Técnicos Concretos:**
  1. Módulo de cámara forense (`expo-camera` + `expo-file-system` + `expo-crypto`): captura por categoría (`MUESTREO_OLLA`, `CONO_REVENIMIENTO`, `PROBETAS_MOLDEADAS`, `REMISION_CONCRETERA`, etc.), cálculo inmediato de SHA-256, preservación de EXIF/timestamp y cola de subida en segundo plano con reanudación/reintentos.
  2. Módulo GPS (`expo-location`): captura estructurada (`latitud`, `longitud`, `precisionM`, `altitudM`, `gpsCapturadoEn`, `gpsEstado`) con indicador de precisión en metros, timeout no bloqueante de 8 s y respaldo hacia `coordenadasColado`.
  3. Módulo logístico móvil (`DespachoMuestra`): lista de muestras pendientes por recolectar con semáforo ASTM C31 / NMX-C-109 (`NORMAL`/`ADVERTENCIA`/`CRITICO`/`VENCIDO` < 48h usando la función compartida), escaneo de QR de hoja de campo / confirmación de recolección con temperatura, estado del espécimen, GPS y foto de evidencia.
  4. Pantalla de resolución de conflictos `409`: comparativa lado a lado para muestras en `BORRADOR` y notificación/retención segura para muestras bloqueadas (`REVISADA`/`CERRADA`).
- **Dependencias:** Fase 3 completada.
- **Riesgos y Mitigaciones:**
  - *Riesgo:* Consumo excesivo de espacio o datos móviles por fotos sin comprimir. *Mitigación:* Compresión controlada en el dispositivo (JPEG 85%, lado largo máx. 1600 px) manteniendo nitidez suficiente para lectura de remisiones/conos, y opción de "Subir fotos solo por Wi-Fi" configurable por operador.
  - *Riesgo:* Falta de señal GPS en excavaciones o plantas techadas retrase el muestreo de concreto fresco. *Mitigación:* Timeout no bloqueante y guardado con estado `BAJA_PRECISION`/`SIN_SENAL` sin impedir el registro normativo de tiempos de olla.
- **Criterios de Avance / Verificación (Gate 4):**
  - Captura de 15 fotos offline + GPS en campo, corte deliberado de red a mitad de la subida de archivos y reanudación limpia sin archivos huérfanos ni discrepancia de SHA-256 en el servidor.
  - Verificación de visualización de fotos de campo, coordenadas GPS y semáforos 48h en la interfaz Web de escritorio.

---

#### Fase 5 — Empaquetado Productivo, Cobertura Web/iOS Opcional y Validación en Obra
- **Alcance:** Integrar los cambios del servidor en el instalador Windows oficial, generar los artefactos distribuibles Android (e iOS opcional), mejorar vistas responsivas en Web para uso conectado y ejecutar piloto real en obra.
- **Entregables Técnicos Concretos:**
  1. Actualización del pipeline de `build_payload/` y `build_installer/setup.iss` para incluir `packages/*` compilados en `standalone`, migraciones Prisma nuevas y utilidades opcionales de servicio/firewall/Caddy.
  2. Generación de APK/AAB firmado de producción (EAS Build / Gradle) y configuración de actualización OTA (`expo-updates`) para correcciones JS en campo; validación de build iOS si la empresa dispone de dispositivos Apple.
  3. Mejoras puntuales de diseño responsivo (`@media (max-width: 768px)`) en la Web Next.js existente para visualización cómoda de fotos de campo, mapas/enlaces GPS y resolución de conflictos desde navegador en laboratorio o tablet conectada.
  4. Piloto controlado en obra real (mínimo 1 semana con 2 brigadas) + auditoría de trazabilidad ISO/IEC 17025 (verificación de folios, SHA-256 de fotos, respaldos `formatVersion = 4` y bitácora `Auditoria`).
- **Dependencias:** Fase 4 completada.
- **Riesgos y Mitigaciones:**
  - *Riesgo:* Bloqueos de antivirus o Firewall de Windows en PCs de laboratorio al exponer puerto/túnel. *Mitigación:* Reglas explícitas durante la instalación (documentadas o script PowerShell firmado), preferencia por Tailscale (conexión saliente que rara vez requiere abrir puertos entrantes) y pruebas previas en Windows 10/11 limpio.
- **Criterios de Avance / Verificación (Gate 5):**
  - Instalación limpia y actualización sobre base `labsico.db` heredada mediante `Instalador-ENSALIA-v*.exe` sin pérdida de datos.
  - Cero muestras perdidas, 100% de fotos verificadas por SHA-256 tras respaldo y restauración completa, y aprobación operativa por Signatario Técnico del laboratorio.

### 5.3 Checklist Global de Verificación y Gates de Calidad

| Gate | Criterio Verificable | Evidencia Requerida |
|---|---|---|
| **G0** | Servidor Windows + SQLite WAL + Backup v4 + Standalone | `npm run build` standalone OK, `RESPALDAR-ENSALIA.cmd` y `Restore-Ensalia.ps1` pasan con fotos en disco, `PRAGMA journal_mode` devuelve `wal`. |
| **G1** | Contratos compartidos + Esquema aditivo + Auth/RBAC | `npm run typecheck` y `npm test` en verde; `401`/`403` verificados en rutas protegidas; migración exitosa sobre copia de BD real. |
| **G2** | Motor Sync + Idempotencia + Fotos SHA-256 + Conectividad | Tests de reintento idempotente, conflicto `409` y transferencia multipart SHA-256 pasando sobre LAN TLS / Tailscale. |
| **G3** | App Android Expo MVP operativa offline | Captura completa en modo avión + persistencia tras reinicio + sincronización y reconciliación `LOCAL-* -> Folio`. |
| **G4** | Fotos forenses + GPS + Despachos 48h + Conflictos | Corte de red en medio de subida binaria recuperado al 100%, GPS estructurado visible en laboratorio, alertas < 48h consistentes. |
| **G5** | Empaquetado final + Piloto en obra | Instalador Inno Setup probado en upgrade no destructivo; piloto de campo validado bajo criterios ISO/IEC 17025. |
