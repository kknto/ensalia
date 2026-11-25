"use client";

import { useEffect, useState, useId } from "react";
import { Calendar, Truck, User, X, CheckSquare, Square, PlusCircle, AlertCircle } from "lucide-react";
import { PendingSample } from "../types";

interface NewDispatchModalProps {
  isOpen: boolean;
  pendingSamples: PendingSample[];
  selectedInitialSampleIds?: string[];
  isSaving: boolean;
  onConfirm: (payload: {
    fechaProgramada: string;
    choferOperadorId?: string;
    choferNombre?: string;
    vehiculo: string;
    placas: string;
    origen: string;
    destino: string;
    observaciones: string;
    muestrasIds: string[];
  }) => void;
  onCancel: () => void;
}

export function NewDispatchModal({
  isOpen,
  pendingSamples,
  selectedInitialSampleIds,
  isSaving,
  onConfirm,
  onCancel,
}: NewDispatchModalProps) {
  const [fecha, setFecha] = useState("");
  const [operadores, setOperadores] = useState<Array<{ id: string; nombre: string }>>([]);
  const [choferId, setChoferId] = useState("");
  const [nuevoChoferNombre, setNuevoChoferNombre] = useState("");
  const [modoNuevoChofer, setModoNuevoChofer] = useState(false);
  const [vehiculo, setVehiculo] = useState("Camioneta Ranger 01");
  const [placas, setPlacas] = useState("JA-8921-A");
  const [origen, setOrigen] = useState("Laboratorio Central");
  const [destino, setDestino] = useState("Ruta Obras Zona Norte");
  const [observaciones, setObservaciones] = useState("");
  const [selectedMuestras, setSelectedMuestras] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Inicialización limpia cuando el modal se abre (sin dependencias inestables que provoquen bucle infinito)
  useEffect(() => {
    if (!isOpen) return;

    // Fecha/hora actual en formato datetime-local
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    setFecha(localISOTime);

    // Muestras seleccionadas por defecto
    if (selectedInitialSampleIds && selectedInitialSampleIds.length > 0) {
      setSelectedMuestras(selectedInitialSampleIds);
    } else {
      setSelectedMuestras(pendingSamples.map((s) => s.id));
    }

    setError("");
    setModoNuevoChofer(false);
    setNuevoChoferNombre("");

    // Cargar catálogo de operadores desde la API
    fetch("/api/catalogos")
      .then((res) => res.json())
      .then((data) => {
        const ops: Array<{ id: string; nombre: string }> = Array.isArray(data)
          ? data
          : data.operadores || [];
        setOperadores(ops);
        if (ops.length > 0) {
          setChoferId(ops[0].id);
        } else {
          setModoNuevoChofer(true);
        }
      })
      .catch(() => {});

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]); // Depende estrictamente de isOpen para evitar loops de render

  if (!isOpen) return null;

  const toggleSample = (id: string) => {
    setSelectedMuestras((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMuestras.length === pendingSamples.length) {
      setSelectedMuestras([]);
    } else {
      setSelectedMuestras(pendingSamples.map((s) => s.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const nombreChoferFinal = modoNuevoChofer ? nuevoChoferNombre.trim() : "";
    if (!modoNuevoChofer && !choferId) {
      setError("Debes seleccionar un chofer u operador responsable.");
      return;
    }
    if (modoNuevoChofer && !nombreChoferFinal) {
      setError("Debes escribir el nombre del nuevo chofer u operador.");
      return;
    }

    if (selectedMuestras.length === 0) {
      setError("Debes seleccionar al menos una muestra para incluir en el manifiesto de despacho.");
      return;
    }

    onConfirm({
      fechaProgramada: new Date(fecha).toISOString(),
      choferOperadorId: modoNuevoChofer ? undefined : choferId,
      choferNombre: modoNuevoChofer ? nombreChoferFinal : undefined,
      vehiculo,
      placas,
      origen,
      destino,
      observaciones,
      muestrasIds: selectedMuestras,
    });
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-dispatch-title"
        style={{
          width: "100%",
          maxWidth: "780px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
          borderRadius: "14px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        {/* Cabecera del modal */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--line, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "var(--ensalia-primary-50, #edf5fd)",
                display: "grid",
                placeItems: "center",
                color: "var(--brand, #16734c)",
              }}
            >
              <Truck size={22} />
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--brand, #16734c)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Logística de Ensayes y Traslado
              </span>
              <h2 id="new-dispatch-title" style={{ margin: "2px 0 0 0", fontSize: "1.15rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
                Nuevo Manifiesto de Despacho / Recolección
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Cerrar ventana"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              color: "var(--muted, #64748b)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensaje de error si aplica */}
        {error && (
          <div
            style={{
              padding: "10px 22px",
              backgroundColor: "#fef2f2",
              borderBottom: "1px solid #fee2e2",
              color: "#991b1b",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Cuerpo del formulario con scroll suave */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Bloque 1: Ruta y Operador */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Fecha y hora programada *</span>
                <input
                  type="datetime-local"
                  required
                  value={fecha}
                  disabled={isSaving}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </label>

              <label className="field" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Chofer / Operador asignado *</span>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--brand, #16734c)",
                      fontSize: "11px",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 600,
                    }}
                    onClick={() => {
                      setModoNuevoChofer(!modoNuevoChofer);
                      setError("");
                    }}
                  >
                    {modoNuevoChofer ? "← Seleccionar de la lista" : "+ Escribir nuevo chofer"}
                  </button>
                </div>

                {modoNuevoChofer ? (
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Escribe el nombre del chofer o técnico..."
                    value={nuevoChoferNombre}
                    disabled={isSaving}
                    onChange={(e) => setNuevoChoferNombre(e.target.value)}
                  />
                ) : (
                  <select
                    required
                    value={choferId}
                    disabled={isSaving}
                    onChange={(e) => setChoferId(e.target.value)}
                  >
                    <option value="">Selecciona operador...</option>
                    {operadores.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Vehículo</span>
                <input
                  type="text"
                  value={vehiculo}
                  disabled={isSaving}
                  onChange={(e) => setVehiculo(e.target.value)}
                  placeholder="Ej. Ranger 01 / Hilux 02"
                />
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span>Placas</span>
                <input
                  type="text"
                  value={placas}
                  disabled={isSaving}
                  onChange={(e) => setPlacas(e.target.value)}
                  placeholder="Ej. JA-8921-A"
                />
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span>Origen</span>
                <input
                  type="text"
                  value={origen}
                  disabled={isSaving}
                  onChange={(e) => setOrigen(e.target.value)}
                />
              </label>

              <label className="field" style={{ margin: 0 }}>
                <span>Destino / Zona</span>
                <input
                  type="text"
                  value={destino}
                  disabled={isSaving}
                  onChange={(e) => setDestino(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Bloque 2: Selección de Muestras */}
          <div
            style={{
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: "10px",
              padding: "14px",
              backgroundColor: "#fafbfc",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                  Muestras a recolectar
                </span>
                <span
                  style={{
                    backgroundColor: "var(--ensalia-primary-50, #edf5fd)",
                    color: "var(--brand, #16734c)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {selectedMuestras.length} seleccionadas
                </span>
              </div>

              <button
                type="button"
                className="text-button"
                style={{
                  fontSize: "12px",
                  color: "var(--brand, #16734c)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                onClick={handleSelectAll}
              >
                {selectedMuestras.length === pendingSamples.length
                  ? "Deseleccionar todas"
                  : "Seleccionar todas"}
              </button>
            </div>

            <div
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                paddingRight: "4px",
              }}
            >
              {pendingSamples.length === 0 ? (
                <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--muted)" }}>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    No hay muestras pendientes de recolección en este momento.
                  </p>
                </div>
              ) : (
                pendingSamples.map((m) => {
                  const isChecked = selectedMuestras.includes(m.id);
                  const isCritico = m.estadoCurado === "CRITICO" || m.estadoCurado === "VENCIDO";
                  return (
                    <label
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: isChecked
                          ? "1px solid var(--brand, #16734c)"
                          : "1px solid var(--line, #e2e8f0)",
                        backgroundColor: isChecked ? "#f0fdf4" : "#ffffff",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSample(m.id)}
                        disabled={isSaving}
                        style={{
                          width: "18px",
                          minWidth: "18px",
                          height: "18px",
                          minHeight: "18px",
                          margin: 0,
                          cursor: "pointer",
                          accentColor: "var(--brand, #16734c)",
                          flexShrink: 0,
                        }}
                      />

                      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{m.idMuestra}</strong>
                          <span style={{ fontSize: "13px", color: "var(--ink-muted, #475569)" }}>
                            • {m.cliente} — <span style={{ fontWeight: 500 }}>{m.obra}</span>
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px", fontSize: "11px", color: "var(--muted)" }}>
                          <span>{m.elemento || "Sin elemento"}</span>
                          <span>•</span>
                          <span>{m.numeroEspecimenes} especímenes</span>
                        </div>
                      </div>

                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: isCritico ? "#fee2e2" : "#f1f5f9",
                            color: isCritico ? "#991b1b" : "#475569",
                          }}
                        >
                          {m.horasTranscurridas}h en obra
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Bloque 3: Observaciones */}
          <label className="field" style={{ margin: 0 }}>
            <span>Observaciones de la ruta o especificaciones de recolección</span>
            <textarea
              rows={2}
              value={observaciones}
              disabled={isSaving}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Instrucciones al chofer, contacto en obra, equipo auxiliar requerido..."
            />
          </label>

          {/* Botones de acción */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "10px",
              borderTop: "1px solid var(--line, #e2e8f0)",
            }}
          >
            <button
              type="button"
              className="secondary"
              onClick={onCancel}
              disabled={isSaving}
              style={{ padding: "8px 16px" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="primary"
              disabled={isSaving || pendingSamples.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
              }}
            >
              <Truck size={16} />
              <span>{isSaving ? "Emitiendo manifiesto..." : "Emitir Manifiesto de Despacho"}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
