import { prisma } from "@/lib/prisma";
import { CodigoModulo, EstadoSuscripcion, NivelSuscripcion } from "@prisma/client";

// Módulos base esenciales incluidos en la instalación básica (Core)
export const CORE_MODULES: ReadonlySet<CodigoModulo> = new Set([
  CodigoModulo.CAPTURA_BASE,
  CodigoModulo.REGISTROS_BITACORA,
  CodigoModulo.PERSONALIZACION_PERFIL,
]);

// Mapa de módulos incluidos según el nivel de suscripción
export const TIER_MODULES: Record<NivelSuscripcion, CodigoModulo[]> = {
  STARTER: [
    CodigoModulo.CAPTURA_BASE,
    CodigoModulo.REGISTROS_BITACORA,
    CodigoModulo.PERSONALIZACION_PERFIL,
  ],
  ESTANDAR: [
    CodigoModulo.CAPTURA_BASE,
    CodigoModulo.REGISTROS_BITACORA,
    CodigoModulo.PERSONALIZACION_PERFIL,
    CodigoModulo.PROGRAMACION_ENSAYOS,
    CodigoModulo.HOJAS_CAMPO,
    CodigoModulo.LOGISTICA_SALIDAS,
  ],
  PROFESIONAL: [
    CodigoModulo.CAPTURA_BASE,
    CodigoModulo.REGISTROS_BITACORA,
    CodigoModulo.PERSONALIZACION_PERFIL,
    CodigoModulo.PROGRAMACION_ENSAYOS,
    CodigoModulo.HOJAS_CAMPO,
    CodigoModulo.LOGISTICA_SALIDAS,
    CodigoModulo.INVENTARIO_EQUIPOS,
    CodigoModulo.CALIBRACION_MANTENIMIENTO,
    CodigoModulo.CURVAS_FC_FOTOS,
    CodigoModulo.REPORTES_AVANZADOS,
  ],
  EMPRESARIAL: [
    CodigoModulo.CAPTURA_BASE,
    CodigoModulo.REGISTROS_BITACORA,
    CodigoModulo.PERSONALIZACION_PERFIL,
    CodigoModulo.PROGRAMACION_ENSAYOS,
    CodigoModulo.HOJAS_CAMPO,
    CodigoModulo.LOGISTICA_SALIDAS,
    CodigoModulo.INVENTARIO_EQUIPOS,
    CodigoModulo.CALIBRACION_MANTENIMIENTO,
    CodigoModulo.CURVAS_FC_FOTOS,
    CodigoModulo.REPORTES_AVANZADOS,
    CodigoModulo.DIGITALIZACION_OCR,
  ],
};

export async function ensureDefaultSubscription(): Promise<void> {
  const count = await prisma.suscripcionLocal.count();
  if (count === 0) {
    // Inicializar suscripción local predeterminada (Nivel Profesional para operar módulos completos de laboratorio)
    const defaultPlan = NivelSuscripcion.PROFESIONAL;
    const allowed = TIER_MODULES[defaultPlan];

    const sub = await prisma.suscripcionLocal.create({
      data: {
        plan: defaultPlan,
        estado: EstadoSuscripcion.ACTIVA,
        titular: "Laboratorio Central ENSALIA",
        emisor: "ENSALIA Licensing System",
        dispositivosMaximos: 3,
        validaDesde: new Date(),
        validaHasta: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año de vigencia
      },
    });

    for (const mod of Object.values(CodigoModulo)) {
      await prisma.moduloFeatureFlag.create({
        data: {
          suscripcionId: sub.id,
          modulo: mod,
          habilitado: allowed.includes(mod),
        },
      });
    }
  }
}

export async function isModuleActive(modulo: CodigoModulo): Promise<boolean> {
  const isCore = CORE_MODULES.has(modulo);

  // Asegurar que exista suscripción base inicial si es primera ejecución
  await ensureDefaultSubscription();

  // 1. Verificar Nivel de Licencia Comercial de la Instalación (Fail-Closed / Deny-by-default)
  const suscripcion = await prisma.suscripcionLocal.findFirst({
    where: { estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.DE_PRUEBA] } },
    include: { flags: true },
    orderBy: { actualizadoEn: "desc" },
  });

  if (!suscripcion) {
    return isCore;
  }

  const isExpired = suscripcion.validaHasta && suscripcion.validaHasta < new Date();
  if (isExpired) {
    return isCore;
  }

  if (!isCore) {
    const flag = suscripcion.flags.find((f) => f.modulo === modulo);
    if (!flag || !flag.habilitado) {
      return false;
    }
  }

  // 2. Verificar Preferencia Operativa del Perfil Activo (Tenant)
  const perfil = await prisma.perfilCliente.findFirst({
    where: { activo: true, versionPublicadaId: { not: null } },
    include: { versionPublicada: true },
    orderBy: { actualizadoEn: "desc" },
  });

  if (!perfil?.versionPublicada) return true;
  const config = perfil.versionPublicada.configuracionJson as Record<string, unknown> | null;
  const profileModulos = config?.modulos as Record<string, boolean> | undefined;
  if (!profileModulos) return true;

  const legacyMap: Partial<Record<CodigoModulo, string>> = {
    CAPTURA_BASE: "captura",
    REGISTROS_BITACORA: "bitacora",
    PERSONALIZACION_PERFIL: "personalizacion",
    PROGRAMACION_ENSAYOS: "programacionEnsayos",
    HOJAS_CAMPO: "hojasCampo",
    LOGISTICA_SALIDAS: "muestrasSalir",
    INVENTARIO_EQUIPOS: "inventario",
    CALIBRACION_MANTENIMIENTO: "calibracion",
    CURVAS_FC_FOTOS: "curvasFc",
    REPORTES_AVANZADOS: "reportesAvanzados",
    DIGITALIZACION_OCR: "digitalizacionOcr",
  };

  const preferenceKey = legacyMap[modulo] ?? (modulo as string);
  if (profileModulos[preferenceKey] !== undefined) {
    return Boolean(profileModulos[preferenceKey]);
  }

  return true;
}

export async function getActiveModulesMap(): Promise<Record<CodigoModulo, boolean>> {
  await ensureDefaultSubscription();
  const allModules = Object.values(CodigoModulo);
  const result: Partial<Record<CodigoModulo, boolean>> = {};

  for (const modulo of allModules) {
    result[modulo] = await isModuleActive(modulo);
  }

  return result as Record<CodigoModulo, boolean>;
}

export async function getSubscriptionInfo() {
  await ensureDefaultSubscription();

  const sub = await prisma.suscripcionLocal.findFirst({
    where: { estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.DE_PRUEBA] } },
    include: { flags: true },
    orderBy: { actualizadoEn: "desc" },
  });

  if (!sub) {
    return {
      plan: NivelSuscripcion.STARTER,
      titular: "Licencia Básica Gratuita",
      estado: EstadoSuscripcion.ACTIVA,
      validaHasta: null,
      diasRestantes: null,
      activa: true,
    };
  }

  const now = new Date();
  const diasRestantes = sub.validaHasta
    ? Math.max(0, Math.ceil((sub.validaHasta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    plan: sub.plan,
    titular: sub.titular,
    estado: sub.estado,
    validaHasta: sub.validaHasta ? sub.validaHasta.toISOString() : null,
    diasRestantes,
    activa: sub.validaHasta ? sub.validaHasta > now : true,
  };
}

