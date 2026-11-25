import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PressTelemetryEngine,
  parseControlsFrame,
  parseForneyFrame,
  parseEleFrame,
  parseMatestFrame,
  parseAnyPressFrame,
  PressTelemetryClient,
  LBF_TO_KN,
  PSI_TO_MPA,
} from "../../src/lib/hardware/press-telemetry";

describe("TELEMETRÍA INDUSTRIAL DE PRENSAS DE LABORATORIO (ASTM C39 / NMX-C-083)", () => {
  describe("1. Parsers de Protocolos de Consolas Físicas", () => {
    test("Controls Group: Parseo de trama continua y trama de carga pico", () => {
      // Trama continua de Controls
      const rawCont = "+00284.5 kN  +004.4 kN/s  ST:RUN\r\n";
      const cont = parseControlsFrame(rawCont);
      assert.ok(cont, "Debe parsear la trama continua de Controls");
      assert.strictEqual(cont.manufacturer, "CONTROLS");
      assert.strictEqual(cont.currentKn, 284.5);
      assert.strictEqual(cont.rateKnS, 4.4);
      assert.strictEqual(cont.isPeakFrame, false);

      // Trama pico de Controls
      const rawPeak = "PEAK: +00589.4 kN  TIME: 0092s  ST:STOP\r\n";
      const peak = parseControlsFrame(rawPeak);
      assert.ok(peak, "Debe parsear la trama de pico de Controls");
      assert.strictEqual(peak.currentKn, 589.4);
      assert.strictEqual(peak.peakKn, 589.4);
      assert.strictEqual(peak.isPeakFrame, true);
    });

    test("Forney LP: Normalización dimensional rigurosa de LBF/PSI a SI métrico", () => {
      const rawForney = "TEST: 00124  FORCE: 112500 LBF  STRESS: 3980 PSI  PEAK: 112500 LBF\r\n";
      const forney = parseForneyFrame(rawForney);
      assert.ok(forney, "Debe parsear la trama de Forney");
      assert.strictEqual(forney.manufacturer, "FORNEY");
      assert.strictEqual(forney.isPeakFrame, true);

      // Verificación de factores de conversión física NIST
      const expectedKn = Number((112500 * LBF_TO_KN).toFixed(2));
      const expectedMpa = Number((3980 * PSI_TO_MPA).toFixed(2));

      assert.strictEqual(forney.currentKn, expectedKn);
      assert.strictEqual(forney.normalized.stressMpa, expectedMpa);
      assert.ok(forney.normalized.forceKgf > 50000, "Fuerza en kgf debe ser proporcional a 112.5 klbf");
    });

    test("ELE International: Detección y extracción de carga en tramas multilínea", () => {
      const rawEle = `ELE ADR-TOUCH - TEST REPORT\r\nSAMPLE ID: 260842\r\nMAX LOAD: 462.1 kN\r\nPACE RATE: 4.5 kN/s\r\nSTATUS: COMPLETE`;
      const ele = parseEleFrame(rawEle);
      assert.ok(ele, "Debe parsear trama de ELE International");
      assert.strictEqual(ele.manufacturer, "ELE");
      assert.strictEqual(ele.currentKn, 462.1);
      assert.strictEqual(ele.peakKn, 462.1);
      assert.strictEqual(ele.rateKnS, 4.5);
      assert.strictEqual(ele.isPeakFrame, true);
    });

    test("Matest S.p.A: Parseo de trama de protocolo Cyber-Plus Evolution", () => {
      // S=01: En ensayo / carga viva
      const rawMatestRun = "#01L=00452.3R=004.42S=01*";
      const matestRun = parseMatestFrame(rawMatestRun);
      assert.ok(matestRun, "Debe parsear trama de Matest en marcha");
      assert.strictEqual(matestRun.manufacturer, "MATEST");
      assert.strictEqual(matestRun.currentKn, 452.3);
      assert.strictEqual(matestRun.rateKnS, 4.42);
      assert.strictEqual(matestRun.isPeakFrame, false);

      // S=02: Ensayo completado / carga congelada
      const rawMatestStop = "#01L=00531.8R=000.00S=02*";
      const matestStop = parseMatestFrame(rawMatestStop);
      assert.ok(matestStop, "Debe parsear trama de Matest completada");
      assert.strictEqual(matestStop.currentKn, 531.8);
      assert.strictEqual(matestStop.isPeakFrame, true);
    });

    test("Parser Omnidireccional: Reconocimiento agnóstico de marca", () => {
      const c = parseAnyPressFrame("+00310.2 kN  +004.0 kN/s  ST:RUN");
      assert.strictEqual(c?.manufacturer, "CONTROLS");

      const f = parseAnyPressFrame("TEST: 05  FORCE: 85000 LBF  STRESS: 3000 PSI  PEAK: 85000 LBF");
      assert.strictEqual(f?.manufacturer, "FORNEY");

      const m = parseAnyPressFrame("#01L=00380.0R=003.50S=01*");
      assert.strictEqual(m?.manufacturer, "MATEST");
    });
  });

  describe("2. Motor Metrológico y Validación de Tasa de Carga ASTM C39", () => {
    test("Cálculo geométrico adaptativo: Cilindro 150 mm vs Cilindro 100 mm", () => {
      const engine150 = new PressTelemetryEngine(150.0);
      const engine100 = new PressTelemetryEngine(100.0);

      // Área 150mm = PI * 7.5^2 = 176.71 cm2
      // Rango normativo ASTM C39: 0.15 a 0.35 MPa/s -> kN/s = rateMpa * areaMm2 * 1e-3
      // Para 150mm: min = 0.15 * 17671.46 * 1e-3 = 2.65 kN/s, max = 0.35 * 17671.46 * 1e-3 = 6.19 kN/s
      assert.ok(engine150.minRateKnS > 2.5 && engine150.minRateKnS < 2.8);
      assert.ok(engine150.maxRateKnS > 6.0 && engine150.maxRateKnS < 6.4);

      // Para 100mm: área = 78.54 cm2 -> min = 1.18 kN/s, max = 2.75 kN/s
      assert.ok(engine100.minRateKnS > 1.1 && engine100.minRateKnS < 1.3);
      assert.ok(engine100.maxRateKnS > 2.6 && engine100.maxRateKnS < 2.9);
    });

    test("Fase 1 vs Fase 2: Tasa de carga solo es vinculante al superar el 50% de la carga", () => {
      const engine = new PressTelemetryEngine(150.0);

      // Lectura 1: precarga
      const r1 = engine.processReading(4.0, 1000);
      assert.strictEqual(r1.phase, "PRELOAD");

      // Lectura 2: inicio en Fase 1 (baja carga, tasa fuera de norma pero aceptable por norma)
      const r2 = engine.processReading(20.0, 2000);
      assert.strictEqual(r2.phase, "PHASE_1");
      assert.strictEqual(r2.rateCompliant, true, "En fase 1 no se penaliza la tasa de carga según ASTM C39 §7.5.1");
    });

    test("Filtro Anti-Flutter: Asentamiento hidráulico transitorio no dispara rotura", () => {
      const engine = new PressTelemetryEngine(150.0);

      // Elevar carga hasta 300 kN
      engine.processReading(100, 1000);
      engine.processReading(200, 2000);
      engine.processReading(300, 3000);

      // Caída transitoria por asentamiento mecánico de platos (1 frame)
      const drop1 = engine.processReading(240, 3100); // Caída > 15%
      assert.strictEqual(drop1.breakDetected, false, "1 frame de caída no debe disparar rotura prematura");
      assert.strictEqual(drop1.peakLoadKn, 300.0, "La carga pico debe permanecer congelada en 300 kN");

      // Recuperación inmediata de la presión hidráulica
      const recovery = engine.processReading(320, 3200);
      assert.strictEqual(recovery.breakDetected, false);
      assert.strictEqual(recovery.peakLoadKn, 320.0, "La carga pico debe subir a 320 kN");
      assert.strictEqual(engine.consecutiveDropFrames, 0, "El contador de flutter debe resetearse a 0");
    });

    test("Detección de Rotura Real: Caída sostenida en 3 frames consecutivos confirma fallo", () => {
      const engine = new PressTelemetryEngine(150.0);

      engine.processReading(100, 1000);
      engine.processReading(300, 2000);
      engine.processReading(500, 3000); // Pico máximo alcanzado

      // Frame 1 de colapso
      const f1 = engine.processReading(400, 3100);
      assert.strictEqual(f1.breakDetected, false);

      // Frame 2 de colapso
      const f2 = engine.processReading(280, 3200);
      assert.strictEqual(f2.breakDetected, false);

      // Frame 3 de colapso sostenido: confirmación definitiva de rotura
      const f3 = engine.processReading(150, 3300);
      assert.strictEqual(f3.breakDetected, true, "Tres frames de colapso confirman rotura definitiva");
      assert.strictEqual(f3.phase, "BROKEN");
      assert.strictEqual(f3.peakLoadKn, 500.0, "El pico retained se mantiene en 500 kN intacto");
    });
  });

  describe("3. Ingesta Automática Directa y Cliente de Telemetría", () => {
    test("Ingesta de líneas crudas con engine.ingestRawFrame", () => {
      const engine = new PressTelemetryEngine(150.0);

      const reading1 = engine.ingestRawFrame("+00150.0 kN  +004.2 kN/s  ST:RUN", "CONTROLS");
      assert.ok(reading1);
      assert.strictEqual(reading1.currentLoadKn, 150.0);

      const reading2 = engine.ingestRawFrame("+00480.0 kN  +004.3 kN/s  ST:RUN", "CONTROLS");
      assert.ok(reading2);
      assert.strictEqual(reading2.currentLoadKn, 480.0);
      assert.strictEqual(reading2.peakLoadKn, 480.0);
    });

    test("PressTelemetryClient: Inicialización y cambio dinámico de espécimen y marca", () => {
      let lastReading: any = null;
      let lastStatus: any = null;

      const client = new PressTelemetryClient({
        brand: "CONTROLS",
        specimenDiameterMm: 150,
        onReading: (r) => {
          lastReading = r;
        },
        onStatusChange: (s) => {
          lastStatus = s;
        },
      });

      assert.strictEqual(client.getStatus(), "DISCONNECTED");

      // Cambiar diámetro y verificar recalculo en el motor interno
      client.setSpecimenDiameter(100);
      assert.strictEqual(client.getEngine().diameterMm, 100);

      // Cambiar marca
      client.setBrand("FORNEY");
      assert.strictEqual(client.getEngine().manufacturer, "FORNEY");

      client.disconnect();
    });
  });
});

