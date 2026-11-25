"use client";

import { useMemo, useState } from "react";
import type { EquipmentType } from "./InventoryPanel";

type Mode = "RANGO" | "PEGADO";
type BulkRow = { codigoInterno: string; numeroSerie: string | null; marca?: string; modelo?: string; ubicacion?: string; notas?: string };
type RowError = { fila?: number; row?: number; campo?: string; field?: string; mensaje?: string; message?: string };
type Validation = { valido?: boolean; valid?: boolean; total?: number; errores?: RowError[]; errors?: RowError[]; filas?: BulkRow[]; rows?: BulkRow[]; token?: string; checksum?: string };
type Result = { lote?: { id?: string; cantidadCreada?: number; creadoEn?: string }; equipos?: Array<{ codigoInterno: string; numeroSerie?: string | null }>; cantidadCreada?: number };
type Props = { types: EquipmentType[]; headers: () => Record<string, string>; onClose: () => void; onComplete: (message: string) => Promise<void> | void; onError: (message: string) => void };

const MAX_ROWS = 500;
const defaultCommon = { tipoId: "", marca: "", modelo: "", ubicacion: "", notas: "" };

async function responseData(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "No se pudo completar la carga masiva.");
  return data;
}

function parsePastedRows(value: string): BulkRow[] {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const separator = lines.some((line) => line.includes("\t")) ? "\t" : lines.some((line) => line.includes(";")) ? ";" : ",";
  const split = (line: string) => line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const first = split(lines[0]).map((cell) => cell.toLowerCase().replaceAll(" ", ""));
  const hasHeader = first.some((cell) => ["codigointerno", "codigo", "serie", "numeroserie"].includes(cell));
  const data = hasHeader ? lines.slice(1) : lines;
  return data.map((line) => { const [codigoInterno = "", numeroSerie = ""] = split(line); return { codigoInterno, numeroSerie: numeroSerie || null }; });
}

