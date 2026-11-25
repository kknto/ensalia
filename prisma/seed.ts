import { PrismaClient, TipoCatalogo } from "@prisma/client";
import { createHash } from "node:crypto";
import { DEFAULT_PROFILE_CONFIGURATION, DEFAULT_PROFILE_KEY } from "../src/lib/config/defaults";
const prisma = new PrismaClient();
async function main() {
  const operator = await prisma.operador.upsert({ where: { nombre: "Captura oficina" }, update: {}, create: { nombre: "Captura oficina" } });
  const values: [TipoCatalogo, string][] = [
    ["TIPO_CONCRETO", "Concreto convencional"], ["CEMENTO", "CPC 30R"], ["CONCRETERA", "Por capturar"],
  ];
  for (const [tipo, nombre] of values) await prisma.catalogo.upsert({ where: { tipo_nombre: { tipo, nombre } }, update: {}, create: { tipo, nombre } });
  const equipmentTypes = [
    { codigo: "PLACA_REVENIMIENTO", nombre: "Placa de revenimiento" },
    { codigo: "CONO_REVENIMIENTO", nombre: "Cono de revenimiento" },
    { codigo: "VARILLA", nombre: "Varilla" },
    { codigo: "CUCHARON", nombre: "Cucharón" },
    { codigo: "TERMOMETRO", nombre: "Termómetro", requiereCalibracion: true },
    { codigo: "CARRETILLA", nombre: "Carretilla" },
    { codigo: "EQUIPO_AIRE", nombre: "Equipo de contenido de aire", requiereCalibracion: true },
    { codigo: "MOLDE_CILINDRO_15X30", nombre: "Molde cilíndrico 15x30 cm", esMolde: true },
    { codigo: "MOLDE_CILINDRO_10X20", nombre: "Molde cilíndrico 10x20 cm", esMolde: true },
    { codigo: "MOLDE_VIGA_50X15X15", nombre: "Molde de viga 50x15x15 cm", esMolde: true },
  ];
  for (const row of equipmentTypes) await prisma.tipoEquipo.upsert({ where: { codigo: row.codigo }, update: { nombre: row.nombre, requiereSerie: false, requiereCalibracion: row.requiereCalibracion ?? false, esMolde: row.esMolde ?? false, activo: true }, create: { ...row, requiereSerie: false, obligatorioEnMuestra: false } });
  const profile = await prisma.perfilCliente.upsert({ where: { clave: DEFAULT_PROFILE_KEY }, update: { nombreInterno: "Ensalia Demo", esPlantillaSistema: true }, create: { clave: DEFAULT_PROFILE_KEY, nombreInterno: "Ensalia Demo", esPlantillaSistema: true, activo: true } });
  let version = await prisma.versionPerfil.findUnique({ where: { perfilId_numeroVersion: { perfilId: profile.id, numeroVersion: 1 } } });
  if (!version) version = await prisma.versionPerfil.create({ data: {
    perfilId: profile.id, numeroVersion: 1, estado: "PUBLICADA", configuracionJson: DEFAULT_PROFILE_CONFIGURATION,
    checksum: createHash("sha256").update(JSON.stringify(normalize(DEFAULT_PROFILE_CONFIGURATION)), "utf8").digest("hex"),
    notas: "Plantilla base de Ensalia", creadaPorId: operator.id, validadaPorId: operator.id, publicadaPorId: operator.id,
    validadaEn: new Date(), publicadaEn: new Date(),
  } });
  await prisma.perfilCliente.update({ where: { id: profile.id }, data: { versionPublicadaId: version.id } });
}
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  return value;
}
main().finally(() => prisma.$disconnect());
