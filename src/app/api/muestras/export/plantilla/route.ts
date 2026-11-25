import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, sampleFilters } from "@/lib/api";
import { renderConcreteCaptureTemplateCsv } from "@/lib/templates/capture-template-csv";

export async function GET(request: NextRequest) {
  const where = sampleFilters(new URL(request.url));
  if ("error" in where) return Response.json({ error: where.error }, { status: 400 });
  try {
    const samples = await prisma.muestra.findMany({
      where,
      include: { especimenes: { orderBy: { numero: "asc" } } },
      orderBy: [{ fechaMuestreo: "desc" }, { creadoEn: "desc" }],
    });
    const csv = renderConcreteCaptureTemplateCsv(samples);
    return new Response(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-captura-ensalia.csv"',
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    } });
  } catch (error) { return errorResponse(error); }
}

