/**
 * CLIENTE DE TELEMETRÍA SERIAL Y WEBSOCKET PARA PRENSAS DE LABORATORIO
 * ---------------------------------------------------------------------------
 * Soporta:
 * 1. Web Serial API nativa (Chrome / Edge en quiosco táctil con USB-to-RS232)
 * 2. Conexión WebSocket a daemon local (ej. agente Python/C# en puerto 8088)
 * 3. Simulador metrológico ASTM C39 / NMX-C-083 para validación industrial
 */

import { PressTelemetryEngine } from "./engine";
import {
  PressBrand,
  PressConnectionStatus,
  PressReading,
  SerialPortConfig,
} from "./types";

export interface TelemetryClientOptions {
  brand: PressBrand;
  specimenDiameterMm?: number;
  specimenLengthMm?: number;
  baudRate?: number;
  wsUrl?: string;
  onReading?: (reading: PressReading) => void;
  onStatusChange?: (status: PressConnectionStatus, message?: string) => void;
}

export class PressTelemetryClient {
  private engine: PressTelemetryEngine;
  private brand: PressBrand;
  private baudRate: number;
  private wsUrl: string;
  private status: PressConnectionStatus = "DISCONNECTED";

  // Web Serial API handles
  private serialPort: any = null;
  private reader: any = null;
  private readableStreamClosed: Promise<void> | null = null;
  private keepReading = false;

  // WebSocket handle
  private ws: WebSocket | null = null;

  // Simulator interval
  private simInterval: NodeJS.Timeout | null = null;

  private onReadingCb?: (reading: PressReading) => void;
  private onStatusChangeCb?: (status: PressConnectionStatus, message?: string) => void;

  constructor(options: TelemetryClientOptions) {
    this.brand = options.brand;
    this.baudRate = options.baudRate || 9600;
    this.wsUrl = options.wsUrl || "ws://localhost:8088/press";
    this.onReadingCb = options.onReading;
    this.onStatusChangeCb = options.onStatusChange;

    this.engine = new PressTelemetryEngine(options.specimenDiameterMm || 150.0);
    this.engine.setManufacturer(this.brand);
  }

  public setSpecimenDiameter(diameterMm: number) {
    this.engine.setSpecimenDiameter(diameterMm);
  }

  public setBrand(brand: PressBrand) {
    this.brand = brand;
    this.engine.setManufacturer(brand);
  }

  public getEngine(): PressTelemetryEngine {
    return this.engine;
  }

  public getStatus(): PressConnectionStatus {
    return this.status;
  }

  private updateStatus(status: PressConnectionStatus, msg?: string) {
    this.status = status;
    if (this.onStatusChangeCb) {
      this.onStatusChangeCb(status, msg);
    }
  }

  /**
   * Conecta vía Web Serial API (Navegador con acceso a puerto COM USB/RS-232)
   */
  public async connectSerial(customConfig?: Partial<SerialPortConfig>): Promise<boolean> {
    if (typeof window === "undefined" || !("serial" in navigator)) {
      this.updateStatus("ERROR", "Web Serial API no soportada en este entorno o navegador.");
      return false;
    }

    try {
      this.updateStatus("CONNECTING", "Solicitando selección de puerto serial COM...");
      // @ts-ignore
      this.serialPort = await navigator.serial.requestPort();

      const baud = customConfig?.baudRate || this.baudRate;
      await this.serialPort.open({
        baudRate: baud,
        dataBits: customConfig?.dataBits || 8,
        stopBits: customConfig?.stopBits || 1,
        parity: customConfig?.parity || "none",
        bufferSize: 1024,
      });

      this.updateStatus("STREAMING", `Conectado al puerto serial a ${baud} bps.`);
      this.engine.reset();
      this.keepReading = true;

      // Iniciar bucle de lectura asíncrona de texto línea por línea
      // @ts-ignore
      const textDecoder = new TextDecoderStream();
      this.readableStreamClosed = this.serialPort.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      this.readSerialLoop();
      return true;
    } catch (err: any) {
      this.updateStatus("ERROR", `Fallo al abrir puerto serial: ${err?.message || err}`);
      return false;
    }
  }

