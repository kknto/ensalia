"use client";

import { useEffect } from "react";
import { CheckCircle2, HelpCircle, Info, Lightbulb, ListOrdered, Target, X } from "lucide-react";
import { HELP_CONTENT, HelpSection } from "@/lib/help/content";

interface HelpModalProps {
  viewKey: string;
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ viewKey, isOpen, onClose }: HelpModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const section: HelpSection = HELP_CONTENT[viewKey] || {
    clave: viewKey,
    titulo: "Ayuda y Guía Operativa",
    subtitulo: "Instrucciones de uso de la pantalla",
    objetivo: "Consulta las instrucciones de uso y buenas prácticas para esta sección de ENSALIA.",
    pasos: [
      {
        numero: 1,
        titulo: "Operación general",
        descripcion: "Revisa los campos disponibles y completa los datos requeridos.",
      },
    ],
    tips: [
      {
        pregunta: "¿Tienes dudas sobre algún campo?",
        respuesta: "Los campos con asterisco o etiquetas específicas son requeridos por la normativa.",
      },
    ],
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <section
        className="modal help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        style={{
          backgroundColor: "var(--card, #ffffff)",
          borderRadius: "16px",
          maxWidth: "680px",
          width: "100%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--line, #e2e8f0)",
          overflow: "hidden",
        }}
      >
        {/* Encabezado */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--line, #e2e8f0)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            backgroundColor: "var(--surface, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "rgba(2, 132, 199, 0.12)",
                color: "var(--brand, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <HelpCircle size={22} />
            </div>
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--brand, #0284c7)",
                  margin: 0,
                }}
              >
                Guía Operativa ENSALIA
              </p>
              <h2
                id="help-modal-title"
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  margin: "2px 0 0",
                  color: "var(--text, #0f172a)",
                }}
              >
                {section.titulo}
              </h2>
              <p style={{ fontSize: "12px", color: "var(--muted, #64748b)", margin: "2px 0 0" }}>
                {section.subtitulo}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar ventana de ayuda"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "var(--muted, #64748b)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Bloque 1: Objetivo */}
          <div
            style={{
              backgroundColor: "rgba(2, 132, 199, 0.05)",
              border: "1px solid rgba(2, 132, 199, 0.2)",
              borderRadius: "12px",
              padding: "14px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Target size={18} style={{ color: "var(--brand, #0284c7)" }} />
              <strong style={{ fontSize: "14px", color: "var(--brand-dark, #0369a1)" }}>
                ¿Cuál es el objetivo de esta pantalla?
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--text, #334155)" }}>
              {section.objetivo}
            </p>
          </div>

          {/* Bloque 2: Pasos recomendados */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <ListOrdered size={18} style={{ color: "var(--brand, #0284c7)" }} />
              <strong style={{ fontSize: "14px", color: "var(--text, #0f172a)" }}>
                Guía de uso recomendada (Paso a paso)
              </strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {section.pasos.map((paso) => (
                <div
                  key={paso.numero}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    backgroundColor: "var(--surface, #f8fafc)",
                    border: "1px solid var(--line, #e2e8f0)",
                  }}
                >
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: "var(--brand, #0284c7)",
                      color: "#ffffff",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {paso.numero}
                  </span>
                  <div>
                    <strong style={{ fontSize: "13px", color: "var(--text, #0f172a)", display: "block" }}>
                      {paso.titulo}
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--muted, #64748b)", lineHeight: "1.4" }}>
                      {paso.descripcion}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloque 3: Tips y Preguntas frecuentes */}
          {section.tips && section.tips.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Lightbulb size={18} style={{ color: "#d97706" }} />
                <strong style={{ fontSize: "14px", color: "var(--text, #0f172a)" }}>
                  Consejos y Preguntas Frecuentes
                </strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {section.tips.map((tip, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(245, 158, 11, 0.06)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                    }}
                  >
                    <strong style={{ fontSize: "13px", color: "#92400e", display: "block", marginBottom: "4px" }}>
                      💡 {tip.pregunta}
                    </strong>
                    <p style={{ margin: 0, fontSize: "12px", color: "#78350f", lineHeight: "1.4" }}>
                      {tip.respuesta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--line, #e2e8f0)",
            backgroundColor: "var(--surface, #f8fafc)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
            Tip: Puedes presionar <strong>Esc</strong> para cerrar esta ayuda.
          </span>
          <button
            type="button"
            className="primary"
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 18px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} />
            <span>Entendido</span>
          </button>
        </div>
      </section>
    </div>
  );
}
