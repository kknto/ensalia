import { PDFPage, rgb, PDFFont } from "pdf-lib";
import { TipoFallaConcreto } from "@prisma/client";

export interface FractureInfo {
  titulo: string;
  subtitulo: string;
  astmReferencia: string;
}

export function getFractureInfo(type: TipoFallaConcreto): FractureInfo {
  switch (type) {
    case "CONO_TIPO_1":
      return {
        titulo: "Tipo 1: Cono Bien Formado",
        subtitulo: "Conos bien definidos en ambos extremos, fisuras limpias < 25 mm",
        astmReferencia: "ASTM C39 Fig. 2 - Cone",
      };
    case "CONO_Y_DIVIDIDO_TIPO_2":
      return {
        titulo: "Tipo 2: Cono y Hendidura",
        subtitulo: "Cono en un extremo y fisura longitudinal que atraviesa el opuesto",
        astmReferencia: "ASTM C39 Fig. 2 - Cone & Split",
      };
    case "COLUMNA_TIPO_3":
      return {
        titulo: "Tipo 3: Columnar Vertical",
        subtitulo: "Fisuras verticales continuas paralelas de extremo a extremo",
        astmReferencia: "ASTM C39 Fig. 2 - Columnar",
      };
    case "CIZALLA_TIPO_4":
      return {
        titulo: "Tipo 4: Cizallamiento Diagonal",
        subtitulo: "Plano diagonal completo a través del cuerpo del espécimen",
        astmReferencia: "ASTM C39 Fig. 2 - Shear",
      };
    case "ESQUINA_TIPO_5":
      return {
        titulo: "Tipo 5: Desprendimiento Lateral",
        subtitulo: "Fractura en esquina o arista, sin penetrar el eje central",
        astmReferencia: "ASTM C39 Fig. 2 - Side fracture",
      };
    case "PUNTUAL_TIPO_6":
      return {
        titulo: "Tipo 6: Falla de Cabeceo",
        subtitulo: "Falla puntual o desprendimiento confinado al refrentado/almohadilla",
        astmReferencia: "ASTM C39 Fig. 2 - Pointed / Cap",
      };
    default:
      return {
        titulo: "Falla No Convencional",
        subtitulo: "Patrón de fractura irregular o mixto",
        astmReferencia: "ASTM C39 Fig. 2 - Other",
      };
  }
}

/**
 * Dibuja el diagrama vectorial pericial de la fractura según la Figura 2 de ASTM C39.
 * Utiliza líneas vectoriales puras en el PDF, garantizando nitidez infinita sin artefactos rasterizados.
 */
