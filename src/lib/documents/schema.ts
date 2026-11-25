import { z } from "zod";

export const issueFieldSheetSchema = z.object({
  versionMuestra: z.number().int().min(0),
  motivoSustitucion: z.string().trim().min(5).max(500).optional(),
}).strict();

export const cancelFieldSheetSchema = z.object({
  motivo: z.string().trim().min(5).max(500),
}).strict();

export const reprintFieldSheetSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
  copiaControlada: z.boolean().default(false),
}).strict();
