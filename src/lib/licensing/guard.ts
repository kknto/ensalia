import { NextResponse } from "next/server";
import { CodigoModulo } from "@prisma/client";
import { isModuleActive } from "./engine";

export class LicenseEnforcementError extends Error {
  constructor(public readonly modulo: CodigoModulo) {
    super(`Acceso denegado: El módulo '${modulo}' no está activo en su plan de suscripción.`);
    this.name = "LicenseEnforcementError";
  }
}

export async function requireModule(modulo: CodigoModulo): Promise<NextResponse | null> {
  const activo = await isModuleActive(modulo);
  if (!activo) {
    return NextResponse.json(
      {
        error: "MODULO_NO_CONTRATADO",
        mensaje: `El módulo '${modulo}' no está habilitado en su nivel de suscripción actual.`,
        moduloRequerido: modulo,
      },
      { status: 403 }
    );
  }
  return null;
}

export async function assertModuleActive(modulo: CodigoModulo): Promise<void> {
  const activo = await isModuleActive(modulo);
  if (!activo) {
    throw new LicenseEnforcementError(modulo);
  }
}

