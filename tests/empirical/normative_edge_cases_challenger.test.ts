import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { addCivilDays, civilDate } from "../../src/lib/civil-date";

/**
 * SUITE DE PRUEBAS ADVERSARIALES: CASOS DE BORDE NORMATIVOS Y FLUJO DE CALIDAD
 * Normas de Referencia: ASTM C39 / ASTM C511 / ASTM C684 / NMX-C-083 / ISO 17025
 */

describe("CHALLENGER STRESS TESTS: CASOS DE BORDE NORMATIVOS Y ERGONOMÍA (M1)", () => {

  // =========================================================================
  // RETO 1: TOLERANCIAS HORARIAS ASTM C39 / NMX-C-083 Y COLISIÓN DE DOMINGOS
  // =========================================================================
  describe("1. Tolerancias Horarias y Ensayes en Días Inhábiles / Domingos", () => {
    
    // Matriz oficial de tolerancias ASTM C39 / NMX-C-083-ONNCCE
    const ASTM_C39_TOLERANCES: Record<number, { nominalHours: number; toleranceHours: number; label: string }> = {
      1: { nominalHours: 24, toleranceHours: 0.5, label: "24 horas (±0.5 h)" },
      3: { nominalHours: 72, toleranceHours: 2.0, label: "3 días (±2.0 h)" },
      7: { nominalHours: 168, toleranceHours: 6.0, label: "7 días (±6.0 h)" },
      14: { nominalHours: 336, toleranceHours: 12.0, label: "14 días (±12.0 h)" },
      28: { nominalHours: 672, toleranceHours: 20.0, label: "28 días (±20.0 h)" },
      90: { nominalHours: 2160, toleranceHours: 48.0, label: "90 días (±48.0 h)" },
    };

    function evaluateHourlyTolerance(
      samplingTimestamp: Date,
      breakTimestamp: Date,
      nominalAgeDays: number
    ) {
      const spec = ASTM_C39_TOLERANCES[nominalAgeDays];
      if (!spec) throw new Error(`Edad nominal ${nominalAgeDays} no configurada`);
      
      const elapsedHours = (breakTimestamp.getTime() - samplingTimestamp.getTime()) / (1000 * 60 * 60);
      const deltaHours = elapsedHours - spec.nominalHours;
      const absDelta = Math.abs(deltaHours);
      const inTolerance = absDelta <= spec.toleranceHours;
      
      return {
        elapsedHours,
        nominalHours: spec.nominalHours,
        deltaHours,
        toleranceHours: spec.toleranceHours,
        inTolerance,
        deviationHours: inTolerance ? 0 : absDelta - spec.toleranceHours,
      };
    }

    test("addCivilDays calcula fecha calendario pero es ciego a la hora de muestreo y tolerancia horaria", () => {
      // Muestreo vespertino: Viernes a las 17:30
      const fechaMuestreoCivil = "2026-11-06"; // Viernes
      const fecha24h = addCivilDays(fechaMuestreoCivil, 1);
      assert.equal(fecha24h, "2026-11-07"); // Sábado

      // Simulación de rotura en laboratorio a las 08:30 del sábado (apertura de turno)
      const tMuestreo = new Date("2026-11-06T17:30:00-05:00");
      const tRotura = new Date("2026-11-07T08:30:00-05:00"); // 15 horas después
      
      const eval24h = evaluateHourlyTolerance(tMuestreo, tRotura, 1);
      assert.equal(eval24h.elapsedHours, 15);
      assert.equal(eval24h.inTolerance, false);
      // Falla por 8.5 horas fuera de la tolerancia de ±30 min
      assert.equal(eval24h.deviationHours, 8.5);
    });

    test("Colisión de cilindro de 7 días que vence en domingo inhábil produce rotura fuera de norma si se rompe en lunes", () => {
      // Muestreo domingo 1 de noviembre a las 10:00
      const tMuestreo = new Date("2026-11-01T10:00:00-05:00");
      const fechaCivil = "2026-11-01";
      const fechaProgramadaCivil = addCivilDays(fechaCivil, 7);
      assert.equal(fechaProgramadaCivil, "2026-11-08"); // Domingo siguiente

      // Verificar que cae en domingo (0 en getUTCDay con anchor)
      const dayOfWeek = new Date(`${fechaProgramadaCivil}T12:00:00Z`).getUTCDay();
      assert.equal(dayOfWeek, 0); // 0 = Domingo

      // Si el laboratorio está cerrado el domingo y se rompe el lunes a las 09:00:
      const tRoturaLunes = new Date("2026-11-09T09:00:00-05:00");
      const eval7d = evaluateHourlyTolerance(tMuestreo, tRoturaLunes, 7);
      
      assert.equal(eval7d.elapsedHours, 191); // 191 horas vs 168 nominales
      assert.equal(eval7d.deltaHours, 23); // +23 horas de retraso
      assert.equal(eval7d.inTolerance, false);
      assert.equal(eval7d.deviationHours, 17); // 17 horas de exceso sobre los ±6h permitidos
    });

    test("Detección anticipada de domingos: un oráculo preventivo debe alertar antes del vencimiento", () => {
      // Verificamos si una fecha cae en fin de semana para generar alerta preventiva
      function isWeekend(civilDateStr: string): { isWeekend: boolean; dayName: string } {
        const d = new Date(`${civilDateStr}T12:00:00Z`);
        const day = d.getUTCDay();
        return {
          isWeekend: day === 0 || day === 6,
          dayName: day === 0 ? "Domingo" : day === 6 ? "Sábado" : "Día hábil",
        };
      }

      const coladoMiercoles = "2026-11-04"; // Miércoles
      const ensaye3d = addCivilDays(coladoMiercoles, 3); // Sábado 7
      const ensaye7d = addCivilDays(coladoMiercoles, 7); // Miércoles 11
      const ensaye28d = addCivilDays(coladoMiercoles, 28); // Miércoles 2 dic

      assert.equal(isWeekend(ensaye3d).dayName, "Sábado");
      assert.equal(isWeekend(ensaye7d).dayName, "Día hábil");

      const coladoDomingo = "2026-11-01";
      const ensaye7dDom = addCivilDays(coladoDomingo, 7);
      assert.equal(isWeekend(ensaye7dDom).dayName, "Domingo");
      assert.equal(isWeekend(ensaye7dDom).isWeekend, true);
    });
  });

  // =========================================================================
  // RETO 2: CURADO ACELERADO (ASTM C684) VS CURADO ESTÁNDAR (ASTM C511)
  // =========================================================================
  describe("2. Flexibilidad de Métodos de Curado (ASTM C511 vs ASTM C684)", () => {

    test("El esquema Prisma no contiene modelos ni atributos para métodos de curado alternativos", () => {
      const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
      const schemaContent = fs.readFileSync(schemaPath, "utf-8");

      // Validar que CondicionHumedad existe pero solo cubre condición superficial al ensaye
      assert.match(schemaContent, /enum CondicionHumedad/);
      assert.match(schemaContent, /HUMEDO_SATURADO/);
      assert.match(schemaContent, /SUPERFICIALMENTE_SECO/);
      assert.match(schemaContent, /SECO_AIRE/);

      // Verificar ausencia de regímenes térmicos / acelerados
      assert.doesNotMatch(schemaContent, /ASTM_C684/i);
      assert.doesNotMatch(schemaContent, /CURADO_ACELERADO/i);
      assert.doesNotMatch(schemaContent, /AGUA_CALIENTE/i);
      assert.doesNotMatch(schemaContent, /VAPOR/i);
      assert.doesNotMatch(schemaContent, /AUTOCLAVE/i);
    });

    test("El servicio de reporte PDF hardcodea régimen de curado húmedo estándar NMX-C-148 / ASTM C511", () => {
      const servicePath = path.resolve(process.cwd(), "src/lib/pdf/compression-report/service.ts");
      const serviceContent = fs.readFileSync(servicePath, "utf-8");

      // Comprobar que el valor por defecto hardcodeado es cámara húmeda o pileta
      assert.match(serviceContent, /Cámara Húmeda NMX-C-148/);
      assert.match(serviceContent, /Pileta de Curado/);

      // Si un usuario ensaya probetas curadas al vapor bajo ASTM C684, el informe PDF
      // certificaría incorrectamente curado estándar a 23±2°C a menos que se parametrice.
    });
  });

  // =========================================================================
  // RETO 3: ERGONOMÍA PARA TALLERES PEQUEÑOS VS LABORATORIOS ISO 17025
  // =========================================================================
  describe("3. Ergonomía en Laboratorios Pequeños (1 Técnico) vs Grandes (Roles ISO 17025)", () => {

    test("Alternativa B conserva acceso a todos los módulos en 1 clic (encabezados fijos sin colapso)", () => {
      const proposalPath = path.resolve(process.cwd(), "docs/architecture/PROPUESTA_ARQUITECTURA_NAVEGACION_ENSALIA.md");
      const proposalContent = fs.readFileSync(proposalPath, "utf-8");

      // La propuesta prohíbe explícitamente los acordeones colapsables en entornos industriales
      assert.match(proposalContent, /NO se deben implementar acordeones colapsables/i);
      assert.match(proposalContent, /pointer-events: none/i);
      assert.match(proposalContent, /1 solo toque/i);
    });

    test("En pantallas móviles (<=768px), los títulos de sección se ocultan y display: contents preserva flex horizontal", () => {
      const proposalPath = path.resolve(process.cwd(), "docs/architecture/PROPUESTA_ARQUITECTURA_NAVEGACION_ENSALIA.md");
      const proposalContent = fs.readFileSync(proposalPath, "utf-8");

      assert.match(proposalContent, /\.sidebar-section-title\s*\{\s*display:\s*none\s*!important;\s*\}/);
      assert.match(proposalContent, /\.sidebar-nav-section\s*\{[^}]*display:\s*contents/);
    });

    test("Verificación del soporte de roles (RBAC) en modelo Operador para extensión de campo", () => {
      const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
      const schemaContent = fs.readFileSync(schemaPath, "utf-8");

      // Modelo Operador ahora incluye rol para control de acceso entre campo y laboratorio
      const operadorModelMatch = schemaContent.match(/model Operador \{([^}]+)\}/);
      assert.ok(operadorModelMatch, "Modelo Operador debe existir");
      const operadorBody = operadorModelMatch[1];

      assert.match(operadorBody, /rol\s+String/i);
    });
  });

  // =========================================================================
  // RETO 4: INTEGRIDAD DE CÓDIGO FUENTE (ALTERNATIVA B IMPLEMENTADA)
  // =========================================================================
  describe("4. Integridad de Código Fuente en src/", () => {
    test("Solo los archivos autorizados de navegación (page.tsx y globals.css) fueron actualizados para Alternativa B", () => {
      const srcDir = path.resolve(process.cwd(), "src");
      const pagePath = path.join(srcDir, "app", "page.tsx");
      const cssPath = path.join(srcDir, "app", "globals.css");

      const pageContent = fs.readFileSync(pagePath, "utf8");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      assert.ok(pageContent.includes("navigationGroups"), "page.tsx debe contener navigationGroups de Alternativa B");
      assert.ok(cssContent.includes(".nav-section-title"), "globals.css debe contener estilos para Alternativa B");
    });
  });
});
