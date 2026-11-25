import { ClientIdentity } from "./types";

type Props = {
  value: ClientIdentity;
  disabled?: boolean;
  onChange: (value: ClientIdentity) => void;
};

export default function IdentityEditor({ value, disabled, onChange }: Props) {
  const update = (key: keyof ClientIdentity, next: string) => onChange({ ...value, [key]: next });
  return <section className="card customization-editor" aria-labelledby="identity-title">
    <div className="section-head"><div><p className="eyebrow">Identidad del cliente</p><h2 id="identity-title">Marca y datos visibles</h2><p className="muted">Personaliza la instalación sin cambiar el núcleo de Ensalia.</p></div></div>
    <fieldset disabled={disabled}><div className="grid two">
      <label className="field"><span>Nombre comercial *</span><input value={value.nombreComercial} onChange={(e) => update("nombreComercial", e.target.value)} required /></label>
      <label className="field"><span>Razón social</span><input value={value.razonSocial} onChange={(e) => update("razonSocial", e.target.value)} /></label>
      <label className="field"><span>Contacto</span><input value={value.contacto} onChange={(e) => update("contacto", e.target.value)} /></label>
      <label className="field"><span>Color principal</span><span className="color-control"><input type="color" value={value.colorPrimario} onChange={(e) => update("colorPrimario", e.target.value)} /><input value={value.colorPrimario} onChange={(e) => update("colorPrimario", e.target.value)} pattern="#[0-9a-fA-F]{6}" aria-label="Código hexadecimal del color principal" /></span></label>
      <label className="field"><span>Color secundario</span><span className="color-control"><input type="color" value={value.colorSecundario} onChange={(e) => update("colorSecundario", e.target.value)} /><input value={value.colorSecundario} onChange={(e) => update("colorSecundario", e.target.value)} pattern="#[0-9a-fA-F]{6}" aria-label="Código hexadecimal del color secundario" /></span></label>
      <label className="field full"><span>Domicilio</span><textarea rows={2} value={value.domicilio} onChange={(e) => update("domicilio", e.target.value)} /></label>
      <label className="field full"><span>Leyenda para documentos</span><textarea rows={3} value={value.leyendaDocumental} onChange={(e) => update("leyendaDocumental", e.target.value)} /></label>
    </div></fieldset>
  </section>;
}

