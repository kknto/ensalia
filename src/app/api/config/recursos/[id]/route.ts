import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { deleteProfileResource, ProfileResourceError, resolveManagedProfileAsset } from "@/lib/config/resources";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const resource = await prisma.recursoPerfil.findUnique({ where: { id } });
    if (!resource) return Response.json({ error: "Recurso no encontrado." }, { status: 404 });
    const bytes = await readFile(resolveManagedProfileAsset(resource.rutaRelativa));
    return new Response(bytes, { headers: { "Content-Type": resource.mimeType, "Content-Length": String(bytes.byteLength), "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof ProfileResourceError) return Response.json({ error: error.message }, { status: error.status });
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const resource = await deleteProfileResource(id, operator.id);
    return Response.json({ eliminado: true, id: resource.id });
  } catch (error) {
    if (error instanceof ProfileResourceError) return Response.json({ error: error.message }, { status: error.status });
    return errorResponse(error);
  }
}
