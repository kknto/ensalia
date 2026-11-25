"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, Trash2, Upload, X } from "lucide-react";
import { ConfirmDialog } from "@/features/samples/components/ConfirmDialog";

type Resource = { id: string; mimeType: string; tamano: number };
type Props = {
  versionId?: string;
  editable: boolean;
  headers: () => Record<string, string>;
  onMessage: (message: string, error?: boolean) => void;
};

function uploadHeaders(source: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => key.toLowerCase() !== "content-type")
  );
}

export default function LogoEditor({ versionId, editable, headers, onMessage }: Props) {
  const [resource, setResource] = useState<Resource | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const load = useCallback(async () => {
    if (!versionId) {
      setResource(null);
      setPreviewUrl("");
      return;
    }
    const response = await fetch(`/api/config/versiones/${versionId}/recursos`, {
      headers: headers(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(data.error || "No se pudieron cargar los recursos.");
    const logo =
      (Array.isArray(data.recursos) ? data.recursos : []).find((item: Resource) =>
        item.mimeType.startsWith("image/")
      ) || null;
    setResource(logo);
    if (!logo) {
      setPreviewUrl("");
      return;
    }
    const imageResponse = await fetch(`/api/config/recursos/${logo.id}`, {
      headers: headers(),
    });
    if (!imageResponse.ok)
      throw new Error("No se pudo cargar la vista previa del logotipo.");
    const objectUrl = URL.createObjectURL(await imageResponse.blob());
    setPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return objectUrl;
    });
  }, [versionId, headers]);

  useEffect(() => {
    void load().catch((error) =>
      onMessage(
        error instanceof Error ? error.message : "No se pudo cargar el logotipo.",
        true
      )
    );
  }, [load, onMessage]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !versionId) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("archivo", file);
      const response = await fetch(
        `/api/config/versiones/${versionId}/recursos`,
        {
          method: "POST",
          headers: uploadHeaders(headers()),
          body: form,
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "No se pudo guardar el logotipo.");
      onMessage("Logotipo guardado en la versión en borrador.");
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "No se pudo guardar el logotipo.",
        true
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function executeRemove() {
    if (!resource) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/config/recursos/${resource.id}`, {
        method: "DELETE",
        headers: headers(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "No se pudo quitar el logotipo.");
      onMessage("Logotipo retirado de la versión en borrador.");
      setShowConfirmRemove(false);
      await load();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "No se pudo quitar el logotipo.",
        true
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card customization-editor" aria-labelledby="logo-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">Recurso administrado</p>
          <h2 id="logo-title">Logotipo</h2>
          <p className="muted">
            PNG, JPEG o WebP, máximo 2 MB. Sólo puede cambiarse en una versión en borrador.
          </p>
        </div>
      </div>

      {previewUrl ? (
        <div style={{ textAlign: "center", padding: "12px", background: "var(--wash)", borderRadius: "8px", marginBottom: "16px" }}>
          <img
            src={previewUrl}
            alt="Vista previa del logotipo del cliente"
            className="profile-logo-preview"
            style={{ maxHeight: "80px", maxWidth: "100%", objectFit: "contain" }}
          />
        </div>
      ) : (
        <div className="empty compact" style={{ padding: "24px 16px", textAlign: "center" }}>
          <ImageIcon size={32} style={{ margin: "0 auto 8px", color: "var(--muted)", opacity: 0.6 }} />
          <strong>Sin logotipo institucional</strong>
          <span>Ensalia conservará su identidad predeterminada en los reportes.</span>
        </div>
      )}

      <div className="modal-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <label
          className={`secondary file-button ${!editable || busy ? "disabled" : ""}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Upload size={16} />
          <span>Seleccionar imagen</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={upload}
            disabled={!editable || busy || !versionId}
          />
        </label>

        {resource && (
          <button
            type="button"
            className="danger-quiet"
            onClick={() => setShowConfirmRemove(true)}
            disabled={!editable || busy}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Trash2 size={16} />
            <span>Quitar</span>
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmRemove}
        title="Quitar logotipo"
        description="¿Confirmas que deseas retirar el logotipo personalizado de esta versión en borrador?"
        confirmLabel="Quitar logotipo"
        isDestructive={true}
        onConfirm={() => void executeRemove()}
        onCancel={() => setShowConfirmRemove(false)}
      />
    </section>
  );
}
