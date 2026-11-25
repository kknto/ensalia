import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateEnrollmentCode, generateQrDataUrl, EnrollmentPayload } from "@/lib/devices/enrollment";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; accion: string }> }
) {
  try {
    const { id, accion } = await params;

    const dispositivo = await prisma.dispositivoMovil.findUnique({
      where: { id },
    });

    if (!dispositivo) {
      return NextResponse.json(
        { error: "Dispositivo no encontrado." },
        { status: 404 }
      );
    }

    if (accion === "bloquear") {
      const actualizado = await prisma.dispositivoMovil.update({
        where: { id },
        data: {
          estado: "BLOQUEADO",
          tokenRevocadoEn: new Date(),
        },
      });
      return NextResponse.json({
        mensaje: `El dispositivo '${actualizado.nombre}' ha sido bloqueado. Se revocó su acceso inmediatamente.`,
        dispositivo: actualizado,
      });
    }

    if (accion === "desbloquear") {
      const actualizado = await prisma.dispositivoMovil.update({
        where: { id },
        data: {
          estado: "ACTIVO",
          tokenRevocadoEn: null,
        },
      });
      return NextResponse.json({
        mensaje: `El dispositivo '${actualizado.nombre}' ha sido reactivado.`,
        dispositivo: actualizado,
      });
    }

    if (accion === "dar-de-baja") {
      const actualizado = await prisma.dispositivoMovil.update({
        where: { id },
        data: {
          estado: "DADO_DE_BAJA",
          tokenRevocadoEn: new Date(),
          codigoEnrolamiento: null,
          codigoExpiraEn: null,
        },
      });
      return NextResponse.json({
        mensaje: `El dispositivo '${actualizado.nombre}' ha sido dado de baja definitivamente. El cupo queda liberado.`,
        dispositivo: actualizado,
      });
    }

    if (accion === "regenerar-codigo") {
      const codigo = generateEnrollmentCode();
      const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "127.0.0.1:3210";
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const serverUrl = `${proto}://${host}`;

      const actualizado = await prisma.dispositivoMovil.update({
        where: { id },
        data: {
          codigoEnrolamiento: codigo,
          codigoExpiraEn: expiraEn,
          estado: "PENDIENTE",
        },
      });

      const qrPayload: EnrollmentPayload = {
        version: 1,
        serverUrl,
        code: codigo,
        deviceId: id,
        issuedAt: new Date().toISOString(),
      };

      const qrDataUrl = await generateQrDataUrl(qrPayload);

      return NextResponse.json({
        mensaje: "Nuevo código de enrolamiento generado con éxito.",
        dispositivo: actualizado,
        enrolamiento: {
          codigo,
          expiraEn: expiraEn.toISOString(),
          serverUrl,
          qrDataUrl,
        },
      });
    }

    return NextResponse.json(
      { error: `Acción '${accion}' no reconocida.` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en acción de dispositivo:", error);
    return NextResponse.json(
      { error: "Error interno al ejecutar la acción sobre el dispositivo." },
      { status: 500 }
    );
  }
}