  private async readSerialLoop() {
    let lineBuffer = "";
    try {
      while (this.keepReading && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value) {
          lineBuffer += value;
          const lines = lineBuffer.split(/\r?\n/);
          // Mantener la última línea incompleta en el buffer
          lineBuffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim().length > 0) {
              const reading = this.engine.ingestRawFrame(line, this.brand);
              if (reading && this.onReadingCb) {
                this.onReadingCb(reading);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[PressTelemetry] Error en bucle de lectura serial:", err);
    } finally {
      if (this.status !== "DISCONNECTED") {
        this.updateStatus("DISCONNECTED", "Transmisión serial finalizada.");
      }
    }
  }

  /**
   * Conecta vía WebSocket a un servidor daemon local
   */
  public connectWebSocket(url?: string): boolean {
    const targetUrl = url || this.wsUrl;
    this.updateStatus("CONNECTING", `Conectando a WebSocket ${targetUrl}...`);

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        this.updateStatus("STREAMING", `WebSocket conectado a ${targetUrl}`);
        this.engine.reset();
      };

      this.ws.onmessage = (event) => {
        const data = String(event.data);
        const lines = data.split(/\r?\n/);
        for (const line of lines) {
          if (line.trim().length > 0) {
            const reading = this.engine.ingestRawFrame(line, this.brand);
            if (reading && this.onReadingCb) {
              this.onReadingCb(reading);
            }
          }
        }
      };

      this.ws.onerror = () => {
        this.updateStatus("ERROR", "Error de comunicación en WebSocket.");
      };

      this.ws.onclose = () => {
        this.updateStatus("DISCONNECTED", "Conexión WebSocket cerrada.");
      };

      return true;
    } catch (err: any) {
      this.updateStatus("ERROR", `No se pudo inicializar WebSocket: ${err?.message || err}`);
      return false;
    }
  }

  /**
   * Inicia simulación metrológica de un ensaye ASTM C39 completo
   * Genera rampa elasto-plástica con tasa nominal objetivo 0.25 MPa/s,
   * ruido de bomba hidráulica y ruptura catastrófica programada.
   */
  public startMetrologicalSimulation(targetStrengthMpa = 32.5, durationSec = 15) {
    this.disconnect();
    this.engine.reset();
    this.updateStatus("STREAMING", "Simulación metrológica activa (ASTM C39).");

    const areaMm2 = (Math.PI * Math.pow(this.engine.diameterMm, 2)) / 4;
    const targetPeakKn = (targetStrengthMpa * areaMm2) / 1000; // kN

    // Intervalo de muestreo: 100ms (10 Hz)
    const dt = 0.1;
    let elapsedSec = 0;
    let currentKn = 0;
    let postBreakFrames = 0;

    this.simInterval = setInterval(() => {
      elapsedSec += dt;

      if (elapsedSec < 1.0) {
        // Fase 1: Asentamiento hidráulico inicial con leve fluctuación
        currentKn = 5.0 + (Math.random() * 2.0 - 1.0);
      } else if (elapsedSec < durationSec) {
        // Fase 2: Rampa elasto-plástica con tasa de carga ASTM C39 ~0.25 MPa/s
        const progress = (elapsedSec - 1.0) / (durationSec - 1.0);
        // Modelo constitutivo parabólico suave
        const shape = 1 - Math.pow(1 - progress, 1.8);
        const noise = (Math.random() - 0.5) * 1.5; // Ruido de celda de carga ±0.75 kN
        currentKn = Math.max(0, targetPeakKn * shape + noise);
      } else {
        // Fase 3: Ruptura violenta del espécimen (caída drástica a ~20% de la carga pico)
        postBreakFrames++;
        currentKn = Math.max(0, targetPeakKn * 0.18 + (Math.random() - 0.5) * 2.0);
      }

      // Generar línea de telemetría acorde a la marca configurada
      let rawLine = "";
      if (this.brand === "CONTROLS") {
        rawLine = `+00${currentKn.toFixed(1)} kN  +002.5 kN/s  ST:RUN`;
      } else if (this.brand === "FORNEY") {
        const lbf = currentKn * 224.808943;
        const psi = (lbf / (areaMm2 / 645.16));
        rawLine = `TEST: 00100  FORCE: ${lbf.toFixed(0)} LBF  STRESS: ${psi.toFixed(0)} PSI  PEAK: ${lbf.toFixed(0)} LBF`;
      } else if (this.brand === "ELE") {
        rawLine = `ELE ADR-TOUCH\r\nMAX LOAD: ${currentKn.toFixed(1)} kN\r\nPACE RATE: 2.5 kN/s`;
      } else {
        // MATEST
        rawLine = `#01L=${currentKn.toFixed(1)}R=002.50S=01*`;
      }

      const reading = this.engine.ingestRawFrame(rawLine, this.brand);
      if (reading && this.onReadingCb) {
        this.onReadingCb(reading);
      }

      // Detener automáticamente la simulación tras 3 segundos post-ruptura
      if (postBreakFrames >= 30) {
        this.stopSimulation();
      }
    }, dt * 1000);
  }

  public stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.updateStatus("DISCONNECTED", "Simulación finalizada.");
  }

  /**
   * Cierra de forma limpia cualquier conexión activa
   */
  public async disconnect() {
    this.stopSimulation();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // Ignorar
      }
      this.ws = null;
    }

    this.keepReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        // Ignorar
      }
      this.reader = null;
    }

    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch (e) {
        // Ignorar
      }
      this.serialPort = null;
    }

    this.updateStatus("DISCONNECTED", "Desconectado.");
  }
}
