import ExcelJS from "exceljs";
import crypto from "node:crypto";
import { TipoFallaConcreto } from "@prisma/client";
import { ParsedBlockResult, ParsedSpecimen, IngestionDiagnostic } from "./types";
import { parseExcelSerialDate, levenshteinDistance } from "./date-parser";
import { calculateSlendernessCorrection } from "../../pdf/compression-report/metrology";

export class HardenedLegacyExcelIngestionEngine {
  // Diccionario canónico de sinónimos y tokens normativos de laboratorio
  private readonly headerSynonyms: Record<string, string[]> = {
    numero: ["no", "no.", "numero", "muestra", "cilindro", "item", "id", "probeta", "#"],
    fechaColado: ["fecha colado", "f. colado", "f colado", "muestreo", "fecha muestreo", "colado"],
    fechaEnsaye: ["fecha ensaye", "f. ensaye", "f ensaye", "rotura", "fecha rotura", "ensaye"],
    edadDias: ["edad", "edad dias", "dias", "edad (dias)", "edad cilindro"],
    cargaKg: ["carga", "carga kg", "carga (kg)", "carga max", "fuerza kg", "lectura kg", "fuerza (kg)"],
    cargaKn: ["carga kn", "carga (kn)", "fuerza kn", "kn"],
    resistencia: ["resistencia", "fc", "f'c", "f´c", "kg/cm2", "kg/cm²", "fc obtenido", "esfuerzo"],
    diametro: ["diametro", "diametro mm", "diametro (mm)", "d prom", "diametro promedio"],
    diametro1: ["d1", "diametro 1", "diametro1"],
    diametro2: ["d2", "diametro 2", "diametro2"],
    longitud: ["longitud", "altura", "h", "longitud mm", "longitud (mm)"],
    tipoFalla: ["falla", "tipo falla", "fractura", "patron falla", "tipo fractura"],
  };

  /**
   * Coincidencia de alias con blindaje contra falsos positivos.
   * Emplea expresiones regulares con límites de palabra para tokens cortos (evita que 'Turno' haga match con 'no')
   * y distancia de Levenshtein <= 2 para admitir errores ortográficos en el campo.
   */
  public matchHeaderAlias(cellText: string, alias: string): boolean {
    const text = cellText.toLowerCase().trim();
    const cleanAlias = alias.toLowerCase().trim();
    if (!text || !cleanAlias) return false;

    // 1. Límites estrictos para tokens cortos (<= 3 caracteres)
    if (cleanAlias.length <= 3) {
      const escaped = cleanAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const boundaryRegex = new RegExp(`(^|[\\s.,;()_-])${escaped}([\\s.,;()_-]|$)`, "i");
      return boundaryRegex.test(text);
    }

    // 2. Coincidencia por subcadena para términos largos
    if (text.includes(cleanAlias)) return true;

    // 3. Distancia de Levenshtein <= 2 para tolerar errores tipográficos (e.g. 'resitencia' -> 'resistencia')
    if (levenshteinDistance(text, cleanAlias) <= 2) return true;

    // 4. Búsqueda por token en encabezados compuestos
    const tokens = text.split(/[\s,()_-]+/).filter((t) => t.length > 3);
    for (const token of tokens) {
      if (levenshteinDistance(token, cleanAlias) <= 1) return true;
    }

    return false;
  }

  public sanitizeNumeric(val: unknown): number {
    if (typeof val === "number") return val;
    if (!val) return 0;
    if (typeof val === "object" && val !== null && "result" in val) {
      const res = (val as { result: unknown }).result;
      return typeof res === "number" ? res : parseFloat(String(res).replace(/[^0-9.-]/g, "")) || 0;
    }
    const cleanStr = String(val).replace(/[^0-9.-]/g, "");
    return parseFloat(cleanStr) || 0;
  }

  private detectMetadataOrSummaryRow(row: ExcelJS.Row): boolean {
    let isMeta = false;
    row.eachCell((cell) => {
      const txt = cell.text?.toLowerCase().trim() || "";
      if (
        txt.includes(":") ||
        txt.includes("promedio") ||
        txt.includes("desv") ||
        txt.includes("coef") ||
        txt.includes("cliente") ||
        txt.includes("obra")
      ) {
        isMeta = true;
      }
    });
    return isMeta;
  }

  private extractMetadataPairs(row: ExcelJS.Row, metadata: Record<string, string | number | Date>): void {
    row.eachCell((cell, colNumber) => {
      const text = cell.text?.trim() || "";
      if (text.endsWith(":") || text.includes(":")) {
        const parts = text.split(":");
        const key = parts[0].toLowerCase().trim();
        const inlineVal = parts.slice(1).join(":").trim();
        if (inlineVal) {
          metadata[key] = inlineVal;
        } else {
          const nextCell = row.getCell(colNumber + 1);
          if (nextCell && nextCell.value) {
            metadata[key] = nextCell.text?.trim() || String(nextCell.value);
          }
        }
      }
    });
  }

