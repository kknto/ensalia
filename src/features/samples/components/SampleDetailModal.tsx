"use client";

import { useEffect, useMemo } from "react";
import { Check, Edit3, Lock, Trash2, X } from "lucide-react";
import { Sample, statusLabel } from "../types";
import { SampleEquipmentSnapshot } from "@/components/EquipmentAssignment";
import FieldSheetPanel from "@/components/FieldSheetPanel";
import { OpenStreetMap } from "@/components/common/OpenStreetMap";

interface SampleDetailModalProps {
  sample: Sample;
  saving: boolean;
  headers: () => Record<string, string>;
  onMessage: (message: string, error?: boolean) => void;
  onClose: () => void;
  onEdit: (sample: Sample) => void;
  onRequestTransition: (action: "revisar" | "cerrar" | "anular") => void;
}

export function SampleDetailModal({
  sample,
  saving,
  headers,
  onMessage,
  onClose,
  onEdit,
  onRequestTransition,
}: SampleDetailModalProps) {
  const status = sample.estatusBitacora;

  const coords = useMemo(() => {
    if (typeof sample.latitud === "number" && typeof sample.longitud === "number") {
      return {
        lat: sample.latitud,
        lng: sample.longitud,
        acc: sample.precisionM,
      };
    }
    if (sample.coordenadasColado) {
      const match = sample.coordenadasColado.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (match) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), acc: undefined };
      }
    }
    return null;
  }, [sample]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="modal sample-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="section-head">
          <div>
            <p className="eyebrow">Detalle de muestra</p>
            <h2 id="detail-title">{sample.idMuestra}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar detalle"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <span className={`status ${String(status || "").toLowerCase()}`}>
            {statusLabel(status)}
          </span>
        </div>

        <dl className="detail-grid">
          <div>
            <dt>Fecha de muestreo</dt>
            <dd>{String(sample.fechaMuestreo).slice(0, 10)}</dd>
          </div>
          <div>
            <dt>No. muestra</dt>
            <dd>{sample.noMuestra}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{sample.cliente}</dd>
          </div>
          <div>
            <dt>Obra</dt>
            <dd>{sample.obra}</dd>
          </div>
          <div>
            <dt>Tipo de concreto</dt>
            <dd>{sample.tipoConcreto}</dd>
          </div>
          <div>
            <dt>Especímenes</dt>
            <dd>{sample.especimenes?.length || 0}</dd>
          </div>
        </dl>

        {sample.id && (
          <SampleEquipmentSnapshot
            sampleId={sample.id}
            headers={headers}
            onMessage={onMessage}
          />
        )}

        {coords && (
          <div style={{ margin: "16px 0" }}>
            <OpenStreetMap
              latitude={coords.lat}
              longitude={coords.lng}
              accuracyMeters={coords.acc}
              title={`Ubicación de Muestreo: ${sample.obra || sample.idMuestra}`}
            />
          </div>
        )}

        {sample.id && (
          <FieldSheetPanel
            sampleId={sample.id}
            sampleVersion={Number(sample.version || 0)}
            headers={headers}
            onMessage={onMessage}
          />
        )}

        <div className="modal-actions" style={{ marginTop: "24px" }}>
          {(status === "BORRADOR" || status === "REVISADA") && (
            <button
              type="button"
              className="secondary"
              onClick={() => onEdit(sample)}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Edit3 size={16} />
              <span>Editar</span>
            </button>
          )}

          {status === "BORRADOR" && (
            <button
              type="button"
              className="primary"
              onClick={() => onRequestTransition("revisar")}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Check size={16} />
              <span>{saving ? "Procesando…" : "Marcar revisada"}</span>
            </button>
          )}

          {status === "REVISADA" && (
            <button
              type="button"
              className="primary"
              onClick={() => onRequestTransition("cerrar")}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Lock size={16} />
              <span>{saving ? "Cerrando…" : "Cerrar muestra"}</span>
            </button>
          )}

          {(status === "BORRADOR" || status === "REVISADA") && (
            <button
              type="button"
              className="danger"
              onClick={() => onRequestTransition("anular")}
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Trash2 size={16} />
              <span>Anular</span>
            </button>
          )}
        </div>

        {status === "REVISADA" && (
          <p className="callout" style={{ marginTop: "16px" }}>
            Si editas esta muestra, volverá a borrador y necesitará una nueva revisión técnica.
          </p>
        )}
      </section>
    </div>
  );
}

