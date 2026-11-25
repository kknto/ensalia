CREATE TABLE "Colado" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "folio" TEXT NOT NULL,
  "fechaColado" DATETIME NOT NULL,
  "cliente" TEXT NOT NULL,
  "obra" TEXT NOT NULL,
  "localizacion" TEXT,
  "procedencia" TEXT,
  "elemento" TEXT,
  "volumenM3" DECIMAL,
  "fcKgCm2" DECIMAL,
  "tipoConcreto" TEXT,
  "concretera" TEXT,
  "tmaMm" DECIMAL,
  "cemento" TEXT,
  "observaciones" TEXT,
  "numeroTomas" INTEGER NOT NULL DEFAULT 1,
  "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
  "esSintetico" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL,
  "cerradoEn" DATETIME,
  "anuladoEn" DATETIME,
  "creadorId" TEXT NOT NULL,
  "perfilClienteId" TEXT,
  "versionPerfilId" TEXT,
  "configuracionSnapshotJson" JSONB,
  CONSTRAINT "Colado_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Colado_perfilClienteId_fkey" FOREIGN KEY ("perfilClienteId") REFERENCES "PerfilCliente"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Colado_versionPerfilId_fkey" FOREIGN KEY ("versionPerfilId") REFERENCES "VersionPerfil"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "Muestra" ADD COLUMN "coladoId" TEXT REFERENCES "Colado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Muestra" ADD COLUMN "numeroDentroColado" INTEGER;
ALTER TABLE "Auditoria" ADD COLUMN "coladoId" TEXT REFERENCES "Colado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Colado" (
  "id", "folio", "fechaColado", "cliente", "obra", "localizacion", "procedencia", "elemento", "volumenM3",
  "fcKgCm2", "tipoConcreto", "concretera", "tmaMm", "cemento", "observaciones", "numeroTomas", "estado",
  "esSintetico", "version", "creadoEn", "actualizadoEn", "cerradoEn", "anuladoEn", "creadorId",
  "perfilClienteId", "versionPerfilId", "configuracionSnapshotJson"
)
SELECT
  'colado-historico-' || "id", 'COL-HIST-' || "idMuestra", "fechaMuestreo", "cliente", "obra", "localizacion",
  "procedencia", "elemento", "volumenM3", "fcKgCm2", "tipoConcreto", "concretera", "tmaMm", "cemento",
  "observaciones", 1,
  CASE WHEN "estatusBitacora" = 'CERRADA' THEN 'CERRADO' WHEN "estatusBitacora" = 'ANULADA' THEN 'ANULADO' ELSE 'ABIERTO' END,
  true, 0, "creadoEn", "actualizadoEn", "cerradoEn",
  CASE WHEN "estatusBitacora" = 'ANULADA' THEN "actualizadoEn" ELSE NULL END,
  "creadorId", "perfilClienteId", "versionPerfilId", "configuracionSnapshotJson"
FROM "Muestra";

UPDATE "Muestra"
SET "coladoId" = 'colado-historico-' || "id", "numeroDentroColado" = 1
WHERE "coladoId" IS NULL;

CREATE UNIQUE INDEX "Colado_folio_key" ON "Colado"("folio");
CREATE INDEX "Colado_fechaColado_idx" ON "Colado"("fechaColado");
CREATE INDEX "Colado_cliente_obra_idx" ON "Colado"("cliente", "obra");
CREATE INDEX "Colado_estado_actualizadoEn_idx" ON "Colado"("estado", "actualizadoEn");
CREATE UNIQUE INDEX "Muestra_coladoId_numeroDentroColado_key" ON "Muestra"("coladoId", "numeroDentroColado");
CREATE INDEX "Muestra_coladoId_creadoEn_idx" ON "Muestra"("coladoId", "creadoEn");
CREATE INDEX "Auditoria_coladoId_creadoEn_idx" ON "Auditoria"("coladoId", "creadoEn");
