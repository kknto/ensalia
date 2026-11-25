"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  Download,
  FileCheck,
  FileText,
  Printer,
  Trash2,
  Upload,
} from "lucide-react";
import { FieldSheetReasonModal } from "./FieldSheetReasonModal";

type Emission = {
  id: string;
  numeroControl: string;
  revision: number;
  estado: "EMITIDA" | "SUSTITUIDA" | "ANULADA";
  emitidaEn: string;
  pdfSha256: string;
  tamanoPdf: number;
};

type Props = {
  sampleId: string;
  sampleVersion: number;
  headers: () => Record<string, string>;
  onMessage: (message: string, error?: boolean) => void;
};

async function fail(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(body.error || "No fue posible completar la operación.");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export default function FieldSheetPanel({
  sampleId,
  sampleVersion,
  headers,
  onMessage,
}: Props) {
  const [rows, setRows] = useState<Emission[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal accesible para motivos
  const [reasonModal, setReasonModal] = useState<{
    isOpen: boolean;
    type: "sustituir" | "anular" | null;
    targetRow?: Emission;
  }>({
    isOpen: false,
    type: null,
  });

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/muestras/${sampleId}/hoja-campo/emisiones`,
        { headers: headers() }
      );
      if (!response.ok) await fail(response);
      setRows((await response.json()) as Emission[]);
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron consultar las hojas.",
        true
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [sampleId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleIssueClick() {
    const active = rows.find((row) => row.estado === "EMITIDA");
    if (active) {
      setReasonModal({
        isOpen: true,
        type: "sustituir",
        targetRow: active,
      });
      return;
    }
    void executeIssue();
  }

  async function executeIssue(reason?: string) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/muestras/${sampleId}/hoja-campo/emisiones`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            versionMuestra: sampleVersion,
            ...(reason ? { motivoSustitucion: reason.trim() } : {}),
          }),
        }
      );
      if (!response.ok) await fail(response);
      const created = (await response.json()) as Emission;
      onMessage(`Hoja ${created.numeroControl} emitida y protegida como evidencia.`);
      setReasonModal({ isOpen: false, type: null });
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "No se pudo emitir la hoja.",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  async function download(row: Emission, controlledCopy = false) {
    setBusy(true);
    try {
      const response = controlledCopy
        ? await fetch(`/api/hojas-campo/${row.id}/reimprimir`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({
              copiaControlada: true,
              motivo: "Copia solicitada desde el expediente",
            }),
          })
        : await fetch(`/api/hojas-campo/${row.id}/pdf`, { headers: headers() });
      if (!response.ok) await fail(response);
      saveBlob(
        await response.blob(),
        `${row.numeroControl}${controlledCopy ? "-copia-controlada" : ""}.pdf`
      );
      onMessage(
        controlledCopy
          ? "Copia controlada generada y registrada."
          : "PDF original descargado."
      );
      if (controlledCopy) await load();
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "No se pudo descargar el documento.",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  function handleCancelClick(row: Emission) {
    setReasonModal({
      isOpen: true,
      type: "anular",
      targetRow: row,
    });
  }

  async function executeCancel(motivo: string) {
    if (!reasonModal.targetRow) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/hojas-campo/${reasonModal.targetRow.id}/anular`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ motivo: motivo.trim() }),
        }
      );
      if (!response.ok) await fail(response);
      onMessage(
        `Hoja ${reasonModal.targetRow.numeroControl} anulada sin eliminar su evidencia.`
      );
      setReasonModal({ isOpen: false, type: null });
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "No se pudo anular la hoja.",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  async function inspectScan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const active = rows.find((row) => row.estado === "EMITIDA");
    if (!active) {
      onMessage(
        "Emite primero una hoja vigente para vincular y conservar el escaneo.",
        true
      );
      return;
    }

    const data = new FormData();
    data.set("archivo", file);
    data.set("muestraId", sampleId);
    data.set("emisionId", active.id);

    const uploadHeaders = headers();
    delete uploadHeaders["Content-Type"];

    setBusy(true);
    try {
      const response = await fetch("/api/digitalizacion/analizar", {
        method: "POST",
        headers: uploadHeaders,
        body: data,
      });
      if (!response.ok) await fail(response);
      const result = (await response.json()) as {
        quality?: { verdict?: string; issues?: unknown[] };
        warning?: string;
      };
      onMessage(
        `Escaneo conservado: ${result.quality?.verdict || "pendiente"}, ${
          result.quality?.issues?.length || 0
        } observaciones. ${result.warning || ""}`
      );
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error
          ? error.message
          : "No se pudo conservar el escaneo.",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card field-sheet-panel">
      <div className="section-head">
        <div>
          <h3>Hoja de campo controlada</h3>
          <p className="muted">
            Conserva la información técnica y los códigos QR exactos del momento de emisión.
          </p>
        </div>
        <button
          type="button"
          className="primary"
          onClick={handleIssueClick}
          disabled={busy || loading}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <FileText size={16} />
          <span>Emitir PDF</span>
        </button>
      </div>

      {loading ? (
        <p className="muted">Consultando historial de emisiones…</p>
      ) : rows.length === 0 ? (
        <p className="empty">Todavía no se ha emitido una hoja de campo para esta muestra.</p>
      ) : (
        <div className="document-list">
          {rows.map((row) => (
            <article className="document-row" key={row.id}>
              <div>
                <strong>{row.numeroControl}</strong>
                <small>
                  Revisión {row.revision} ·{" "}
                  {new Date(row.emitidaEn).toLocaleString("es-MX")} ·{" "}
                  {Math.ceil(row.tamanoPdf / 1024)} KB
                </small>
                <small className="hash">SHA-256 {row.pdfSha256.slice(0, 16)}…</small>
              </div>

              <span className={`status ${row.estado.toLowerCase()}`}>
                {row.estado.toLowerCase()}
              </span>

              <div className="document-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void download(row)}
                  disabled={busy}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Download size={14} />
                  <span>Descargar</span>
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void download(row, true)}
                  disabled={busy}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Printer size={14} />
                  <span>Copia controlada</span>
                </button>
                {row.estado === "EMITIDA" && (
                  <button
                    type="button"
                    className="danger-quiet"
                    onClick={() => handleCancelClick(row)}
                    disabled={busy}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Trash2 size={14} />
                    <span>Anular</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="scan-action" style={{ marginTop: "20px" }}>
        <div>
          <strong>Digitalización asistida</strong>
          <p className="muted">
            Conserva el original escaneado e inspecciona su calidad de captura.
          </p>
        </div>
        <label
          className="secondary upload-button"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Upload size={16} />
          <span>Cargar escaneo</span>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={inspectScan}
            disabled={busy || !rows.some((row) => row.estado === "EMITIDA")}
          />
        </label>
      </div>

      {/* Modal accesible de motivo de sustitución / anulación */}
      <FieldSheetReasonModal
        isOpen={reasonModal.isOpen}
        actionType={reasonModal.type}
        controlNumber={reasonModal.targetRow?.numeroControl}
        isSaving={busy}
        onConfirm={(motivo) => {
          if (reasonModal.type === "sustituir") {
            void executeIssue(motivo);
          } else {
            void executeCancel(motivo);
          }
        }}
        onCancel={() => setReasonModal({ isOpen: false, type: null })}
      />
    </section>
  );
}