export function drawFractureVectorDiagram(
  page: PDFPage,
  type: TipoFallaConcreto,
  originX: number,
  originY: number,
  scale: number = 1.0,
  font?: PDFFont
): void {
  const w = 36 * scale;
  const h = 72 * scale;
  const borderColor = rgb(0.12, 0.16, 0.22);
  const crackColor = rgb(0.86, 0.15, 0.15); // Trazo rojo pericial
  const cylinderFill = rgb(0.96, 0.97, 0.98);

  // 1. Cuerpo del cilindro (15 x 30 cm normalizado)
  page.drawRectangle({
    x: originX,
    y: originY,
    width: w,
    height: h,
    borderWidth: 1.2 * scale,
    borderColor,
    color: cylinderFill,
  });

  // Plato de acero superior
  page.drawLine({
    start: { x: originX - 4 * scale, y: originY + h },
    end: { x: originX + w + 4 * scale, y: originY + h },
    thickness: 2.2 * scale,
    color: borderColor,
  });

  // Plato de acero inferior
  page.drawLine({
    start: { x: originX - 4 * scale, y: originY },
    end: { x: originX + w + 4 * scale, y: originY },
    thickness: 2.2 * scale,
    color: borderColor,
  });

  // 2. Trazo vectorial de las fisuras según la Figura 2 de ASTM C39
  switch (type) {
    case "CONO_TIPO_1":
      // Cono superior
      page.drawLine({
        start: { x: originX + 2 * scale, y: originY + h },
        end: { x: originX + w / 2, y: originY + h * 0.54 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      page.drawLine({
        start: { x: originX + w - 2 * scale, y: originY + h },
        end: { x: originX + w / 2, y: originY + h * 0.54 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      // Cono inferior
      page.drawLine({
        start: { x: originX + 2 * scale, y: originY },
        end: { x: originX + w / 2, y: originY + h * 0.46 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      page.drawLine({
        start: { x: originX + w - 2 * scale, y: originY },
        end: { x: originX + w / 2, y: originY + h * 0.46 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      break;

    case "CONO_Y_DIVIDIDO_TIPO_2":
      // Cono inferior
      page.drawLine({
        start: { x: originX + 2 * scale, y: originY },
        end: { x: originX + w / 2, y: originY + h * 0.48 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      page.drawLine({
        start: { x: originX + w - 2 * scale, y: originY },
        end: { x: originX + w / 2, y: originY + h * 0.48 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      // Fisura longitudinal central que divide el extremo superior
      page.drawLine({
        start: { x: originX + w / 2, y: originY + h * 0.48 },
        end: { x: originX + w / 2, y: originY + h },
        thickness: 1.8 * scale,
        color: crackColor,
      });
      page.drawLine({
        start: { x: originX + w * 0.38, y: originY + h * 0.65 },
        end: { x: originX + w * 0.38, y: originY + h },
        thickness: 1.0 * scale,
        color: crackColor,
      });
      break;

    case "COLUMNA_TIPO_3":
      // Fisuras columnares verticales
      page.drawLine({
        start: { x: originX + w * 0.28, y: originY },
        end: { x: originX + w * 0.28, y: originY + h },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      page.drawLine({
        start: { x: originX + w * 0.52, y: originY },
        end: { x: originX + w * 0.52, y: originY + h },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      page.drawLine({
        start: { x: originX + w * 0.74, y: originY },
        end: { x: originX + w * 0.74, y: originY + h },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      break;

    case "CIZALLA_TIPO_4":
      // Fractura diagonal completa de esquina a esquina
      page.drawLine({
        start: { x: originX + 2 * scale, y: originY + h * 0.88 },
        end: { x: originX + w - 2 * scale, y: originY + h * 0.12 },
        thickness: 2.2 * scale,
        color: crackColor,
      });
      break;

    case "ESQUINA_TIPO_5":
      // Desprendimiento en esquina superior
      page.drawLine({
        start: { x: originX + w * 0.45, y: originY + h },
        end: { x: originX + w, y: originY + h * 0.65 },
        thickness: 1.8 * scale,
        color: crackColor,
      });
      // Desprendimiento en esquina inferior
      page.drawLine({
        start: { x: originX, y: originY + h * 0.35 },
        end: { x: originX + w * 0.55, y: originY },
        thickness: 1.8 * scale,
        color: crackColor,
      });
      break;

    case "PUNTUAL_TIPO_6":
      // Fisuras confinadas a la cara superior (falla de cabeceo)
      page.drawLine({
        start: { x: originX, y: originY + h * 0.92 },
        end: { x: originX + w * 0.35, y: originY + h * 0.84 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      page.drawLine({
        start: { x: originX + w * 0.35, y: originY + h * 0.84 },
        end: { x: originX + w * 0.72, y: originY + h * 0.94 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      page.drawLine({
        start: { x: originX + w * 0.72, y: originY + h * 0.94 },
        end: { x: originX + w, y: originY + h * 0.88 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      break;

    default:
      // Falla genérica diagonal
      page.drawLine({
        start: { x: originX + 3 * scale, y: originY + h * 0.82 },
        end: { x: originX + w - 3 * scale, y: originY + h * 0.18 },
        thickness: 1.6 * scale,
        color: crackColor,
      });
      break;
  }

  // Rotulado inferior si se pasa la fuente
  if (font) {
    const info = getFractureInfo(type);
    page.drawText(info.astmReferencia, {
      x: originX - 6 * scale,
      y: originY - 10 * scale,
      size: 5.5 * scale,
      font,
      color: rgb(0.3, 0.35, 0.4),
    });
  }
}

