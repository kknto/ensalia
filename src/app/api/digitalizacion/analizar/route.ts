import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { ManualReviewEngine } from "@/lib/ocr/engine";
import { OcrFileError, validateOcrUpload } from "@/lib/ocr/files";
import { evaluateImageQuality } from "@/lib/ocr/quality";
import { prisma } from "@/lib/prisma";
import { stageDocument } from "@/lib/documents/storage";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  try {
    const form = await request.formData();
    const file = form.get("archivo");
    const emisionId = String(form.get("emisionId") || "").trim();
    if (!(file instanceof File)) return Response.json({ error: "Seleccione una fotografía o PDF." }, { status: 400 });
    const validated = validateOcrUpload(new Uint8Array(await file.arrayBuffer()), file.type, file.name);
    const quality = evaluateImageQuality({ ...validated.dimensions, templateLocated: false });
    if (quality.verdict === "REJECTED") return Response.json({ error: "La captura no cumple la calidad mínima.", quality }, { status: 422 });
    const result = await new ManualReviewEngine().analyze(validated);
    let persistence: "NOT_REQUESTED" | "STORED" = "NOT_REQUESTED";
    if (emisionId) {
      const emission = await prisma.emisionHojaCampo.findUnique({ where: { id: emisionId }, select: { id: true, muestraId: true } });
      if (!emission) return Response.json({ error: "La emisión seleccionada no existe." }, { status: 404 });
      const extension = ({ "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[validated.mime];
      const relativePath = `field-sheets/${emission.id}/scans/${randomUUID()}.${extension}`;
      const staged = await stageDocument(relativePath, validated.bytes);
      try {
        await prisma.$transaction(async (tx) => {
          await tx.archivoHojaCampo.create({ data: { emisionId, tipo: "ESCANEO_ORIGINAL", nombreSeguro: validated.originalName, mimeType: validated.mime, tamano: validated.bytes.byteLength, hashSha256: validated.sha256, rutaRelativa: relativePath } });
          await tx.eventoHojaCampo.create({ data: { emisionId, operadorId: operator.id, tipo: "DIGITALIZACION", detalleJson: { hashSha256: validated.sha256, mimeType: validated.mime, paginas: validated.pageCount, calidad: quality.verdict, incidencias: quality.issues } } });
          await tx.auditoria.create({ data: { muestraId: emission.muestraId, operadorId: operator.id, accion: "HOJA_CAMPO_DIGITALIZADA", cambiosJson: { emisionId, hashSha256: validated.sha256, calidad: quality.verdict } } });
          await staged.commit();
        });
        persistence = "STORED";
      } catch (error) { await staged.rollback(); throw error; }
    }
    return Response.json({
      document: {
        id: validated.id, name: validated.originalName, mime: validated.mime, bytes: validated.bytes.length,
        sha256: validated.sha256, pageCount: validated.pageCount, dimensions: validated.dimensions,
      },
      quality,
      extraction: result,
      persistence,
      warning: persistence === "STORED" ? "El original quedó conservado. La extracción automática aún requiere revisión humana." : "El archivo sólo fue inspeccionado porque no se indicó una emisión documental.",
    }, { status: 202 });
  } catch (error) {
    if (error instanceof OcrFileError) return Response.json({ error: error.message }, { status: error.status });
    console.error(error);
    return Response.json({ error: "No fue posible analizar el documento." }, { status: 500 });
  }
}