  public extractSpecimenRow(
    row: ExcelJS.Row,
    map: Record<string, number>,
    rowNumber: number,
    diagnostics: IngestionDiagnostic[]
  ): ParsedSpecimen | null {
    const rawCargaKg = map.cargaKg ? this.sanitizeNumeric(row.getCell(map.cargaKg).value) : 0;
    const rawCargaKn = map.cargaKn ? this.sanitizeNumeric(row.getCell(map.cargaKn).value) : 0;
    const rawResistencia = map.resistencia ? this.sanitizeNumeric(row.getCell(map.resistencia).value) : 0;

    let cargaFinalKg = rawCargaKg > 0 ? rawCargaKg : rawCargaKn * 101.9716;
    let cargaFinalKn = rawCargaKn > 0 ? rawCargaKn : cargaFinalKg * 0.00980665;

    // Si no hay carga pero hay resistencia y dimensiones, deducir carga
    const diametro1 = map.diametro1 ? this.sanitizeNumeric(row.getCell(map.diametro1).value) : 0;
    const diametro2 = map.diametro2 ? this.sanitizeNumeric(row.getCell(map.diametro2).value) : 0;
    let diametro = map.diametro ? this.sanitizeNumeric(row.getCell(map.diametro).value) : 0;

    if (diametro <= 0) {
      if (diametro1 > 0 && diametro2 > 0) diametro = (diametro1 + diametro2) / 2;
      else if (diametro1 > 0) diametro = diametro1;
      else diametro = 150.0;
    }

    const longitud = map.longitud ? this.sanitizeNumeric(row.getCell(map.longitud).value) : 300.0;
    const areaCm2 = Number(((Math.PI * Math.pow(diametro / 10, 2)) / 4).toFixed(2));

    if (cargaFinalKg <= 0 && rawResistencia > 0 && areaCm2 > 0) {
      cargaFinalKg = rawResistencia * areaCm2;
      cargaFinalKn = cargaFinalKg * 0.00980665;
    }

    if (cargaFinalKg <= 0 && rawResistencia <= 0) {
      return null;
    }

    let resistencia = rawResistencia > 0 ? rawResistencia : cargaFinalKg / areaCm2;

    // Factor L/D
    const slenderness = calculateSlendernessCorrection(longitud, diametro);
    if (slenderness.factorLd < 1.0 && rawResistencia <= 0) {
      resistencia = resistencia * slenderness.factorLd;
    }

    // Fechas
    const rawFechaColado = map.fechaColado ? row.getCell(map.fechaColado).value : undefined;
    const rawFechaEnsaye = map.fechaEnsaye ? row.getCell(map.fechaEnsaye).value : undefined;
    const fechaColado = parseExcelSerialDate(rawFechaColado);
    const fechaEnsaye = parseExcelSerialDate(rawFechaEnsaye);

    // Tipo de falla
    let tipoFalla: TipoFallaConcreto = "CONO_TIPO_1";
    if (map.tipoFalla) {
      const rawFalla = row.getCell(map.tipoFalla).text?.trim().toUpperCase() || "";
      if (rawFalla.includes("2") || rawFalla.includes("HENDIDURA") || rawFalla.includes("DIVIDIDO")) {
        tipoFalla = "CONO_Y_DIVIDIDO_TIPO_2";
      } else if (rawFalla.includes("3") || rawFalla.includes("COLUMNA")) {
        tipoFalla = "COLUMNA_TIPO_3";
      } else if (rawFalla.includes("4") || rawFalla.includes("CIZALLA") || rawFalla.includes("DIAGONAL")) {
        tipoFalla = "CIZALLA_TIPO_4";
      } else if (rawFalla.includes("5") || rawFalla.includes("ESQUINA") || rawFalla.includes("LATERAL")) {
        tipoFalla = "ESQUINA_TIPO_5";
      } else if (rawFalla.includes("6") || rawFalla.includes("PUNTUAL") || rawFalla.includes("CABECEO")) {
        tipoFalla = "PUNTUAL_TIPO_6";
      }
    }

    let edadDias = map.edadDias ? Number(this.sanitizeNumeric(row.getCell(map.edadDias).value)) || 0 : 0;
    if (edadDias <= 0 && fechaColado && fechaEnsaye) {
      const diffMs = fechaEnsaye.getTime() - fechaColado.getTime();
      edadDias = Math.max(1, Math.round(diffMs / (86400 * 1000)));
    }
    if (edadDias <= 0) edadDias = 28;

    const numero = map.numero ? Number(this.sanitizeNumeric(row.getCell(map.numero).value)) || 1 : 1;

    return {
      numero,
      fechaColado,
      fechaEnsaye,
      edadDias,
      diametro1Mm: diametro1 > 0 ? diametro1 : undefined,
      diametro2Mm: diametro2 > 0 ? diametro2 : undefined,
      diametroMm: Number(diametro.toFixed(1)),
      longitudMm: Number(longitud.toFixed(1)),
      areaCm2,
      cargaMaximaKg: Math.round(cargaFinalKg),
      cargaMaximaKn: Number(cargaFinalKn.toFixed(1)),
      resistenciaCalculadaKgCm2: Number(resistencia.toFixed(1)),
      tipoFalla,
      factorLd: slenderness.factorLd,
    };
  }

