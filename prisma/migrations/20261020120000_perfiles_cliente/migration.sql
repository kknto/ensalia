-- Perfiles de personalizacion versionados. Todas las columnas nuevas en Muestra
-- son opcionales para conservar registros historicos sin inventar configuracion.
CREATE TABLE "PerfilCliente" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clave" TEXT NOT NULL,
  "nombreInterno" TEXT NOT NULL,
  "esPlantillaSistema" BOOLEAN NOT NULL DEFAULT false,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "versionPublicadaId" TEXT,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL,
  CONSTRAINT "PerfilCliente_versionPublicadaId_fkey" FOREIGN KEY ("versionPublicadaId") REFERENCES "VersionPerfil" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "VersionPerfil" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "perfilId" TEXT NOT NULL,
  "numeroVersion" INTEGER NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
  "basadaEnId" TEXT,
  "esquemaVersion" INTEGER NOT NULL DEFAULT 1,
  "configuracionJson" JSONB NOT NULL,
  "checksum" TEXT,
  "notas" TEXT,
  "creadaPorId" TEXT NOT NULL,
  "validadaPorId" TEXT,
  "publicadaPorId" TEXT,
  "creadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validadaEn" DATETIME,
  "publicadaEn" DATETIME,
  CONSTRAINT "VersionPerfil_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilCliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "VersionPerfil_basadaEnId_fkey" FOREIGN KEY ("basadaEnId") REFERENCES "VersionPerfil" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "VersionPerfil_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VersionPerfil_validadaPorId_fkey" FOREIGN KEY ("validadaPorId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "VersionPerfil_publicadaPorId_fkey" FOREIGN KEY ("publicadaPorId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "RecursoPerfil" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "versionPerfilId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "nombreSeguro" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tamano" INTEGER NOT NULL,
  "hashSha256" TEXT NOT NULL,
  "rutaRelativa" TEXT NOT NULL,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecursoPerfil_versionPerfilId_fkey" FOREIGN KEY ("versionPerfilId") REFERENCES "VersionPerfil" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PublicacionPerfil" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "perfilId" TEXT NOT NULL,
  "versionAnteriorId" TEXT,
  "versionNuevaId" TEXT NOT NULL,
  "operadorId" TEXT NOT NULL,
  "respaldoRuta" TEXT,
  "resultado" TEXT NOT NULL,
  "detalleJson" JSONB,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicacionPerfil_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilCliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PublicacionPerfil_versionAnteriorId_fkey" FOREIGN KEY ("versionAnteriorId") REFERENCES "VersionPerfil" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PublicacionPerfil_versionNuevaId_fkey" FOREIGN KEY ("versionNuevaId") REFERENCES "VersionPerfil" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PublicacionPerfil_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "Muestra" ADD COLUMN "perfilClienteId" TEXT REFERENCES "PerfilCliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Muestra" ADD COLUMN "versionPerfilId" TEXT REFERENCES "VersionPerfil"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Muestra" ADD COLUMN "configuracionSnapshotJson" JSONB;

CREATE UNIQUE INDEX "PerfilCliente_clave_key" ON "PerfilCliente"("clave");
CREATE UNIQUE INDEX "PerfilCliente_versionPublicadaId_key" ON "PerfilCliente"("versionPublicadaId");
CREATE INDEX "PerfilCliente_activo_nombreInterno_idx" ON "PerfilCliente"("activo", "nombreInterno");
CREATE UNIQUE INDEX "VersionPerfil_perfilId_numeroVersion_key" ON "VersionPerfil"("perfilId", "numeroVersion");
CREATE INDEX "VersionPerfil_perfilId_estado_idx" ON "VersionPerfil"("perfilId", "estado");
CREATE INDEX "RecursoPerfil_versionPerfilId_tipo_idx" ON "RecursoPerfil"("versionPerfilId", "tipo");
CREATE INDEX "PublicacionPerfil_perfilId_creadoEn_idx" ON "PublicacionPerfil"("perfilId", "creadoEn");
CREATE INDEX "Muestra_perfilClienteId_versionPerfilId_idx" ON "Muestra"("perfilClienteId", "versionPerfilId");
