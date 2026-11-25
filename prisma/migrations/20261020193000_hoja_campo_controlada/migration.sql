CREATE TABLE "EmisionHojaCampo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "muestraId" TEXT NOT NULL,
  "numeroControl" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'EMITIDA',
  "versionMuestra" INTEGER NOT NULL,
  "perfilClienteId" TEXT,
  "versionPerfilId" TEXT,
  "plantillaCodigo" TEXT NOT NULL DEFAULT 'HOJA_CAMPO_CONCRETO',
  "plantillaVersion" INTEGER NOT NULL DEFAULT 1,
  "datosSnapshotJson" JSONB NOT NULL,
  "configuracionSnapshotJson" JSONB,
  "rutaPdf" TEXT NOT NULL,
  "pdfSha256" TEXT NOT NULL,
  "tamanoPdf" INTEGER NOT NULL,
  "tokenQrHash" TEXT NOT NULL,
  "emitidaPorId" TEXT NOT NULL,
  "emitidaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sustituyeAId" TEXT,
  "motivoAnulacion" TEXT,
  "anuladaPorId" TEXT,
  "anuladaEn" DATETIME,
  CONSTRAINT "EmisionHojaCampo_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EmisionHojaCampo_emitidaPorId_fkey" FOREIGN KEY ("emitidaPorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EmisionHojaCampo_anuladaPorId_fkey" FOREIGN KEY ("anuladaPorId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "EmisionHojaCampo_sustituyeAId_fkey" FOREIGN KEY ("sustituyeAId") REFERENCES "EmisionHojaCampo" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "EventoHojaCampo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "emisionId" TEXT NOT NULL,
  "operadorId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "detalleJson" JSONB,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventoHojaCampo_emisionId_fkey" FOREIGN KEY ("emisionId") REFERENCES "EmisionHojaCampo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EventoHojaCampo_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ArchivoHojaCampo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "emisionId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "nombreSeguro" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tamano" INTEGER NOT NULL,
  "hashSha256" TEXT NOT NULL,
  "rutaRelativa" TEXT NOT NULL,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArchivoHojaCampo_emisionId_fkey" FOREIGN KEY ("emisionId") REFERENCES "EmisionHojaCampo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EmisionHojaCampo_numeroControl_key" ON "EmisionHojaCampo"("numeroControl");
CREATE UNIQUE INDEX "EmisionHojaCampo_tokenQrHash_key" ON "EmisionHojaCampo"("tokenQrHash");
CREATE UNIQUE INDEX "EmisionHojaCampo_sustituyeAId_key" ON "EmisionHojaCampo"("sustituyeAId");
CREATE UNIQUE INDEX "EmisionHojaCampo_muestraId_revision_key" ON "EmisionHojaCampo"("muestraId", "revision");
CREATE INDEX "EmisionHojaCampo_muestraId_estado_emitidaEn_idx" ON "EmisionHojaCampo"("muestraId", "estado", "emitidaEn");
CREATE UNIQUE INDEX "EmisionHojaCampo_una_vigente_por_muestra" ON "EmisionHojaCampo"("muestraId") WHERE "estado" = 'EMITIDA';
CREATE INDEX "EventoHojaCampo_emisionId_creadoEn_idx" ON "EventoHojaCampo"("emisionId", "creadoEn");
CREATE UNIQUE INDEX "ArchivoHojaCampo_rutaRelativa_key" ON "ArchivoHojaCampo"("rutaRelativa");
CREATE INDEX "ArchivoHojaCampo_emisionId_tipo_creadoEn_idx" ON "ArchivoHojaCampo"("emisionId", "tipo", "creadoEn");
