CREATE TABLE "CargaInventario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idempotencyKey" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cantidadSolicitada" INTEGER NOT NULL,
    "cantidadCreada" INTEGER NOT NULL DEFAULT 0,
    "contenidoHash" TEXT NOT NULL,
    "parametrosJson" JSONB,
    "resultadoJson" JSONB,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoEn" DATETIME,
    CONSTRAINT "CargaInventario_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CargaInventario_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoEquipo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "Equipo" ADD COLUMN "cargaInventarioId" TEXT REFERENCES "CargaInventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovimientoEquipo" ADD COLUMN "cargaInventarioId" TEXT REFERENCES "CargaInventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CargaInventario_idempotencyKey_key" ON "CargaInventario"("idempotencyKey");
CREATE INDEX "CargaInventario_creadoEn_idx" ON "CargaInventario"("creadoEn");
CREATE INDEX "CargaInventario_tipoId_creadoEn_idx" ON "CargaInventario"("tipoId", "creadoEn");
CREATE INDEX "Equipo_cargaInventarioId_idx" ON "Equipo"("cargaInventarioId");
CREATE INDEX "MovimientoEquipo_cargaInventarioId_creadoEn_idx" ON "MovimientoEquipo"("cargaInventarioId", "creadoEn");
