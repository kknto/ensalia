"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Plus, RotateCcw, Save, Trash2, Info, Building2, MapPin, Truck, FlaskConical } from "lucide-react";
import { Sample, Specimen } from "../types";
import EquipmentAssignment from "@/components/EquipmentAssignment";
import { HelpButton } from "@/components/common/HelpButton";
import { HelpModal } from "@/components/common/HelpModal";

interface SampleFormViewProps {
  form: Sample;
  set: (key: string, value: unknown) => void;
  specimens: Specimen[];
  saving: boolean;
  headers: () => Record<string, string>;
  onMessage: (message: string, error?: boolean) => void;
  onSubmit: (event: FormEvent) => void;
  onReset: () => void;
  onAddSpecimen: () => void;
  onRemoveSpecimen: (index: number) => void;
  clientesDisponibles?: string[];
  obrasPorCliente?: Record<string, string[]>;
}

export function SampleFormView({
  form,
  set,
  specimens,
  saving,
  headers,
  onMessage,
  onSubmit,
  onReset,
  onAddSpecimen,
  onRemoveSpecimen,
  clientesDisponibles = [],
  obrasPorCliente = {},
}: SampleFormViewProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const editable =
    !form.estatusBitacora ||
    form.estatusBitacora === "BORRADOR" ||
    form.estatusBitacora === "REVISADA";

  function updateSamplingDate(value: string) {
    set("fechaMuestreo", value);
  }

  // Obras filtradas para el cliente actualmente tecleado/seleccionado
  const obrasSugeridas = useMemo(() => {
    const clienteActual = form.cliente?.trim();
    if (clienteActual && obrasPorCliente[clienteActual]) {
      return obrasPorCliente[clienteActual];
    }
    // Si no hay cliente específico o no tiene obras mapeadas aún, mostrar obras globales
    const todasLasObras = new Set<string>();
    for (const lista of Object.values(obrasPorCliente)) {
      for (const o of lista) todasLasObras.add(o);
    }
    return Array.from(todasLasObras).sort((a, b) => a.localeCompare(b));
  }, [form.cliente, obrasPorCliente]);

  return (
    <form onSubmit={onSubmit}>
      {/* Datalists nativos para autocompletado inteligente */}
      <datalist id="clientes-sugeridos">
        {clientesDisponibles.map((cliente) => (
          <option key={cliente} value={cliente} />
        ))}
      </datalist>

      <datalist id="obras-sugeridas">
        {obrasSugeridas.map((obra) => (
          <option key={obra} value={obra} />
        ))}
      </datalist>

      <datalist id="ciudades-sugeridas">
        <option value="Cancún, Q. Roo" />
        <option value="Playa del Carmen, Q. Roo" />
        <option value="Tulum, Q. Roo" />
        <option value="Puerto Morelos, Q. Roo" />
        <option value="Chetumal, Q. Roo" />
        <option value="Cozumel, Q. Roo" />
        <option value="Mérida, Yucatán" />
      </datalist>

      <datalist id="concreteras-sugeridas">
        <option value="Holcim" />
        <option value="Cemex" />
        <option value="Moctezuma" />
        <option value="Cruz Azul" />
        <option value="Concretera Maya" />
      </datalist>

      <datalist id="tipos-concreto-sugeridos">
        <option value="Normal" />
        <option value="Bombeable" />
        <option value="Estructural" />
        <option value="MR (Pavimentos)" />
        <option value="Rápido (Resistencia acelerada)" />
        <option value="Fluido" />
      </datalist>

      <datalist id="elementos-sugeridos">
        <option value="Castillos" />
        <option value="Columnas" />
        <option value="Losa" />
        <option value="Zapatas" />
        <option value="Trabes" />
        <option value="Muros" />
        <option value="Firme" />
        <option value="Pilas / Pilotes" />
      </datalist>

      <section className="notice" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Info size={20} style={{ color: "var(--brand)", flexShrink: 0 }} />
          <div>
            <strong>{form.id ? `Editando ${form.idMuestra}` : "Nuevo reporte de muestreo en obra (MC-LBS-CC-MO)"}.</strong>{" "}
            Los campos marcados con * son obligatorios para cumplimiento normativo.
          </div>
        </div>
        <HelpButton onClick={() => setHelpOpen(true)} label="Guía de captura" />
      </section>

      <fieldset disabled={saving || !editable} style={{ border: "none", padding: 0, margin: 0 }}>
        {/* 1. Identificación y Ubicación del Colado */}
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Building2 size={20} style={{ color: "var(--brand)" }} />
            <h2 style={{ margin: 0 }}>1. Identificación y Ubicación del Colado</h2>
          </div>

          <div className="grid two">
            <Field label="Fecha de colado / muestreo *">
              <input
                type="date"
                value={form.fechaMuestreo}
                onChange={(e) => updateSamplingDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Cliente *">
              <input
                list="clientes-sugeridos"
                placeholder="Escribe o selecciona cliente..."
                value={form.cliente ?? ""}
                onChange={(e) => set("cliente", e.target.value)}
                required
                autoComplete="off"
              />
            </Field>

            <Field label="Obra *">
              <input
                list="obras-sugeridas"
                placeholder={form.cliente ? `Obras de ${form.cliente}...` : "Escribe o selecciona obra..."}
                value={form.obra ?? ""}
                onChange={(e) => set("obra", e.target.value)}
                required
                autoComplete="off"
              />
            </Field>

            <Field label="Ciudad">
              <input
                list="ciudades-sugeridas"
                placeholder="Ej. Cancún, Q. Roo"
                value={String(form.ciudad ?? "")}
                onChange={(e) => set("ciudad", e.target.value)}
              />
            </Field>

            <Field label="Coordenadas del Colado">
              <input
                placeholder="Ej. Mz 23, 17, 22 o coordenadas GPS"
                value={String(form.coordenadasColado ?? "")}
                onChange={(e) => set("coordenadasColado", e.target.value)}
              />
            </Field>

            <Field label="Dirección de la obra">
              <input
                placeholder="Ej. Benito Juárez SM 255 L Txya Mz 21"
                value={String(form.direccion ?? "")}
                onChange={(e) => set("direccion", e.target.value)}
              />
            </Field>

            <Field label="Elemento">
              <input
                list="elementos-sugeridos"
                placeholder="Ej. Castillos, Losas, Columnas"
                value={String(form.elemento ?? "")}
                onChange={(e) => set("elemento", e.target.value)}
              />
            </Field>

            <Field label="Localización / Tramo">
              <input
                placeholder="Ej. Eje A-B, Nivel +2.40"
                value={String(form.localizacion ?? "")}
                onChange={(e) => set("localizacion", e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* 2. Concreto, Remisión y Transporte */}
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Truck size={20} style={{ color: "var(--brand)" }} />
            <h2 style={{ margin: 0 }}>2. Concreto, Remisión y Transporte</h2>
          </div>

          <div className="grid three">
            <Field label="No. de muestra *">
              <input
                placeholder="Ej. 2447"
                value={String(form.noMuestra ?? "")}
                onChange={(e) => set("noMuestra", e.target.value)}
                required
              />
            </Field>

            <Field label="Tipo de concreto *">
              <input
                list="tipos-concreto-sugeridos"
                placeholder="Ej. Normal, Bombeable"
                value={String(form.tipoConcreto ?? "")}
                onChange={(e) => set("tipoConcreto", e.target.value)}
                required
              />
            </Field>

            <Field label="Concretera">
              <input
                list="concreteras-sugeridas"
                placeholder="Ej. Holcim, Cemex"
                value={String(form.concretera ?? "")}
                onChange={(e) => set("concretera", e.target.value)}
              />
            </Field>

            <Field label="# Sistema (Planta)">
              <input
                placeholder="Ej. 8794"
                value={String(form.sistema ?? "")}
                onChange={(e) => set("sistema", e.target.value)}
              />
            </Field>

            <Field label="Tipo de Cemento">
              <input
                placeholder="Ej. CPC-40"
                value={String(form.cemento ?? "")}
                onChange={(e) => set("cemento", e.target.value)}
              />
            </Field>

            <Field label="Remisión">
              <input
                placeholder="Ej. 44160699"
                value={String(form.remision ?? "")}
                onChange={(e) => set("remision", e.target.value)}
              />
            </Field>

            <Field label="Camión / Olla">
              <input
                placeholder="Ej. 5293"
                value={String(form.camion ?? "")}
                onChange={(e) => set("camion", e.target.value)}
              />
            </Field>

            <Field label="Volumen (m³)">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Ej. 6"
                value={String(form.volumenM3 ?? "")}
                onChange={(e) => set("volumenM3", e.target.value)}
              />
            </Field>

            <Field label="f'c Proyecto (kg/cm²)">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Ej. 200"
                value={String(form.fcKgCm2 ?? "")}
                onChange={(e) => set("fcKgCm2", e.target.value)}
              />
            </Field>

            <Field label="TMA (mm)">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Ej. 20"
                value={String(form.tmaMm ?? "")}
                onChange={(e) => set("tmaMm", e.target.value)}
              />
            </Field>

            <Field label="Revenimiento Diseño (cm)">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Ej. 18"
                value={String(form.revenimientoCm ?? "")}
                onChange={(e) => set("revenimientoCm", e.target.value)}
              />
            </Field>

            <Field label="Tolerancia Revenimiento">
              <input
                placeholder="Ej. ± 3.5 cm"
                value={String(form.toleranciaRevenimiento ?? "± 3.5 cm")}
                onChange={(e) => set("toleranciaRevenimiento", e.target.value)}
              />
            </Field>

            <Field label="Revenimiento Obtenido 1 (cm)">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Ej. 19"
                value={String(form.revenimientoObtenido ?? "")}
                onChange={(e) => set("revenimientoObtenido", e.target.value)}
              />
            </Field>

            <Field label="Revenimiento Obtenido 2 (cm)">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Segunda prueba opcional"
                value={String(form.revenimientoObtenido2 ?? "")}
                onChange={(e) => set("revenimientoObtenido2", e.target.value)}
              />
            </Field>

            <Field label="Temp. Ambiente (°C)">
              <input
                type="number"
                step="any"
                placeholder="Ej. 32.4"
                value={String(form.tempAmbienteC ?? "")}
                onChange={(e) => set("tempAmbienteC", e.target.value)}
              />
            </Field>

            <Field label="Temp. Concreto (°C)">
              <input
                type="number"
                step="any"
                placeholder="Ej. 32.4"
                value={String(form.tempConcretoC ?? "")}
                onChange={(e) => set("tempConcretoC", e.target.value)}
              />
            </Field>

            <Field label="Contenido de Aire (%)">
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                placeholder="Ej. 1.5"
                value={String(form.contenidoAirePct ?? "")}
                onChange={(e) => set("contenidoAirePct", e.target.value)}
              />
            </Field>
          </div>

          <h3 style={{ fontSize: "0.95rem", marginTop: "18px", marginBottom: "8px", color: "var(--ink-muted)" }}>
            Horarios de Transporte y Muestreo en Obra (24h)
          </h3>
          <div className="grid four" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Field label="Salida de Planta">
              <input
                type="datetime-local"
                value={String(form.salidaPlanta ?? "")}
                onChange={(e) => set("salidaPlanta", e.target.value)}
              />
            </Field>
            <Field label="Llegada a Obra">
              <input
                type="datetime-local"
                value={String(form.llegadaObra ?? "")}
                onChange={(e) => set("llegadaObra", e.target.value)}
              />
            </Field>
            <Field label="Elaboración de Muestra">
              <input
                type="datetime-local"
                value={String(form.elaboracionMuestra ?? "")}
                onChange={(e) => set("elaboracionMuestra", e.target.value)}
              />
            </Field>
            <Field label="Inicio Descarga">
              <input
                type="datetime-local"
                value={String(form.inicioDescarga ?? "")}
                onChange={(e) => set("inicioDescarga", e.target.value)}
              />
            </Field>
            <Field label="Fin Descarga">
              <input
                type="datetime-local"
                value={String(form.finDescarga ?? "")}
                onChange={(e) => set("finDescarga", e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* 3. Especímenes y Moldes Ocupados */}
        <section className="card">
          <div className="section-head">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FlaskConical size={20} style={{ color: "var(--brand)" }} />
              <div>
                <h2 style={{ margin: 0 }}>3. Especímenes y Moldes Ocupados</h2>
                <p className="muted" style={{ margin: "2px 0 0 0" }}>
                  Admite hasta 4 especímenes por muestra oficial según formato MC-LBS-CC-MO.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={onAddSpecimen}
              disabled={saving || specimens.length >= 4}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={16} />
              <span>Agregar espécimen</span>
            </button>
          </div>

          <div className="grid two" style={{ marginBottom: "16px", marginTop: "14px" }}>
            <Field label="Número de especímenes">
              <input value={specimens.length} readOnly />
            </Field>
            <Field label="Laboratorista de campo (Realiza)">
              <input
                placeholder="Nombre del técnico laboratorista"
                value={String(form.laboratoristaCampo ?? "")}
                onChange={(e) => set("laboratoristaCampo", e.target.value)}
              />
            </Field>
            <Field label="Residente de obra (Visto Bueno)">
              <input
                placeholder="Nombre del residente o supervisor de obra"
                value={String(form.residenteObra ?? "")}
                onChange={(e) => set("residenteObra", e.target.value)}
              />
            </Field>
          </div>

          {specimens.map((specimen, index) => (
            <fieldset className="specimen" key={specimen.id || specimen.numero}>
              <legend>Espécimen {index + 1}</legend>
              <Field label="Tipo de espécimen">
                <select
                  value={specimen.tipo}
                  onChange={(e) => {
                    const copy = [...specimens];
                    copy[index] = { ...specimen, tipo: e.target.value };
                    set("especimenes", copy);
                  }}
                >
                  <option value="CILINDRO_15X30">Cilindro 15x30 cm</option>
                  <option value="CILINDRO_10X20">Cilindro 10x20 cm</option>
                  <option value="VIGA_50X15X15">Viga 50x15x15 cm</option>
                </select>
              </Field>

              <Field label="Edad programada (días)">
                <input
                  type="number"
                  min="0"
                  placeholder="Ej. 7, 14, 28"
                  value={specimen.edadDias ?? ""}
                  onChange={(e) => {
                    const copy = [...specimens];
                    copy[index] = {
                      ...specimen,
                      edadDias: e.target.value === "" ? null : Number(e.target.value),
                    };
                    set("especimenes", copy);
                  }}
                />
              </Field>

              <Field label="Fecha estimada de ensaye">
                <input
                  type="date"
                  value={specimen.fechaEnsaye?.slice(0, 10) || ""}
                  onChange={(e) => {
                    const copy = [...specimens];
                    copy[index] = {
                      ...specimen,
                      fechaEnsaye: e.target.value || null,
                    };
                    set("especimenes", copy);
                  }}
                />
              </Field>

              <Field label="# Molde Muestra (ID Físico)">
                <input
                  placeholder="Ej. 006, 092, 077"
                  value={specimen.numeroMolde ?? ""}
                  onChange={(e) => {
                    const copy = [...specimens];
                    copy[index] = {
                      ...specimen,
                      numeroMolde: e.target.value,
                    };
                    set("especimenes", copy);
                  }}
                />
              </Field>

              <button
                type="button"
                className="danger-quiet"
                onClick={() => onRemoveSpecimen(index)}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Trash2 size={14} />
                <span>Eliminar</span>
              </button>
            </fieldset>
          ))}
        </section>

        {/* 4. Asignación de equipos */}
        <EquipmentAssignment
          sampleId={form.id}
          specimens={specimens}
          headers={headers}
          disabled={saving || !editable}
          onMessage={onMessage}
        />

        {/* 5. Observaciones y recolección */}
        <section className="card">
          <h2>5. Observaciones y recolección</h2>
          <div className="grid two">
            <Field label="Observaciones">
              <textarea
                rows={4}
                placeholder="Notas de campo, aditivos, condiciones climáticas o incidencias..."
                value={String(form.observaciones ?? "")}
                onChange={(e) => set("observaciones", e.target.value)}
              />
            </Field>
            <Field label="Estatus de recolección">
              <select
                value={form.estatusRecoleccion}
                onChange={(e) => set("estatusRecoleccion", e.target.value)}
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="RECOLECTADA">Recolectada</option>
                <option value="NO_RECOLECTADA">No recolectada</option>
              </select>
            </Field>
          </div>
        </section>
      </fieldset>

      <div className="sticky-actions">
        <button
          className="primary"
          type="submit"
          disabled={saving || !editable}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <Save size={18} />
          <span>
            {saving
              ? "Guardando…"
              : form.id
              ? "Guardar cambios"
              : "Guardar como borrador"}
          </span>
        </button>
        <button
          type="button"
          className="secondary"
          onClick={onReset}
          disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <RotateCcw size={18} />
          <span>Limpiar formulario</span>
        </button>
      </div>

      <HelpModal
        viewKey="nueva"
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
