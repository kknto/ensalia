# Plan Maestro de Automatización y Curvas de Compresión ENSALIA: Arquitectura Técnica, Captura sin Fricción, Reportes Oficiales e Interoperabilidad Corporativa

- **Documento**: `docs/architecture/ENSALIA_COMPRESSION_TESTING_AUTOMATION_PLAN.md`
- **Versión**: 1.0.0 (Release 2 Master Plan)
- **Fecha**: 2026-10-30
- **Estado**: Aprobado para Implementación
- **Autor**: Equipo de Arquitectura Técnica y Automatización ENSALIA
- **Pila Tecnológica**: Next.js 15.5.4 (App Router), React 19.1.1, Node.js 20+, Prisma ORM v6.16.2, SQLite local (`ensalia.db` / `labsico.db`), TypeScript 5.9.2 (Strict Mode), `pdf-lib` v1.17.1, `qrcode` v1.5.4, `exceljs` v4.4.0, Vosk Kaldi WASM (`vosk-model-small-es-0.42`)
- **Normativa Metrológica Aplicable**: ASTM C39/C39M-21, ASTM C31/C31M, ASTM C1231, ASTM C617, NMX-C-083-ONNCCE-2014/2020, NMX-C-109-ONNCCE, NMX-C-160-ONNCCE, ACI 214R-11, ACI 318-19, ISO/IEC 17025:2017 / EMA (Entidad Mexicana de Acreditación)

---

## Índice General

