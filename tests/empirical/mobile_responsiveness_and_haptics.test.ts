import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PressKioskHaptics } from "../../src/features/fc-curves/components/kiosk/PressKioskHaptics";

describe("ADAPTACIÓN Y EXPERIENCIA MÓVIL INDUSTRIAL (ENSALIA MOBILE)", () => {
  describe("1. Utilidad de Feedback Háptico (Web Vibration API)", () => {
    test("Resiliencia en SSR o entornos sin soporte de vibración", () => {
      // Debe ejecutarse sin lanzar excepciones cuando navigator.vibrate no está presente
      assert.doesNotThrow(() => {
        PressKioskHaptics.keyPress();
        PressKioskHaptics.success();
        PressKioskHaptics.alert();
        PressKioskHaptics.concreteBreak();
        PressKioskHaptics.scanned();
      });
    });

    test("Emisión correcta de patrones hápticos al estar disponible navigator.vibrate", () => {
      let lastPattern: any = null;
      // Mock de navigator en el entorno usando defineProperty para compatibilidad con Node 21+
      const mockNav = {
        vibrate: (pattern: any) => {
          lastPattern = pattern;
          return true;
        },
      };

      try {
        Object.defineProperty(globalThis, "navigator", {
          value: mockNav,
          configurable: true,
          writable: true,
        });
      } catch {
        (globalThis as any).navigator = mockNav;
      }
      (globalThis as any).window = { navigator: mockNav };

      PressKioskHaptics.keyPress();
      assert.strictEqual(lastPattern, 15, "Pulsación simple debe durar 15ms");

      PressKioskHaptics.success();
      assert.deepStrictEqual(lastPattern, [40, 30, 60], "Éxito debe usar patrón de triple pulso");

      PressKioskHaptics.alert();
      assert.strictEqual(lastPattern, 180, "Alerta debe emitir pulso largo de 180ms");

      PressKioskHaptics.concreteBreak();
      assert.deepStrictEqual(
        lastPattern,
        [80, 40, 80, 40, 160],
        "Ruptura de probeta debe emitir patrón háptico industrial de alta intensidad"
      );

      PressKioskHaptics.scanned();
      assert.deepStrictEqual(lastPattern, [30, 20, 30], "Escaneo debe emitir confirmación corta");
    });
  });

  describe("2. Ergonomía Táctil y Touch Targets (WCAG 2.5.5 / Mobile Guidelines)", () => {
    test("El teclado numérico virtual define targets táctiles >= 44px en modo estándar y compacto", () => {
      const numpadFile = fs.readFileSync(
        path.join(process.cwd(), "src/features/fc-curves/components/kiosk/GiantVirtualNumpad.tsx"),
        "utf8"
      );

      // Comprobar que el modo compacto usa al menos 52px (mayor al mínimo de 44px de Apple/Android)
      assert.ok(numpadFile.includes('"52px"'), "Modo compacto debe medir al menos 52px");
      assert.ok(numpadFile.includes('"76px"'), "Modo quiosco estándar debe medir 76px");
      assert.ok(numpadFile.includes('touchAction: "manipulation"'), "Debe eliminar el retardo de 300ms en navegadores móviles");
    });

    test("El selector de patrones de fractura ASTM C39 usa grid fluido minmax para no colapsar en móviles", () => {
      const selectorFile = fs.readFileSync(
        path.join(process.cwd(), "src/features/fc-curves/components/kiosk/FracturePatternSelector.tsx"),
        "utf8"
      );

      assert.ok(
        selectorFile.includes("repeat(auto-fit, minmax("),
        "Debe usar auto-fit o minmax flexible para adaptarse a cualquier ancho de smartphone"
      );
    });

    test("El modal de quiosco integra Media Queries y Safe Area Insets para notch y barras de navegación móviles", () => {
      const modalFile = fs.readFileSync(
        path.join(process.cwd(), "src/features/fc-curves/components/kiosk/PressKioskModal.tsx"),
        "utf8"
      );

      assert.ok(modalFile.includes("safe-area-inset-top"), "Debe respetar safe-area-inset-top");
      assert.ok(modalFile.includes("safe-area-inset-bottom"), "Debe respetar safe-area-inset-bottom");
      assert.ok(modalFile.includes("isMobile"), "Debe contar con estado reactivo para pantallas móviles");
      assert.ok(modalFile.includes("mobileTab"), "Debe soportar navegación por pestañas en dispositivos móviles");
    });
  });

  describe("3. Optimización de Main Thread (rAF Throttling para Telemetría)", () => {
    test("usePressTelemetry desacopla la frecuencia serial con requestAnimationFrame", () => {
      const hookFile = fs.readFileSync(
        path.join(process.cwd(), "src/features/fc-curves/hooks/usePressTelemetry.ts"),
        "utf8"
      );

      assert.ok(hookFile.includes("requestAnimationFrame"), "Debe utilizar requestAnimationFrame para evitar saturar la CPU móvil");
      assert.ok(hookFile.includes("cancelAnimationFrame"), "Debe limpiar el rAF pendiente al desmontarse");
      assert.ok(hookFile.includes("reading.breakDetected"), "Ruptura debe despacharse sin throttle para respuesta instantánea");
    });
  });

  describe("4. PWA y Metadatos de Instalación Standalone", () => {
    test("El archivo manifest.json contiene la configuración corporativa correcta", () => {
      const manifestPath = path.join(process.cwd(), "public/manifest.json");
      assert.ok(fs.existsSync(manifestPath), "El archivo public/manifest.json debe existir");

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      assert.strictEqual(manifest.display, "standalone", "PWA debe configurarse en modo standalone");
      assert.strictEqual(manifest.start_url, "/", "start_url debe ser la raíz");
      assert.ok(manifest.theme_color, "Debe tener theme_color definido");
    });

    test("layout.tsx define viewport seguro para móviles y meta tags de Apple Web App", () => {
      const layoutFile = fs.readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");

      assert.ok(layoutFile.includes('viewportFit: "cover"'), "Debe especificar viewportFit cover");
      assert.ok(layoutFile.includes('manifest: "/manifest.json"'), "Debe referenciar el manifest.json");
      assert.ok(layoutFile.includes("appleWebApp"), "Debe incluir configuración de Apple Web App");
    });

    test("globals.css contiene estilos responsivos específicos para smartphones (max-width: 768px)", () => {
      const cssFile = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

      assert.ok(cssFile.includes("@media (max-width: 768px)"), "Debe contener media query para móviles a 768px");
      assert.ok(cssFile.includes(".app-shell"), "Debe reestructurar .app-shell para móviles");
      assert.ok(cssFile.includes(".sidebar nav"), "Debe habilitar scroll horizontal en la navegación móvil");
    });
  });
});
