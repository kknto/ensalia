"use client";

import { Download, FileSpreadsheet, Search } from "lucide-react";
import { states } from "../types";

interface RecordsFiltersProps {
  query: string;
  setQuery: (v: string) => void;
  stateFilter: string;
  setStateFilter: (v: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  loading: boolean;
  onSearch: () => void;
  onDownload: (template: boolean) => void;
}

export function RecordsFilters({
  query,
  setQuery,
  stateFilter,
  setStateFilter,
  from,
  setFrom,
  to,
  setTo,
  loading,
  onSearch,
  onDownload,
}: RecordsFiltersProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form className="card filters" onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <label className="field">
        <span>Buscar</span>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input
            placeholder="Cliente, obra, muestra, remisión o ubicación"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: "36px" }}
          />
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
        </div>
      </label>

      <label className="field">
        <span>Estado</span>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          {states.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Desde</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>

      <label className="field">
        <span>Hasta</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>

      <div className="filter-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="submit"
          className="primary"
          disabled={loading}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Search size={16} />
          <span>{loading ? "Buscando…" : "Buscar"}</span>
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => onDownload(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <FileSpreadsheet size={16} />
          <span>Exportar plantilla</span>
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => onDownload(false)}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Download size={16} />
          <span>Reporte CSV</span>
        </button>
      </div>
    </form>
  );
}

