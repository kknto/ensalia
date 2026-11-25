"use client";

import { useMemo, useState } from "react";
import { EnsayeItem } from "../types";

interface FcEvolutionChartProps {
  ensayes: EnsayeItem[];
  fcDiseno?: number;
}

export function FcEvolutionChart({ ensayes, fcDiseno = 250 }: FcEvolutionChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<EnsayeItem | null>(null);

  // Dimensiones del viewBox SVG
  const width = 640;
  const height = 280;
  const padding = { top: 30, right: 30, bottom: 40, left: 55 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Rango de edades (X) y resistencias (Y)
  const maxX = 35; // días
  const minY = 0;
  const maxY = useMemo(() => {
    const maxVal = Math.max(fcDiseno * 1.4, ...ensayes.map((e) => Number(e.resistenciaKgCm2) || 0));
    return Math.ceil(maxVal / 50) * 50;
  }, [ensayes, fcDiseno]);

  const scaleX = (edad: number) => padding.left + (Math.min(edad, maxX) / maxX) * plotWidth;
  const scaleY = (res: number) => padding.top + plotHeight - (res / maxY) * plotHeight;

  // Línea horizontal de f'c de diseño
  const yFcDiseno = scaleY(fcDiseno);

  // Puntos calculados
  const points = useMemo(() => {
    return ensayes.map((e) => {
      const x = scaleX(e.edadRealDias);
      const y = scaleY(Number(e.resistenciaKgCm2));
      const cumple = Number(e.resistenciaKgCm2) >= fcDiseno;
      return { ...e, x, y, cumple };
    });
  }, [ensayes, fcDiseno, plotWidth, plotHeight, maxY]); // eslint-disable-line react-hooks/exhaustive-deps

  // Curva de tendencia logística/exponencial típica del concreto: f(t) = fc * (t / (a + b*t))
  const trendLinePath = useMemo(() => {
    if (points.length < 2) return "";
    const pts: string[] = [];
    for (let t = 1; t <= 30; t += 1) {
      // Modelo ACI de desarrollo de resistencia aproximado para cemento Tipo I
      const factor = t / (4 + 0.85 * t);
      const estimatedFc = fcDiseno * factor;
      const x = scaleX(t);
      const y = scaleY(estimatedFc);
      pts.push(`${t === 1 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, [fcDiseno, plotWidth, plotHeight, maxY]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        role="img"
        aria-label="Gráfica de evolución de resistencia del concreto por edad"
      >
        {/* Fondo del área de trazado */}
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          fill="var(--ensalia-bg-app, #f8fafc)"
          rx={4}
        />

        {/* Líneas de cuadrícula horizontal */}
        {[0.25, 0.5, 0.75, 1].map((pct) => {
          const val = Math.round(maxY * pct);
          const y = scaleY(val);
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="var(--ensalia-border-subtle, #e2e8f0)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--ensalia-text-faint, #64748b)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Líneas de cuadrícula vertical (Edades clave: 3, 7, 14, 28 días) */}
        {[3, 7, 14, 28].map((d) => {
          const x = scaleX(d);
          return (
            <g key={d}>
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + plotHeight}
                stroke="var(--ensalia-border-subtle, #e2e8f0)"
                strokeDasharray="2 4"
              />
              <text
                x={x}
                y={padding.top + plotHeight + 18}
                textAnchor="middle"
                fontSize={11}
                fontWeight={d === 28 ? 600 : 400}
                fill={d === 28 ? "var(--ensalia-primary-700, #145388)" : "var(--ensalia-text-faint, #64748b)"}
              >
                {d}d
              </text>
            </g>
          );
        })}

        {/* Línea de f'c de diseño */}
        {fcDiseno > 0 && (
          <g>
            <line
              x1={padding.left}
              y1={yFcDiseno}
              x2={padding.left + plotWidth}
              y2={yFcDiseno}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
            <text
              x={padding.left + plotWidth - 6}
              y={yFcDiseno - 6}
              textAnchor="end"
              fontSize={11}
              fontWeight={600}
              fill="#ef4444"
            >
              f&apos;c diseño: {fcDiseno} kg/cm²
            </text>
          </g>
        )}

        {/* Curva de evolución teórica ACI */}
        {trendLinePath && (
          <path
            d={trendLinePath}
            fill="none"
            stroke="var(--ensalia-primary-400, #499ded)"
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.8}
          />
        )}

        {/* Puntos individuales de rotura */}
        {points.map((pt) => (
          <circle
            key={pt.id}
            cx={pt.x}
            cy={pt.y}
            r={hoveredPoint?.id === pt.id ? 7 : 5}
            fill={pt.cumple ? "#10b981" : "#ef4444"}
            stroke="#ffffff"
            strokeWidth={1.5}
            style={{ cursor: "pointer", transition: "all 0.15s ease" }}
            onMouseEnter={() => setHoveredPoint(pt)}
            onMouseLeave={() => setHoveredPoint(null)}
          />
        ))}

        {/* Etiquetas de los ejes */}
        <text
          x={padding.left + plotWidth / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--ensalia-text-muted, #475569)"
        >
          Edad del concreto (días)
        </text>
        <text
          transform={`rotate(-90) translate(-${padding.top + plotHeight / 2}, 14)`}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--ensalia-text-muted, #475569)"
        >
          Resistencia (kg/cm²)
        </text>
      </svg>

      {/* Tooltip dinámico */}
      {hoveredPoint && (
        <div
          style={{
            position: "absolute",
            left: `${(scaleX(hoveredPoint.edadRealDias) / width) * 100}%`,
            top: `${(scaleY(Number(hoveredPoint.resistenciaKgCm2)) / height) * 100}%`,
            transform: "translate(-50%, -125%)",
            background: "rgba(15, 23, 42, 0.92)",
            color: "#ffffff",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
            zIndex: 10,
          }}
        >
          <strong>{hoveredPoint.resistenciaKgCm2} kg/cm²</strong> ({hoveredPoint.edadRealDias} días)
          <div style={{ fontSize: "10px", opacity: 0.85 }}>
            {hoveredPoint.especimen?.muestra?.idMuestra || "Muestra"} | Carga: {hoveredPoint.cargaMaximaKg} kg
          </div>
        </div>
      )}
    </div>
  );
}

