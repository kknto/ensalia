"use client";

import React, { useMemo } from "react";
import { ExternalLink, MapPin, Navigation, ShieldAlert, ShieldCheck } from "lucide-react";

interface OpenStreetMapProps {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  title?: string;
  height?: string | number;
  className?: string;
}

export function OpenStreetMap({
  latitude,
  longitude,
  accuracyMeters,
  title = "Ubicación en obra",
  height = "260px",
  className = "",
}: OpenStreetMapProps) {
  // Delta aproximado para el recuadro del mapa (zoom ~16)
  const delta = 0.0035;
  const bbox = useMemo(() => {
    const minLon = (longitude - delta).toFixed(6);
    const minLat = (latitude - delta).toFixed(6);
    const maxLon = (longitude + delta).toFixed(6);
    const maxLat = (latitude + delta).toFixed(6);
    return `${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}`;
  }, [latitude, longitude, delta]);

  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;
  const osmFullUrl = `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=16/${latitude.toFixed(6)}/${longitude.toFixed(6)}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const wazeUrl = `https://waze.com/ul?ll=${latitude.toFixed(6)},${longitude.toFixed(6)}&navigate=yes`;

  const isGoodAccuracy = accuracyMeters != null && accuracyMeters <= 25;

  return (
    <div
      className={`card ${className}`}
      style={{
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid var(--line, #e2e8f0)",
        background: "var(--card-bg, #ffffff)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MapPin size={18} style={{ color: "var(--brand, #1e4a38)" }} />
          <strong>{title}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {accuracyMeters != null && (
            <span
              style={{
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "12px",
                background: isGoodAccuracy ? "#e6f4ea" : "#fef7e0",
                color: isGoodAccuracy ? "#137333" : "#b06000",
                fontWeight: 500,
              }}
            >
              {isGoodAccuracy ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              Precisión: ±{accuracyMeters.toFixed(1)} m
            </span>
          )}
          <span style={{ fontSize: "12px", color: "var(--muted, #64748b)", fontFamily: "monospace" }}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>
      </div>

      {/* Visor interactivo OpenStreetMap */}
      <div
        style={{
          width: "100%",
          height: typeof height === "number" ? `${height}px` : height,
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid var(--line, #cbd5e1)",
          position: "relative",
        }}
      >
        <iframe
          title={`Mapa OpenStreetMap - ${title}`}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={osmEmbedUrl}
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>

      {/* Enlaces a proveedores de navegación */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "10px",
          fontSize: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <span style={{ color: "var(--muted, #64748b)" }}>
          Cartografía © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>OpenStreetMap</a>
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--brand, #1e4a38)" }}
          >
            <span>Google Maps</span>
            <ExternalLink size={12} />
          </a>
          <a
            href={wazeUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--brand, #1e4a38)" }}
          >
            <span>Waze</span>
            <Navigation size={12} />
          </a>
          <a
            href={osmFullUrl}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--brand, #1e4a38)" }}
          >
            <span>Ampliar OSM</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
