"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, FileText, ShieldCheck, X } from "lucide-react";

interface CertificateViewerModalProps {
  isOpen: boolean;
  equipoId: string;
  calibracionId: string;
  nombreArchivo: string;
  hashSha256: string;
  tamanoBytes?: number;
  onClose: () => void;
}

export function CertificateViewerModal({
  isOpen,
  equipoId,
  calibracionId,
  nombreArchivo,
  hashSha256,
  tamanoBytes,
  onClose,
}: CertificateViewerModalProps) {
  const [copied, setCopied] = useState(false);
  const pdfUrl = `/api/equipos/${equipoId}/calibraciones/${calibracionId}/documento`;
  const downloadUrl = `${pdfUrl}?download=true`;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hashSha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      style={{ zIndex: 1200 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-viewer-title"
        style={{
          width: "90vw",
          maxWidth: "1000px",
          height: "85vh",
          display: "flex",
          flexDirection: "column",
          padding: "20px",
        }}
      >
        {/* Header */}
        <div
          className="section-head"
          style={{
            marginBottom: "12px",
            borderBottom: "1px solid var(--ensalia-border-subtle, #e2e8f0)",
            paddingBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                backgroundColor: "var(--ensalia-primary-50, #edf5fd)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--brand, #16734c)",
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 id="cert-viewer-title" style={{ margin: 0, fontSize: "18px" }}>
                  {nombreArchivo}
                </h2>
                {tamanoBytes && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--muted, #64748b)",
                      background: "var(--wash, #f4f8f5)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {formatSize(tamanoBytes)}
                  </span>
                )}
              </div>
              <p className="eyebrow" style={{ margin: "2px 0 0 0" }}>
                Certificado Oficial de Calibración Metrológica
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href={downloadUrl}
              className="secondary button-compact"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
              title="Descargar archivo PDF"
            >
              <Download size={16} />
              <span>Descargar</span>
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="secondary button-compact"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
              title="Abrir en pestaña nueva"
            >
              <ExternalLink size={16} />
              <span>Pestaña</span>
            </a>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Cerrar visor"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SHA-256 Forensic Integrity Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--ensalia-primary-50, #edf5fd)",
            border: "1px solid var(--ensalia-primary-100, #d8ecff)",
            borderRadius: "6px",
            padding: "8px 12px",
            marginBottom: "12px",
            fontSize: "12px",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
            <ShieldCheck size={16} style={{ color: "#059669", flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: "var(--ensalia-primary-900, #0a2540)", whiteSpace: "nowrap" }}>
              Huella Digital SHA-256:
            </span>
            <code
              style={{
                fontFamily: "monospace",
                color: "var(--ensalia-text-muted, #475569)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={hashSha256}
            >
              {hashSha256}
            </code>
          </div>

          <button
            type="button"
            className="text-button"
            onClick={copyHash}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              flexShrink: 0,
              padding: "2px 6px",
            }}
          >
            {copied ? (
              <>
                <Check size={14} style={{ color: "#059669" }} />
                <span style={{ color: "#059669" }}>Copiado</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar Hash</span>
              </>
            )}
          </button>
        </div>

        {/* PDF Frame */}
        <div
          style={{
            flex: 1,
            backgroundColor: "#525659",
            borderRadius: "6px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <iframe
            src={pdfUrl}
            title={`Certificado ${nombreArchivo}`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </div>
      </section>
    </div>
  );
}

