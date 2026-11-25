import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEnrollmentCode, generateQrDataUrl, EnrollmentPayload } from "@/lib/devices/enrollment";

export async function GET() {
  try {
    const dispositivos = await prisma.dispositivoMovil.findMany({
      orderBy: { creadoEn: "desc" },
      include: {
        operadorAsignado: {
          select: { id: true, nombre: true, rol: true },
        },
        _count: {
          select: { muestras: true, fotos: true },
        },
      },
    });

    const suscripcion = await prisma.suscripcionLocal.findFirst();
    const dispositivosMaximos = suscripcion?.dispositivosMaximos ?? 3;
    const activos = dispositivos.filter((d) => d.estado === "ACTIVO").length;

    return NextResponse.json({
      dispositivos,
      meta: {
        total: dispositivos.length,
        activos,
        dispositivosMaximos,
        disponiblesParaEnrolar: Math.max(0, dispositivosMaximos - activos),
      },
    });
  } catch (error) {
    console.error("Error al listar dispositivos:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los dispositivos móviles." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const nombre = typeof body.nombre === "string" && body.nombre.trim() 
      ? body.nombre.trim() 
      : `Dispositivo Móvil ${new Date().toLocaleDateString("es-MX")}`;
    const operadorAsignadoId = typeof body.operadorAsignadoId === "string" ? body.operadorAsignadoId : null;

    // Verificar cupo de licencia
    const suscripcion = await prisma.suscripcionLocal.findFirst();
    const dispositivosMaximos = suscripcion?.dispositivosMaximos ?? 3;
    const activosCount = await prisma.dispositivoMovil.count({
      where: { estado: "ACTIVO" },
    });

    if (activosCount >= dispositivosMaximos) {
      return NextResponse.json(
        { error: `Límite de licencia alcanzado (${dispositivosMaximos} dispositivos activos). Para enrolar uno nuevo, da de baja o bloquea un dispositivo existente.` },
        { status: 403 }
      );
    }

    const codigo = generateEnrollmentCode();
    const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Resolver URL del servidor a partir del request
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "127.0.0.1:3210";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const serverUrl = `${proto}://${host}`;

    // UUID provisional único para el registro pendiente
    const provisionalUuid = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const nuevo = await prisma.dispositivoMovil.create({
      data: {
        deviceUuid: provisionalUuid,
        nombre,
        codigoEnrolamiento: codigo,
        codigoExpiraEn: expiraEn,
        estado: "PENDIENTE",
        operadorAsignadoId,
      },
    });

    const qrPayload: EnrollmentPayload = {
      version: 1,
      serverUrl,
      code: codigo,
      deviceId: nuevo.id,
      issuedAt: new Date().toISOString(),
    };

    const qrDataUrl = await generateQrDataUrl(qrPayload);

    return NextResponse.json(
      {
        dispositivo: nuevo,
        enrolamiento: {
          codigo,
          expiraEn: expiraEn.toISOString(),
          serverUrl,
          qrDataUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear enrolamiento:", error);
    return NextResponse.json(
      { error: "No se pudo generar el código de enrolamiento." },
      { status: 500 }
    );
  }
}