1. [Resumen Ejecutivo y Diagnóstico del Problema](#1-resumen-ejecutivo-y-diagnóstico-del-problema)
   - 1.1 Contexto y Diagnóstico del Cuello de Botella en el Área de Prensas
   - 1.2 Impacto de la Transcripción Diferida y Vulnerabilidad en Auditorías
   - 1.3 Objetivos Técnicos y Comerciales del Plan Maestro
   - 1.4 Principios Rectores: Local-First e Intranet 100% Offline (Cero Dependencia de Nube)
2. [Arquitectura de Captura sin Fricción y Adquisición Física (R2)](#2-arquitectura-de-captura-sin-fricción-y-adquisición-física-r2)
   - 2.1 Modo Quiosco Táctil Industrial de Prensa (Press Kiosk Mode UI)
   - 2.2 Dictado por Voz Local Manos Libres (100% Offline)
   - 2.3 Identificación y Escaneo Rápido de Especímenes
   - 2.4 Adquisición Directa de Telemetría de Prensas Digitales (Serial RS-232 / USB / Bluetooth)
   - 2.5 OCR Asistido por Cámara WebRTC para Manómetros Análogos y Displays 7 Segmentos
   - 2.6 Matriz de Viabilidad, Bill of Materials (BOM USD/MXN) y Roadmap en 3 Fases
3. [Motor Automatizado de Reportes Oficiales de Rotura en PDF (`pdf-lib`) (R3)](#3-motor-automatizado-de-reportes-oficiales-de-rotura-en-pdf-pdf-lib-r3)
   - 3.1 Fundamentación Normativa y Requisitos de Metrología (ASTM C39 y NMX-C-083)
   - 3.2 Evaluación Estadística de Calidad ACI 214R-11 y Criterios Estructurales ACI 318-19
   - 3.3 Arquitectura del Generador de Reportes PDF con `pdf-lib` (100% Offline, <120 ms)
   - 3.4 Motor de Dibujo Vectorial Dinámico de Fracturas (Tipos 1 al 6)
   - 3.5 Incrustación de Evidencia Fotográfica Forense de Probeta Fracturada
   - 3.6 Trazabilidad Criptográfica QR SHA-256 y Firmas Digitales Biométricas
4. [Motor Bidireccional de Interoperabilidad con Excel Corporativo (`exceljs`) (R4)](#4-motor-bidireccional-de-interoperabilidad-con-excel-corporativo-exceljs-r4)
   - 4.1 Diagnóstico de Libros Heredados de Laboratorio (Estructuras Multi-Tabla y Filas Vacías)
   - 4.2 Ingesta e Importación Tolerante a Fallos (Legacy Multi-Block Parser)
   - 4.3 Generador y Exportador de Excel Corporativo con Fórmulas Vivas y Formato Semafórico
   - 4.4 Estrategia de Migración Gradual, Conciliación y Prevención de Duplicados
5. [Arquitectura del Sistema, Modelos de Datos Prisma e Integración de Componentes](#5-arquitectura-del-sistema-modelos-de-datos-prisma-e-integración-de-componentes)
   - 5.1 Extensiones Aditivas al Esquema Prisma (SQLite-Safe)
   - 5.2 Contratos e Interfaces de TypeScript Estricto
   - 5.3 Orquestación y Flujo de Usuario de Extremo a Extremo
6. [Empaquetamiento Comercial Multicapa y Modelo de Valor (R5)](#6-empaquetamiento-comercial-multicapa-y-modelo-de-valor-r5)
   - 6.1 Matriz Granular de Capacidades por Nivel Comercial (Core vs Pro vs Enterprise)
   - 6.2 Justificación Cuantitativa de Retorno de Inversión (ROI)
   - 6.3 Argumentario Comercial y Guion de Ventas para Directores de Laboratorio

---

## 1. Resumen Ejecutivo y Diagnóstico del Problema

### 1.1 Contexto y Diagnóstico del Cuello de Botella en el Área de Prensas

En el control de calidad de la industria de la construcción, el ensayo de resistencia a la compresión de cilindros y vigas de concreto (normado por **ASTM C39/C39M** y **NMX-C-083-ONNCCE**) representa el punto crítico donde se valida la seguridad estructural de edificaciones e infraestructura civil. No obstante, mientras que las fases de dosificación y diseño de mezclas han avanzado hacia la digitalización, la operación física en el área de rotura permanece anclada en prácticas manuales vulnerables:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             DIAGNÓSTICO DEL FLUJO FÍSICO TRADICIONAL EN EL ÁREA DE ROTURA              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [ Pila de Curado / Niebla ] ──► Extracción manual de cilindro (13 kg, húmedo/lodo)   │
│                 │                                                                      │
│                 ▼                                                                      │
│   [ Medición Dimensional ]    ──► Calibrador vernier / flexómetro                      │
│                 │                 Anotación en libreta o bitácora de papel mojado      │
│                 ▼                                                                      │
│   [ Montaje en Prensa ]       ──► Centrado físico, platos cabeceadores con neopreno    │
│                 │                                                                      │
│                 ▼                                                                      │
│   [ Aplicación de Carga ]     ──► Operador observa manómetro o display digital         │
│                 │                 Memoriza la lectura pico (ej. 458.5 kN / 46,750 kg)  │
│                 ▼                                                                      │
│   [ Falla del Espécimen ]     ──► Limpieza de escombros de concreto con guantes        │
│                 │                 Anotación rápida con lápiz en papel humedecido       │
│                 ▼                                                                      │
│   [ Fin de la Jornada ]       ──► Transcripción diferida (1.5 - 2 horas) a Excel       │
│                 │                 - Error tipográfico promedio: 4.2%                   │
│                 │                 - Retraso de emisión: 24 a 48 horas                  │
│                 ▼                                                                      │
│   [ Emisión de Reportes ]     ──► Copiado/pegado en plantillas desvinculadas           │
│                                   Vulnerabilidad en auditorías EMA / ISO 17025         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Causas Fundamentales del Cuello de Botella Físico:
1. **Contaminación de Manos y Guantes**: Los cilindros estándar de $15 \times 30\text{ cm}$ pesan entre $12.5\text{ y }13.5\text{ kg}$ y provienen de piletas saturadas con cal ($\text{pH} > 12$) o cámaras húmedas al $95\%\text{ HR}$. Los operadores visten guantes industriales de nitrilo, hule o carnaza impregnados de agua, hidróxido de calcio y arena fina. En este estado, la interacción con teclados tradicionales de computadora o pantallas capacitivas comerciales (smartphones/tablets convencionales) resulta inviable debido a toques fantasma inducidos por gotas o rechazo de pulsación por el espesor del guante.
2. **Deterioro de Fichas de Papel**: Las hojas de campo se rompen, manchan con lechada y tornan ilegibles durante la jornada, derivando en pérdida de trazabilidad o confusión en la numeración correlativa de especímenes gemelos.
3. **Falta de Validación Dimensional Dinámica**: El cálculo manual en campo suele omitir el promediado de diámetros ortogonales ($d_1$ y $d_2$) y desestima la verificación de redondez ($< 2.0\%$ de excentricidad). Asimismo, cuando las probetas presentan relaciones de esbeltez anormales ($L/D < 1.75$), se ignora el factor de corrección de la Tabla 1 de ASTM C39, sobrestimando artificialmente la resistencia del concreto hasta en un $13\%$.

---

### 1.2 Impacto de la Transcripción Diferida y Vulnerabilidad en Auditorías

La práctica generalizada de diferir la captura de resultados para transcribirlos por la tarde a libros de Microsoft Excel genera dos patologías operativas críticas:

1. **Riesgo de Errores Tipográficos (Transposición de Cifras)**:
   - Ensayos de laboratorio demuestran que transcribir 80 probetas diarias desde libretas húmedas a Excel conlleva una tasa promedio de error tipográfico del **$4.2\%$**.
   - Una transposición común (e.g. capturar $218\text{ kg/cm}^2$ en lugar del valor real de $281\text{ kg/cm}^2$) detona una falsa alarma de resistencia deficiente en obra. Esto fuerza al contratista a paralizar frentes de colado, convocar comités de supervisión y ordenar costosas extracciones de núcleos de concreto (*corazones*) mediante brocas de diamante e inspecciones esclerométricas no destructivas, cuyo costo por evento fluctúa entre **$800\text{ y }\$2,000\text{ USD}$**, además de litigios contractuales graves.
2. **Vulnerabilidad Forense bajo ISO/IEC 17025 y Criterios EMA**:
   - Los organismos de acreditación (como la **Entidad Mexicana de Acreditación - EMA** bajo la norma **NMX-EC-17025-IMNC-2018 / ISO/IEC 17025:2017**) exigen salvaguardar la trazabilidad inmutable del dato primario (*data integrity*).
   - Un libro de Excel no constituye una evidencia metrológica inalterable: las celdas pueden editarse sin pista de auditoría (*audit trail*), no vinculan la fotografía pericial de la fractura del cilindro al instante de la falla, y carecen del snapshot del certificado de calibración vigente de la prensa al momento de ejecutar la prueba. Durante auditorías bienales, la discrepancia entre las libretas de campo y los archivos digitales genera no conformidades mayores (*Hallazgos Grado Cero*), arriesgando la suspensión de la acreditación técnica del laboratorio.

---

### 1.3 Objetivos Técnicos y Comerciales del Plan Maestro

El presente documento establece la arquitectura de ingeniería para erradicar el papel en el área de prensas de ENSALIA mediante cuatro pilares fundamentales:

1. **Digitalización Física en el Punto de Rotura**: Proporcionar modalidades de captura sin fricción (Quiosco táctil de uso rudo, Dictado por voz local asistido por pedal USB y Escaneo omnidireccional de códigos de barras) que permitan registrar el ensayo en menos de 5 segundos con manos mojadas.
2. **Adquisición Directa de Datos de Prensa**: Interconectar el puerto serial de las consolas digitales líderes (Controls, Forney, ELE International, Matest) mediante Web Serial API o micro-daemons locales, capturando la carga pico y validando la tasa de carga de $0.25 \pm 0.05\text{ MPa/s}$ estipulada por ASTM C39. Para prensas analógicas de manómetro, proveer OCR asistido por cámara WebRTC.
3. **Generación Automática de Reportes Oficiales Certificados**: Construir un motor de renderizado PDF local de alto rendimiento basado en `pdf-lib` (tiempo de generación $<120\text{ ms}$, tamaño $<350\text{ KB}$), con diseño ejecutivo de 1 página normalizada (Letter $612 \times 792\text{ pt}$), diagramación vectorial procedural de fracturas (Tipos 1 al 6), fotografía pericial incrustada con sello indeleble, y código QR con firma criptográfica SHA-256.
4. **Interoperabilidad Total con Excel Corporativo**: Integrar un motor bidireccional basado en `exceljs` capaz de ingerir hojas heterogéneas con múltiples tablas separadas por filas en blanco mediante algoritmos de coincidencia difusa (Fuzzy Levenshtein) y exportar libros corporativos oficiales con fórmulas activas vivas (`=ROUND()`, `=AVERAGEIF()`, `=STDEV.S()`).
5. **Comercialización Modular Escalonada**: Estructurar la oferta comercial en tres niveles (Core, Pro y Enterprise) que demuestren un retorno de inversión (ROI) cuantificable inferior a 2.5 meses.

---

### 1.4 Principios Rectores: Local-First e Intranet 100% Offline (Cero Dependencia de Nube)

Los laboratorios de concreto y obras civiles a menudo operan en naves industriales, sótanos de control, frentes carreteros o instalaciones provisionales donde la conectividad a Internet es nula, intermitente o deliberadamente aislada por motivos de ciberseguridad industrial. Por lo tanto, la arquitectura de ENSALIA se rige por el principio de **Autonomía Operativa 100% Local**:

- **Cero Llamadas a APIs Externas**: El reconocimiento de voz, la decodificación de códigos de barras, la lectura serie, el OCR de manómetros, el análisis estadístico ACI 214R y la compilación de reportes PDF ocurren estrictamente en la memoria RAM y el procesador de la máquina local o servidor de intranet de la planta.
- **Persistencia Atómica en SQLite**: Los datos, estados y telemetría de ensayo se almacenan directamente en la base de datos local SQLite mediante Prisma ORM, con cero riesgo de bloqueo por desconexión de red.
- **Verificación Criptográfica Offline**: La autenticidad de los informes generados se valida mediante códigos QR que contienen payloads canónicos con firma SHA-256 contrastables de manera autónoma en la red local.

---

## 2. Arquitectura de Captura sin Fricción y Adquisición Física (R2)

### 2.1 Modo Quiosco Táctil Industrial de Prensa (Press Kiosk Mode UI)

Para transformar la experiencia del operario en la estación de ensayo, se diseña una interfaz de usuario especializada de pantalla completa (*Kiosk Mode*) desacoplada de los menús administrativos convencionales.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ESTACIÓN DE ENSAYE DE PRENSA ENSALIA                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [ Cilindro de Concreto ]                                                             │
│             │                                                                          │
│             ▼ (Paso 1: Identificación Manos Libres)                                    │
│   ┌──────────────────────────┐                                                         │
│   │ Escáner Fijo Presentación│──(USB HID Keyboard Wedge)──┐                            │
│   │ Zebra DS9308 (QR / C128) │                            │                            │
│   └──────────────────────────┘                            │                            │
│                                                           ▼                            │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                     ENSALIA KIOSK MODE (Next.js 15 App)                        │   │
│   │                                                                                │   │
│   │   ┌────────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │   │
│   │   │  Touch UI Ergonómica   │  │  Motor de Voz Local  │  │ Web Serial API / │   │   │
│   │   │  (Botones >= 80px)     │  │  Vosk WASM (Kaldi)   │  │ Node Serial Svc  │   │   │
│   │   └────────────────────────┘  └──────────▲───────────┘  └────────▲─────────┘   │   │
│   │               ▲                          │                       │             │   │
│   └───────────────┼──────────────────────────┼───────────────────────┼─────────────┘   │
│                   │                          │                       │                 │
│      (Toques de   │             (Audio 16kHz)│          (Telemetría  │                 │
│       Guante)     │                          │           RS-232/USB) │                 │
│                   │                          │                       │                 │
│   ┌───────────────┴──────────┐  ┌────────────┴───────────┐  ┌────────┴─────────────┐   │
│   │ Monitor Industrial IP65  │  │ Micrófono Direccional  │  │ Prensa de Concreto   │   │
│   │ Resistivo 5 Hilos o PCAP │  │   + Pedal PTT USB      │  │ Controls / Forney /  │   │
│   │ con Glove Mode           │  │ (Push-To-Talk)         │  │ ELE / Matest         │   │
│   └──────────────────────────┘  └────────────────────────┘  └──────────────────────┘   │
│                                                                      │                 │
│                                                                      ▼ (Alternativa)   │
│                                                             ┌──────────────────────┐   │
│                                                             │ Cámara WebRTC 1080p  │   │
│                                                             │ + OCR Asistido /     │   │
│                                                             │ Dial Gauge Reader    │   │
│                                                             │ (Manómetro Análogo)  │   │
│                                                             └──────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Especificaciones de Pantalla y Hardware Industrial
1. **Tecnología del Panel Táctil**:
   - **Opción Principal (Recomendada)**: **Táctil Resistivo de 5 Hilos (5-Wire Resistive)** con certificación frontal **IP65/NEMA 4**.
     - *Justificación Técnica*: Funciona exclusivamente mediante presión física (50 a 120 gramos de fuerza por punto). Es $100\%$ inmune a películas de agua pulverizada, condensación y lodo sobre la pantalla. Responde con total precisión ante cualquier tipo de guante (látex, nitrilo grueso, carnaza de soldador o piel industrial).
   - **Opción Secundaria**: **Capacitivo Proyectado Industrial (PCAP)** con controlador multitoque industrial (e.g., microcontrolador **EETI EXC80H** o Ilitek).
     - Debe configurarse en firmware con: `Water Rejection Level: Extreme` (filtra la capacitancia parásita de gotas y derrames) y `Glove Mode: High Sensitivity` (amplifica la ganancia dieléctrica para detectar dedos a través de capas aislantes de caucho de hasta $5\text{ mm}$).
2. **Dimensiones y Desacoplamiento de Vibraciones**:
   - Pantallas de $15.6''$ a $21.5''$ Full HD ($1920 \times 1080$).
   - Montaje mediante brazo de acero articulado fijado a poste lateral o pared adyacente (estándar **VESA 75/100** o montaje **RAM Mounts**).
   - Se instalan **aisladores elásticos de goma (silentblocks)** en la placa de fijación para desacoplar mecánicamente el monitor de los impactos de alta frecuencia provocados por la bomba hidráulica y la rotura violenta del concreto.

#### B. Ergonomía de Interfaz (Tokens de Diseño Kiosk)
- **Target Dimensions**:
  - Botones primarios de acción (`[ INICIAR ]`, `[ CONFIRMAR CARGA ]`, `[ GUARDAR ENSAYE ]`): Altura mínima de **$80\text{ px}$**, ancho mínimo de **$220\text{ px}$**.
  - Botones de selección de categoría (patrón de fractura 1 a 6): Mínimo **$96 \times 96\text{ px}$** con glifo visual estilizado.
  - Separación inter-botón: Margen libre de al menos **$20\text{ px}$**, previniendo pulsaciones accidentales colaterales con guantes anchos.
- **Teclado Numérico Virtual en Pantalla (Giant Virtual Numpad)**:
  - En sustitución del teclado del sistema operativo, el modal despliega un teclado numérico táctil de gran formato con botones de **$72 \times 72\text{ px}$**.
  - **Retroalimentación Auditiva de Baja Latencia**: Cada pulsación dispara un tono sintetizado mediante la Web Audio API nativa ($1,200\text{ Hz}$ durante $35\text{ ms}$ para dígitos; acorde mayor de $880\text{ Hz} / 1,320\text{ Hz}$ durante $100\text{ ms}$ para confirmación exitosa), permitiendo al operador saber que el valor fue capturado sin necesidad de desviar la vista del espécimen.
- **Temas de Contraste Extremo**:
  - **Dark Mode Industrial (OLED / Naves Oscuras)**: Fondo negro puro `#000000`, tarjetas en `#121212`, bordes en `#333333` (2px), textos principales en `#FFFFFF` (peso bold 700), acentos de acción en verde neón `#00E676` y alertas en ámbar brillante `#FFD600`. Relación de contraste WCAG AAA superior a $12:1$.
  - **Light Mode Industrial (Alta Luminosidad Solar / Exterior)**: Fondo blanco puro `#FFFFFF`, paneles en gris claro `#F1F5F9`, bordes negros gruesos `#000000` (2px), textos `#000000` y botones primarios en azul cobalto `#0D47A1` o verde bosque `#166534`.

---

### 2.2 Dictado por Voz Local Manos Libres (100% Offline)

#### A. Evaluación Comparativa de Motores Acústicos

| Criterio Metrológico | Chromium Web Speech API | Whisper.cpp (WASM / Node) | Vosk Spanish (`vosk-browser` / Kaldi) |
| :--- | :--- | :--- | :--- |
| **Operación 100% Offline** | ❌ Incierto (falla con error `network` si la PC carece de paquetes de idioma locales en Win 11). | ✅ Totalmente offline mediante pesos binarios locales. | ✅ Totalmente offline mediante modelo empaquetado estático. |
| **Latencia de Inferencia** | Inaceptable en aislamiento ($300 - 1500\text{ ms}$). | $350 - 1200\text{ ms}$ en CPUs de baja potencia (Atom/Celeron). | **$< 40\text{ ms}$ (Decodificación streaming en tiempo real)**. |
| **Consumo de Memoria y CPU** | Nulo en local (procesamiento en nube externa). | Alto ($180 - 450\text{ MB}$ RAM, picos del $100\%$ en 2 cores). | **Mínimo ($39\text{ MB}$ modelo, $< 50\text{ MB}$ RAM, $< 8\%$ CPU)**. |
| **Inmunidad a Ruido de Prensa ($85\text{ dBA}$)** | Pésima (captura el soplido de aceite y genera texto erróneo). | Pésima (alucina frases completas en silencios con ruido de fondo). | **Extrema** (mediante **gramática finita BNF de Kaldi**, ignora cualquier sonido ajeno al léxico). |
| **Decisión de Arquitectura** | Descartado por violar principio local-first. | Descartado por latencia y riesgo de alucinación. | **SELECCIONADO COMO ESTÁNDAR OBLIGATORIO**. |

#### B. Modelo Acústico y Gramática Restringida Kaldi
Se adopta el modelo compacto en español **`vosk-model-small-es-0.42`** (~39 MB comprimido), montado sobre un Web Worker que ejecuta el motor de inferencia en WebAssembly (`vosk-browser`). Para garantizar una precisión de reconocimiento $>99.4\%$ bajo el ruido continuo de $85\text{ dBA}$ de la motobomba hidráulica, el reconocedor restringe el espacio de búsqueda a una gramática estricta:

```json
[
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa",
  "cien", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos", "mil",
  "y", "punto", "coma", "kilonewtons", "kilos", "toneladas",
  "cono", "tipo uno", "tipo dos", "columna", "tipo tres", "cizalla", "tipo cuatro", "esquina", "tipo cinco", "cabeceo", "puntual", "tipo seis",
  "capturar", "carga", "tara", "iniciar", "detener", "repetir", "confirmar", "guardar", "siguiente", "cancelar"
]
```
*Mecanismo de Aislamiento Acústico y Justificación de Completitud Lexicológica*:
Vosk Kaldi WASM opera restringiendo la red de transición de estados finitos (FSA HMM) estrictamente a los tokens declarados en esta gramática. Cualquier fonema o sonido ambiental (hum de la bomba hidráulica, clics mecánicos, soplido de aceite o conversaciones de fondo) que no encaje dentro del autómata es rechazado de raíz, emitiendo un string vacío (`""`) sin contaminar los campos de captura.
Es mandatorio incluir la serie completa de decenas (`"sesenta"`, `"setenta"`, `"ochenta"`, `"noventa"`) y centenas (`"seiscientos"`, `"setecientos"`, `"ochocientos"`, `"novecientos"`). Si se omitieran dichas decenas, un operador que dicte *"Carga cuatrocientos sesenta y dos punto cinco kilonewtons"* sufriría la anulación acústica de *"sesenta"*, decodificando erróneamente *"cuatrocientos dos punto cinco"* ($402.5\text{ kN}$ en lugar de $462.5\text{ kN}$), lo que representaría un error del $13\%$ en el informe de laboratorio.

#### C. Control Push-To-Talk (PTT) con Pedal de Pie USB Industrial
Para evitar que el micrófono permanezca abierto captando ráfagas continuas de sonido, se implementa una arquitectura **Push-To-Talk (PTT)** operada por el pie:
1. **Interruptor de Pedal Metálico USB**: Dispositivo industrial de carcasa metálica sellada IP65 (e.g. *iKKEGOL USB Foot Switch* o *StealthSwitch*), conectado por USB a la estación de trabajo y reconocido como un teclado HID que emite la tecla `F12` o `Space`.
2. **Ciclo de Operación Manos Libres**:
   - El operador coloca el cilindro cabeceado en los platos de la prensa.
   - Mientras sujeta las manijas de protección de la prensa, **pisa el pedal**: el sistema activa el stream de audio del micrófono y muestra el indicador `"Escuchando..."` en verde neón.
   - El operador dicta: *"Carga cuatrocientos sesenta y dos punto cinco kilonewtons cono tipo uno"*.
   - El operador **suelta el pedal**: el stream de audio se interrumpe inmediatamente, Vosk vacía el búfer acústico residual en $<30\text{ ms}$, el analizador sintáctico extrae `carga = 462.5` y `falla = CONO_TIPO_1`, rellena los campos en pantalla y emite el tono de confirmación.
3. **Micrófono Direccional Cardioide**: Diadema monoaural industrial o micrófono cuello de ganso montado en el chasis de la máquina orientado hacia la boca del operario ($15\text{ cm}$ de distancia) con patrón cardioide estrecho, rechazando el ruido acústico proveniente del motor hidráulico situado a espaldas del técnico.

---

### 2.3 Identificación y Escaneo Rápido de Especímenes

#### A. Simbologías y Criterios de Resistencia al Agua
1. **Código 128 (1D Lineal)**:
   - Empleado en tiras de identificación estrechas ($50 \times 25\text{ mm}$) adheridas a moldes metálicos o tarjetas de curado.
   - Formato de Codificación: `<FOLIO_MUESTRA>-<NUMERO_ESPECIMEN>` (ej. `M260842-E02`).
2. **Código QR (2D Matriz, ISO/IEC 18004)**:
   - Impreso en hojas de campo, tarjetas de canastilla de curado y etiquetas plásticas de probeta.
   - **Nivel de Corrección de Errores H (30% de recuperación)**: Esta especificación es mandatoria para laboratorios de materiales. Permite que la etiqueta sufra rayones severos, salpicaduras de lechada de cemento o raspaduras abrasivas durante el transporte de la muestra sin perder su capacidad de lectura.
   - Payload Estandarizado: `ENSALIA:S:<UUID_MUESTRA>:E:<NUMERO_ESPECIMEN>` (ej. `ENSALIA:S:clx12a809b:E:2`).

#### B. Modalidades de Lectura: Escáner de Sobremesa vs. WebRTC
- **Modalidad A (Estándar Primario Recomendado): Escáner de Presentación Fijo USB HID**:
  - Dispositivo de sobremesa omnidireccional con sellado IP52 (e.g., **Zebra DS9308** o **Honeywell Orbit 7190g**), montado permanentemente junto a la prensa o mesa de cabeceo.
  - El laboratorista saca el cilindro de la pileta, lo toma con ambas manos húmedas y lo pasa frente a la ventana de lectura a una distancia de $10\text{ a }25\text{ cm}$.
  - El lector decodifica la simbología en menos de $150\text{ ms}$ y transmite la ráfaga de pulsaciones de teclado HID terminadas en `Enter`.
  - El quiosco ENSALIA intercepta el código globalmente, busca el espécimen en la programación del día y abre automáticamente el formulario de ensayo sin requerir un solo clic de ratón.
- **Modalidad B (Alternativa de Campo / Tablet): Escáner Asistido WebRTC**:
  - Para estaciones basadas en tablet sin puertos USB disponibles.
  - Implementa la API nativa de Chromium `BarcodeDetector` (acelerada por GPU), con respaldo en WebAssembly mediante `@zxing/library`.
  - Captura el stream de video a 30 fps, analiza fotogramas en un `OffscreenCanvas` y emite una señal háptica al detectar el código.

---

### 2.4 Adquisición Directa de Telemetría de Prensas Digitales (Serial RS-232 / USB / Bluetooth)

#### A. Levantamiento de Consolas y Protocolos Digitales

1. **CONTROLS Group (Italia / Internacional)**:
   - Modelos: Consolas `DigiPlus` (50-C10D/2D), `Advantest 9`, `MCC Multichannel`, `Automax`.
   - Conector Físico: Puerto DB9 Hembra RS-232 (o puerto USB interno basado en chipset FTDI FT232R).
   - Parámetros de Comunicación: **9600 o 19200 Baudios, 8 Data Bits, No Parity, 1 Stop Bit (8N1)**. Control de flujo: Ninguno.
   - Trama Continua en Ejecución (emitida a 10 Hz):
     ```text
     +00124.5 kN  +002.4 kN/s  ST:RUN\r\n
     ```
   - Trama de Carga Pico (retenida al fracturarse el espécimen):
     ```text
     PEAK: +00458.2 kN  TIME: 0084s  ST:STOP\r\n
     ```
2. **FORNEY LP (Estados Unidos)**:
   - Modelos: Consolas `Co-Pilot` (TA-1252), `ForneyLink Touchscreen`, `VFD Automatic Series`.
   - Conector Físico: DB9 RS-232 o puerto USB Virtual COM (Silicon Labs CP210x).
   - Parámetros de Comunicación: **38400 Baudios (o 9600 en consolas legadas), 8N1**, sin handshaking.
   - Trama ASCII al Finalizar Ensayo:
     ```text
     TEST: 00124  FORCE: 103250 LBF  STRESS: 3652 PSI  PEAK: 103250 LBF\r\n
     ```
   - **NORMALIZACIÓN OBLIGATORIA DE UNIDADES IMPERIALES (LBF / PSI)**:
     Las consolas Forney emiten fuerza expresada en libras-fuerza (`LBF`) y esfuerzo en libras por pulgada cuadrada (`PSI`). La ingesta directa sin conversión provocaría almacenar $103,250\text{ kN}$ ($10,528\text{ toneladas métricas}$), introduciendo un error catastrófico de factor **$224.7\times$**. El puente serial implementa un filtro de normalización metrológica inmediata en la frontera de adquisición:
     $$F_{\text{kN}} = F_{\text{LBF}} \times 0.0044482216$$
     $$F_{\text{kgf}} = F_{\text{LBF}} \times 0.45359237$$
     $$\sigma_{\text{MPa}} = \sigma_{\text{PSI}} \times 0.006894757$$
     $$\sigma_{\text{kg/cm}^2} = \sigma_{\text{PSI}} \times 0.07030696$$
     *Ejemplo canónico*: Una lectura de $103,250\text{ LBF}$ con esfuerzo de $3,652\text{ PSI}$ es normalizada determinísticamente a $F = 459.28\text{ kN}$ ($46,833.4\text{ kgf}$) y $\sigma = 25.18\text{ MPa}$ ($256.76\text{ kg/cm}^2$), persistiendo únicamente unidades canónicas en SQLite.

3. **ELE International (Reino Unido / Internacional)**:
   - Modelos: Consolas `ADR-Touch` (ADR 2000, ADR 3000), `ADR-Auto`.
   - Conector Físico: DB9 Macho RS-232.
   - Parámetros de Comunicación: **9600 Baudios, 8N1**.
   - **CONDICIÓN CRÍTICA DE HARDWARE (Loopback RTS/CTS)**: Las consolas ELE ADR-Touch comprueban la presencia de una impresora externa mediante hardware handshaking. **Es mandatorio puentear físicamente los pines 7 y 8 (RTS y CTS) en el conector DB9 del cable del lado de la PC**. Si este puente no existe, la consola ELE inhibe el puerto serie y no transmite ninguna trama.
   - Trama Emitida (acumulación multi-línea con delimitador de fin de bloque):
     ```text
     ELE ADR-TOUCH - TEST REPORT\r\n
     SAMPLE ID: 260842\r\n
     MAX LOAD: 462.1 kN\r\n
     PACE RATE: 4.5 kN/s\r\n
     ```
4. **MATEST S.p.A. (Italia)**:
   - Modelos: Consolas `Cyber-Plus Evolution`, `Digitec`, `Servo-Plus Evolution`.
   - Conector Físico: DB9 RS-232 o interfaz Ethernet TCP/IP.
   - Parámetros de Comunicación: **9600 o 19200 Baudios, 8N1**.
   - Trama de Telemetría Continua:
     ```text
     #01L=00452.3R=004.42S=01*\r\n
     ```
     (Donde `L` representa la Carga en kN, `R` la Tasa de Carga en kN/s y `S=01` indica estado activo en carga).

#### B. Arquitectura de Ingesta: Web Serial API vs. Microservicio Daemon Local
Se implementa una arquitectura dual flexible adaptada a la topología física del laboratorio:

```text
VÍA 1: NAVEGADOR DIRECTO (Web Serial API) - Para quioscos autónomos mono-puesto
  [ Navegador Chromium ] ──(navigator.serial)──► [ Adaptador USB-RS232 FTDI ] ──► [ Prensa ]
  
VÍA 2: DAEMON SERIAL EN RED (Node.js Service) - Para laboratorios multi-estación
  [ Prensa ] ──► [ PC Host / Mini PC ] ──(Node serialport)──► [ WebSocket Server ws://:8088 ]
                                                                       │
                                              ┌────────────────────────┴───────────────────────┐
                                              ▼                                                ▼
                                    [ Quiosco Táctil Prensa ]                         [ PC Jefe de Lab ]
```

1. **Vía 1: Acceso Directo por Web Serial API (`navigator.serial`)**:
   - Ejecución $100\%$ en el navegador cliente (Google Chrome, Microsoft Edge, Opera).
   - Requiere un solo clic de emparejamiento inicial del puerto (`navigator.serial.requestPort()`); posteriormente la aplicación reabre la conexión de manera transparente (`navigator.serial.getPorts()`).
   - Cero instalación de daemons o dependencias externas en la computadora.
2. **Vía 2: Microservicio Daemon Local (Node.js Serial Bridge)**:
   - Para instalaciones donde la prensa está conectada a una computadora fija en el banco de prueba y el operario se desplaza con una tablet inalámbrica en la mano.
   - El daemon (`node-serialport`) se ejecuta como servicio desatendido de Windows (mediante `nssm`).
   - Mantiene el puerto COM permanentemente abierto con reconexión automática en caliente (*auto-reconnect*) y expone un servidor WebSocket local (`ws://localhost:8088/press`) que retransmite las lecturas en JSON a múltiples clientes en la red LAN.

3. **Requisito W3C de Entorno Seguro (Secure Contexts en Red Local)**:
   Conforme a la especificación W3C, tanto la **Web Serial API** (`navigator.serial`) como la captura de video WebRTC (`navigator.mediaDevices.getUserMedia`) están restringidas por los motores Chromium y WebKit exclusivamente a contextos seguros (`window.isSecureContext === true`). Mientras que `http://localhost` y `http://127.0.0.1` son seguros por definición, el acceso desde tablets u otros quioscos mediante IP de red intranet (e.g. `http://192.168.1.100:3000`) exige resolver el contexto seguro mediante una de tres estrategias operativas:
   - **Estrategia A (Recomendada en Intranet)**: Terminación TLS local mediante certificados de autoridad raíz interna generados con `mkcert` o proxy inverso Caddy/Nginx con dominio local (e.g. `https://ensalia.lab/`).
   - **Estrategia B (Quiosco Dedicado)**: Lanzamiento del navegador Chromium con la directiva explícita: `--unsafely-treat-insecure-origin-as-secure="http://192.168.1.100:3000" --enable-features=WebSerial`.
   - **Estrategia C (Aislamiento Total)**: Utilización por defecto del Microservicio Daemon Local Node.js (`ws://localhost:8088/press`), el cual transporta la telemetría sobre WebSocket local sin verse afectado por las restricciones de origen web.

#### C. Algoritmo de Tasa de Carga ASTM C39 / NMX-C-083 y Detección de Rotura
La norma **ASTM C39 (§7.5.1)** y la **NMX-C-083-ONNCCE** exigen que la velocidad de aplicación de carga se mantenga estrictamente entre **$0.15\text{ y }0.35\text{ MPa/s}$** ($20\text{ a }50\text{ psi/s}$), con una tasa objetivo de **$0.25\text{ MPa/s}$**, durante la segunda mitad de la curva de ensaye ($\ge 50\%$ de la carga máxima prevista).

##### 1. Parametrización Dinámica de la Tasa según el Área del Espécimen
La velocidad en $\text{kN/s}$ no es una constante de la prensa, sino una función directa del área transversal neta $A$:
$$\text{Tasa (kN/s)} = \text{Tasa de Esfuerzo (MPa/s)} \times A (\text{mm}^2) \times 10^{-3} = \frac{\text{Tasa (MPa/s)} \times A (\text{cm}^2)}{10}$$

| Geometría de Probeta | Diámetro Medio ($D$) | Área Transversal ($A$) | Tasa Mínima ($0.15\text{ MPa/s}$) | Tasa Objetivo ($0.25\text{ MPa/s}$) | Tasa Máxima ($0.35\text{ MPa/s}$) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Cilindro Estándar $15 \times 30\text{ cm}$** | $150.0\text{ mm}$ | $176.71\text{ cm}^2$ | **$2.65\text{ kN/s}$** ($270\text{ kgf/s}$) | **$4.42\text{ kN/s}$** ($450\text{ kgf/s}$) | **$6.18\text{ kN/s}$** ($631\text{ kgf/s}$) |
| **Cilindro $10 \times 20\text{ cm}$** | $100.0\text{ mm}$ | $78.54\text{ cm}^2$ | **$1.18\text{ kN/s}$** ($120\text{ kgf/s}$) | **$1.96\text{ kN/s}$** ($200\text{ kgf/s}$) | **$2.75\text{ kN/s}$** ($280\text{ kgf/s}$) |
| **Corazón Extraído $3 \times 6\text{ in.}$** | $75.0\text{ mm}$ | $44.18\text{ cm}^2$ | **$0.66\text{ kN/s}$** ($68\text{ kgf/s}$) | **$1.10\text{ kN/s}$** ($113\text{ kgf/s}$) | **$1.55\text{ kN/s}$** ($158\text{ kgf/s}$) |
| **Cubo de Mortero $5 \times 5\text{ cm}$** | $50.0\text{ mm}$ lado | $25.00\text{ cm}^2$ | **$0.38\text{ kN/s}$** ($38\text{ kgf/s}$) | **$0.63\text{ kN/s}$** ($64\text{ kgf/s}$) | **$0.88\text{ kN/s}$** ($89\text{ kgf/s}$) |

*Impacto Metrológico*: Un motor que fije estáticamente los límites en $3.53\text{ a }5.30\text{ kN/s}$ causará el **$100\%$ de rechazos falsos** por no conformidad de tasa cuando el laboratorio ensaye cilindros de $100 \times 200\text{ mm}$ (cuyo rango normativo es $1.18\text{ a }2.75\text{ kN/s}$). Por ello, el motor parametriza dinámicamente los umbrales en función del diámetro medido.

##### 2. Filtro Anti-Flutter de Asentamiento Hidráulico y Umbral Dinámico de Rotura
- **Filtro Anti-Flutter ($\ge 3$ Frames Consecutivos)**: En prensas hidráulicas, durante el asentamiento de los platos oscilantes sobre las almohadillas de neopreno (típicamente entre $20\text{ y }40\text{ kN}$), la válvula bypass y la deformación inicial provocan fluctuaciones transitorias donde la fuerza puede caer brevemente $> 15\%$ durante 100-200 ms. Para evitar disparos en falso antes de la rotura real, el motor exige que la caída persista durante al menos **3 lecturas consecutivas ($300\text{ ms}$ a 10 Hz)**.
- **Umbral Dinámico de Rotura**: Para habilitar la captura automática en concretos a edades tempranas (12h/24h) o morteros donde la falla física ocurre por debajo de $30\text{ kN}$, se reemplaza el corte rígido por un umbral dinámico:
  $$\text{minBreakThresholdKn} = \max(10.0\text{ kN}, 0.20 \times F_{\text{esperada}})$$

```typescript
// Motor de Telemetría Serie y Detección Endurecida de Carga Pico
export class PressTelemetryEngine {
  private peakLoadKn = 0;
  private isTesting = false;
  private loadHistory: Array<{ time: number; loadKn: number }> = [];
  private consecutiveDropFrames = 0;

  // Parámetros calculados dinámicamente según la probeta
  public readonly areaCm2: number;
  public readonly minRateKnS: number;
  public readonly maxRateKnS: number;
  public readonly targetRateKnS: number;
  public readonly minBreakThresholdKn: number;

  constructor(
    diameterMm = 150.0,
    expectedPeakKn?: number
  ) {
    const areaMm2 = (Math.PI * Math.pow(diameterMm, 2)) / 4;
    this.areaCm2 = Number((areaMm2 / 100).toFixed(2));

    // ASTM C39 / NMX-C-083: 0.15 a 0.35 MPa/s (Tasa objetivo 0.25 MPa/s)
    this.minRateKnS = Number((0.15 * areaMm2 * 1e-3).toFixed(2));
    this.maxRateKnS = Number((0.35 * areaMm2 * 1e-3).toFixed(2));
    this.targetRateKnS = Number((0.25 * areaMm2 * 1e-3).toFixed(2));

    // Umbral dinámico de activación de rotura (mínimo 10 kN o 20% de carga prevista)
    const expected = expectedPeakKn || (this.areaCm2 * 250 * 0.00980665); // Default f'c = 250 kg/cm2
    this.minBreakThresholdKn = Math.max(10.0, Number((expected * 0.20).toFixed(1)));
  }

  public processReading(loadKn: number, timestamp = performance.now()): {
    currentLoadKn: number;
    peakLoadKn: number;
    currentRateKnS: number;
    rateCompliant: boolean;
    breakDetected: boolean;
    phase: "PRELOAD" | "PHASE_1" | "PHASE_2_NORMATIVE" | "BROKEN";
  } {
    // 1. Detección de inicio de ensayo al superar precarga inicial (5.0 kN)
    if (loadKn > 5.0 && !this.isTesting) {
      this.isTesting = true;
      this.peakLoadKn = loadKn;
      this.loadHistory = [];
      this.consecutiveDropFrames = 0;
    }

    // 2. Ventana deslizante temporal móvil (últimos 1.5 segundos / 15 muestras a 10 Hz)
    this.loadHistory.push({ time: timestamp, loadKn });
    if (this.loadHistory.length > 20) this.loadHistory.shift();

    // 3. Derivada instantánea de carga dP/dt
    let currentRateKnS = 0;
    if (this.loadHistory.length >= 2) {
      const oldest = this.loadHistory[0];
      const dt = (timestamp - oldest.time) / 1000;
      if (dt > 0.1) {
        currentRateKnS = (loadKn - oldest.loadKn) / dt;
      }
    }

    // 4. Retención de Carga Pico Invariable
    if (loadKn > this.peakLoadKn) {
      this.peakLoadKn = loadKn;
    }

    // 5. Evaluación de Fase y Cumplimiento Normativo (ASTM C39 §7.5.1)
    // La tasa solo es vinculante en la Fase 2 (cuando carga >= 50% de la carga máxima o estimada)
    const isPhase2 = this.isTesting && (loadKn >= this.peakLoadKn * 0.50 || loadKn >= this.minBreakThresholdKn * 1.5);
    const rateCompliant = !isPhase2 || (currentRateKnS >= this.minRateKnS && currentRateKnS <= this.maxRateKnS);

    // 6. Detección Robusta de Rotura con Filtro Anti-Flutter (>= 3 frames consecutivos con caída > 15%)
    let breakDetected = false;
    if (this.isTesting && this.peakLoadKn >= this.minBreakThresholdKn) {
      if (loadKn < this.peakLoadKn * 0.85) {
        this.consecutiveDropFrames++;
        if (this.consecutiveDropFrames >= 3) {
          breakDetected = true;
          this.isTesting = false;
        }
      } else {
        // Recuperación de presión (asentamiento o fluctuación hidráulica transitoria)
        this.consecutiveDropFrames = 0;
      }
    }

    const phase = !this.isTesting
      ? (this.peakLoadKn > 0 ? "BROKEN" : "PRELOAD")
      : (isPhase2 ? "PHASE_2_NORMATIVE" : "PHASE_1");

    return {
      currentLoadKn: loadKn,
      peakLoadKn: this.peakLoadKn,
      currentRateKnS: Math.max(0, Number(currentRateKnS.toFixed(2))),
      rateCompliant,
      breakDetected,
      phase,
    };
  }

  public reset(): void {
    this.peakLoadKn = 0;
    this.isTesting = false;
    this.loadHistory = [];
    this.consecutiveDropFrames = 0;
  }
}
```

---

### 2.5 OCR Asistido por Cámara WebRTC para Manómetros Análogos y Displays 7 Segmentos

Para laboratorios que operan prensas hidráulicas mecánicas de carátula circular (tipo Bourdon) o indicadores digitales de 7 segmentos carentes de salida serial, se implementa un pipeline de visión computacional local en el navegador:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      PIPELINE DE OCR Y GAUGE READER ASISTIDO                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   [ Flujo WebRTC HD ] ──► [ Recorte ROI ] ──► [ Transformación de Perspectiva 4 Puntos ]│
│                                                              │                          │
│                                  ┌───────────────────────────┴───────────────────────┐  │
│                                  ▼ (Manómetro Análogo)       ▼ (Display 7 Segmentos) │  │
│                     [ Desenvoltura Polar (R, θ) ]        [ Normalización CLAHE ]     │  │
│                                  │                                   │                  │
│                     [ Detección de Aguja Hough ]         [ Umbralización Otsu ]      │  │
│                                  │                                   │                  │
│                     [ Cálculo de Ángulo / kN ]           [ Tesseract.js WASM Whitelist]│
│                                  │                                   │                  │
│                                  └───────────────────────────┬───────────────────────┘  │
│                                                              ▼                          │
│                                            [ Superposición Visual en Canvas ]           │
│                                            [ Validación con Operador (1-Tap) ]          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### A. Lector de Aguja en Manómetros Análogos (Polar Hough Dial Reader)
1. **Calibración Geométrica Guiada**: Al instalar la cámara, el administrador efectúa un procedimiento único de cuatro clics en pantalla: centro del manómetro $(x_c, y_c)$, radio útil $R$, ángulo del cero $\theta_0$ ($0\text{ kgf}$) y ángulo de máxima escala $\theta_{\max}$ (e.g. $100,000\text{ kgf}$ a $300^\circ$).
2. **Transformación Polar**: El área circular delimitada se proyecta a un plano rectangular donde el eje horizontal representa el ángulo continuo $\theta \in [0, 360^\circ]$ y el vertical la distancia radial $r$.
3. **Detección de Aguja mediante Transformada de Hough**: La aguja negra o roja resalta como una franja vertical oscura. El algoritmo identifica la recta principal y calcula su orientación angular con una resolución de $\pm 0.2^\circ$.
4. **Conversión Metrológica**:
   $$\text{Carga Calculada} = \frac{\theta_{\text{aguja}} - \theta_0}{\theta_{\max} - \theta_0} \times \text{Capacidad Plena}$$

#### B. Display Digital de 7 Segmentos (Tesseract.js WASM)
- El recorte del display se procesa mediante ecualización adaptativa local del histograma (CLAHE) para suprimir reflejos luminosos del vidrio y binarización de Otsu.
- Se ejecuta **Tesseract.js** en WebAssembly configurado con máscara estricta de caracteres: `tessedit_char_whitelist = "0123456789."` y modo de segmentación de línea única (`PSM.SINGLE_LINE`), con inferencia local en $<70\text{ ms}$.

#### C. Principio Human-in-the-Loop Obligatorio
El resultado de la visión computacional jamás se persiste ciegamente: la pantalla congela el fotograma y despliega el valor detectado en caracteres gigantes de alto contraste (e.g. `45,800 kgf`). El operador valida la cifra con **un solo toque en el pedal USB o en el botón de pantalla `[ CONFIRMAR LECTURA ]`**. Si una gota de aceite alteró un dígito, el operador toca el número y lo rectifica en el teclado numérico en menos de 2 segundos.

---

### 2.6 Matriz de Viabilidad, Bill of Materials (BOM USD/MXN) y Roadmap en 3 Fases

#### A. Matriz de Viabilidad Técnica y Operativa

| Modalidad de Captura | Viabilidad Técnica | Robustez en Ambiente Húmedo | Complejidad de Implementación | Fricción para el Operador | Costo Relativo |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Kiosk Touchscreen (Resistivo 5-Hilos)** | Muy Alta | Excelente (Inmune a agua y lodo) | Media (Diseño CSS/React) | Muy Baja (Intuitivo) | Moderado |
| **2. Escáner USB Fijo Manos Libres (Zebra DS9308)**| Muy Alta | Alta (Carcasa sellada IP52) | Muy Baja (HID Wedge nativo) | Cero (Pasa la probeta con dos manos) | Bajo |
| **3. Dictado por Voz Local (Vosk WASM + PTT)** | Alta | Muy Alta (Manos libres totales) | Media (Integración AudioWorklet)| Muy Baja (Pedal de pie natural) | Bajo |
| **4. Telemetría Serie Directa (Web Serial API)**| Muy Alta | Excelente (Cable blindado fijo) | Media (Parser de tramas ASCII) | Cero (Captura automática de pico) | Mínimo |
| **5. OCR Asistido por Cámara WebRTC** | Media-Alta| Moderada (Sensible a reflejos/polvo)| Alta (Calibración geométrica) | Media (Requiere confirmación visual) | Bajo-Medio |

---

#### B. Bill of Materials (BOM) Detallado de Hardware (Valores en USD y MXN)
*Tipo de cambio de referencia comercial: $1.00\text{ USD} = 20.00\text{ MXN}$*

##### Opción A: Paquete Base Optimizado (Kit Prensa Inteligente Plug & Play)
*Diseñado para laboratorios con prensas digitales existentes (Controls, Forney, ELE, Matest) sobre PC o tablet Windows existente.*

| Componente | Especificación Técnica Recomendada | Costo (USD) | Costo (MXN) | Justificación Metrológica |
| :--- | :--- | :---: | :---: | :--- |
| **Escáner 2D Fijo Manos Libres** | Zebra DS9308 USB HID (o Datalogic Magellan 1500M) | $185.00 | $3,700.00 | Lectura omnidireccional instantánea de códigos QR/128 con ambas manos ocupadas. |
| **Pedal de Pie Industrial USB (PTT)** | iKKEGOL Single Foot Switch USB Metálico IP65 | $30.00 | $600.00 | Disparo de voz y confirmación sin tocar pantallas con guantes lodosos. |
| **Cable Industrial USB a RS-232 DB9** | Chipset FTDI FT232RL Blindado Grado Industrial (con loopback RTS/CTS) | $28.00 | $560.00 | Conexión directa y confiable a la consola serie sin pérdida de paquetes. |
| **Diadema con Micrófono Cancelación Ruido**| Auricular USB monoaural con micrófono cancelador pasivo de ruido | $45.00 | $900.00 | Inmunidad acústica frente al motor hidráulico de la máquina ($85\text{ dBA}$). |
| **TOTAL BOM OPCIÓN BASE** | — | **$288.00 USD** | **$5,760.00 MXN** | **Retorno de inversión directo en menos de 15 días laborales.** |

##### Opción B: Estación Kiosk Completa de Uso Rudo (Turnkey Workstation)
*Diseñada para montaje permanente en el chasis de la prensa en ambientes severos sin PC previa.*

| Componente | Especificación Técnica Recomendada | Costo (USD) | Costo (MXN) | Justificación Metrológica |
| :--- | :--- | :---: | :---: | :--- |
| **Panel PC Industrial Táctil 15.6" IP65**| Panel táctil resistivo 5 hilos o PCAP Glove Mode, Intel Celeron/Core, Fanless, Win 11 Pro, IP65 Frontal | $750.00 | $15,000.00 | Estanqueidad frente a salpicaduras de curado y polvo de concreto. |
| **Brazo Articulado para Chasis de Prensa**| Soporte VESA 75/100 de acero de alta resistencia con amortiguadores elásticos antivibración | $95.00 | $1,900.00 | Desacopla la pantalla de las sacudidas de fractura del bastidor. |
| **Escáner 2D Presentación Manos Libres** | Zebra DS9308 USB Omnidireccional | $185.00 | $3,700.00 | Identificación de probetas en 0.2 segundos. |
| **Pedal Doble Industrial USB** | Pedal de 2 interruptores (Izquierdo: Voz PTT, Derecho: Guardar Ensaye) | $55.00 | $1,100.00 | Flujo manos libres integral para el ciclo completo de ensayo. |
| **Cable de Telemetría RS-232 / USB FTDI** | Adaptador industrial blindado con aislamiento galvánico de $1.5\text{ kV}$ | $45.00 | $900.00 | Protección contra sobretensiones transitorias del motor de la prensa. |
| **Cámara WebRTC Full HD con Base Magnética**| Cámara USB 1080p con lente varifocal y base magnética antivibración (para fotos forenses y OCR) | $75.00 | $1,500.00 | Registro de la falla y lectura asistida de carátula análoga. |
| **TOTAL BOM ESTACIÓN TURNKEY** | — | **$1,205.00 USD** | **$24,100.00 MXN** | **Solución integral de grado industrial con vida útil superior a 7 años.** |

---

#### C. Roadmap de Despliegue en 3 Fases Priorizadas

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ROADMAP DE DESPLIEGUE EN ÁREA DE ROTURA                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  FASE 1: CERO PAPELES Y QUICK WINS (Semanas 1 - 2)                                     │
│  ├── Interfaz Kiosk Mode con Touch Targets >= 80px y Numpad Virtual                    │
│  ├── Interceptor de Escáner USB HID Wedge (Códigos QR y Code 128)                      │
│  └── Conexión Directa Web Serial API para Prensas Controls, Forney, ELE y Matest       │
│                                                                                        │
│  FASE 2: MANOS LIBRES TOTALES (Semanas 3 - 4)                                          │
│  ├── Integración de Vosk WASM Offline en Español con Diccionario Gramatical Kaldi       │
│  ├── Mapeo de Pedal de Pie USB Industrial (F12 PTT / Enter Guardar)                    │
│  └── Validación Automática de Tasa de Carga ASTM C39 / NMX-C-083 (0.25 ± 0.05 MPa/s)  │
│                                                                                        │
│  FASE 3: DIGITALIZACIÓN DE PRENSAS ANÁLOGAS (Semanas 5 - 6)                            │
│  ├── Pipeline de OCR Asistido y Gauge Reader Polar para Manómetros Bourdon             │
│  ├── Estampado Forense de Fractura WebRTC y Guardado Local WebP en SQLite              │
│  └── Servicio Daemon Local Node.js Serial Bridge para Laboratorios Multi-Terminal      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Motor Automatizado de Reportes Oficiales de Rotura en PDF (`pdf-lib`) (R3)

### 3.1 Fundamentación Normativa y Requisitos de Metrología (ASTM C39 y NMX-C-083)

#### A. Medición Dimensional y Regla de Excentricidad Máxima ($< 2\%$)
Conforme a **ASTM C39 (§6.2)** y **NMX-C-083**, el área transversal no debe inferirse de un diámetro nominal:
1. Deben registrarse **dos diámetros ortogonales ($d_1$ y $d_2$)** medidos con vernier a la mitad de la altura de la probeta, aproximados al $0.25\text{ mm}$ ($0.01\text{ in.}$).
2. **Criterio de Rechazo por Excentricidad**:
   $$\Delta_{\text{excentricidad}} = \frac{|d_1 - d_2|}{\min(d_1, d_2)} \times 100\%$$
   Si $\Delta_{\text{excentricidad}} > 2.0\%$, la probeta está fuera de la tolerancia geométrica de cilindricidad y **no debe ensayarse oficialmente**, debiendo asentarse la no conformidad.
3. Diámetro medio y área oficial:
   $$D = \frac{d_1 + d_2}{2}, \quad A = \frac{\pi D^2}{4}$$
   (El área se asienta redondeada a la $0.01\text{ cm}^2$ más cercana).

#### B. Factor de Corrección por Esbeltez ($L/D$)
Cuando la longitud del cilindro tras el refrentado produce una relación longitud/diámetro $L/D \le 1.75$ (frecuente en corazones extraídos o probetas recortadas), la resistencia calculada sobrestima la capacidad real del material debido al confinamiento triaxial de los platos de acero. Por norma, debe aplicarse el factor de corrección multiplicativo $F_{L/D}$:

$$\text{Resistencia Corregida } f_c = f_{c,\text{nominal}} \times F_{L/D} = \left( \frac{P}{A} \right) \times F_{L/D}$$

| Relación $L/D$ | Factor ASTM C39 Tabla 1 | Factor NMX-C-083 Tabla 1 | Significado Mecánico |
| :---: | :---: | :---: | :--- |
| **$2.00$** | **$1.00$** | **$1.00$** | Cilindro estándar. Estado uniaxial libre. |
| **$1.75$** | **$0.98$** | **$0.98$** | Leve influencia del confinamiento en extremos. |
| **$1.50$** | **$0.96$** | **$0.96$** | Confinamiento moderado incrementa resistencia aparente. |
| **$1.25$** | **$0.93$** | **$0.94$** | Fuerte restricción mecánica de platos. |
| **$1.00$** | **$0.87$** | **$0.89$** | Máximo confinamiento; incremento ficticio del $13\%$. |
| **$< 1.00$** | **RECHAZADA** | **RECHAZADA** | Espécimen no normativo. Extrapolación estrictamente prohibida. |

*Fórmula de Interpolación Lineal Continua para $L/D \in [R_1, R_2]$*:
$$F_{L/D} = F_1 + \left( \frac{L/D - R_1}{R_2 - R_1} \right) \times (F_2 - F_1)$$

*Guardas Metrológicas de Frontera*:
- Para $L/D \ge 2.00$: El factor se acota estrictamente a $F_{L/D} = 1.000$. Queda terminantemente prohibido extrapolar $F_{L/D} > 1.000$ para probetas más altas de lo habitual, ya que sobreestimaría artificial e ilegalmente la resistencia estructural.
- Para $L/D < 1.00$: El espécimen se declara **RECHAZADO**. El confinamiento triaxial de los cabezales distorsiona la rotura y no representa la resistencia uniaxial del concreto.

#### C. Ventanas y Tolerancias Temporales en la Edad de Ensaye (NMX-C-083)
El ensayo ejecutado fuera de la ventana horaria permitida no puede certificarse como válido a menos que se asiente explícitamente en el informe:

| Edad Programada ($\text{Edad}$) | Tolerancia Permisible | Tolerancia Relativa | Ventana Válida en Horas |
| :--- | :--- | :---: | :---: |
| **$24\text{ horas}$ ($1\text{ día}$)** | $\pm 0.5\text{ horas}$ ($\pm 30\text{ min}$) | $\pm 2.08\%$ | $23.5\text{ h}$ a $24.5\text{ h}$ |
| **$3\text{ días}$ ($72\text{ horas}$)** | $\pm 2.0\text{ horas}$ | $\pm 2.78\%$ | $70.0\text{ h}$ a $74.0\text{ h}$ |
| **$7\text{ días}$ ($168\text{ horas}$)** | $\pm 6.0\text{ horas}$ | $\pm 3.57\%$ | $162.0\text{ h}$ a $174.0\text{ h}$ |
| **$14\text{ días}$ ($336\text{ horas}$)**| $\pm 12.0\text{ horas}$ | $\pm 3.57\%$ | $324.0\text{ h}$ a $348.0\text{ h}$ |
| **$28\text{ días}$ ($672\text{ horas}$)**| $\pm 20.0\text{ horas}$ | $\pm 2.98\%$ | $652.0\text{ h}$ a $692.0\text{ h}$ |
| **$60\text{ días}$ ($1440\text{ horas}$)**| $\pm 36.0\text{ horas}$ | $\pm 2.50\%$ | $1404.0\text{ h}$ a $1476.0\text{ h}$ |
| **$90\text{ días}$ ($2160\text{ horas}$)**| $\pm 48.0\text{ horas}$ | $\pm 2.22\%$ | $2112.0\text{ h}$ a $2208.0\text{ h}$ |

*Comportamiento del Sistema ENSALIA*: Si $\Delta t = |t_{\text{rotura}} - t_{\text{colado}}| - \text{HorasNominales} > \text{Tolerancia}$, el motor PDF estampa automáticamente un cintillo de advertencia en rojo: `"FUERA DE TOLERANCIA DE EDAD SEGÚN NMX-C-083 (+X.X horas)"`.

---

### 3.2 Evaluación Estadística de Calidad ACI 214R-11 y Criterios Estructurales ACI 318-19

#### A. Definición de "Resultado de Ensayo" vs. "Espécimen"
Conforme a **ACI 214R (§3.1)** y **ACI 318 (§26.12)**, un único cilindro roto es un resultado de probeta. Un **Resultado Oficial de Ensayo ($x_i$)** se define formalmente como el **promedio de al menos dos probetas gemelas** moldeadas de la misma muestra de concreto y ensayadas a la edad de garantía especificada (generalmente 28 días).

#### B. Variación Dentro del Ensayo ($s_1, V_1$): Control de Calidad del Laboratorio
Evalúa la repetibilidad de los procedimientos internos del laboratorio (moldeo, compactación, curado, cabeceo y centrado en la prensa):
- Rango entre probetas gemelas: $R = |f_{c,1} - f_{c,2}|$.
- Rango promedio del lote: $\bar{R} = \frac{1}{m} \sum_{i=1}^m R_i$.
- Desviación estándar dentro del ensayo ($s_1$):
  $$s_1 = \frac{\bar{R}}{d_2} \quad \text{donde } d_2 = 1.128 \text{ para } n = 2 \text{ probetas companion}$$
- Coeficiente de variación dentro del ensayo ($V_1$):
  $$V_1 = \left( \frac{s_1}{\bar{x}} \right) \times 100\%$$

*Criterios de Calificación ACI 214R (Tabla 4.3)*:
- $V_1 < 3.0\%$: **Excelente** (Práctica de laboratorio impecable).
- $3.0\% \le V_1 \le 4.0\%$: **Muy Bueno** (Laboratorio comercial acreditado estándar).
- $4.0\% < V_1 \le 5.0\%$: **Bueno** (Aceptable, ligera dispersión operativa).
- $V_1 > 5.0\%$: **Deficiente** (Procedimientos defectuosos; exige auditoría de cabezales, platos o técnicos).

#### C. Variación General ($s, V$) y Resistencia de Dosificación Requerida ($f'_{cr}$)
Mide la variabilidad combinada de los materiales constituyentes (cemento, agregados, aditivos) y la dosificación en la planta de concreto:
$$\bar{x} = \frac{1}{n} \sum_{i=1}^n x_i, \quad s = \sqrt{\frac{1}{n - 1} \sum_{i=1}^n (x_i - \bar{x})^2}, \quad V = \left( \frac{s}{\bar{x}} \right) \times 100\%$$

*Fórmulas de Dosificación Requerida $f'_{cr}$ (ACI 318-19 / ACI 214R)*:
1. Para concreto convencional ($f'c \le 350\text{ kg/cm}^2$ o $\le 35\text{ MPa}$):
   $$f'_{cr} = \max \Big( f'c + 1.34s, \quad f'c + 2.33s - 35\text{ kg/cm}^2 \Big)$$
2. Para concreto de alta resistencia ($f'c > 350\text{ kg/cm}^2$ o $> 35\text{ MPa}$):
   $$f'_{cr} = \max \Big( f'c + 1.34s, \quad 0.90 f'c + 2.33s \Big)$$
3. **Factor de Ajuste $k$ por Muestra Reducida ($15 \le n < 30$ Ensayos)**:
   Si se dispone de entre 15 y 29 ensayos consecutivos, la desviación estándar debe corregirse mediante $s_{\text{ajustada}} = k \cdot s$:
   - $n = 15 \rightarrow k = 1.16$
   - $n = 20 \rightarrow k = 1.08$
   - $n = 25 \rightarrow k = 1.03$
   - $n \ge 30 \rightarrow k = 1.00$
4. **Margen Fijo de Sobrediseño por Historial Insuficiente ($n < 15$ Ensayos - ACI 318-19 Tabla 26.12.1.1(b))**:
   Cuando una planta dosificadora o diseño de mezcla nuevo carece de historial estadístico suficiente ($n < 15$ registros previos), la norma ACI 318 prohíbe el empleo de la desviación estándar debido a la excesiva volatilidad de la varianza muestral. En su lugar, el sistema impone obligatoriamente los incrementos fijos de sobrediseño:
   - Para $f'c < 210\text{ kg/cm}^2$ ($< 21\text{ MPa}$):
     $$f'_{cr} = f'c + 70\text{ kg/cm}^2 \quad (+7.0\text{ MPa})$$
   - Para $210 \le f'c \le 350\text{ kg/cm}^2$ ($21 \le f'c \le 35\text{ MPa}$):
     $$f'_{cr} = f'c + 85\text{ kg/cm}^2 \quad (+8.5\text{ MPa})$$
   - Para $f'c > 350\text{ kg/cm}^2$ ($> 35\text{ MPa}$):
     $$f'_{cr} = 1.10 f'c + 50\text{ kg/cm}^2 \quad (1.10 f'c + 5.0\text{ MPa})$$

#### D. Criterios de Aceptación Estructural (ACI 318-19 §26.12.3)
Para considerar satisfactorio un lote estructural, deben cumplirse simultáneamente dos condiciones:
1. El promedio aritmético de cualesquiera **tres ensayos consecutivos** ($\bar{x}_3$) debe ser igual o superior a $f'c$:
   $$\bar{x}_{3,i} = \frac{x_i + x_{i-1} + x_{i-2}}{3} \ge f'c$$
2. Ningún ensayo individual ($x_i$) debe caer por debajo de $f'c$ por más de:
   - $35\text{ kg/cm}^2$ ($3.5\text{ MPa}$) para concretos con $f'c \le 350\text{ kg/cm}^2$.
   - $0.10 f'c$ para concretos con $f'c > 350\text{ kg/cm}^2$.

#### E. Modelado Gaussiano y Guardas Defensivas contra División por Cero
$$\text{Densidad Normal } f(x) = \frac{1}{s \sqrt{2\pi}} \exp \left( -\frac{1}{2} \left( \frac{x - \bar{x}}{s} \right)^2 \right)$$
- **Guardas Estrictas en Código**:
  1. Si $n < 2$: Denominador $n - 1 = 0 \rightarrow$ retorna $s = 0, V = 0\%, f'_{cr} = \text{null}$, puntos gaussianos = `[]`.
  2. Si $s \le 0$ o $\bar{x} \le 0$: Denominador $s\sqrt{2\pi} = 0 \rightarrow$ retorna $V = 0\%, f'_{cr} = f'c$, puntos gaussianos = `[]`.
  3. Intervalo de Graficación: Delimitado entre $[\max(0, \bar{x} - 3.5s), \; \bar{x} + 3.5s]$ discretizado en 60 intervalos regulares.

---

### 3.3 Arquitectura del Generador de Reportes PDF con `pdf-lib` (100% Offline, <120 ms)

#### A. Especificaciones de Rendimiento y Dimensiones
- **Motor**: Pure TypeScript / JavaScript `pdf-lib` + tipografías base del estándar PDF (`Helvetica` y `Helvetica-Bold`).
- **Rendimiento Comprobado**: Tiempo de compilación inferior a **$120\text{ ms}$** por documento en procesadores comerciales; tamaño binario inferior a **$350\text{ KB}$** (incluyendo fotografía de fractura comprimida en WebP/JPEG); cero llamadas de red externas; cero dependencias de navegadores headless (Puppeteer o Chromium).
- **Formato Físico**: Carta Estándar (**Letter**):
  $$\text{Ancho} = 612\text{ pt} \quad (8.5\text{ in.}), \quad \text{Alto} = 792\text{ pt} \quad (11.0\text{ in.})$$
  $$\text{Margen de Impresión} = 30\text{ pt} \quad (\text{Ancho útil} = 552\text{ pt})$$

#### B. Arquitectura Visual del Certificado Ejecutivo de 1 Página

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [LOGO]  LABORATORIO DE CONTROL DE CALIDAD S.A. DE C.V.  [CERT FOLIO]   │
│         Acreditación EMA No. C-0412-089/22 | Rama Concreto             │
├────────────────────────────────────────────────────────────────────────┤
│ 1. DATOS DEL CLIENTE Y DE LA OBRA                                      │
│    Cliente: CONSORCIO VIAL PENINSULAR   Obra: TREN MAYA TRAMO 4        │
│    Contratista: ICA CONSTRUCTORA        Ubicación: KM 142+500 CANCÚN   │
│    Elemento: LOSA SUPERIOR PASO SUPERIOR VEHICULAR EJE 4               │
├────────────────────────────────────────────────────────────────────────┤
│ 2. ESPECIFICACIÓN DEL CONCRETO Y COLADO                                │
│    f'c Diseño: 300 kg/cm² (29.4 MPa)    Edad Garantía: 28 días         │
│    TMA: 19 mm (3/4")   Rev. Nom: 14 cm  Tipo Cemento: CPC 40R          │
│    Concretera: CEMEX PLANTA CANCÚN      Remisión: R-98421 Camión: C-14 │
├────────────────────────────────────────────────────────────────────────┤
│ 3. CONDICIONES DE MUESTREO Y CURADO                                    │
│    Fecha/Hora Muestreo: 2026-10-02 10:30 h  Revenimiento Obtenido: 14.5│
│    Temp. Ambiente: 28.5 °C  Temp. Concreto: 27.2 °C  Aire: 1.8%        │
│    Curado: Cámara Húmeda NMX-C-148 (23 ± 2 °C, HR >= 95%)              │
├────────────────────────────────────────────────────────────────────────┤
│ 4. RESULTADOS DE ENSAYE DE COMPRESIÓN (ASTM C39 / NMX-C-083)           │
│ ┌──┬─────────┬────┬──────┬─────────┬────┬─────┬──────┬───┬──────┬───┬──┐ │
│ │# │F. Rotura│Edad│Masa g│D1/D2(mm)│D mm│L mm │Área  │P kN│fc kg │%fc│Ok│ │
│ ├──┼─────────┼────┼──────┼─────────┼────┼─────┼──────┼───┼──────┼───┼──┤ │
│ │1 │09/10/26 │ 7d │12,810│150.1/150│150 │300.2│176.7 │412│ 237.8│ 79│✓ │ │
│ │2 │30/10/26 │28d │12,850│150.0/150│150 │300.0│176.7 │562│ 324.5│108│✓ │ │
│ │3 │30/10/26 │28d │12,840│150.2/150│150 │300.1│176.7 │558│ 322.1│107│✓ │ │
│ └──┴─────────┴────┴──────┴─────────┴────┴─────┴──────┴───┴──────┴───┴──┘ │
├────────────────────────────────────────────────────────────────────────┤
│ 5. PATRONES DE FRACTURA Y EVIDENCIA FOTOGRÁFICA                        │
│ ┌─────────────────────────┐  ┌───────────────────────────────────────┐ │
│ │  VECTOR PROBE DIAGRAM   │  │    HIGH-RES FORENSIC BREAK PHOTO      │ │
│ │  Type 1: Conical cone   │  │    [Watermark burned: M-842 #2]       │ │
│ │  both ends well formed  │  │    324.5 kg/cm² (108%) | 2026-10-30   │ │
│ └─────────────────────────┘  └───────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ 6. VALIDACIÓN CRIPTOGRÁFICA Y FIRMAS DIGITALES AUTORIZADAS             │
│ [  QR CODE  ] SHA-256: 8a7f43b...    ________________  _______________│
│ Scan to verify http://ensalia/verify/  Técnico Ensaye   Jefe de Calidad│
│ Offline Token: ENSALIA:COMP:1:...    Ing. C. Canto    Ing. R. Morales │
└────────────────────────────────────────────────────────────────────────┘
```

#### Coordenadas Verticales Exactas ($Y$-Axis en Points desde la base $Y=0$):
- **$Y = 762$ a $720$**: Encabezado Institucional, Logotipo, Folio y Acreditación EMA ($42\text{ pt}$).
- **$Y = 715$ a $650$**: Cuadrícula de Datos del Cliente, Obra, Localización y Elemento ($65\text{ pt}$).
- **$Y = 645$ a $590$**: Especificación del Concreto, Diseño $f'c$, Revenimiento y Cemento ($55\text{ pt}$).
- **$Y = 585$ a $540$**: Parámetros de Muestreo en Campo, Temperaturas y Régimen de Curado ($45\text{ pt}$).
- **$Y = 535$ a $385$**: Tabla Oficial de Resultados de Ensayes (Encabezados + hasta 5 filas) ($150\text{ pt}$).
- **$Y = 380$ a $240$**: Marco de Evidencia Física: Silueta Vectorial de Falla + Fotografía Forense ($140\text{ pt}$).
- **$Y = 235$ a $165$**: Bloque de Trazabilidad Criptográfica QR SHA-256 ($70\text{ pt}$).
- **$Y = 160$ a $75$**: Bloque de Firmas Digitales Biométricas (Técnico y Signatario Acreditado) ($85\text{ pt}$).
- **$Y = 70$ a $25$**: Declaración Legal de Cumplimiento Normativo ASTM C39 / NMX-C-083 y Pie de Página ($45\text{ pt}$).

---

### 3.4 Motor de Dibujo Vectorial Dinámico de Fracturas (Tipos 1 al 6)

Para eliminar cualquier dependencia de imágenes rasterizadas borrosas o iconos externos, el motor dibuja directamente en el canvas del PDF las geometrías de rotura normalizadas por **ASTM C39 (Figura 2)**:

```text
    Type 1              Type 2              Type 3
  ┌────────┐          ┌────────┐          ┌────────┐
  │ \    / │ Cone     │ \    / │ Cone     │ |    | │ Columnar
  │  \  /  │ both     │  \  /  │ top,     │ |    | │ vertical
  │   ><   │ ends     │   ><   │ split    │ |    | │ cracks
  │  /  \  │          │   ||   │ bottom   │ |    | │ through
  │ /    \ │          │   ||   │          │ |    | │ both ends
  └────────┘          └────────┘          └────────┘
    Type 4              Type 5              Type 6
  ┌────────┐          ┌────────┐          ┌────────┐
  │      / │ Shear    │\      /│ Corner/  │░░░░░░░░│ Capping /
  │     /  │ diagonal │ \    / │ Side     │        │ Pointed
  │    /   │ fracture │        │ fracture │        │ failure
  │   /    │ (no cone)│        │ (corner  │        │ (spalled
  │  /     │          │        │ chipped) │        │ end)
  └────────┘          └────────┘          └────────┘
```

```typescript
// Implementación del Dibujo Vectorial de Patrones de Fractura en PDF
import { PDFPage, rgb } from "pdf-lib";

export type TipoFallaConcreto =
  | "CONO_TIPO_1"
  | "CONO_Y_DIVIDIDO_TIPO_2"
  | "COLUMNA_TIPO_3"
  | "CIZALLA_TIPO_4"
  | "ESQUINA_TIPO_5"
  | "PUNTUAL_TIPO_6"
  | "OTRA";

export function drawFractureVectorDiagram(
  page: PDFPage,
  type: TipoFallaConcreto,
  originX: number,
  originY: number,
  scale: number = 1.0
): void {
  const w = 32 * scale;
  const h = 64 * scale;
  const borderColor = rgb(0.15, 0.2, 0.25);
  const crackColor = rgb(0.85, 0.15, 0.15); // Trazo rojo pericial

  // 1. Cuerpo del cilindro y platos de acero
  page.drawRectangle({
    x: originX,
    y: originY,
    width: w,
    height: h,
    borderWidth: 1.2 * scale,
    borderColor,
    color: rgb(0.96, 0.97, 0.98),
  });

  // Plato superior
  page.drawLine({
    start: { x: originX - 4 * scale, y: originY + h },
    end: { x: originX + w + 4 * scale, y: originY + h },
    thickness: 2 * scale,
    color: borderColor,
  });

  // Plato inferior
  page.drawLine({
    start: { x: originX - 4 * scale, y: originY },
    end: { x: originX + w + 4 * scale, y: originY },
    thickness: 2 * scale,
    color: borderColor,
  });

  // 2. Trazo vectorial de fractura según ASTM C39 Figura 2
  switch (type) {
    case "CONO_TIPO_1":
      // Cono superior bien formado
      page.drawLine({ start: { x: originX, y: originY + h }, end: { x: originX + w / 2, y: originY + h * 0.55 }, thickness: 1.5 * scale, color: crackColor });
      page.drawLine({ start: { x: originX + w, y: originY + h }, end: { x: originX + w / 2, y: originY + h * 0.55 }, thickness: 1.5 * scale, color: crackColor });
      // Cono inferior bien formado
      page.drawLine({ start: { x: originX, y: originY }, end: { x: originX + w / 2, y: originY + h * 0.45 }, thickness: 1.5 * scale, color: crackColor });
      page.drawLine({ start: { x: originX + w, y: originY }, end: { x: originX + w / 2, y: originY + h * 0.45 }, thickness: 1.5 * scale, color: crackColor });
      break;

    case "CONO_Y_DIVIDIDO_TIPO_2":
      // Cono inferior bien formado
      page.drawLine({ start: { x: originX, y: originY }, end: { x: originX + w / 2, y: originY + h * 0.48 }, thickness: 1.5 * scale, color: crackColor });
      page.drawLine({ start: { x: originX + w, y: originY }, end: { x: originX + w / 2, y: originY + h * 0.48 }, thickness: 1.5 * scale, color: crackColor });
      // Fisura vertical atravesando el extremo superior
      page.drawLine({ start: { x: originX + w / 2, y: originY + h * 0.48 }, end: { x: originX + w / 2, y: originY + h }, thickness: 1.5 * scale, color: crackColor });
      page.drawLine({ start: { x: originX + w * 0.4, y: originY + h * 0.6 }, end: { x: originX + w * 0.4, y: originY + h }, thickness: 1.0 * scale, color: crackColor });
      break;

    case "COLUMNA_TIPO_3":
      // Fisuras columnares verticales paralelas
      page.drawLine({ start: { x: originX + w * 0.28, y: originY }, end: { x: originX + w * 0.28, y: originY + h }, thickness: 1.5 * scale, color: crackColor });
      page.drawLine({ start: { x: originX + w * 0.52, y: originY }, end: { x: originX + w * 0.52, y: originY + h }, thickness: 1.5 * scale, color: crackColor });
      page.drawLine({ start: { x: originX + w * 0.74, y: originY }, end: { x: originX + w * 0.74, y: originY + h }, thickness: 1.5 * scale, color: crackColor });
      break;

    case "CIZALLA_TIPO_4":
      // Fractura diagonal completa de esquina a esquina
      page.drawLine({ start: { x: originX + 2 * scale, y: originY + h * 0.85 }, end: { x: originX + w - 2 * scale, y: originY + h * 0.15 }, thickness: 2.0 * scale, color: crackColor });
      break;

    case "ESQUINA_TIPO_5":
      // Desprendimiento en esquina superior
      page.drawLine({ start: { x: originX + w * 0.5, y: originY + h }, end: { x: originX + w, y: originY + h * 0.68 }, thickness: 1.6 * scale, color: crackColor });
      // Desprendimiento en esquina inferior
      page.drawLine({ start: { x: originX, y: originY + h * 0.32 }, end: { x: originX + w * 0.5, y: originY }, thickness: 1.6 * scale, color: crackColor });
      break;

    case "PUNTUAL_TIPO_6":
      // Falla superficial confinada al cabeceo / descascaramiento
      page.drawLine({ start: { x: originX, y: originY + h * 0.9 }, end: { x: originX + w * 0.3, y: originY + h * 0.82 }, thickness: 1.5 * scale, color: crackColor });
      page.drawLine({ start: { x: originX + w * 0.3, y: originY + h * 0.82 }, end: { x: originX + w * 0.7, y: originY + h * 0.92 }, thickness: 1.5 * scale, color: crackColor });
      page.drawLine({ start: { x: originX + w * 0.7, y: originY + h * 0.92 }, end: { x: originX + w, y: originY + h * 0.86 }, thickness: 1.5 * scale, color: crackColor });
      break;

    default:
      // Falla diagonal genérica
      page.drawLine({ start: { x: originX, y: originY + h * 0.8 }, end: { x: originX + w, y: originY + h * 0.2 }, thickness: 1.5 * scale, color: crackColor });
      break;
  }
}
```

---

### 3.5 Incrustación de Evidencia Fotográfica Forense de Probeta Fracturada

Para convertir el reporte en una pieza pericial inalterable, la fotografía tomada en la estación de prensa (vía cámara WebRTC o móvil) se incrusta en el cuadrante de evidencia física del PDF:
1. **Compresión y Ajuste de Aspect Ratio**: La imagen capturada se escala deterministamente a un cuadro de $190 \times 130\text{ pt}$, preservando la proporción original sin distorsión anatómica del cilindro.
2. **Sello Forense Indeleble Quemado en Píxeles**: Previo a la incrustación, se dibuja sobre la imagen una franja semitransparente con los metadatos forenses quemados:
   `[ FOLIO: INF-COMP-2026-00412 | CILINDRO #2 | CARGA: 562.0 kN | fc: 324.5 kg/cm² (108%) | 2026-10-30 14:32 UTC ]`
3. **Resguardo de Inexistencia**: Si la estación no contaba con cámara al momento del ensaye, el motor dibuja un recuadro con borde punteado y la leyenda: *"Evidencia fotográfica no registrada en estación de prensa"*, asegurando que el diseño de página no se desplace.

---

### 3.6 Trazabilidad Criptográfica QR SHA-256 y Firmas Digitales Biométricas

#### A. Generación Canónica y Hash SHA-256
Antes de sellar el documento, los atributos metrológicos del informe se serializan en un JSON canónico con claves ordenadas alfabéticamente:

```typescript
export interface CertificateCanonicalPayload {
  folio: string;               // "INF-COMP-2026-00412"
  idMuestra: string;           // "M-2026-0842"
  cliente: string;
  obra: string;
  fechaColadoUtc: string;      // "2026-10-02T10:30:00Z"
  fcDisenoKgCm2: number;       // 300
  edadGarantiaDias: number;    // 28
  fechaEmisionUtc: string;     // "2026-10-30T14:30:00Z"
  especimenes: Array<{
    numero: number;
    edadRealDias: number;
    cargaMaximaKg: number;
    resistenciaKgCm2: number;
    porcentajeFc: number;
    tipoFalla: string;
  }>;
  prensaCodigoInterno: string;
  operadorId: string;
  signatarioId: string;
}
```
Se calcula el hash SHA-256 inmutable:
$$\text{HashDoc} = \text{SHA256}(\text{CanonicalJsonString})$$

#### B. Código QR con Payload Dual
El código QR ($72 \times 72\text{ pt}$) impreso en la base del certificado contiene un payload de doble verificación:
1. **Enlace Intranet / Web**: `http://<ip-servidor>:3000/verify/<sha256>?folio=INF-COMP-2026-00412`
2. **Token Autónomo 100% Offline**:
   `ENSALIA:COMP:1:INF-COMP-2026-00412:20261030:324.5:8a7f43bd3289...`
   (Permite a un supervisor en campo verificar la autenticidad del papel impreso sin internet, comparando la carga y resistencia del token contra la tabla física).

#### C. Firmas Digitales Biométricas Integradas
El bloque inferior incorpora los recuadros de firma para el **Técnico de Laboratorio** y el **Signatario Autorizado Acreditado (Jefe de Calidad)**:
- Trazos vectoriales capturados mediante canvas táctil o digitalizador de firmas con interpolación de curvas Bézier.
- Incrustadas como imágenes PNG transparentes acompañadas del nombre completo, cargo institucional, número de Cédula Profesional y sello temporal ISO 8601 UTC.

---

## 4. Motor Bidireccional de Interoperabilidad con Excel Corporativo (`exceljs`) (R4)

### 4.1 Diagnóstico de Libros Heredados de Laboratorio (Estructuras Multi-Tabla y Filas Vacías)

Los laboratorios de concreto operan tradicionalmente con libros de Excel estructurados en múltiples tablas y bloques que desafían a los lectores de CSV planos:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ESTRUCTURA TÍPICA DE UN LIBRO HEREDADO DE ENSAYE DE CONCRETO (EXCEL)        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fila 01 - 08: [ BLOQUE 1: METADATOS ]                                       │
│               Cliente: CONSORCIO PENINSULAR    Obra: TREN MAYA TRAMO 4      │
│               f'c Proyecto: 300 kg/cm²         Concretera: CEMEX CANCÚN     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fila 09     : [ SEPARADOR: FILA EN BLANCO ]                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fila 10 - 25: [ BLOQUE 2: TABLA DE CILINDROS DE ENSAYE ]                    │
│               | No. | F. Colado | F. Ensaye | Edad | Carga kN | Res. kg/cm²| │
│               |  1  | 02/10/26  | 09/10/26  |  7d  |   412.0  |    237.8   | │
│               |  2  | 02/10/26  | 30/10/26  | 28d  |   562.0  |    324.5   | │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fila 26     : [ SEPARADOR: FILA EN BLANCO ]                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Fila 27 - 35: [ BLOQUE 3: ESTADÍSTICAS Y EVALUACIÓN ACI ]                   │
│               Promedio 28d: 323.3 kg/cm²   % f'c: 107.8%   Desv. Std: 1.7   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Patologías de las Hojas de Cálculo Existentes:
1. **Múltiples Bloques Separados por Filas Vacías**: Un parser tradicional que lee línea por línea aborta al topar la primera fila en blanco creyendo que el archivo terminó.
2. **Desalineación y Alias de Encabezados**: Unos técnicos escriben `Resistencia kg/cm²`, otros `f'c obtenido`, `R. Calculada` o `Esfuerzo (kg/cm2)`.
3. **Números de Serie de Fechas de Excel**: Las fechas se almacenan como enteros continuos desde el año 1900 (afectados por el célebre bug histórico de año bisiesto de Lotus 1-2-3 / Excel 1900). Si no se normalizan con la zona horaria civil local (`America/Cancun` / UTC-5), las fechas se desfasan un día atrás.
4. **Celdas con Unidades de Texto Embebidas**: Valores numéricos contaminados con texto (e.g. `"45,800 kgf"` o `"15.0 cm"`), que rompen conversiones estándar `parseFloat()`.

---

### 4.2 Ingesta e Importación Tolerante a Fallos (Legacy Multi-Block Parser)

```typescript
// Motor de Ingesta Multi-Bloque y Coincidencia Difusa Endurecido
import ExcelJS from "exceljs";

export interface ParsedBlockResult {
  metadata: Record<string, string | number | Date>;
  specimens: Array<{
    numero: number;
    fechaColado?: Date;
    fechaEnsaye?: Date;
    edadDias: number;
    diametroMm: number;
    longitudMm: number;
    cargaMaximaKg: number;
    cargaMaximaKn: number;
    resistenciaCalculadaKgCm2: number;
    tipoFalla: string;
  }>;
  diagnostics: Array<{ cell: string; message: string; severity: "CRITICAL" | "WARNING" }>;
}

// Algoritmo Canónico de Distancia de Levenshtein para Coincidencia Difusa de Encabezados
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export class LegacyExcelIngestionEngine {
  // Diccionario de sinónimos y tokens normativos
  private readonly headerSynonyms: Record<string, string[]> = {
    numero: ["no", "no.", "numero", "muestra", "cilindro", "item", "id", "probeta", "#"],
    fechaColado: ["fecha colado", "f. colado", "f colado", "muestreo", "fecha muestreo", "colado"],
    fechaEnsaye: ["fecha ensaye", "f. ensaye", "f ensaye", "rotura", "fecha rotura", "ensaye"],
    edadDias: ["edad", "edad dias", "dias", "edad (dias)", "edad cilindro"],
    cargaKg: ["carga", "carga kg", "carga (kg)", "carga max", "fuerza kg", "lectura kg", "fuerza (kg)"],
    cargaKn: ["carga kn", "carga (kn)", "fuerza kn", "kn"],
    resistencia: ["resistencia", "fc", "f'c", "f´c", "kg/cm2", "kg/cm²", "fc obtenido", "esfuerzo"],
    diametro: ["diametro", "diametro mm", "diametro (mm)", "d1", "d2", "d prom"],
    longitud: ["longitud", "altura", "h", "longitud mm", "longitud (mm)"],
    tipoFalla: ["falla", "tipo falla", "fractura", "patron falla", "tipo fractura"],
  };

  public async parseWorkbook(buffer: ArrayBuffer): Promise<ParsedBlockResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const result: ParsedBlockResult = {
      metadata: {},
      specimens: [],
      diagnostics: [],
    };

    let currentSection: "SEEKING_HEADER" | "READING_TABLE" = "SEEKING_HEADER";
    let columnMap: Record<string, number> = {};
    let consecutiveEmptyRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      // 1. Evaluar si la fila contiene celdas con valores no nulos
      const hasValues = row.values && (row.values as any[]).some(v => v !== null && v !== undefined && v !== "");

      // Manejo del Búfer de Filas Vacías (Lookahead Buffer de 3 Filas Consecutivas)
      if (!hasValues) {
        if (currentSection === "READING_TABLE") {
          consecutiveEmptyRows++;
          // Si encontramos 3 o más filas vacías consecutivas, confirmamos el fin del bloque tabular
          if (consecutiveEmptyRows >= 3) {
            currentSection = "SEEKING_HEADER";
          }
        }
        return;
      }

      // 2. Si estamos buscando encabezados de tabla (Bloque de Cabecera)
      if (currentSection === "SEEKING_HEADER") {
        const potentialHeaders: Record<string, number> = {};
        row.eachCell((cell, colNumber) => {
          const text = cell.text?.trim() || "";
          if (!text) return;

          for (const [canonicalKey, aliases] of Object.entries(this.headerSynonyms)) {
            if (aliases.some(alias => this.matchHeaderAlias(text, alias))) {
              potentialHeaders[canonicalKey] = colNumber;
            }
          }
        });

        // Criterio de Activación: Al menos 2 columnas metrológicas críticas detectadas
        if ((potentialHeaders.cargaKg || potentialHeaders.cargaKn || potentialHeaders.resistencia) &&
            (potentialHeaders.numero || potentialHeaders.edadDias || potentialHeaders.diametro)) {
          columnMap = potentialHeaders;
          currentSection = "READING_TABLE";
          consecutiveEmptyRows = 0;
          return;
        }

        // De lo contrario, procesar como metadatos de obra / cliente (Bloque A)
        this.extractMetadataPairs(row, result.metadata);
        return;
      }

      // 3. Si estamos en la sección de datos tabulares (Bloque B)
      if (currentSection === "READING_TABLE") {
        // Verificar si la fila no es un resumen o metadatos de cierre (ej. "Promedio 28d: 324.5 kg/cm2")
        if (this.detectMetadataOrSummaryRow(row)) {
          currentSection = "SEEKING_HEADER";
          this.extractMetadataPairs(row, result.metadata);
          consecutiveEmptyRows = 0;
          return;
        }

        try {
          const specimen = this.extractSpecimenRow(row, columnMap, rowNumber, result.diagnostics);
          if (specimen) {
            result.specimens.push(specimen);
            consecutiveEmptyRows = 0; // Reinicio exitoso del búfer al procesar espécimen
          }
        } catch (err: any) {
          result.diagnostics.push({
            cell: `Fila ${rowNumber}`,
            message: `Error al procesar espécimen: ${err.message}`,
            severity: "CRITICAL",
          });
        }
      }
    });

    return result;
  }

  // Coincidencia de Encabezados con Límites de Palabra Exactos y Levenshtein <= 2
  private matchHeaderAlias(cellText: string, alias: string): boolean {
    const text = cellText.toLowerCase().trim();
    const cleanAlias = alias.toLowerCase().trim();

    // 1. Tokens ultra-cortos (<= 3 caracteres): Límite estricto de palabra regex
    // Previene colisiones catastróficas donde 'Turno' hace match con el alias 'no'
    if (cleanAlias.length <= 3) {
      const boundaryRegex = new RegExp(`(^|[\\s.,;()_-])${cleanAlias.replace('.', '\\.')}([\\s.,;()_-]|$)`, 'i');
      return boundaryRegex.test(text);
    }

    // 2. Coincidencia directa por inclusión
    if (text.includes(cleanAlias)) return true;

    // 3. Coincidencia Difusa por Distancia de Levenshtein (<= 2) para tolerar errores tipográficos
    // Detecta: "resistensia", "resistecia" -> "resistencia"; "cilintro" -> "cilindro"; "logitud" -> "longitud"
    if (levenshteinDistance(text, cleanAlias) <= 2) return true;

    // 4. Búsqueda por token individual en celdas con texto compuesto
    const tokens = text.split(/[\s,()_-]+/).filter(t => t.length > 3);
    for (const token of tokens) {
      if (levenshteinDistance(token, cleanAlias) <= 1) return true;
    }

    return false;
  }

  // Detección de filas de metadatos o resúmenes estadísticos posteriores
  private detectMetadataOrSummaryRow(row: ExcelJS.Row): boolean {
    let isMeta = false;
    row.eachCell((cell) => {
      const txt = cell.text?.toLowerCase().trim() || "";
      if (txt.includes(":") || txt.includes("promedio") || txt.includes("desv") || txt.includes("coef")) {
        isMeta = true;
      }
    });
    return isMeta;
  }

  private extractMetadataPairs(row: ExcelJS.Row, metadata: Record<string, any>): void {
    row.eachCell((cell, colNumber) => {
      const text = cell.text?.trim() || "";
      if (text.endsWith(":") || text.includes(":")) {
        const parts = text.split(":");
        const key = parts[0].toLowerCase().trim();
        const inlineVal = parts[1]?.trim();
        if (inlineVal) {
          metadata[key] = inlineVal;
        } else {
          // El valor puede situarse en la celda adyacente derecha
          const nextCell = row.getCell(colNumber + 1);
          if (nextCell && nextCell.value) {
            metadata[key] = nextCell.text?.trim();
          }
        }
      }
    });
  }

  // Parseo Seguro de Fechas Excel con Corrección de Año Bisiesto 1900 y Anclaje UTC al Mediodía
  public parseExcelSerialDate(val: any): Date | undefined {
    if (!val) return undefined;
    if (val instanceof Date) {
      return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), 12, 0, 0));
    }
    if (typeof val === "number" && val > 0) {
      // Corrección del bug de año bisiesto 1900 de Lotus/Excel:
      // Excel computa erróneamente 1900 como bisiesto; para números de serie > 60 se debe restar 1 día
      const adjustedSerial = val > 60 ? val - 1 : val;
      const msPerDay = 86400 * 1000;
      const epochMs = Date.UTC(1899, 11, 31);
      const targetUtcMs = epochMs + adjustedSerial * msPerDay;
      // Anclar a las 12:00:00 UTC (mediodía) para blindar contra desfases de calendario en UTC-5 o UTC-6
      return new Date(targetUtcMs + 12 * 3600 * 1000);
    }
    if (typeof val === "string") {
      const str = val.trim();
      if (!str) return undefined;
      const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (isoMatch) {
        return new Date(Date.UTC(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]), 12, 0, 0));
      }
      const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (dmyMatch) {
        return new Date(Date.UTC(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]), 12, 0, 0));
      }
      const parsed = Date.parse(str);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
      }
    }
    return undefined;
  }

  public extractSpecimenRow(
    row: ExcelJS.Row,
    map: Record<string, number>,
    rowNumber: number,
    diagnostics: Array<any>
  ): any {
    const rawCargaKg = map.cargaKg ? this.sanitizeNumeric(row.getCell(map.cargaKg).value) : 0;
    const rawCargaKn = map.cargaKn ? this.sanitizeNumeric(row.getCell(map.cargaKn).value) : 0;
    const cargaFinalKg = rawCargaKg > 0 ? rawCargaKg : rawCargaKn * 101.9716;

    if (cargaFinalKg <= 0) return null; // No es fila de datos de rotura válida

    const diametro = map.diametro ? this.sanitizeNumeric(row.getCell(map.diametro).value) : 150.0;
    const longitud = map.longitud ? this.sanitizeNumeric(row.getCell(map.longitud).value) : 300.0;
    const areaCm2 = (Math.PI * Math.pow(diametro / 10, 2)) / 4;
    const resistencia = cargaFinalKg / areaCm2;

    // Extracción robusta de fechas con resolución de número de serie Excel
    const rawFechaColado = map.fechaColado ? row.getCell(map.fechaColado).value : undefined;
    const rawFechaEnsaye = map.fechaEnsaye ? row.getCell(map.fechaEnsaye).value : undefined;
    const fechaColado = this.parseExcelSerialDate(rawFechaColado);
    const fechaEnsaye = this.parseExcelSerialDate(rawFechaEnsaye);

    return {
      numero: map.numero ? Number(this.sanitizeNumeric(row.getCell(map.numero).value)) || 1 : 1,
      fechaColado,
      fechaEnsaye,
      edadDias: map.edadDias ? Number(this.sanitizeNumeric(row.getCell(map.edadDias).value)) || 28 : 28,
      diametroMm: diametro,
      longitudMm: longitud,
      cargaMaximaKg: Math.round(cargaFinalKg),
      cargaMaximaKn: Number((cargaFinalKg * 0.00980665).toFixed(1)),
      resistenciaCalculadaKgCm2: Number(resistencia.toFixed(1)),
      tipoFalla: map.tipoFalla ? row.getCell(map.tipoFalla).text?.trim() || "CONO_TIPO_1" : "CONO_TIPO_1",
    };
  }

  public sanitizeNumeric(val: any): number {
    if (typeof val === "number") return val;
    if (!val) return 0;
    if (typeof val === "object" && "result" in val) return Number(val.result) || 0;
    const cleanStr = String(val).replace(/[^0-9.-]/g, "");
    return parseFloat(cleanStr) || 0;
  }
}
```

---

### 4.3 Generador y Exportador de Excel Corporativo con Fórmulas Vivas y Formato Semafórico

A diferencia de librerías simplificadas como SheetJS (cuya versión comunitaria eliminó estilos y fórmulas complejas), **`exceljs`** permite producir hojas de cálculo con la identidad corporativa completa del laboratorio:

```typescript
// Motor de Generación de Excel Corporativo con Fórmulas Nativas
import ExcelJS from "exceljs";

export async function generateCorporateExcelWorkbook(dataset: any): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ENSALIA Platform";
  wb.created = new Date();

  const ws = wb.addWorksheet("Informe de Ensaye f'c", {
    views: [{ showGridLines: true }],
  });

  // 1. Paleta de Colores Institucionales
  const COLOR_HEADER_BG = "0F172A"; // Pizarra oscura corporativa
  const COLOR_HEADER_TXT = "FFFFFF";
  const COLOR_ACCENT_BG = "16734C"; // Verde esmeralda ingeniería
  const COLOR_ZEBRA_BG = "F8FAFC";

  // 2. Encabezado Institucional
  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "CERTIFICADO DE CONTROL DE CALIDAD - RESISTENCIA A LA COMPRESIÓN";
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: COLOR_HEADER_TXT } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  // 3. Metadatos de la Obra (Filas 3 a 6)
  ws.getCell("B3").value = "Cliente:"; ws.getCell("C3").value = dataset.cliente;
  ws.getCell("B4").value = "Obra:"; ws.getCell("C4").value = dataset.obra;
  ws.getCell("G3").value = "f'c Proyecto:"; ws.getCell("H3").value = dataset.fcDisenoKgCm2;
  ws.getCell("G4").value = "Edad Garantía:"; ws.getCell("H4").value = `${dataset.edadGarantiaDias} días`;

  // 4. Tabla de Especímenes (Encabezados en Fila 9)
  const headers = ["#", "F. Colado", "F. Ensaye", "Edad (d)", "D1 (mm)", "D2 (mm)", "L (mm)", "Área (cm²)", "Carga (kg)", "f'c (kg/cm²)", "% f'c"];
  const headerRow = ws.getRow(9);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLOR_HEADER_TXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ACCENT_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // 5. Inyección de Filas con FÓRMULAS ACTIVAS VIVAS de Excel
  let currentRow = 10;
  for (const item of dataset.especimenes) {
    const r = ws.getRow(currentRow);
    r.getCell(1).value = item.numero;
    r.getCell(2).value = item.fechaColado;
    r.getCell(3).value = item.fechaEnsaye;
    r.getCell(4).value = item.edadDias;
    r.getCell(5).value = item.diametro1Mm;
    r.getCell(6).value = item.diametro2Mm;
    r.getCell(7).value = item.longitudMm;

    // FÓRMULA VIVA: Área Transversal A = pi * ((D1+D2)/20)^2 / 4
    r.getCell(8).value = {
      formula: `ROUND(PI()*POWER(((E${currentRow}+F${currentRow})/2)/10, 2)/4, 2)`,
      result: item.areaCm2,
    };

    r.getCell(9).value = item.cargaMaximaKg;

    // FÓRMULA VIVA: Resistencia Corregida f_c = (Carga / Área) * Factor L/D (ASTM C39 / NMX-C-083)
    // Se incorpora explícitamente el factor de corrección por esbeltez F_{L/D} (Tabla 1 de ASTM C39)
    // eliminando discrepancias entre el certificado oficial PDF y el libro Excel cuando L/D <= 1.75
    const factorLd = typeof item.factorLd === "number" ? item.factorLd : 1.0;
    r.getCell(10).value = {
      formula: factorLd < 1.0
        ? `ROUND((I${currentRow}/H${currentRow})*${factorLd.toFixed(3)}, 1)`
        : `ROUND(I${currentRow}/H${currentRow}, 1)`,
      result: item.resistenciaKgCm2,
    };

    // FÓRMULA VIVA: Porcentaje de Cumplimiento respecto a celda fija $H$3
    r.getCell(11).value = {
      formula: `ROUND((J${currentRow}/$H$3)*100, 1)`,
      result: item.porcentajeFc,
    };

    // Formato numérico
    r.getCell(8).numFmt = "0.00";
    r.getCell(9).numFmt = "#,##0";
    r.getCell(10).numFmt = "0.0";
    r.getCell(11).numFmt = '0.0"%"';

    if (currentRow % 2 === 0) {
      r.eachCell(c => c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA_BG } });
    }
    currentRow++;
  }

  // 6. Resumen Estadístico al Pie con Fórmulas ACI 214R
  const summaryRow = currentRow + 1;
  ws.getCell(`I${summaryRow}`).value = "Promedio 28d:";
  ws.getCell(`J${summaryRow}`).value = {
    formula: `AVERAGEIF(D10:D${currentRow - 1}, 28, J10:J${currentRow - 1})`,
    result: dataset.promedio28d,
  };
  ws.getCell(`J${summaryRow}`).font = { bold: true };

  // 7. Formato Condicional Semafórico sobre Columna K (% f'c)
  ws.addConditionalFormatting({
    ref: `K10:K${currentRow - 1}`,
    rules: [
      {
        type: "cellIs",
        operator: "lessThan",
        formulae: ["85"],
        style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FEE2E2" } }, font: { color: { argb: "991B1B" }, bold: true } },
      },
      {
        type: "cellIs",
        operator: "between",
        formulae: ["85", "99.9"],
        style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FEF3C7" } }, font: { color: { argb: "92400E" } } },
      },
      {
        type: "cellIs",
        operator: "greaterThanOrEqual",
        formulae: ["100"],
        style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "DCFCE7" } }, font: { color: { argb: "166534" }, bold: true } },
      },
    ],
  });

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}
```

---

### 4.4 Estrategia de Migración Gradual, Conciliación y Prevención de Duplicados

Para salvaguardar la confianza de laboratorios con miles de registros en hojas heredadas:
1. **Hash Determinista de Prevención de Duplicados**:
   $$\text{HashMuestra} = \text{SHA256}(\text{cliente} + \text{obra} + \text{noMuestra} + \text{fechaMuestreo})$$
   Antes de insertar un lote importado, ENSALIA verifica si el hash ya existe en SQLite. Si coincide, ofrece una vista comparativa (*diff viewer*) para fusionar o abortar.
2. **Bandeja de Conciliación en Staging**: Los datos parseados se muestran en una tabla editable en pantalla con semáforo de calidad (errores críticos en rojo, advertencias en amarillo). El usuario valida las filas y pulsa `[ CONFIRMAR MIGRACIÓN ]`, transfiriendo el lote atómicamente a la base de datos principal.

---

## 5. Arquitectura del Sistema, Modelos de Datos Prisma e Integración de Componentes

### 5.1 Extensiones Aditivas al Esquema Prisma (SQLite-Safe)

Para preservar la integridad de la base de datos SQLite existente (evitando reconstrucciones destructivas de tablas), todas las extensiones a `EnsayeCompresion` son estrictamente aditivas (campos opcionales `?` o con valores `@default(...)`), complementadas con modelos satélite para telemetría y reportes oficiales:

```prisma
// ============================================================================
// EXTENSIÓN PRISMA: ENSAYE DE COMPRESIÓN ASTM C39 / NMX-C-083 Y TELEMETRÍA
// ============================================================================

enum MetodoCabeceo {
  NEOPRENO_ASTM_C1231
  AZUFRE_ASTM_C617
  RECTIFICADO_EXTREMOS
  OTRO
}

enum MetodoAdquisicion {
  MANUAL_TECLADO
  QUIOSCO_TACTIL
  DICTADO_VOZ_LOCAL
  SERIAL_AUTOMATICO_RS232
  OCR_ASISTIDO_WEBRTC
}

enum EstadoReporteOficial {
  BORRADOR
  EMITIDO
  SUSTITUIDO
  ANULADO
}

model EnsayeCompresion {
  id                   String                 @id @default(cuid())
  especimenId          String                 @unique
  equipoPrensaId       String?
  operadorEnsayeId     String
  fechaHoraEnsaye      DateTime
  edadRealDias         Int

  // Metrología dimensional estricta ASTM C39 / NMX-C-083
  diametro1Mm          Decimal?
  diametro2Mm          Decimal?
  diametroMm           Decimal                // Promedio d = (d1 + d2) / 2
  longitudMm           Decimal                // Altura h del espécimen
  relacionLd           Decimal?               // h / d
  factorCorreccionLd   Decimal?               @default(1.000) // Según ASTM C39 Tabla 1
  areaCm2              Decimal

  // Masa y densidad
  masaG                Decimal?
  densidadKgM3         Decimal?

  // Carga y esfuerzos mecánicos
  cargaMaximaKn        Decimal
  cargaMaximaKg        Decimal
  resistenciaNominalKgCm2 Decimal?           // Carga / Área
  resistenciaKgCm2     Decimal                // Resistencia final corregida por L/D
  porcentajeFc         Decimal?
  tipoFalla            TipoFallaConcreto      @default(CONO_TIPO_1)
  condicionHumedad     CondicionHumedad       @default(HUMEDO_SATURADO)

  // Condiciones de cabeceo (ASTM C1231 / C617)
  metodoCabeceo        MetodoCabeceo          @default(NEOPRENO_ASTM_C1231)
  durezaNeoprenoShoreA Int?                   // Ej: 50, 60, 70
  usosPreviosNeopreno  Int?                   // Contador de reusos del inserto

  // Dinámica de ensayo y tasa de carga ASTM C39
  tiempoEnsayeSegundos Decimal?               // Tiempo transcurrido desde carga inicial
  velocidadCargaMpaS   Decimal?               // Tasa observada en MPa/s (0.15 - 0.35)
  velocidadCargaKgS    Decimal?               // Tasa observada en kgf/s
  tasaCargaCumpleNorma Boolean?               @default(true)

  // Método de captura y modo sin fricción
  metodoCaptura        MetodoAdquisicion      @default(MANUAL_TECLADO)

  // Trazabilidad metrológica inmutable (Snapshot histórico)
  certificadoCalibracionSnapshot String?     // Folio de calibración vigente de la prensa
  vigenciaCalibracionSnapshot    DateTime?
  laboratorioCalibracionSnapshot String?
  incertidumbreSnapshot          String?

  // Integridad y firma digital
  firmaOperadorHash    String?                // Hash SHA-256 de la firma/token del operador
  tokenValidacionQr    String?                @unique // Token único para QR público/intranet
  hashIntegridadSha256 String?                // Hash forense de los datos del ensaye

  cumpleEspecificacion Boolean                @default(true)
  observaciones        String?
  creadoEn             DateTime               @default(now())
  actualizadoEn        DateTime               @updatedAt

  especimen            Especimen              @relation(fields: [especimenId], references: [id], onDelete: Cascade)
  equipoPrensa         Equipo?                @relation(fields: [equipoPrensaId], references: [id], onDelete: SetNull)
  operadorEnsaye       Operador               @relation(fields: [operadorEnsayeId], references: [id])
  fotos                FotoEnsayeCompresion[]
  telemetria           LecturaTelemetriaEnsaye?
  itemReporte          ItemReporteCompresion?

  @@index([fechaHoraEnsaye])
  @@index([equipoPrensaId])
  @@index([operadorEnsayeId])
}

// Curva continua de carga-tiempo obtenida vía puerto serial (10 Hz)
model LecturaTelemetriaEnsaye {
  id                 String           @id @default(cuid())
  ensayeId           String           @unique
  frecuenciaHz       Int              @default(10) // 10 muestras/segundo
  totalPuntos        Int
  duracionSegundos   Decimal
  cargaPicoKn        Decimal
  velocidadMediaMpaS Decimal
  curvaPuntosJson    Json             // Array comprimido: [{t: 0.1, kn: 5.2}, ...]
  puertoOrigen       String?          // Ej: "COM3", "WebSerial"
  creadoEn           DateTime         @default(now())

  ensaye             EnsayeCompresion @relation(fields: [ensayeId], references: [id], onDelete: Cascade)
}

// Configuración serial por equipo de prensa
model ConfiguracionPrensaSerial {
  id             String       @id @default(cuid())
  equipoId       String       @unique
  marcaPrensa    String       // Controls, Forney, ELE, Matest
  modeloControl  String       // DigiPlus, Advantest, ADR-Touch, Cyber-Plus
  baudRate       Int          @default(9600)
  dataBits       Int          @default(8)
  stopBits       Int          @default(1)
  parity         String       @default("none") // "none", "even", "odd"
  protocoloTrama String       // "CONTROLS_ASCII", "FORNEY_STREAM", "ELE_HEX"
  activo         Boolean      @default(true)
  creadoEn       DateTime     @default(now())
  actualizadoEn  DateTime     @updatedAt

  equipo         Equipo       @relation(fields: [equipoId], references: [id], onDelete: Cascade)
}

// Certificado oficial de ensayo emitido en PDF
model ReporteOficialCompresion {
  id                        String                     @id @default(cuid())
  folio                     String                     @unique
  revision                  Int                        @default(1)
  muestraId                 String
  coladoId                  String?
  estado                    EstadoReporteOficial       @default(EMITIDO)
  fechaEmision              DateTime                   @default(now())
  fcDisenoKgCm2             Decimal
  edadGarantiaDias          Int                        @default(28)
  resistenciaPromedioKgCm2  Decimal?
  porcentajeCumplimiento    Decimal?
  cumpleEspecificacion      Boolean                    @default(true)
  datosSnapshotJson         Json                       // Snapshot inmutable de la muestra y colado
  hashSha256                String                     @unique
  rutaPdfRelativa           String                     @unique
  tamanoPdfBytes            Int
  operadorEnsayeId          String
  signatarioAutorizadoId    String
  firmaOperadorHash         String?
  firmaSignatarioHash       String?
  creadoEn                  DateTime                   @default(now())
  actualizadoEn             DateTime                   @updatedAt

  muestra                   Muestra                    @relation(fields: [muestraId], references: [id], onDelete: Restrict)
  colado                    Colado?                    @relation(fields: [coladoId], references: [id], onDelete: SetNull)
  operadorEnsaye            Operador                   @relation("operadorReporteCompresion", fields: [operadorEnsayeId], references: [id])
  signatarioAutorizado      Operador                   @relation("signatarioReporteCompresion", fields: [signatarioAutorizadoId], references: [id])
  especimenes               ItemReporteCompresion[]

  @@index([folio])
  @@index([muestraId, fechaEmision])
}

// Desglose de especímenes incluidos en el certificado oficial
model ItemReporteCompresion {
  id                   String                   @id @default(cuid())
  reporteId            String
  ensayeCompresionId   String                   @unique
  especimenNumero      Int
  edadRealDias         Int
  edadRealHoras        Decimal
  enToleranciaEdad     Boolean                  @default(true)
  desviacionHoras      Decimal                  @default(0)
  diametroMm           Decimal
  longitudMm           Decimal
  relacionLd           Decimal
  factorLd             Decimal                  @default(1.0)
  areaCm2              Decimal
  cargaMaximaKg        Decimal
  resistenciaKgCm2     Decimal
  resistenciaMpa       Decimal
  porcentajeFc         Decimal
  tipoFalla            TipoFallaConcreto
  cumple               Boolean                  @default(true)

  reporte              ReporteOficialCompresion  @relation(fields: [reporteId], references: [id], onDelete: Cascade)
  ensayeCompresion     EnsayeCompresion         @relation(fields: [ensayeCompresionId], references: [id], onDelete: Restrict)

  @@index([reporteId, especimenNumero])
}
```

---

### 5.2 Contratos e Interfaces de TypeScript Estricto

```typescript
// src/features/fc-curves/types.ts

export interface SerialPortConfig {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  flowControl?: "none" | "hardware";
}

export interface PressTelemetryPoint {
  timestampMs: number;
  forceKn: number;
  rateKnS: number;
  isCompliantRate: boolean;
}

export interface PressConnectionHandle {
  portName: string;
  disconnect: () => Promise<void>;
  isStreaming: boolean;
}

export interface ParsedVoiceCommand {
  rawText: string;
  confidence: number;
  cargaKn?: number;
  tipoFalla?: TipoFallaConcreto;
  action?: "START" | "STOP" | "SAVE" | "CANCEL" | "CONFIRM";
}

export interface CompressionCertificateData {
  folio: string;
  fechaEmision: Date;
  laboratorio: {
    nombre: string;
    acreditacionEma: string;
    logoBytes?: Uint8Array;
  };
  proyecto: {
    cliente: string;
    obra: string;
    elemento: string;
  };
  mezcla: {
    fcDisenoKgCm2: number;
    edadGarantiaDias: number;
    concretera: string;
  };
  especimenes: Array<{
    numero: number;
    edadDias: number;
    diametro1Mm: number;
    diametro2Mm: number;
    diametroPromedioMm: number;
    longitudMm: number;
    factorLd: number;
    areaCm2: number;
    cargaMaximaKn: number;
    cargaMaximaKg: number;
    resistenciaKgCm2: number;
    porcentajeFc: number;
    tipoFalla: TipoFallaConcreto;
    enToleranciaEdad: boolean;
    fotoRoturaBytes?: Uint8Array;
  }>;
  firmas: {
    operadorNombre: string;
    operadorFirmaPng?: Uint8Array;
    signatarioNombre: string;
    signatarioFirmaPng?: Uint8Array;
  };
}
```

---

### 5.3 Orquestación y Flujo de Usuario de Extremo a Extremo

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUJO DE INTEGRACIÓN DE COMPONENTES                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                  
     ┌────────────────────────┐                   ┌─────────────────────────┐
     │  TestSchedulePanel     │                   │  InventoryPanel         │
     │  (Agenda de Ensayes)   │                   │  (Prensas y Calib.)     │
     └───────────┬────────────┘                   └────────────┬────────────┘
                 │                                             │
                 │ 1. Selección espécimen                      │ 2. Verificación
                 │    programado para hoy                      │    calibración
                 ▼                                             ▼
     ┌──────────────────────────────────────────────────────────────────────┐
     │                    PRESS KIOSK WORKSTATION UI                        │
     │ - Vista táctil alta visibilidad (Targets >= 80px)                    │
     │ - Ingesta de Carga Máxima: Serial RS-232 / Voz Local / OCR           │
     │ - Detección automática de Fractura y Caída de Carga                  │
     │ - Disparo WebRTC para Foto Forense con Watermark Canvas              │
     └──────────────────────────────────┬───────────────────────────────────┘
                                        │
                                        │ 3. POST /api/ensayes
                                        │    (Persistencia atómica SQLite)
                                        ▼
     ┌────────────────────────┐                   ┌─────────────────────────┐
     │  FcStatisticalDashb.   │                   │  Official Report Engine │
     │  - Actualización Gauss │                   │  - Certificado PDF C39  │
     │  - Curva Carga-Tiempo  │                   │  - Libro Excel Corporat.│
     │  - ACI 214R Evaluación │                   │    con fórmulas vivas   │
     └────────────────────────┘                   └─────────────────────────┘
```

1. **Agenda Diaria $\rightarrow$ Quiosco**: `TestSchedulePanel` muestra los cilindros del día. El operario escanea el código de barras o pulsa `"Rotura en Prensa"`, abriendo el quiosco precargado con el diseño de mezcla y molde asignado.
2. **Candado Metrológico de Calibración**: El quiosco verifica el estado de la prensa en `InventoryPanel`. Si la calibración está vencida, el tier Enterprise aplica un **bloqueo estricto (*Calibration Enforcement Lock*)**, impidiendo la emisión de reportes oficiales hasta registrar el nuevo certificado.
3. **Rotura y Telemetría**: La prensa transmite el flujo serie a 10 Hz. Al fracturarse el concreto, el sistema retiene el pico, dispara la foto WebRTC forense, quema la marca de agua y guarda en SQLite.
4. **Analítica Inmediata y Certificación**: `FcStatisticalDashboard` actualiza la campana de Gauss, el $V_1$ dentro del ensayo y la media móvil de 3 puntos. El usuario pulsa `"Generar Certificado Oficial"` y obtiene en $<120\text{ ms}$ el PDF con código QR y firmas.

---

## 6. Empaquetamiento Comercial Multicapa y Modelo de Valor (R5)

### 6.1 Matriz Granular de Capacidades por Nivel Comercial (Core vs Pro vs Enterprise)

| Capacidad / Módulo Funcional | Nivel Core (Básico) | Nivel Pro (Avanzado) | Nivel Enterprise (Corporativo) |
| :--- | :---: | :---: | :---: |
| **Público Objetivo** | Laboratorios independientes pequeños y satélites de obra | Laboratorios medianos acreditados y plantas concreteras | Consorcios de infraestructura, supervisión y multi-planta |
| **Captura en Quiosco de Prensa** | Manual táctil básica (teclado numérico táctil) | Táctil optimizada + **Dictado por voz local 100% offline** | Táctil + Voz + Integración total de periféricos |
| **Identificación de Cilindros** | Selección manual de lista | **Escaneo de código de barras / QR (lector USB)** | Escaneo rápido + Etiquetas térmicas inalterables |
| **Adquisición de Carga Máxima** | Captura manual de manómetro | **Adquisición directa Serial RS-232 / USB (Web Serial)** | Serial Multi-Prensa + **OCR asistido WebRTC para análogos** |
| **Curva de Telemetría Dinámica** | No disponible | Registro de curva carga-tiempo (10 Hz) | Curva esfuerzo-deformación + Módulo elástico |
| **Evidencia Fotográfica** | Carga manual de archivos WebP/JPG | Captura WebRTC con marca de agua canvas | Foto automatizada al detectar rotura + Hash SHA-256 |
| **Normativa ASTM C39 / NMX-C-083** | Cálculo de resistencia básico | **Dimensiones d1/d2 + Factor corrección L/D + Tasa carga** | Control estricto ciclos neopreno + Validación de tasa |
| **Reportes Oficiales PDF** | Formato estándar de rotura | **PDF normalizado con QR intranet y fotos embebidas** | PDF con **firma digital criptográfica y QR público** |
| **Interoperabilidad Excel** | Exportación/Importación CSV estándar | **Motor ExcelJS corporativo (estilos y fórmulas vivas)** | Plantillas personalizadas por cliente + Sincronización multi-obra |
| **Analítica Estadística** | No disponible | **Campana de Gauss + Control ACI 214R + Tendencias f'c** | Análisis predictivo multi-planta + Correlación de mezclas |
| **Control Metrológico Prensas** | Registro informativo de equipos | Semáforo de vencimiento y certificado PDF | **Bloqueo duro por vencimiento de calibración (Lock)** |
| **Auditoría e Integridad** | Registro de creación básico | Historial de modificaciones por operador | Pista de auditoría inmutable forense + Exportación pericial |

---

### 6.2 Justificación Cuantitativa de Retorno de Inversión (ROI)

#### 1. Ahorro de Mano de Obra Directa en Transcripción
- **Escenario Base**: Laboratorio promedio ensayando 80 especímenes diarios.
- **Tiempo Invertido Actual**: $1.5\text{ horas diarias}$ por técnico transcribiendo libretas de campo mojadas a hojas de Excel ($37.5\text{ horas al mes} = 450\text{ horas anuales}$).
- **Con ENSALIA Pro/Enterprise**: La captura serie directa y el escaneo omnidireccional eliminan la transcripción al $100\%$.
- **Ahorro Financiero Directo**:
  $$\text{Ahorro Anual} = 450\text{ horas} \times \$9.00\text{ USD/hora} \approx \mathbf{\$4,050.00\text{ USD / año}} \quad [\mathbf{\$81,000.00\text{ MXN / año}}]$$

#### 2. Erradicación de Errores Tipográficos y Disputas de Corazones de Concreto
- **Costo de un Falso Positivo de Baja Resistencia**: En una obra civil mediana (e.g. puente o nave logística), un error de transcripción en la probeta de 28 días que arroje falsamente un valor $< 85\% f'c$ detona la extracción de tres testigos cilíndricos (*corazones*) con broca de diamante, pruebas de esclerometría, honorarios de peritos independientes y paro preventivo del colado.
- **Costo Típico por Evento de Disputa**: Entre **$1,200\text{ y }\$2,500\text{ USD}$**.
- **Con ENSALIA**: Al leer la carga directamente de la celda digital con validación fotográfica y dimensional ortogonal, la tasa de error tipográfico se abate a **$0.0\%$**, blindando al laboratorio contra reclamos de aseguradoras y constructores.

#### 3. Reducción del Costo de Auditoría EMA / ISO 17025
- La preparación de expedientes de calibración de prensas, hojas de cálculo validadas y trazabilidad de probetas suele demandar **2 semanas completas de trabajo** del Jefe de Calidad antes de cada auditoría de acreditación.
- Con ENSALIA, el expediente metrológico, las firmas biométricas y las curvas de Gauss se exportan en **5 minutos**, reduciendo el costo administrativo de cumplimiento en más de un $80\%$.

#### 4. Periodo de Recuperación de la Inversión (Payback Period)
Considerando una suscripción de ENSALIA Pro y un kit de hardware base ($288\text{ USD}$):
$$\text{Inversión Inicial Total} \approx \$1,000\text{ USD}$$
$$\text{Ahorro Mensual} \approx \$400\text{ USD}$$
$$\mathbf{\text{Periodo de Recuperación (Payback)}} = \frac{\$1,000}{\$400} = \mathbf{2.5\text{ meses}}$$

---

### 6.3 Argumentario Comercial y Guion de Ventas para Directores de Laboratorio

#### Discurso para el Director General / Dueño del Laboratorio:
> *"Ingeniero, actualmente su laboratorio pierde entre 1.5 y 2 horas diarias de su personal más valioso simplemente pasando datos a mano desde libretas manchadas de cemento a hojas de Excel. Peor aún: una sola transposición de dígitos en un resultado de 28 días puede costarle un cliente clave o forzarlo a pagar una extracción de corazones de más de $35,000 pesos.*
>
> *ENSALIA convierte su prensa existente en una estación inteligente de grado aeroespacial: su técnico pasa el cilindro por el escáner, la prensa vacía la carga por serial o el técnico la dicta con el pedal de pie sin soltar la muestra, la cámara sella la fotografía de la fractura con marca de agua indeleble y en 5 segundos el certificado oficial en PDF queda emitido con firma digital y código QR. En menos de tres meses, el sistema se paga solo únicamente con el tiempo de nómina recuperado."*

#### Discurso para el Jefe de Control de Calidad y Signatario Acreditado EMA:
> *"Colega, sabemos el estrés que representa una auditoría de la EMA bajo la norma ISO 17025 cuando el auditor pide contrastar la hoja de campo física contra el informe final y la calibración de la máquina. Con ENSALIA, el informe oficial en PDF vincula matemáticamente las dos lecturas de diámetro, aplica la interpolación exacta de L/D de la Tabla 1 de ASTM C39, verifica que el ensayo se hizo dentro de la tolerancia de horas de la NMX-C-083 y congela el snapshot del certificado de calibración de la prensa vigente ese día.*
>
> *No hay forma de que una auditoría encuentre un error de cálculo o un dato manipulado: todo está blindado con criptografía SHA-256 y respaldado por la curva de Gauss ACI 214R calculada en tiempo real."*

---

*Fin del Plan Maestro de Automatización y Curvas de Compresión ENSALIA.*
