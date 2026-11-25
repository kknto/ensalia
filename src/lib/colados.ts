import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { MuestraInput } from "./validation";

export type ColadoSharedInput = Pick<MuestraInput, "fechaMuestreo" | "cliente" | "obra" | "ciudad" | "coordenadasColado" | "direccion" | "sistema" | "localizacion" | "procedencia" | "elemento" | "volumenM3" | "fcKgCm2" | "tipoConcreto" | "concretera" | "tmaMm" | "cemento" | "observaciones" | "revenimientoCm" | "toleranciaRevenimiento">;

export function nextColadoFolio(date = new Date()) {
  return `COL-${date.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createSyntheticColado(
  tx: Prisma.TransactionClient,
  data: ColadoSharedInput,
  operatorId: string,
  profile: { id: string; versionId: string; snapshot: Prisma.InputJsonValue },
) {
  const fecha = new Date(data.fechaMuestreo);
  return tx.colado.create({ data: {
    folio: nextColadoFolio(fecha), fechaColado: fecha, cliente: data.cliente, obra: data.obra,
    ciudad: data.ciudad, coordenadasColado: data.coordenadasColado, direccion: data.direccion, sistema: data.sistema,
    localizacion: data.localizacion, procedencia: data.procedencia, elemento: data.elemento,
    revenimientoCm: data.revenimientoCm, toleranciaRevenimiento: data.toleranciaRevenimiento,
    volumenM3: data.volumenM3, fcKgCm2: data.fcKgCm2, tipoConcreto: data.tipoConcreto,
    concretera: data.concretera, tmaMm: data.tmaMm, cemento: data.cemento, observaciones: data.observaciones,
    numeroTomas: 1, esSintetico: true, creadorId: operatorId, perfilClienteId: profile.id,
    versionPerfilId: profile.versionId, configuracionSnapshotJson: profile.snapshot,
  } });
}

export const coladoInclude = {
  creador: true,
  muestras: { orderBy: { numeroDentroColado: "asc" as const }, include: { especimenes: { orderBy: { numero: "asc" as const } } } },
  auditorias: { orderBy: { creadoEn: "desc" as const }, include: { operador: true } },
};
