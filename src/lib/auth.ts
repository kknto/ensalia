import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export async function getOperator(request: NextRequest) {
  const access = request.headers.get("x-app-access-code");
  // Ensalia se ejecuta enlazado a 127.0.0.1 en una sola PC. Un código heredado
  // en .env no debe bloquear la operación local: sólo se exige cuando la
  // instalación lo habilita expresamente.
  const accessRequired = process.env.ENSALIA_REQUIRE_ACCESS_CODE?.toLowerCase() === "true";
  if (accessRequired && process.env.APP_ACCESS_CODE && access !== process.env.APP_ACCESS_CODE) {
    return null;
  }
  const operatorId = request.headers.get("x-operator-id");
  if (operatorId) return prisma.operador.findFirst({ where: { id: operatorId, activo: true } });
  const operatorName = (request.headers.get("x-operator-name") || "Captura oficina").trim().slice(0, 200);
  return prisma.operador.upsert({
    where: { nombre: operatorName },
    update: { activo: true },
    create: { nombre: operatorName },
  });
}

export function unauthorized() {
  return Response.json({ error: "Código de acceso inválido" }, { status: 401 });
}
