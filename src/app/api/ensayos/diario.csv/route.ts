import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api";
import { disabledModuleResponse } from "@/lib/config/modules";
import { dailyTestCsv } from "@/lib/ensayos/report";
import { filtersFromUrl, testSchedule } from "@/lib/ensayos/schedule";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const disabled = await disabledModuleResponse("programacionEnsayos"); if (disabled) return disabled;
  const parsed = filtersFromUrl(new URL(request.url), true);
  if (!parsed.success || !parsed.data.fecha) return Response.json({ error: "Indique una fecha valida en formato YYYY-MM-DD." }, { status: 400 });
  try {
    const result = await testSchedule(prisma, parsed.data);
    return new Response(dailyTestCsv({ items: result.items }), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="programa-ensayes-${parsed.data.fecha}.csv"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