  /**
   * Ingesta un libro de Excel y retorna los bloques de metadatos, especímenes y diagnósticos.
   * Admite tanto un objeto `ExcelJS.Workbook` existente como un buffer binario `ArrayBuffer` o `Buffer`.
   */
  public async parseWorkbook(
    input: ExcelJS.Workbook | ArrayBuffer | Buffer
  ): Promise<{ columnMap: Record<string, number>; result: ParsedBlockResult }> {
    let workbook: ExcelJS.Workbook;
    if (input instanceof ExcelJS.Workbook) {
      workbook = input;
    } else {
      workbook = new ExcelJS.Workbook();
      const buf = input instanceof ArrayBuffer ? Buffer.from(input) : input;
      await workbook.xlsx.load(buf as any);
    }

    const worksheet = workbook.worksheets[0];
    const result: ParsedBlockResult = {
      metadata: {},
      specimens: [],
      diagnostics: [],
    };

    if (!worksheet) {
      result.diagnostics.push({
        message: "El archivo Excel no contiene ninguna hoja de trabajo válida.",
        severity: "CRITICAL",
      });
      return { columnMap: {}, result };
    }

    let currentSection: "SEEKING_HEADER" | "READING_TABLE" = "SEEKING_HEADER";
    let columnMap: Record<string, number> = {};
    let consecutiveEmptyRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      // 1. Evaluar si la fila contiene celdas con valores no nulos
      const hasValues =
        row.values &&
        (row.values as unknown[]).some((v) => v !== null && v !== undefined && v !== "");

      // Manejo del Búfer de Filas Vacías (Lookahead Buffer de 3 Filas Consecutivas)
      if (!hasValues) {
        if (currentSection === "READING_TABLE") {
          consecutiveEmptyRows++;
          // Si encontramos 3 o más filas vacías consecutivas, confirmamos el fin del bloque tabular
          if (consecutiveEmptyRows >= 3) {
            currentSection = "SEEKING_HEADER";
            columnMap = {};
          }
        }
        return;
      }

      // Reiniciar contador de filas vacías consecutivas al encontrar contenido
      consecutiveEmptyRows = 0;

      // 2. Si estamos buscando encabezados de tabla (Bloque de Cabecera)
      if (currentSection === "SEEKING_HEADER") {
        const potentialHeaders: Record<string, number> = {};
        row.eachCell((cell, colNumber) => {
          const text = cell.text?.trim() || "";
          if (!text) return;

          for (const [canonicalKey, aliases] of Object.entries(this.headerSynonyms)) {
            if (aliases.some((alias) => this.matchHeaderAlias(text, alias))) {
              potentialHeaders[canonicalKey] = colNumber;
            }
          }
        });

        // Criterio de Activación: Al menos 2 columnas metrológicas críticas detectadas
        if (
          (potentialHeaders.cargaKg || potentialHeaders.cargaKn || potentialHeaders.resistencia) &&
          (potentialHeaders.numero || potentialHeaders.edadDias || potentialHeaders.fechaEnsaye || potentialHeaders.fechaColado)
        ) {
          currentSection = "READING_TABLE";
          columnMap = potentialHeaders;
          return;
        }

        // Si no es fila de encabezados, extraer pares clave:valor de metadatos de obra
        if (this.detectMetadataOrSummaryRow(row)) {
          this.extractMetadataPairs(row, result.metadata);
        }
        return;
      }

      // 3. Si estamos en modo de lectura de tabla de especímenes
      if (currentSection === "READING_TABLE") {
        // Verificar si la fila es un cierre de resumen o metadatos al pie
        if (this.detectMetadataOrSummaryRow(row)) {
          this.extractMetadataPairs(row, result.metadata);
          return;
        }

        // Extraer datos mecánicos y geométricos del espécimen
        const specimen = this.extractSpecimenRow(row, columnMap, rowNumber, result.diagnostics);
        if (specimen) {
          result.specimens.push(specimen);
        }
      }
    });

    // Calcular hash determinista de prevención de duplicados
    const clienteStr = String(result.metadata.cliente || "").toLowerCase().trim();
    const obraStr = String(result.metadata.obra || "").toLowerCase().trim();
    const muestraStr = String(result.metadata.muestra || result.metadata.id || "").toLowerCase().trim();
    const coladoStr = result.specimens[0]?.fechaColado?.toISOString() || "";

    result.hashMuestra = crypto
      .createHash("sha256")
      .update(`${clienteStr}|${obraStr}|${muestraStr}|${coladoStr}`, "utf8")
      .digest("hex");

    return { columnMap, result };
  }
}

