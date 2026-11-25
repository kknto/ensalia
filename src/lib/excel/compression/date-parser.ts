/**
 * Parser de fechas de Excel con corrección del bug histórico de año bisiesto 1900 de Lotus 1-2-3
 * y anclaje al mediodía UTC (12:00:00) para evitar desfasajes por zonas horarias civiles (e.g. UTC-5).
 */
export function parseExcelSerialDate(val: unknown): Date | undefined {
  if (!val) return undefined;

  // Si ya es un objeto Date nativo de JS
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return undefined;
    return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), 12, 0, 0));
  }

  // Si es un número serial de Excel (días desde 1900)
  if (typeof val === "number" && val > 0) {
    // Lotus 1-2-3 / Excel 1900 leap year bug correction:
    // Excel asume erróneamente que 1900 fue bisiesto (día 60 = 29 de febrero de 1900).
    // Para cualquier serial mayor a 60, restamos 1 para sincronizar con el calendario gregoriano real.
    const adjustedSerial = val > 60 ? val - 1 : val;
    const msPerDay = 86400 * 1000;
    const epochMs = Date.UTC(1899, 11, 31);
    const targetUtcMs = epochMs + adjustedSerial * msPerDay;
    return new Date(targetUtcMs + 12 * 3600 * 1000); // Anclaje UTC a las 12:00:00
  }

  // Si es una cadena de texto
  if (typeof val === "string") {
    const str = val.trim();
    if (!str) return undefined;

    // Formato ISO: YYYY-MM-DD o YYYY/MM/DD
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      return new Date(
        Date.UTC(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 12, 0, 0)
      );
    }

    // Formato común latino/mexicano: DD/MM/YYYY o DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      return new Date(
        Date.UTC(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10), 12, 0, 0)
      );
    }

    // Fallback estándar
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return new Date(
        Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0)
      );
    }
  }

  return undefined;
}

/**
 * Distancia de Levenshtein para coincidencia difusa de encabezados con tolerancia a errores tipográficos.
 */
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

