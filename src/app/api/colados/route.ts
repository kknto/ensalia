import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { coladoSchema } from "@/lib/validation";
import { coladoInclude, nextColadoFolio } from "@/lib/colados";
import { resolveActiveProfile, configurationSnapshot } from "@/lib/config/service";
import { profileConfigurationSchema } from "@/lib/config/schema";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 200);
  const estado = request.nextUrl.searchParams.get("estado");
  if (estado && !["ABIERTO", "CERRADO", "ANULADO"].includes(estado)) return Response.json({ error: "Estado no válido" }, { status: 400 });
  try {
    const rows = await prisma.colado.findMany({ where: { ...(estado ? { estado: estado as "ABIERTO" | "CERRADO" | "ANULADO" } : {}), ...(q ? { OR: [{ folio: { contains: q } }, { cliente: { contains: q } }, { obra: { contains: q } }, { elemento: { contains: q } }] } : {}) }, include: { _count: { select: { muestras: true } }, creador: true }, orderBy: [{ fechaColado: "desc" }, { creadoEn: "desc" }], take: 500 });
    return Response.json(rows);
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = coladoSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  try {
    const profile = await resolveActiveProfile(operator);
    if (!profile.versionPublicada) return Response.json({ error: "No existe una configuración publicada." }, { status: 409 });
    const configuration = profileConfigurationSchema.parse(profile.versionPublicada.configuracionJson);
    if (!configuration.modulos.captura) return Response.json({ error: "El módulo de captura está deshabilitado." }, { status: 403 });
    const snapshot = configurationSnapshot(configuration) as Prisma.InputJsonValue;
    const row = await prisma.$transaction(async (tx) => {
      const colado = await tx.colado.create({ data: { ...parsed.data, fechaColado: new Date(parsed.data.fechaColado), folio: nextColadoFolio(new Date(parsed.data.fechaColado)), creadorId: operator.id, perfilClienteId: profile.id, versionPerfilId: profile.versionPublicada!.id, configuracionSnapshotJson: snapshot } });
      await tx.auditoria.create({ data: { coladoId: colado.id, operadorId: operator.id, accion: "COLADO_CREADO", estadoDespues: "ABIERTO", cambiosJson: { folio: colado.folio, numeroTomas: colado.numeroTomas } } });
      return tx.colado.findUniqueOrThrow({ where: { id: colado.id }, include: coladoInclude });
    });
    return Response.json(row, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
