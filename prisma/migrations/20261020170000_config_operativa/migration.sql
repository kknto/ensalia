CREATE TABLE "ValorCatalogoPerfil" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "perfilId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "metadataJson" JSONB,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL,
  CONSTRAINT "ValorCatalogoPerfil_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilCliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SecuenciaFolio" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "perfilId" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "anio" INTEGER NOT NULL,
  "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
  "actualizadoEn" DATETIME NOT NULL,
  CONSTRAINT "SecuenciaFolio_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "PerfilCliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ValorCatalogoPerfil_perfilId_tipo_clave_key" ON "ValorCatalogoPerfil"("perfilId", "tipo", "clave");
CREATE INDEX "ValorCatalogoPerfil_perfilId_tipo_activo_orden_idx" ON "ValorCatalogoPerfil"("perfilId", "tipo", "activo", "orden");
CREATE UNIQUE INDEX "SecuenciaFolio_perfilId_clave_anio_key" ON "SecuenciaFolio"("perfilId", "clave", "anio");
