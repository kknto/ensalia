"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Search, Wrench, X } from "lucide-react";
import type { Equipment, EquipmentType } from "./InventoryPanel";
import { ReturnEquipmentModal } from "./ReturnEquipmentModal";

type Specimen = { id?: string; numero: number; tipo: string };
type Assignment = {
  id?: string;
  equipoId: string;
  especimenId?: string | null;
  estado?: string;
  equipo?: Equipment;
  codigoInternoSnapshot?: string;
  numeroSerieSnapshot?: string | null;
  estadoEquipoSnapshot?: string;
  calibracionVigenteHastaSnapshot?: string | null;
};
type Props = {
  sampleId?: string;
  specimens: Specimen[];
  headers: () => Record<string, string>;
  disabled?: boolean;
  onMessage: (message: string, error?: boolean) => void;
};

const asList = <T,>(data: unknown, key: string): T[] =>
  Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>)[key])
    ? ((data as Record<string, unknown>)[key] as T[])
    : [];

const equipmentCode = (equipment?: Equipment) =>
  equipment?.codigoInterno || equipment?.numeroSerie || "Equipo sin código";

const specimenNumber = (assignment: Assignment, specimens: Specimen[]) =>
  specimens.find((item) => item.id === assignment.especimenId)?.numero;

export default function EquipmentAssignment({
  sampleId,
  specimens,
  headers,
  disabled,
  onMessage,
}: Props) {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pickerType, setPickerType] = useState<EquipmentType | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Assignment[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadCatalog();
    if (sampleId) void loadAssignments();
  }, [sampleId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function parse(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(
        new Error((data as { error?: string }).error || "No se pudo completar la operación."),
        { status: response.status }
      );
    }
    return data;
  }

  async function loadCatalog() {
    try {
      const [typeData, equipmentData] = await Promise.all([
        parse(await fetch("/api/equipos/tipos")),
        parse(await fetch("/api/equipos?estado=DISPONIBLE")),
      ]);
      setTypes(asList<EquipmentType>(typeData, "tipos"));
      setEquipment(asList<Equipment>(equipmentData, "equipos"));
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "No se cargó el catálogo de equipos.", true);
    }
  }

  async function loadAssignments() {
    if (!sampleId) return;
    try {
      const data = await parse(await fetch(`/api/muestras/${sampleId}/equipos`));
      setAssignments(asList<Assignment>(data, "equipos"));
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "No se cargaron los equipos asignados.", true);
    }
  }

  function openPicker(type: EquipmentType) {
    setPickerType(type);
    setSearch("");
    setDraft([]);
  }

  function toggle(item: Equipment) {
    setDraft((current) =>
      current.some((assignment) => assignment.equipoId === item.id)
        ? current.filter((assignment) => assignment.equipoId !== item.id)
        : [...current, { equipoId: item.id }]
    );
  }

  async function saveSelection() {
    if (!sampleId || !pickerType) return;
    setSaving(true);
    const occupied = new Set(assignments.map((item) => item.especimenId).filter(Boolean));
    const free = specimens.filter((item) => item.id && !occupied.has(item.id));
    const selected = draft.map((item, index) => ({
      ...item,
      especimenId: pickerType.esMolde ? free[index]?.id || null : null,
    }));

    try {
      const sample = await parse(await fetch(`/api/muestras/${sampleId}`));
      const data = await parse(
        await fetch(`/api/muestras/${sampleId}/equipos`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            versionMuestra: Number(sample.version || 0),
            equipos: selected.map(({ equipoId, especimenId }) => ({
              equipoId,
              ...(especimenId ? { especimenId } : {}),
            })),
          }),
        })
      );
      setAssignments([...assignments, ...asList<Assignment>(data, "asignaciones")]);
      setPickerType(null);
      onMessage("Asignación de equipos actualizada.");
      await Promise.all([loadCatalog(), loadAssignments()]);
    } catch (error) {
      const conflict = error instanceof Error && "status" in error && error.status === 409;
      onMessage(
        conflict
          ? `La disponibilidad cambió: ${
              error instanceof Error ? error.message : "conflicto de asignación"
            }. Actualiza y selecciona nuevamente.`
          : error instanceof Error
          ? error.message
          : "No se pudo asignar el equipo.",
        true
      );
      if (conflict) {
        await loadCatalog();
        await loadAssignments();
      }
    } finally {
      setSaving(false);
    }
  }

  const grouped = useMemo(
    () =>
      types.map((type) => ({
        type,
        selected: assignments.filter(
          (item) =>
            item.estado !== "DEVUELTA" &&
            item.estado !== "CANCELADA" &&
            (item.equipo?.tipoId || equipment.find((eq) => eq.id === item.equipoId)?.tipoId) ===
              type.id
        ),
      })),
    [types, assignments, equipment]
  );

  if (!sampleId) {
    return (
      <section className="card equipment-capture">
        <h2>4. Equipos utilizados</h2>
        <p className="notice compact">
          Guarda primero la muestra como borrador para seleccionar equipos por código interno.
        </p>
      </section>
    );
  }

  return (
    <section className="card equipment-capture">
      <div className="section-head">
        <div>
          <h2>4. Equipos utilizados</h2>
          <p className="muted">
            Selecciona unidades disponibles. Los moldes se vinculan uno a uno con cada espécimen.
          </p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => void Promise.all([loadCatalog(), loadAssignments()])}
        >
          Actualizar disponibilidad
        </button>
      </div>

      <div className="equipment-cards">
        {grouped.map(({ type, selected }) => (
          <article className="equipment-card" key={type.id}>
            <div>
              <strong>{type.nombre}</strong>
              <small>
                {selected.length} seleccionados
                {type.esMolde && specimens.length ? ` de ${specimens.length}` : ""}
              </small>
            </div>
            <div className="serial-chips">
              {selected.map((assignment) => {
                const item =
                  assignment.equipo || equipment.find((candidate) => candidate.id === assignment.equipoId);
                const specimen = specimenNumber(assignment, specimens);
                return (
                  <span key={assignment.equipoId}>
                    <strong>{assignment.codigoInternoSnapshot || equipmentCode(item)}</strong>
                    {assignment.numeroSerieSnapshot || item?.numeroSerie ? (
                      <small>Serie: {assignment.numeroSerieSnapshot || item?.numeroSerie}</small>
                    ) : null}
                    {type.esMolde && specimen ? ` → espécimen ${specimen}` : ""}
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              className="secondary"
              disabled={disabled}
              onClick={() => openPicker(type)}
            >
              Seleccionar
            </button>
          </article>
        ))}
      </div>

      {pickerType && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setPickerType(null);
          }}
        >
          <section
            className="modal equipment-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="picker-title"
          >
            <div className="section-head">
              <div>
                <h2 id="picker-title">Seleccionar {pickerType.nombre}</h2>
                <p className="muted">
                  {pickerType.esMolde
                    ? `${draft.length} de ${specimens.length} moldes`
                    : `${draft.length} seleccionados`}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setPickerType(null)}
                disabled={saving}
                aria-label="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <label className="field">
              <span>Buscar código interno o serie</span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Escribe o escanea el código interno"
                  style={{ paddingLeft: "36px" }}
                />
                <Search
                  size={16}
                  style={{ position: "absolute", left: "12px", color: "var(--muted)", pointerEvents: "none" }}
                />
              </div>
            </label>

            <div className="picker-list" style={{ maxHeight: "260px", overflowY: "auto" }}>
              {equipment
                .filter(
                  (item) =>
                    item.tipoId === pickerType.id &&
                    `${item.codigoInterno} ${item.numeroSerie || ""}`
                      .toLowerCase()
                      .includes(search.toLowerCase())
                )
                .map((item) => {
                  const chosen = draft.some((assignment) => assignment.equipoId === item.id);
                  const unavailable =
                    item.estado !== "DISPONIBLE" &&
                    !assignments.some((assignment) => assignment.equipoId === item.id);
                  return (
                    <label
                      className={`picker-row ${unavailable ? "unavailable-row" : ""}`}
                      key={item.id}
                      style={{ cursor: unavailable ? "not-allowed" : "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={chosen}
                        disabled={
                          unavailable ||
                          Boolean(pickerType.esMolde && !chosen && draft.length >= specimens.length)
                        }
                        onChange={() => toggle(item)}
                      />
                      <span>
                        <strong>{item.codigoInterno}</strong>
                        <small>
                          {item.numeroSerie ? `Serie: ${item.numeroSerie} · ` : ""}
                          {item.estado.replaceAll("_", " ").toLowerCase()}
                        </small>
                      </span>
                      {item.calibracionVigenteHasta && (
                        <small>Calibración: {item.calibracionVigenteHasta.slice(0, 10)}</small>
                      )}
                    </label>
                  );
                })}
            </div>

            <div className="modal-actions" style={{ justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setPickerType(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => void saveSelection()}
                disabled={
                  saving || Boolean(pickerType.esMolde && draft.length !== specimens.length)
                }
              >
                {saving ? "Guardando…" : "Confirmar selección"}
              </button>
            </div>

            {pickerType.esMolde && specimens.some((item) => !item.id) && (
              <p className="callout" style={{ marginTop: "12px" }}>
                Los especímenes necesitan estar guardados antes de vincular los moldes.
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

export function SampleEquipmentSnapshot({
  sampleId,
  headers,
  onMessage,
}: {
  sampleId: string;
  headers: Props["headers"];
  onMessage: Props["onMessage"];
}) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    void load();
  }, [sampleId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/muestras/${sampleId}/equipos`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se cargaron los equipos.");
      setItems(asList<Assignment>(data, "equipos"));
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "No se cargaron los equipos.", true);
    } finally {
      setLoading(false);
    }
  }

  const activeItems = useMemo(
    () => items.filter((item) => item.estado !== "DEVUELTA" && item.id),
    [items]
  );

  async function executeReturnEquipment(observacion?: string) {
    const activeIds = activeItems.map((item) => item.id as string);
    if (!activeIds.length) return;
    setReturning(true);
    try {
      const sampleResponse = await fetch(`/api/muestras/${sampleId}`);
      const sample = await sampleResponse.json();
      if (!sampleResponse.ok)
        throw new Error(sample.error || "No se pudo verificar la muestra.");

      const response = await fetch(`/api/muestras/${sampleId}/equipos/devolver`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          versionMuestra: Number(sample.version || 0),
          asignacionIds: activeIds,
          estadoFinal: "DISPONIBLE",
          observaciones: observacion,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? `Conflicto: ${data.error || "algún equipo cambió de estado"}.`
            : data.error || "No se pudo registrar la devolución."
        );
      }
      onMessage("Devolución de equipos registrada correctamente.");
      setShowReturnModal(false);
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "No se pudo registrar la devolución.",
        true
      );
    } finally {
      setReturning(false);
    }
  }

  return (
    <section className="snapshot">
      <div className="section-head">
        <h3>Equipos y trazabilidad</h3>
        {activeItems.length > 0 && (
          <button
            type="button"
            className="secondary"
            onClick={() => setShowReturnModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCcw size={16} />
            <span>Registrar devolución ({activeItems.length})</span>
          </button>
        )}
      </div>

      {loading ? (
        <p className="muted">Consultando equipos asignados…</p>
      ) : !items.length ? (
        <p className="muted">No hay equipos asignados a esta muestra.</p>
      ) : (
        <ul className="snapshot-list">
          {items.map((item) => (
            <li key={item.id || item.equipoId}>
              <strong>
                {item.codigoInternoSnapshot || item.equipo?.codigoInterno || item.equipoId}
              </strong>
              <span>
                {item.estadoEquipoSnapshot || item.equipo?.estado || "Estado no disponible"}
              </span>
              {item.numeroSerieSnapshot || item.equipo?.numeroSerie ? (
                <small>
                  Serie del fabricante: {item.numeroSerieSnapshot || item.equipo?.numeroSerie}
                </small>
              ) : null}
              <small>
                Calibración al usar:{" "}
                {item.calibracionVigenteHastaSnapshot?.slice(0, 10) ||
                  item.equipo?.calibracionVigenteHasta?.slice(0, 10) ||
                  "No registrada"}
              </small>
            </li>
          ))}
        </ul>
      )}

      {/* Modal accesible de devolución */}
      <ReturnEquipmentModal
        isOpen={showReturnModal}
        count={activeItems.length}
        isSaving={returning}
        onConfirm={(obs) => void executeReturnEquipment(obs)}
        onCancel={() => setShowReturnModal(false)}
      />
    </section>
  );
}
