import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { disabledModuleResponse } from "@/lib/config/modules";
import { errorResponse, parseJson } from "@/lib/api";
import { bulkInventorySchema, validateBulkInventory } from "@/lib/inventory/bulk";

export async function POST(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("inventario"); if (disabled) return disabled;
  const raw = await parseJson(request) as Record<string, unknown> | null;
  const parsed = bulkInventorySchema.safeParse({ ...raw, idempotencyKey: raw?.idempotencyKey || "preview-only" });
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  try { return Response.json(await validateBulkInventory(prisma, parsed.data)); }
  catch (error) { return errorResponse(error); }
}
