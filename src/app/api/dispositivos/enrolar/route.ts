import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDeviceToken } from "@/lib/devices/enrollment";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const codigo = typeof body.codigo === "string" ? body.codigo.trim().toUpperCase() : "";
    const deviceUuid = typeof body.deviceUuid === "string" ? body.deviceUuid.trim() : "";
    const modelo = typeof body.modelo === "string" ? body.modelo.trim() : null;
    const plataforma = typeof body.plataforma === "string" ? body.plataforma.trim().toUpperCase() : "ANDROID";
    const appVersion = typeof body.appVersion === "string" ? body.appVersion.trim() : null;

    if (!codigo || !deviceUuid) {
      return NextResponse.json(
        { error: "Código de enrolamiento y deviceUuid son obligatorios." },
        { status: 400 }
      );
    }

    // Buscar el dispositivo por código de un solo uso
    const dispositivo = await prisma.dispositivoMovil.findUnique({
      where: { codigoEnrolamiento: codigo },
    });

    if (!dispositivo) {
      return NextResponse.json(
        { error: "Código de enrolamiento no válido o ya utilizado." },
        { status: 404 }
      );
    }

    if (dispositivo.estado !== "PENDIENTE") {
      return NextResponse.json(
        { error: `El dispositivo ya está en estado ${dispositivo.estado.toLowerCase()}.` },
        { status: 409 }
      );
    }

    if (dispositivo.codigoExpiraEn && dispositivo.codigoExpiraEn < new Date()) {
      return NextResponse.json(
        { error: "El código de enrolamiento ha expirado. Solicita uno nuevo en la aplicación web." },
        { status: 410 }
      );
    }

    // Validar que el deviceUuid físico no esté ya registrado en otro dispositivo activo
    const existenteConUuid = await prisma.dispositivoMovil.findUnique({
      where: { deviceUuid },
    });

    if (existenteConUuid && existenteConUuid.id !== dispositivo.id && existenteConUuid.estado === "ACTIVO") {
      return NextResponse.json(
        { error: `Este teléfono o tableta física ya está enrolada como '${existenteConUuid.nombre}'. Da de baja el registro previo antes de re-enrolar.` },
        { status: 409 }
      );
    }

    // Validar límite de suscripción
    const suscripcion = await prisma.suscripcionLocal.findFirst();
    const dispositivosMaximos = suscripcion?.dispositivosMaximos ?? 3;
    const activosCount = await prisma.dispositivoMovil.count({
      where: { estado: "ACTIVO", id: { not: dispositivo.id } },
    });

    if (activosCount >= dispositivosMaximos) {
      return NextResponse.json(
        { error: `Límite de licencia excedido (${dispositivosMaximos} dispositivos activos).` },
        { status: 403 }
      );
    }

    // Activar dispositivo y quemar el código de un solo uso
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    
    const activado = await prisma.dispositivoMovil.update({
      where: { id: dispositivo.id },
      data: {
        deviceUuid,
        modelo: modelo || dispositivo.modelo,
        plataforma: plataforma === "IOS" ? "IOS" : "ANDROID",
        appVersion: appVersion || dispositivo.appVersion,
        estado: "ACTIVO",
        codigoEnrolamiento: null, // Quemar código
        codigoExpiraEn: null,
        ultimoAcceso: new Date(),
        ipUltimoAcceso: clientIp,
        tokenRevocadoEn: null,
      },
      include: {
        operadorAsignado: { select: { id: true, nombre: true, rol: true } },
      },
    });

    // Generar token firmado de hardware
    const token = generateDeviceToken(activado.id, activado.deviceUuid);

    return NextResponse.json({
      mensaje: "Dispositivo enrolado y activado exitosamente.",
      dispositivo: {
        id: activado.id,
        nombre: activado.nombre,
        estado: activado.estado,
        operador: activado.operadorAsignado?.nombre || null,
        token,
      },
    });
  } catch (error) {
    console.error("Error al enrolar dispositivo:", error);
    return NextResponse.json(
      { error: "Error interno al procesar el enrolamiento." },
      { status: 500 }
    );
  }
}
