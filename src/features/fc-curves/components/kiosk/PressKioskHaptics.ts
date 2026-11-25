/**
 * UTILIDAD DE FEEDBACK HÁPTICO INDUSTRIAL (Web Vibration API)
 * ---------------------------------------------------------------------------
 * Provee vibración táctil sincronizada para dispositivos móviles (smartphones y tablets)
 * en ambientes ruidosos de laboratorio de concreto (prensas, trituradoras, mezcladoras).
 */

export class PressKioskHaptics {
  private static getNavigator(): Navigator | null {
    if (typeof navigator !== "undefined") {
      return navigator;
    }
    if (typeof window !== "undefined" && window.navigator) {
      return window.navigator;
    }
    return null;
  }

  private static isAvailable(): boolean {
    const nav = this.getNavigator();
    return Boolean(nav && typeof (nav as any).vibrate === "function");
  }

  /**
   * Pulso sutil y rápido (15 ms) al tocar una tecla del numpad o botón
   */
  public static keyPress(): void {
    if (this.isAvailable()) {
      try {
        const nav = this.getNavigator();
        (nav as any)?.vibrate(15);
      } catch {
        // Silenciar si el navegador bloquea la llamada por falta de interacción
      }
    }
  }

  /**
   * Patrón de éxito al guardar o confirmar un cilindro (40ms encendido, 30ms pausa, 60ms encendido)
   */
  public static success(): void {
    if (this.isAvailable()) {
      try {
        const nav = this.getNavigator();
        (nav as any)?.vibrate([40, 30, 60]);
      } catch {
        // Ignorar
      }
    }
  }

  /**
   * Alerta o advertencia de tasa fuera de norma (pulso largo de 180 ms)
   */
  public static alert(): void {
    if (this.isAvailable()) {
      try {
        const nav = this.getNavigator();
        (nav as any)?.vibrate(180);
      } catch {
        // Ignorar
      }
    }
  }

  /**
   * Ruptura catastrófica del espécimen de concreto detectada (patrón de alta intensidad)
   */
  public static concreteBreak(): void {
    if (this.isAvailable()) {
      try {
        const nav = this.getNavigator();
        (nav as any)?.vibrate([80, 40, 80, 40, 160]);
      } catch {
        // Ignorar
      }
    }
  }

  /**
   * Código de barra o espécimen escaneado con éxito
   */
  public static scanned(): void {
    if (this.isAvailable()) {
      try {
        const nav = this.getNavigator();
        (nav as any)?.vibrate([30, 20, 30]);
      } catch {
        // Ignorar
      }
    }
  }
}
