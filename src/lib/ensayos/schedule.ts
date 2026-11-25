import { EstadoBitacora, Prisma, TipoEspecimen } from "@prisma/client";
import { z } from "zod";
import { addCivilDays, civilDate, CIVIL_TIME_ZONE } from "@/lib/civil-date";

const civilPattern = /^\d{4}-\d{2}-\d{2}$/;
export { addCivilDays, civilDate, CIVIL_TIME_ZONE };

export const scheduleFilterSchema = z.object({
  desde: z.string().regex(civilPattern).optional(),
  hasta: z.string().regex(civilPattern).optional(),
  fecha: z.string().regex(civilPattern).optional(),
  q: z.string().trim().max(200).optional(),
  tipo: z.nativeEnum(TipoEspecimen).optional(),
  estado: z.nativeEnum(EstadoBitacora).optional(),
  incluirBorradores: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
}).superRefine((value, context) => {
  const from = value.fecha || value.desde;
  const to = value.fecha || value.hasta;
  if (from && to && from > to) context.addIssue({ code: z.ZodIssueCode.custom, message: "La fecha inicial no puede ser posterior a la final." });
  if (from && to) {
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
    if (days > 370) context.addIssue({ code: z.ZodIssueCode.custom, message: "El rango no puede exceder 370 dias." });
  }
});

export type ScheduleFilters = z.infer<typeof scheduleFilterSchema>;
type SpecimenSource = {
  id: string; numero: number; tipo: TipoEspecimen; edadDias: number | null; fechaEnsaye: Date | null;
  muestra: {
    id: string; idMuestra: string; noMuestra: string; fechaMuestreo: Date; cliente: string; obra: string;
    elemento: string | null; fcKgCm2: Prisma.Decimal | null; estatusBitacora: EstadoBitacora;
    colado: { id: string; folio: string } | null;
  };
  asignacionesEquipo: Array<{ codigoInternoSnapshot: string; estado: string }>;
};

export type ScheduleItem = ReturnType<typeof scheduleItem>;

export function scheduleItem(specimen: SpecimenSource) {
  const explicit = specimen.fechaEnsaye ? civilDate(specimen.fechaEnsaye) : null;
  const calculated = specimen.edadDias == null ? null : addCivilDays(civilDate(specimen.muestra.fechaMuestreo), specimen.edadDias);
  const fechaProgramada = explicit || calculated;
  return {
    especimenId: specimen.id,
    numero: specimen.numero,
    tipo: specimen.tipo,
    edadDias: specimen.edadDias,
    fechaProgramada,
    fechaCalculada: calculated,
    origenFecha: explicit ? "REGISTRADA" as const : "CALCULADA" as const,
    programacion: specimen.muestra.estatusBitacora === "BORRADOR" ? "PROVISIONAL" as const : "CONFIRMADA" as const,
    moldeCodigo: specimen.asignacionesEquipo.find((item) => item.estado === "ASIGNADA")?.codigoInternoSnapshot
      || specimen.asignacionesEquipo[0]?.codigoInternoSnapshot || null,
    muestra: {
      id: specimen.muestra.id,
      idMuestra: specimen.muestra.idMuestra,
      noMuestra: specimen.muestra.noMuestra,
      fechaMuestreo: civilDate(specimen.muestra.fechaMuestreo),
      cliente: specimen.muestra.cliente,
      obra: specimen.muestra.obra,
      elemento: specimen.muestra.elemento,
      fcKgCm2: specimen.muestra.fcKgCm2 == null ? null : Number(specimen.muestra.fcKgCm2),
      estatusBitacora: specimen.muestra.estatusBitacora,
      colado: specimen.muestra.colado,
    },
  };
}

export function defaultMonthRange(today = civilDate(new Date())) {
  const [year, month] = today.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { desde: `${year}-${String(month).padStart(2, "0")}-01`, hasta: `${year}-${String(month).padStart(2, "0")}-${last}` };
}

export async function testSchedule(client: { especimen: { findMany(args: Prisma.EspecimenFindManyArgs): Promise<unknown> } }, filters: ScheduleFilters) {
  const fallback = defaultMonthRange();
  const desde = filters.fecha || filters.desde || fallback.desde;
  const hasta = filters.fecha || filters.hasta || fallback.hasta;
  const rows = await client.especimen.findMany({
    where: {
      muestra: {
        estatusBitacora: filters.estado || { not: "ANULADA" },
        ...(!filters.incluirBorradores ? { NOT: { estatusBitacora: "BORRADOR" } } : {}),
      },
      ...(filters.tipo ? { tipo: filters.tipo } : {}),
    },
    include: {
      muestra: { select: { id: true, idMuestra: true, noMuestra: true, fechaMuestreo: true, cliente: true, obra: true, elemento: true, fcKgCm2: true, estatusBitacora: true, colado: { select: { id: true, folio: true } } } },
      asignacionesEquipo: { select: { codigoInternoSnapshot: true, estado: true }, orderBy: { asignadoEn: "desc" } },
    },
    orderBy: [{ fechaEnsaye: "asc" }, { muestra: { fechaMuestreo: "asc" } }, { numero: "asc" }],
  }) as SpecimenSource[];
  const needle = filters.q?.toLocaleLowerCase("es-MX");
  const items = rows.map(scheduleItem).filter((item) => item.fechaProgramada && item.fechaProgramada >= desde && item.fechaProgramada <= hasta)
    .filter((item) => !needle || [item.muestra.idMuestra, item.muestra.noMuestra, item.muestra.cliente, item.muestra.obra, item.muestra.colado?.folio]
      .some((value) => value?.toLocaleLowerCase("es-MX").includes(needle)))
    .sort((a, b) => (a.fechaProgramada || "").localeCompare(b.fechaProgramada || "") || a.muestra.idMuestra.localeCompare(b.muestra.idMuestra) || a.numero - b.numero);
  const today = civilDate(new Date());
  const nextSeven = addCivilDays(today, 7);
  const porFecha = Object.fromEntries([...new Set(items.map((item) => item.fechaProgramada!))].map((date) => [date, items.filter((item) => item.fechaProgramada === date).length]));
  return {
    items,
    resumen: {
      total: items.length,
      hoy: items.filter((item) => item.fechaProgramada === today).length,
      proximos: items.filter((item) => item.fechaProgramada! > today && item.fechaProgramada! <= nextSeven).length,
      vencidos: items.filter((item) => item.fechaProgramada! < today).length,
      provisionales: items.filter((item) => item.programacion === "PROVISIONAL").length,
      porFecha,
    },
    rango: { desde, hasta },
  };
}

export function filtersFromUrl(url: URL, daily = false) {
  const keys = daily ? ["fecha", "q", "tipo", "estado", "incluirBorradores"] : ["desde", "hasta", "q", "tipo", "estado", "incluirBorradores"];
  const raw = Object.fromEntries(keys.flatMap((key) => url.searchParams.has(key) ? [[key, url.searchParams.get(key)]] : []));
  if (daily && !url.searchParams.has("incluirBorradores")) raw.incluirBorradores = "false";
  return scheduleFilterSchema.safeParse(raw);
}
