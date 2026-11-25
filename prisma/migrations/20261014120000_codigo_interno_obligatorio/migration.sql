PRAGMA foreign_keys=OFF;

ALTER TABLE "TipoEquipo" ADD COLUMN "obligatorioEnMuestra" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "new_Equipo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tipoId" TEXT NOT NULL,
  "numeroSerie" TEXT,
  "codigoInterno" TEXT NOT NULL,
  "marca" TEXT,
  "modelo" TEXT,
  "descripcion" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
  "ubicacion" TEXT,
  "fechaAlta" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaBaja" DATETIME,
  "motivoBaja" TEXT,
  "calibracionVigenteHasta" DATETIME,
  "notas" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL,
  CONSTRAINT "Equipo_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoEquipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Equipo" (
  "id", "tipoId", "numeroSerie", "codigoInterno", "marca", "modelo", "descripcion", "estado", "ubicacion",
  "fechaAlta", "fechaBaja", "motivoBaja", "calibracionVigenteHasta", "notas", "version", "creadoEn", "actualizadoEn"
)
SELECT
  "id", "tipoId", NULLIF(TRIM("numeroSerie"), ''),
  CASE
    WHEN NULLIF(TRIM("codigoInterno"), '') IS NOT NULL THEN TRIM("codigoInterno")
    ELSE '__MIGRADO__-' || COALESCE(NULLIF(TRIM("numeroSerie"), ''), 'SIN-SERIE') || '-' || "id"
  END,
  "marca", "modelo", "descripcion", "estado", "ubicacion", "fechaAlta", "fechaBaja", "motivoBaja",
  "calibracionVigenteHasta", "notas", "version", "creadoEn", "actualizadoEn"
FROM "Equipo";

DROP TABLE "Equipo";
ALTER TABLE "new_Equipo" RENAME TO "Equipo";
CREATE UNIQUE INDEX "Equipo_codigoInterno_key" ON "Equipo"("codigoInterno");
CREATE INDEX "Equipo_tipoId_estado_idx" ON "Equipo"("tipoId", "estado");
CREATE INDEX "Equipo_calibracionVigenteHasta_idx" ON "Equipo"("calibracionVigenteHasta");

CREATE TABLE "new_AsignacionEquipo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "muestraId" TEXT NOT NULL,
  "equipoId" TEXT NOT NULL,
  "especimenId" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'ASIGNADA',
  "asignadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "asignadoPorId" TEXT NOT NULL,
  "devueltoEn" DATETIME,
  "devueltoPorId" TEXT,
  "observacionesEntrega" TEXT,
  "observacionesDevolucion" TEXT,
  "tipoCodigoSnapshot" TEXT NOT NULL,
  "tipoNombreSnapshot" TEXT NOT NULL,
  "codigoInternoSnapshot" TEXT NOT NULL,
  "numeroSerieSnapshot" TEXT,
  CONSTRAINT "AsignacionEquipo_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionEquipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionEquipo_especimenId_fkey" FOREIGN KEY ("especimenId") REFERENCES "Especimen"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AsignacionEquipo_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionEquipo_devueltoPorId_fkey" FOREIGN KEY ("devueltoPorId") REFERENCES "Operador"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AsignacionEquipo" (
  "id", "muestraId", "equipoId", "especimenId", "estado", "asignadoEn", "asignadoPorId", "devueltoEn",
  "devueltoPorId", "observacionesEntrega", "observacionesDevolucion", "tipoCodigoSnapshot", "tipoNombreSnapshot",
  "codigoInternoSnapshot", "numeroSerieSnapshot"
)
SELECT
  a."id", a."muestraId", a."equipoId", a."especimenId", a."estado", a."asignadoEn", a."asignadoPorId", a."devueltoEn",
  a."devueltoPorId", a."observacionesEntrega", a."observacionesDevolucion", a."tipoCodigoSnapshot", a."tipoNombreSnapshot",
  e."codigoInterno", NULLIF(TRIM(a."numeroSerieSnapshot"), '')
FROM "AsignacionEquipo" a
JOIN "Equipo" e ON e."id" = a."equipoId";

DROP TABLE "AsignacionEquipo";
ALTER TABLE "new_AsignacionEquipo" RENAME TO "AsignacionEquipo";
CREATE INDEX "AsignacionEquipo_muestraId_estado_idx" ON "AsignacionEquipo"("muestraId", "estado");
CREATE INDEX "AsignacionEquipo_equipoId_estado_idx" ON "AsignacionEquipo"("equipoId", "estado");
CREATE INDEX "AsignacionEquipo_especimenId_idx" ON "AsignacionEquipo"("especimenId");
CREATE UNIQUE INDEX "AsignacionEquipo_equipo_activo_key" ON "AsignacionEquipo"("equipoId") WHERE "estado" = 'ASIGNADA';
CREATE UNIQUE INDEX "AsignacionEquipo_especimen_activo_key" ON "AsignacionEquipo"("especimenId") WHERE "estado" = 'ASIGNADA' AND "especimenId" IS NOT NULL;

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
