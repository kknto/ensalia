import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { errorResponse } from "@/lib/api";
import { getOperator, unauthorized } from "@/lib/auth";
import { disabledModuleResponse } from "@/lib/config/modules";
import { profileConfigurationSchema } from "@/lib/config/schema";
import { resolveManagedProfileAsset } from "@/lib/config/resources";
import { renderDailyTestPdf } from "@/lib/ensayos/report";
import { filtersFromUrl, testSchedule } from "@/lib/ensayos/schedule";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("programacionEnsayos"); if (disabled) return disabled;
  const parsed = filtersFromUrl(new URL(request.url), true);
  if (!parsed.success || !parsed.data.fecha) return Response.json({ error: "Indique una fecha valida en formato YYYY-MM-DD." }, { status: 400 });
  try {
    const [result, active] = await Promise.all([
      testSchedule(prisma, parsed.data),
      prisma.perfilCliente.findFirst({ where: { activo: true, versionPublicadaId: { not: null } }, include: { versionPublicada: { include: { recursos: { where: { tipo: "LOGO" }, take: 1 } } } }, orderBy: { actualizadoEn: "desc" } }),
    ]);
    const configuration = active?.versionPublicada ? profileConfigurationSchema.safeParse(active.versionPublicada.configuracionJson) : null;
    const identidad = configuration?.success ? configuration.data.identidad : { nombreComercial: "Ensalia", razonSocial: "", contacto: "", domicilio: "", leyendaDocumental: "" };
    const documento = configuration?.success ? configuration.data.documentos.programaEnsayos : { titulo: "Programa diario de retiro y ensaye", codigo: "FO-LAB-PE", revision: "00", firmas: ["Preparo", "Tecnico responsable", "Reviso"], mostrarCamposManuales: true };
    const resource = active?.versionPublicada?.recursos[0];
    const logo = resource && ["image/png", "image/jpeg"].includes(resource.mimeType)
      ? { bytes: new Uint8Array(await readFile(resolveManagedProfileAsset(resource.rutaRelativa))), mimeType: resource.mimeType }
      : null;
    const folio = `PE-${parsed.data.fecha.replaceAll("-", "")}-${Date.now().toString(36).toUpperCase()}`;
    const bytes = await renderDailyTestPdf({ fecha: parsed.data.fecha, items: result.items, operador: operator.nombre, generadoEn: new Date(), folio, identidad, documento, logo });
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="programa-ensayes-${parsed.data.fecha}.pdf"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
