import { PRODUCT_IDENTITY } from "@/lib/product/identity";
import { ClientIdentity } from "./types";

export default function ProfilePreview({ identity }: { identity: ClientIdentity }) {
  const name = PRODUCT_IDENTITY.name;
  const customer = identity.nombreComercial.trim() || "Nombre del cliente";
  return <section className="card preview-card" aria-labelledby="preview-title">
    <div className="section-head"><div><p className="eyebrow">Vista previa</p><h2 id="preview-title">Así verá el cliente su instalación</h2></div><span className="status borrador">No publicada</span></div>
    <div className="brand-preview" style={{ "--preview-primary": identity.colorPrimario, "--preview-secondary": identity.colorSecundario } as React.CSSProperties}>
      <aside><div className="preview-brand"><span aria-hidden="true">{customer.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{customer}</small></div></div><div className="preview-nav active">Inicio</div><div className="preview-nav">Muestras</div><div className="preview-nav">Inventario</div></aside>
      <div className="preview-content"><small>{PRODUCT_IDENTITY.name} · {PRODUCT_IDENTITY.mode}</small><h3>Resumen de operación</h3><div className="preview-metrics"><span>12<small>Muestras</small></span><span>4<small>Pendientes</small></span></div>{identity.leyendaDocumental && <p>{identity.leyendaDocumental}</p>}</div>
    </div>
    <p className="preview-attribution">Tecnología <strong>{PRODUCT_IDENTITY.name}</strong>. La personalización no altera la trazabilidad ni los datos históricos.</p>
  </section>;
}