export default function BulkInventoryWizard({ types, headers, onClose, onComplete, onError }: Props) {
  const [mode, setMode] = useState<Mode>("RANGO");
  const [step, setStep] = useState<"PREPARAR" | "REVISAR" | "RESULTADO">("PREPARAR");
  const [common, setCommon] = useState(defaultCommon);
  const [range, setRange] = useState({ prefix: "", start: 1, quantity: 100, digits: 3 });
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const errors = validation?.errores || validation?.errors || [];
  const valid = Boolean(validation && (validation.valido ?? validation.valid));
  const errorByRow = useMemo(() => new Map(errors.map((error) => [Number(error.fila ?? error.row ?? 0), error.mensaje || error.message || "Dato no válido"])), [errors]);

  function prepareRows() {
    if (!common.tipoId) { onError("Selecciona el tipo de equipo para continuar."); return; }
    let prepared: BulkRow[];
    if (mode === "RANGO") {
      if (!range.prefix.trim()) { onError("Escribe el prefijo del código interno."); return; }
      if (!Number.isInteger(range.quantity) || range.quantity < 1 || range.quantity > MAX_ROWS) { onError(`La cantidad debe estar entre 1 y ${MAX_ROWS}.`); return; }
      prepared = Array.from({ length: range.quantity }, (_, index) => ({ codigoInterno: `${range.prefix.trim()}${String(range.start + index).padStart(range.digits, "0")}`, numeroSerie: null }));
    } else prepared = parsePastedRows(pasted);
    if (!prepared.length || prepared.length > MAX_ROWS) { onError(`Pega entre 1 y ${MAX_ROWS} filas.`); return; }
    prepared = prepared.map((row) => ({ ...row, marca: common.marca || undefined, modelo: common.modelo || undefined, ubicacion: common.ubicacion || undefined, notas: common.notas || undefined }));
    setRows(prepared); setValidation(null); setIdempotencyKey(crypto.randomUUID()); setStep("REVISAR");
  }

  const payload = (idempotencyKey = "preview-only") => ({ idempotencyKey, metodo: mode, tipoId: common.tipoId, items: rows.map((row) => ({ ...row, numeroSerie: row.numeroSerie || null })) });
  async function validate() {
    setBusy(true); setValidation(null);
    try {
      const data = await responseData(await fetch("/api/equipos/cargas/validar", { method: "POST", headers: headers(), body: JSON.stringify(payload()) }));
      const checked = (data.validacion || data) as Validation;
      setValidation(checked);
      const normalized = checked.filas || checked.rows; if (normalized?.length === rows.length) setRows(normalized);
      if (checked.valido ?? checked.valid) onError("");
    } catch (error) { onError(error instanceof Error ? error.message : "No se pudo validar el lote."); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!valid) { onError("Valida el lote sin errores antes de confirmarlo."); return; }
    setBusy(true);
    try {
      const data = await responseData(await fetch("/api/equipos/cargas", { method: "POST", headers: { ...headers(), "x-idempotency-key": idempotencyKey }, body: JSON.stringify(payload(idempotencyKey)) }));
      setResult(data as Result); setStep("RESULTADO");
      await onComplete(`${(data as Result).lote?.cantidadCreada ?? (data as Result).cantidadCreada ?? rows.length} equipos dados de alta correctamente.`);
    } catch (error) { onError(error instanceof Error ? error.message : "No se pudo confirmar el lote."); }
    finally { setBusy(false); }
  }
  function editRow(index: number, patch: Partial<BulkRow>) { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); setValidation(null); setIdempotencyKey(crypto.randomUUID()); }
  async function downloadResult() {
    const id = result?.lote?.id;
    if (!id) { onError("No se encontro el identificador del lote."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/equipos/cargas/${id}/resultado`, { headers: headers() });
      if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error || "No se pudo descargar el resultado.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `carga-inventario-${id}.csv`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) { onError(error instanceof Error ? error.message : "No se pudo descargar el resultado."); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop"><section className="modal bulk-inventory-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-title">
    <div className="section-head"><div><p className="eyebrow">Inventario</p><h2 id="bulk-title">Carga masiva de equipos</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">×</button></div>
    <ol className="bulk-steps" aria-label="Progreso"><li className={step === "PREPARAR" ? "active" : "done"}>1. Preparar</li><li className={step === "REVISAR" ? "active" : step === "RESULTADO" ? "done" : ""}>2. Revisar</li><li className={step === "RESULTADO" ? "active" : ""}>3. Resultado</li></ol>
    {step === "PREPARAR" && <><div className="bulk-mode" role="radiogroup" aria-label="Método de carga"><label><input type="radio" checked={mode === "RANGO"} onChange={() => setMode("RANGO")} /><span><strong>Generar consecutivos</strong><small>Ideal para muchas unidades iguales.</small></span></label><label><input type="radio" checked={mode === "PEGADO"} onChange={() => setMode("PEGADO")} /><span><strong>Pegar desde Excel o CSV</strong><small>Código y serie en dos columnas.</small></span></label></div>
      <div className="grid two"><label className="field"><span>Tipo de equipo *</span><select value={common.tipoId} onChange={(event) => setCommon({ ...common, tipoId: event.target.value })}><option value="">Seleccionar</option>{types.map((type) => <option key={type.id} value={type.id}>{type.nombre}</option>)}</select></label><label className="field"><span>Ubicación común</span><input value={common.ubicacion} onChange={(event) => setCommon({ ...common, ubicacion: event.target.value })} /></label><label className="field"><span>Marca común</span><input value={common.marca} onChange={(event) => setCommon({ ...common, marca: event.target.value })} /></label><label className="field"><span>Modelo común</span><input value={common.modelo} onChange={(event) => setCommon({ ...common, modelo: event.target.value })} /></label></div>
      {mode === "RANGO" ? <div className="grid four bulk-range"><label className="field"><span>Prefijo *</span><input autoFocus value={range.prefix} onChange={(event) => setRange({ ...range, prefix: event.target.value })} placeholder="C15-" /></label><label className="field"><span>Número inicial</span><input type="number" min="0" value={range.start} onChange={(event) => setRange({ ...range, start: Number(event.target.value) })} /></label><label className="field"><span>Cantidad</span><input type="number" min="1" max={MAX_ROWS} value={range.quantity} onChange={(event) => setRange({ ...range, quantity: Number(event.target.value) })} /></label><label className="field"><span>Dígitos</span><input type="number" min="1" max="9" value={range.digits} onChange={(event) => setRange({ ...range, digits: Number(event.target.value) })} /></label><p className="callout bulk-example">Se generarán {range.quantity || 0} códigos; ejemplo: <strong>{range.prefix}{String(range.start).padStart(range.digits, "0")}</strong>.</p></div> : <label className="field"><span>Pegar códigos y series</span><textarea autoFocus rows={10} value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder={"codigoInterno\tnumeroSerie\nC15-001\tSER-001\nC15-002"} /><small>Acepta columnas separadas por tabulador, punto y coma o coma. La serie es opcional.</small></label>}
      <label className="field"><span>Notas comunes</span><textarea rows={2} value={common.notas} onChange={(event) => setCommon({ ...common, notas: event.target.value })} /></label><div className="modal-actions"><button type="button" className="primary" onClick={prepareRows}>Revisar vista previa</button><button type="button" className="secondary" onClick={onClose}>Cancelar</button></div></>}
    {step === "REVISAR" && <><div className="bulk-summary"><strong>{rows.length} unidades preparadas</strong><span>{errors.length ? `${errors.length} con observaciones` : validation ? "Validación completa" : "Pendientes de validar"}</span></div><div className="bulk-preview" tabIndex={0}><table><thead><tr><th>Fila</th><th>Código interno</th><th>Serie del fabricante</th><th>Validación</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className={errorByRow.has(index + 1) ? "row-error" : ""}><td>{index + 1}</td><td><input aria-label={`Código interno fila ${index + 1}`} value={row.codigoInterno} onChange={(event) => editRow(index, { codigoInterno: event.target.value })} /></td><td><input aria-label={`Serie fila ${index + 1}`} value={row.numeroSerie || ""} onChange={(event) => editRow(index, { numeroSerie: event.target.value || null })} /></td><td>{errorByRow.get(index + 1) || (validation ? "Correcto" : "Pendiente")}</td></tr>)}</tbody></table></div><p className="muted">La vista previa no reserva códigos. Ensalia volverá a validarlos al confirmar y no creará ninguna unidad si una fila falla.</p><div className="modal-actions"><button type="button" className="primary" onClick={() => void (valid ? confirm() : validate())} disabled={busy}>{busy ? "Procesando…" : valid ? `Confirmar alta de ${rows.length}` : "Validar lote"}</button><button type="button" className="secondary" onClick={() => { setStep("PREPARAR"); setValidation(null); }} disabled={busy}>Regresar</button><button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancelar</button></div></>}
    {step === "RESULTADO" && <div className="bulk-result"><div className="alert success" role="status"><strong>Carga terminada.</strong><span>{result?.lote?.cantidadCreada ?? result?.cantidadCreada ?? rows.length} equipos fueron creados como disponibles.</span></div><dl className="detail-grid"><div><dt>Identificador del lote</dt><dd>{result?.lote?.id || "Registrado"}</dd></div><div><dt>Unidades creadas</dt><dd>{result?.lote?.cantidadCreada ?? result?.cantidadCreada ?? rows.length}</dd></div></dl><div className="modal-actions"><button type="button" className="primary" onClick={onClose}>Finalizar</button><button type="button" className="secondary" onClick={() => void downloadResult()} disabled={busy}>{busy ? "Descargando…" : "Descargar resultado CSV"}</button></div></div>}
  </section></div>;
}
