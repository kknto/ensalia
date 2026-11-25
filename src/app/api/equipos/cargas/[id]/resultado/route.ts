import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };
const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const row = await prisma.cargaInventario.findUnique({ where: { id }, include: { tipo: true, operador: true, equipos: { orderBy: { codigoInterno: "asc" } } } });
    if (!row) return Response.json({ error: "Carga no encontrada." }, { status: 404 });
    const lines = [
      ["Codigo interno", "Serie del fabricante", "Tipo", "Ubicacion", "Estado", "Lote", "Operador", "Fecha"].map(quote).join(","),
      ...row.equipos.map((item) => [item.codigoInterno, item.numeroSerie, row.tipo.nombre, item.ubicacion, item.estado, row.id, row.operador.nombre, row.creadoEn.toISOString()].map(quote).join(",")),
    ];
    return new Response("\uFEFF" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="carga-inventario-${row.id}.csv"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
