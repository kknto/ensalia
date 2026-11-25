import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api";
import { disabledModuleResponse } from "@/lib/config/modules";
import { filtersFromUrl, testSchedule } from "@/lib/ensayos/schedule";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const disabled = await disabledModuleResponse("programacionEnsayos"); if (disabled) return disabled;
  const parsed = filtersFromUrl(new URL(request.url), true);
  if (!parsed.success || !parsed.data.fecha) return Response.json({ error: "Indique una fecha valida en formato YYYY-MM-DD." }, { status: 400 });
  try { return Response.json({ ...(await testSchedule(prisma, parsed.data)), fecha: parsed.data.fecha }); }
  catch (error) { return errorResponse(error); }
}
