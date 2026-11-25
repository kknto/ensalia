ALTER TABLE "Muestra" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Muestra" ADD COLUMN "inventarioGestionado" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TipoEquipo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "requiereSerie" BOOLEAN NOT NULL DEFAULT true,
  "requiereCalibracion" BOOLEAN NOT NULL DEFAULT false,
  "esMolde" BOOLEAN NOT NULL DEFAULT false,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL
);

CREATE TABLE "Equipo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tipoId" TEXT NOT NULL,
  "numeroSerie" TEXT NOT NULL,
  "codigoInterno" TEXT,
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

CREATE TABLE "AsignacionEquipo" (
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
  "numeroSerieSnapshot" TEXT NOT NULL,
  CONSTRAINT "AsignacionEquipo_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionEquipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionEquipo_especimenId_fkey" FOREIGN KEY ("especimenId") REFERENCES "Especimen"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AsignacionEquipo_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AsignacionEquipo_devueltoPorId_fkey" FOREIGN KEY ("devueltoPorId") REFERENCES "Operador"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "CalibracionEquipo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "equipoId" TEXT NOT NULL,
  "fechaCalibracion" DATETIME NOT NULL,
  "vigenteHasta" DATETIME,
  "resultado" TEXT NOT NULL,
  "certificado" TEXT,
  "proveedor" TEXT,
  "observaciones" TEXT,
  "registradoPorId" TEXT NOT NULL,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalibracionEquipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CalibracionEquipo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "MovimientoEquipo" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "equipoId" TEXT NOT NULL,
  "muestraId" TEXT,
  "operadorId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "estadoAntes" TEXT,
  "estadoDespues" TEXT,
  "detalleJson" JSONB,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MovimientoEquipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MovimientoEquipo_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MovimientoEquipo_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TipoEquipo_codigo_key" ON "TipoEquipo"("codigo");
CREATE INDEX "TipoEquipo_activo_nombre_idx" ON "TipoEquipo"("activo", "nombre");
CREATE UNIQUE INDEX "Equipo_codigoInterno_key" ON "Equipo"("codigoInterno");
CREATE UNIQUE INDEX "Equipo_tipoId_numeroSerie_key" ON "Equipo"("tipoId", "numeroSerie");
CREATE INDEX "Equipo_tipoId_estado_idx" ON "Equipo"("tipoId", "estado");
CREATE INDEX "Equipo_calibracionVigenteHasta_idx" ON "Equipo"("calibracionVigenteHasta");
CREATE INDEX "AsignacionEquipo_muestraId_estado_idx" ON "AsignacionEquipo"("muestraId", "estado");
CREATE INDEX "AsignacionEquipo_equipoId_estado_idx" ON "AsignacionEquipo"("equipoId", "estado");
CREATE INDEX "AsignacionEquipo_especimenId_idx" ON "AsignacionEquipo"("especimenId");
CREATE UNIQUE INDEX "AsignacionEquipo_equipo_activo_key" ON "AsignacionEquipo"("equipoId") WHERE "estado" = 'ASIGNADA';
CREATE UNIQUE INDEX "AsignacionEquipo_especimen_activo_key" ON "AsignacionEquipo"("especimenId") WHERE "estado" = 'ASIGNADA' AND "especimenId" IS NOT NULL;
CREATE INDEX "CalibracionEquipo_equipoId_fechaCalibracion_idx" ON "CalibracionEquipo"("equipoId", "fechaCalibracion");
CREATE INDEX "CalibracionEquipo_vigenteHasta_idx" ON "CalibracionEquipo"("vigenteHasta");
CREATE INDEX "MovimientoEquipo_equipoId_creadoEn_idx" ON "MovimientoEquipo"("equipoId", "creadoEn");
CREATE INDEX "MovimientoEquipo_muestraId_creadoEn_idx" ON "MovimientoEquipo"("muestraId", "creadoEn");
