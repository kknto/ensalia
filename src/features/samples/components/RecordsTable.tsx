"use client";

import { FileText, Inbox, ArrowRight } from "lucide-react";
import { Sample, statusLabel } from "../types";

interface RecordsTableProps {
  rows: Sample[];
  loading: boolean;
  onOpen: (row: Sample) => void;
  embedded?: boolean;
}

export function RecordsTable({
  rows,
  loading,
  onOpen,
  embedded = false,
}: RecordsTableProps) {
  const containerClass = embedded ? "table-wrap" : "card table-wrap";

  return (
    <section className={containerClass} aria-busy={loading}>
      {loading ? (
        <TableSkeleton embedded={embedded} />
      ) : rows.length === 0 ? (
        <div className="empty" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Inbox size={40} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.6 }} />
          <strong style={{ display: "block", fontSize: "16px", marginBottom: "4px" }}>
            No hay registros para mostrar
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "14px" }}>
            Prueba ajustando los filtros de búsqueda o captura una nueva muestra.
          </span>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">ID muestra</th>
              <th scope="col">Cliente / obra</th>
              <th scope="col">Estado</th>
              <th scope="col">Recolección</th>
              <th scope="col">
                <span className="sr-only">Acción</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id || row.idMuestra)}>
                <td>
                  {new Intl.DateTimeFormat("es-MX", { timeZone: "UTC" }).format(
                    new Date(row.fechaMuestreo)
                  )}
                </td>
                <td>
                  <strong>{String(row.idMuestra)}</strong>
                  <small style={{ display: "block", color: "var(--muted)", fontSize: "12px" }}>
                    {row.noMuestra}
                  </small>
                </td>
                <td>
                  <span>{row.cliente}</span>
                  <small style={{ display: "block", color: "var(--muted)", fontSize: "12px" }}>
                    {row.obra}
                  </small>
                </td>
                <td>
                  <span className={`status ${String(row.estatusBitacora || "").toLowerCase()}`}>
                    {statusLabel(row.estatusBitacora)}
                  </span>
                </td>
                <td>
                  <span style={{ textTransform: "capitalize" }}>
                    {String(row.estatusRecoleccion || "").replaceAll("_", " ").toLowerCase()}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onOpen(row)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 600,
                    }}
                  >
                    <span>Abrir</span>
                    <ArrowRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function TableSkeleton({ embedded }: { embedded: boolean }) {
  const rows = embedded ? [1, 2, 3] : [1, 2, 3, 4, 5];
  return (
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>ID muestra</th>
          <th>Cliente / obra</th>
          <th>Estado</th>
          <th>Recolección</th>
          <th><span className="sr-only">Acción</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((i) => (
          <tr key={i} className="skeleton-row" style={{ opacity: 0.7 }}>
            <td>
              <div className="skeleton-block" style={{ width: "80px", height: "16px", borderRadius: "4px", background: "var(--line)" }} />
            </td>
            <td>
              <div className="skeleton-block" style={{ width: "110px", height: "16px", borderRadius: "4px", background: "var(--line)", marginBottom: "4px" }} />
              <div className="skeleton-block" style={{ width: "60px", height: "12px", borderRadius: "4px", background: "var(--line)", opacity: 0.6 }} />
            </td>
            <td>
              <div className="skeleton-block" style={{ width: "140px", height: "16px", borderRadius: "4px", background: "var(--line)", marginBottom: "4px" }} />
              <div className="skeleton-block" style={{ width: "90px", height: "12px", borderRadius: "4px", background: "var(--line)", opacity: 0.6 }} />
            </td>
            <td>
              <div className="skeleton-block" style={{ width: "70px", height: "22px", borderRadius: "999px", background: "var(--line)" }} />
            </td>
            <td>
              <div className="skeleton-block" style={{ width: "85px", height: "16px", borderRadius: "4px", background: "var(--line)" }} />
            </td>
            <td style={{ textAlign: "right" }}>
              <div className="skeleton-block" style={{ width: "45px", height: "16px", borderRadius: "4px", background: "var(--line)", marginLeft: "auto" }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

