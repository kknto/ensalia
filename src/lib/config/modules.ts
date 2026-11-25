import { prisma } from "@/lib/prisma";
import { profileConfigurationSchema, type ProfileConfiguration } from "./schema";

export async function activeModuleEnabled(module: keyof ProfileConfiguration["modulos"]) {
  const profile = await prisma.perfilCliente.findFirst({ where: { activo: true, versionPublicadaId: { not: null } }, include: { versionPublicada: true }, orderBy: { actualizadoEn: "desc" } });
  if (!profile?.versionPublicada) return true;
  const parsed = profileConfigurationSchema.safeParse(profile.versionPublicada.configuracionJson);
  return parsed.success ? parsed.data.modulos[module] : true;
}

export async function disabledModuleResponse(module: keyof ProfileConfiguration["modulos"]) {
  return await activeModuleEnabled(module) ? null : Response.json({ error: `El modulo ${module} esta deshabilitado en el perfil activo.` }, { status: 403 });
}
