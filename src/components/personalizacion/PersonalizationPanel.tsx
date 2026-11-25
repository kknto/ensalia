"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, FileCheck, Palette, Plus, Save, Send } from "lucide-react";
import CatalogEditor from "./CatalogEditor";
import ConfigurationEditor from "./ConfigurationEditor";
import IdentityEditor from "./IdentityEditor";
import LogoEditor from "./LogoEditor";
import ProfilePreview from "./ProfilePreview";
import { NewProfileModal } from "./NewProfileModal";
import { ConfirmDialog } from "@/features/samples/components/ConfirmDialog";
import { DEFAULT_PROFILE_CONFIGURATION } from "@/lib/config/defaults";
import type { ProfileConfiguration } from "@/lib/config/schema";
import { CustomizationProfile, ProfileVersion } from "./types";

type Props = {
  headers: () => Record<string, string>;
  onMessage: (message: string, error?: boolean) => void;
};

function profileKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export default function PersonalizationPanel({ headers, onMessage }: Props) {
  const [profiles, setProfiles] = useState<CustomizationProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [baseVersion, setBaseVersion] = useState<ProfileVersion | null>(null);
  const [configuration, setConfiguration] = useState<ProfileConfiguration>(
    DEFAULT_PROFILE_CONFIGURATION
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modales accesibles
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);

  const selected = useMemo(
    () => profiles.find((item) => item.id === selectedId) || profiles[0] || null,
    [profiles, selectedId]
  );
  const latest = useMemo(
    () => (selected?.versiones ? selected.versiones[0] || null : null),
    [selected]
  );

  const headersRef = useRef(headers);
  headersRef.current = headers;
  const messageRef = useRef(onMessage);
  messageRef.current = onMessage;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/config/perfiles", {
        headers: headersRef.current(),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(
          data?.error || "No se pudieron cargar los perfiles de personalización."
        );
      }
      setProfiles(data);
      setSelectedId((current) => current || data[0]?.id || "");
    } catch (reason) {
      messageRef.current(
        reason instanceof Error
          ? reason.message
          : "No se pudieron cargar los perfiles.",
        true
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected) {
      const version = selected.versiones?.[0] || null;
      const stored = version?.configuracionJson;
      setBaseVersion(version);
      setConfiguration(
        stored
          ? {
              ...DEFAULT_PROFILE_CONFIGURATION,
              ...stored,
              identidad: {
                ...DEFAULT_PROFILE_CONFIGURATION.identidad,
                ...stored.identidad,
              },
              modulos: {
                ...DEFAULT_PROFILE_CONFIGURATION.modulos,
                ...stored.modulos,
              },
              formulario: {
                campos: {
                  ...DEFAULT_PROFILE_CONFIGURATION.formulario.campos,
                  ...stored.formulario?.campos,
                },
              },
              operacion: {
                ...DEFAULT_PROFILE_CONFIGURATION.operacion,
                ...stored.operacion,
                unidades: {
                  ...DEFAULT_PROFILE_CONFIGURATION.operacion.unidades,
                  ...stored.operacion?.unidades,
                },
              },
              reglas: {
                ...DEFAULT_PROFILE_CONFIGURATION.reglas,
                ...stored.reglas,
              },
              exportaciones:
                stored.exportaciones ||
                DEFAULT_PROFILE_CONFIGURATION.exportaciones,
            }
          : DEFAULT_PROFILE_CONFIGURATION
      );
    }
  }, [selected]);

  async function request(url: string, init: RequestInit, fallback: string) {
    const response = await fetch(url, { ...init, headers: headers() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || fallback);
    return data;
  }

  async function executeCreateProfile(name: string) {
    setSaving(true);
    try {
      const data = await request(
        "/api/config/perfiles",
        {
          method: "POST",
          body: JSON.stringify({
            clave: profileKey(name),
            nombreInterno: name.trim(),
          }),
        },
        "No se pudo crear el perfil."
      );
      onMessage("Perfil creado con su primera versión en borrador.");
      setShowNewProfile(false);
      await load();
      if (data.id) setSelectedId(String(data.id));
    } catch (reason) {
      onMessage(
        reason instanceof Error ? reason.message : "No se pudo crear el perfil.",
        true
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveVersion() {
    if (!selected || !configuration.identidad.nombreComercial.trim()) {
      onMessage("Completa el nombre comercial del cliente.", true);
      return;
    }
    setSaving(true);
    try {
      await request(
        `/api/config/perfiles/${selected.id}/versiones`,
        {
          method: "POST",
          body: JSON.stringify({
            configuracion: configuration,
            basadaEnId: baseVersion?.id || null,
            notas: "Cambios desde el editor de identidad",
          }),
        },
        "No se pudo crear la versión."
      );
      onMessage("Nueva versión guardada como borrador.");
      await load();
    } catch (reason) {
      onMessage(
        reason instanceof Error
          ? reason.message
          : "No se pudo guardar la versión.",
        true
      );
    } finally {
      setSaving(false);
    }
  }

  async function validateVersion() {
    if (!latest) return;
    setSaving(true);
    try {
      await request(
        `/api/config/versiones/${latest.id}/validar`,
        { method: "POST", body: "{}" },
        "La versión no superó la validación."
      );
      onMessage("Versión validada y lista para publicar.");
      await load();
    } catch (reason) {
      onMessage(
        reason instanceof Error ? reason.message : "No se pudo validar.",
        true
      );
    } finally {
      setSaving(false);
    }
  }

  async function executePublishVersion() {
    if (!latest) return;
    setSaving(true);
    try {
      await request(
        `/api/config/versiones/${latest.id}/publicar`,
        { method: "POST", body: "{}" },
        "No se pudo publicar la versión."
      );
      onMessage("Perfil publicado correctamente.");
      setShowConfirmPublish(false);
      await load();
    } catch (reason) {
      onMessage(
        reason instanceof Error ? reason.message : "No se pudo publicar.",
        true
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="customization-layout">
      <section className="card customization-toolbar">
        <div>
          <p className="eyebrow">Configuración por cliente</p>
          <h2>Perfiles de personalización</h2>
          <p className="muted">
            Crea una versión, valídala y publícala sin modificar el núcleo de Ensalia.
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => setShowNewProfile(true)}
          disabled={saving}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={16} />
          <span>Nuevo perfil</span>
        </button>
      </section>

      {loading ? (
        <section className="card empty" aria-busy="true" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Palette size={36} style={{ margin: "0 auto 8px", color: "var(--muted)", opacity: 0.6 }} />
          <strong>Cargando perfiles…</strong>
        </section>
      ) : profiles.length === 0 ? (
        <section className="card empty" style={{ padding: "48px 24px", textAlign: "center" }}>
          <Palette size={40} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.6 }} />
          <strong style={{ display: "block", fontSize: "16px", marginBottom: "4px" }}>
            Aún no hay perfiles registrados
          </strong>
          <span style={{ color: "var(--muted)", fontSize: "14px", display: "block", marginBottom: "16px" }}>
            Crea el primero para adaptar esta instalación a un cliente específico.
          </span>
          <button
            type="button"
            className="primary"
            onClick={() => setShowNewProfile(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} />
            <span>Crear perfil</span>
          </button>
        </section>
      ) : (
        <>
          <section className="card profile-status">
            <label className="field">
              <span>Perfil seleccionado</span>
              <select
                value={selected?.id || ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.nombreInterno} · {profile.clave}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className={`status ${(latest?.estado || "BORRADOR").toLowerCase()}`}>
                {(latest?.estado || "BORRADOR").toLowerCase()}
              </span>
              <small style={{ display: "block", marginTop: "4px" }}>
                {selected?.esPlantillaSistema
                  ? "Plantilla protegida"
                  : `Última versión: ${latest?.numeroVersion || 1}`}
              </small>
            </div>
          </section>

          <div className="customization-columns">
            <IdentityEditor
              value={configuration.identidad}
              onChange={(identidad) =>
                setConfiguration({ ...configuration, identidad })
              }
              disabled={selected?.esPlantillaSistema || saving}
            />
            <ProfilePreview identity={configuration.identidad} />
            <LogoEditor
              versionId={latest?.id}
              editable={
                latest?.estado === "BORRADOR" &&
                !selected?.esPlantillaSistema &&
                !saving
              }
              headers={headers}
              onMessage={onMessage}
            />
          </div>

          <ConfigurationEditor
            value={configuration}
            onChange={setConfiguration}
            disabled={selected?.esPlantillaSistema || saving}
            formFieldsLocked
          />

          {selected && (
            <CatalogEditor
              profileId={selected.id}
              headers={headers}
              onMessage={onMessage}
              disabled={selected.esPlantillaSistema || saving}
            />
          )}

          <div className="sticky-actions">
            <button
              className="primary"
              onClick={saveVersion}
              disabled={saving || selected?.esPlantillaSistema}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Save size={16} />
              <span>{saving ? "Procesando…" : "Guardar nueva versión"}</span>
            </button>

            {latest?.estado === "BORRADOR" && (
              <button
                className="secondary"
                onClick={validateVersion}
                disabled={saving || selected?.esPlantillaSistema}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <CheckCircle2 size={16} />
                <span>Validar versión {latest.numeroVersion}</span>
              </button>
            )}

            {latest?.estado === "VALIDADA" && (
              <button
                className="secondary"
                onClick={() => setShowConfirmPublish(true)}
                disabled={saving || selected?.esPlantillaSistema}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Send size={16} />
                <span>Publicar versión {latest.numeroVersion}</span>
              </button>
            )}

            <span className="action-help">
              La publicación registra auditoría de trazabilidad; el respaldo se ejecuta en el servicio local.
            </span>
          </div>
        </>
      )}

      {/* Modal para crear nuevo perfil sin window.prompt */}
      <NewProfileModal
        isOpen={showNewProfile}
        isSaving={saving}
        onConfirm={(name) => void executeCreateProfile(name)}
        onCancel={() => setShowNewProfile(false)}
      />

      {/* Diálogo accesible para confirmar publicación */}
      <ConfirmDialog
        isOpen={showConfirmPublish}
        title="Publicar versión de perfil"
        description={`¿Deseas publicar la versión ${latest?.numeroVersion} del perfil "${selected?.nombreInterno}"? Esta versión pasará a ser la configuración activa para las nuevas hojas y reportes.`}
        confirmLabel="Publicar versión"
        isDestructive={false}
        onConfirm={() => void executePublishVersion()}
        onCancel={() => setShowConfirmPublish(false)}
      />
    </div>
  );
}
