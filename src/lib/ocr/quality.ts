export type ImageQualityMetrics = {
  width?: number;
  height?: number;
  blurScore?: number;
  contrast?: number;
  glareRatio?: number;
  pageCoverage?: number;
  skewDegrees?: number;
  templateLocated?: boolean;
};

export type QualityGateResult = {
  verdict: "ACCEPTABLE" | "REVIEW_REQUIRED" | "REJECTED";
  issues: { code: string; severity: "WARNING" | "ERROR"; message: string }[];
};

export function evaluateImageQuality(metrics: ImageQualityMetrics): QualityGateResult {
  const issues: QualityGateResult["issues"] = [];
  const error = (code: string, message: string) => issues.push({ code, severity: "ERROR", message });
  const warning = (code: string, message: string) => issues.push({ code, severity: "WARNING", message });
  if (!metrics.width || !metrics.height) warning("METRICS_UNAVAILABLE", "No fue posible medir automáticamente la resolución.");
  else if (metrics.width < 1200 || metrics.height < 1600) error("LOW_RESOLUTION", "La imagen no tiene resolución suficiente; vuelva a escanear o fotografiar más cerca.");
  if (metrics.blurScore !== undefined && metrics.blurScore < 80) error("BLUR", "La imagen está desenfocada.");
  if (metrics.contrast !== undefined && metrics.contrast < 0.18) warning("LOW_CONTRAST", "El contraste es bajo y puede afectar la lectura.");
  if (metrics.glareRatio !== undefined && metrics.glareRatio > 0.08) error("GLARE", "Hay reflejos que cubren parte del formato.");
  if (metrics.pageCoverage !== undefined && metrics.pageCoverage < 0.92) error("INCOMPLETE_PAGE", "No se observa la hoja completa.");
  if (metrics.skewDegrees !== undefined && Math.abs(metrics.skewDegrees) > 15) error("EXCESSIVE_SKEW", "La inclinación o perspectiva es excesiva.");
  else if (metrics.skewDegrees !== undefined && Math.abs(metrics.skewDegrees) > 5) warning("SKEW", "La hoja requiere corrección de inclinación.");
  if (metrics.templateLocated === false) warning("TEMPLATE_NOT_FOUND", "No se identificó el QR o la plantilla; deberá seleccionarse manualmente.");
  return {
    verdict: issues.some((item) => item.severity === "ERROR") ? "REJECTED" : issues.length ? "REVIEW_REQUIRED" : "ACCEPTABLE",
    issues,
  };
}
