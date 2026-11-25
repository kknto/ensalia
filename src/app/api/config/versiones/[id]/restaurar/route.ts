import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { restoreProfileVersion } from "@/lib/config/service";
import { createConsistentLocalBackup, LocalBackupError } from "@/lib/local-backup";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const version = await prisma.versionPerfil.findUnique({ where: { id }, select: { id: true } });
    if (!version) return Response.json({ error: "Version no encontrada" }, { status: 404 });
    const respaldoRuta = await createConsistentLocalBackup("antes-de-restaurar");
    const result = await restoreProfileVersion(id, operator, respaldoRuta);
    return result ? Response.json(result, { status: 201 }) : Response.json({ error: "Version no encontrada" }, { status: 404 });
  } catch (error) {
    if (error instanceof LocalBackupError) return Response.json({ error: error.message }, { status: 503 });
    return errorResponse(error);
  }
}
