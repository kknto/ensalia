"use client";

import { useMemo } from "react";
import { EstadisticasFc } from "../types";

interface FcGaussianChartProps {
  estadisticas: EstadisticasFc;
  fcDiseno?: number;
}

export function FcGaussianChart({ estadisticas, fcDiseno = 250 }: FcGaussianChartProps) {
  const { media, desviacionEstandar, totalMuestras, calificacionAci } = estadisticas;

  const width = 640;
  const height = 280;
  const padding = { top: 30, right: 30, bottom: 40, left: 55 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Si no hay suficiente dispersión o muestras, usar valores representativos
  const sigma = desviacionEstandar > 0 ? desviacionEstandar : 25;
  const mu = media > 0 ? media : fcDiseno;

  // Dominio: [mu - 3.5*sigma, mu + 3.5*sigma]
  const minX = Math.max(0, mu - 3.5 * sigma);
  const maxX = mu + 3.5 * sigma;

  // Altura máxima de la campana en el pico (x = mu): 1 / (sigma * sqrt(2*pi))
  const peakY = 1 / (sigma * Math.sqrt(2 * Math.PI));

  const scaleX = (x: number) => padding.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const scaleY = (y: number) => padding.top + plotHeight - (y / (peakY * 1.15)) * plotHeight;

  // Generar puntos de la curva normal Gaussiana
  const { pathD, area1SigmaD } = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    const steps = 100;
    const stepSize = (maxX - minX) / steps;

    for (let i = 0; i <= steps; i++) {
      const xVal = minX + i * stepSize;
      const exponent = -Math.pow(xVal - mu, 2) / (2 * Math.pow(sigma, 2));
      const yVal = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      pts.push({ x: scaleX(xVal), y: scaleY(yVal) });
    }

    const path = pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    // Área bajo la curva para +/- 1 sigma (68.2% de los datos)
    const x1 = Math.max(minX, mu - sigma);
    const x2 = Math.min(maxX, mu + sigma);
    const areaPts: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= 40; i++) {
      const xVal = x1 + (i / 40) * (x2 - x1);
      const exponent = -Math.pow(xVal - mu, 2) / (2 * Math.pow(sigma, 2));
      const yVal = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      areaPts.push({ x: scaleX(xVal), y: scaleY(yVal) });
    }

    const areaPath = [
      `M ${scaleX(x1).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)}`,
      ...areaPts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
      `L ${scaleX(x2).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)}`,
      "Z",
    ].join(" ");

    return { pathD: path, area1SigmaD: areaPath };
  }, [minX, maxX, mu, sigma, plotWidth, plotHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  const aciBadge = {
    EXCELENTE: { bg: "#ecfdf5", text: "#065f46", label: "Excelente (s < 28 kg/cm²)" },
    BUENA: { bg: "#edf5fd", text: "#145388", label: "Buena (28 ≤ s < 35 kg/cm²)" },
    REGULAR: { bg: "#fffbeb", text: "#92400e", label: "Regular (35 ≤ s < 42 kg/cm²)" },
    DEFICIENTE: { bg: "#fef2f2", text: "#991b1b", label: "Deficiente (s ≥ 42 kg/cm²)" },
    INSUFICIENTE_DATOS: { bg: "#f1f5f9", text: "#475569", label: "Datos insuficientes (n < 10)" },
  }[calificacionAci];

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Badge de evaluación ACI 214R */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          padding: "6px 12px",
          background: "var(--ensalia-bg-app, #f8fafc)",
          borderRadius: "6px",
          fontSize: "12px",
        }}
      >
        <span>
          <strong>Control Estadístico (ACI 214R):</strong>
        </span>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "999px",
            fontWeight: 600,
            background: aciBadge.bg,
            color: aciBadge.text,
          }}
        >
          {aciBadge.label}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        role="img"
        aria-label="Campana de Gauss y distribución de resistencia f'c"
      >
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          fill="var(--ensalia-bg-app, #f8fafc)"
          rx={4}
        />

        {/* Zona sombreada +/- 1 sigma */}
        <path d={area1SigmaD} fill="var(--ensalia-primary-100, #d8ecff)" opacity={0.6} />

        {/* Curva Gaussiana */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--ensalia-primary-700, #145388)"
          strokeWidth={2.5}
        />

        {/* Línea vertical de la Media (x = mu) */}
        <line
          x1={scaleX(mu)}
          y1={padding.top}
          x2={scaleX(mu)}
          y2={padding.top + plotHeight}
          stroke="var(--ensalia-primary-800, #0f3d64)"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
        <text
          x={scaleX(mu)}
          y={padding.top - 8}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill="var(--ensalia-primary-800, #0f3d64)"
        >
          x̄ = {media} kg/cm²
        </text>

        {/* Línea vertical de f'c de diseño */}
        {fcDiseno >= minX && fcDiseno <= maxX && (
          <g>
            <line
              x1={scaleX(fcDiseno)}
              y1={padding.top}
              x2={scaleX(fcDiseno)}
              y2={padding.top + plotHeight}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            />
            <text
              x={scaleX(fcDiseno)}
              y={padding.top + 16}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill="#ef4444"
            >
              f&apos;c ({fcDiseno})
            </text>
          </g>
        )}

        {/* Marcadores de desviación en el eje X */}
        {[mu - 2 * sigma, mu - sigma, mu, mu + sigma, mu + 2 * sigma].map((val, idx) => {
          if (val < minX || val > maxX) return null;
          const x = scaleX(val);
          return (
            <g key={idx}>
              <line
                x1={x}
                y1={padding.top + plotHeight}
                x2={x}
                y2={padding.top + plotHeight + 6}
                stroke="var(--ensalia-border-default, #cbd5e1)"
              />
              <text
                x={x}
                y={padding.top + plotHeight + 18}
                textAnchor="middle"
                fontSize={10}
                fill="var(--ensalia-text-muted, #475569)"
              >
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Eje X y Y */}
        <text
          x={padding.left + plotWidth / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--ensalia-text-muted, #475569)"
        >
          Resistencia a la compresión (kg/cm²)
        </text>
      </svg>
    </div>
  );
}

