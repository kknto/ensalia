import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, sampleFilters } from "@/lib/api";
import { profileConfigurationSchema } from "@/lib/config/schema";
import { EXPORTABLE_SAMPLE_COLUMNS, type ExportableColumn } from "@/lib/config/operational";

const quote = (value: unknown) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export async function GET(request: NextRequest) {
  const where = sampleFilters(new URL(request.url));
  if ("error" in where) return Response.json({ error: where.error }, { status: 400 });
  try {
    const active = await prisma.perfilCliente.findFirst({ where: { activo: true, versionPublicadaId: { not: null } }, include: { versionPublicada: true }, orderBy: { actualizadoEn: "desc" } });
    if (!active?.versionPublicada) return Response.json({ error: "No existe un perfil activo publicado." }, { status: 409 });
    const configuration = profileConfigurationSchema.parse(active.versionPublicada!.configuracionJson);
    if (!configuration.modulos.reportes) return Response.json({ error: "El modulo de reportes esta deshabilitado." }, { status: 403 });
    const requestedKey = new URL(request.url).searchParams.get("perfil")?.toUpperCase() || "OPERACION";
    const exportProfile = configuration.exportaciones.find((item) => item.activo && item.clave.toUpperCase() === requestedKey);
    if (!exportProfile) return Response.json({ error: "Perfil de exportacion no encontrado o inactivo." }, { status: 404 });
    const columns = exportProfile.columnas.filter((column): column is ExportableColumn => column in EXPORTABLE_SAMPLE_COLUMNS);
    if (!columns.length) return Response.json({ error: "El perfil no contiene columnas exportables." }, { status: 409 });
    const rows = await prisma.muestra.findMany({ where, include: { especimenes: { orderBy: { numero: "asc" } }, asignacionesEquipo: { include: { especimen: true }, orderBy: { asignadoEn: "asc" } } }, orderBy: { fechaMuestreo: "desc" } });
    const value = (row: typeof rows[number], column: ExportableColumn): unknown => {
      if (column === "especimenes") return row.especimenes.map((item) => `${item.numero}:${item.tipo}:${item.edadDias ?? ""}`).join(" | ");
      if (column === "equipos") return row.asignacionesEquipo.map((item) => `${item.tipoNombreSnapshot}:${item.codigoInternoSnapshot}${item.numeroSerieSnapshot ? `:serie-${item.numeroSerieSnapshot}` : ""}:${item.estado}${item.especimen ? `:esp-${item.especimen.numero}` : ""}`).join(" | ");
      const raw = row[column as keyof typeof row];
      return raw instanceof Date ? raw.toISOString() : raw;
    };
    const lines = [columns.map((column) => quote(EXPORTABLE_SAMPLE_COLUMNS[column])).join(","), ...rows.map((row) => columns.map((column) => quote(value(row, column))).join(","))];
    return new Response("\uFEFF" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${requestedKey.toLowerCase()}-ensalia.csv"`, "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return errorResponse(error); }
}
