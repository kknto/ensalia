-- AlterTable
ALTER TABLE "CalibracionEquipo" ADD COLUMN "incertidumbre" TEXT;
ALTER TABLE "CalibracionEquipo" ADD COLUMN "laboratorioCalibracion" TEXT;
ALTER TABLE "CalibracionEquipo" ADD COLUMN "numeroAcreditacion" TEXT;

-- AlterTable
ALTER TABLE "Colado" ADD COLUMN "ciudad" TEXT;
ALTER TABLE "Colado" ADD COLUMN "coordenadasColado" TEXT;
ALTER TABLE "Colado" ADD COLUMN "direccion" TEXT;
ALTER TABLE "Colado" ADD COLUMN "revenimientoCm" DECIMAL;
ALTER TABLE "Colado" ADD COLUMN "sistema" TEXT;
ALTER TABLE "Colado" ADD COLUMN "toleranciaRevenimiento" TEXT;

-- AlterTable
ALTER TABLE "Equipo" ADD COLUMN "frecuenciaCalibracionMeses" INTEGER;
ALTER TABLE "Equipo" ADD COLUMN "frecuenciaMantenimientoMeses" INTEGER;
ALTER TABLE "Equipo" ADD COLUMN "mantenimientoVigenteHasta" DATETIME;

-- AlterTable
ALTER TABLE "Especimen" ADD COLUMN "numeroMolde" TEXT;

-- AlterTable
ALTER TABLE "Muestra" ADD COLUMN "ciudad" TEXT;
ALTER TABLE "Muestra" ADD COLUMN "coordenadasColado" TEXT;
ALTER TABLE "Muestra" ADD COLUMN "direccion" TEXT;
ALTER TABLE "Muestra" ADD COLUMN "elaboracionMuestra" DATETIME;
ALTER TABLE "Muestra" ADD COLUMN "revenimientoObtenido2" DECIMAL;
ALTER TABLE "Muestra" ADD COLUMN "sistema" TEXT;
ALTER TABLE "Muestra" ADD COLUMN "toleranciaRevenimiento" TEXT;

-- CreateTable
CREATE TABLE "SuscripcionLocal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "licenciaToken" TEXT,
    "titular" TEXT NOT NULL,
    "emisor" TEXT NOT NULL DEFAULT 'ENSALIA Cloud',
    "validaDesde" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validaHasta" DATETIME,
    "dispositivosMaximos" INTEGER NOT NULL DEFAULT 1,
    "firmaDigitalSha256" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ModuloFeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "suscripcionId" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT false,
    "limitesJson" JSONB,
    "expiraEn" DATETIME,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "ModuloFeatureFlag_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "SuscripcionLocal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentoCalibracion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calibracionId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "nombreSeguro" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "tamano" INTEGER NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "rutaRelativa" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subidoPorId" TEXT NOT NULL,
    CONSTRAINT "DocumentoCalibracion_calibracionId_fkey" FOREIGN KEY ("calibracionId") REFERENCES "CalibracionEquipo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentoCalibracion_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MantenimientoEquipo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PREVENTIVO',
    "estado" TEXT NOT NULL DEFAULT 'PROGRAMADO',
    "fechaProgramada" DATETIME NOT NULL,
    "fechaRealizada" DATETIME,
    "proximoMantenimiento" DATETIME,
    "proveedor" TEXT,
    "costo" DECIMAL,
    "descripcion" TEXT NOT NULL,
    "tareasRealizadas" TEXT,
    "piezasReemplazadas" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "MantenimientoEquipo_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MantenimientoEquipo_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentoMantenimiento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mantenimientoId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "nombreSeguro" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "tamano" INTEGER NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "rutaRelativa" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subidoPorId" TEXT NOT NULL,
    CONSTRAINT "DocumentoMantenimiento_mantenimientoId_fkey" FOREIGN KEY ("mantenimientoId") REFERENCES "MantenimientoEquipo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentoMantenimiento_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DespachoMuestra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folio" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'RECOLECCION_OBRA',
    "estado" TEXT NOT NULL DEFAULT 'PROGRAMADO',
    "fechaProgramada" DATETIME NOT NULL,
    "fechaSalida" DATETIME,
    "fechaRetorno" DATETIME,
    "choferOperadorId" TEXT NOT NULL,
    "vehiculo" TEXT,
    "placas" TEXT,
    "origen" TEXT,
    "destino" TEXT,
    "observaciones" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "DespachoMuestra_choferOperadorId_fkey" FOREIGN KEY ("choferOperadorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemDespachoMuestra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "despachoId" TEXT NOT NULL,
    "muestraId" TEXT NOT NULL,
    "especimenId" TEXT,
    "estadoItem" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "horaRecoleccion" DATETIME,
    "tempRecoleccionC" DECIMAL,
    "condicionEspecimen" TEXT,
    "observaciones" TEXT,
    "firmaRecibidoNombre" TEXT,
    "firmaRecibidoCargo" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "ItemDespachoMuestra_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "DespachoMuestra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemDespachoMuestra_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ItemDespachoMuestra_especimenId_fkey" FOREIGN KEY ("especimenId") REFERENCES "Especimen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnsayeCompresion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "especimenId" TEXT NOT NULL,
    "equipoPrensaId" TEXT,
    "operadorEnsayeId" TEXT NOT NULL,
    "fechaHoraEnsaye" DATETIME NOT NULL,
    "edadRealDias" INTEGER NOT NULL,
    "diametroMm" DECIMAL NOT NULL,
    "longitudMm" DECIMAL NOT NULL,
    "areaCm2" DECIMAL NOT NULL,
    "masaG" DECIMAL,
    "densidadKgM3" DECIMAL,
    "cargaMaximaKn" DECIMAL NOT NULL,
    "cargaMaximaKg" DECIMAL NOT NULL,
    "resistenciaKgCm2" DECIMAL NOT NULL,
    "porcentajeFc" DECIMAL,
    "tipoFalla" TEXT NOT NULL DEFAULT 'CONO_TIPO_1',
    "condicionHumedad" TEXT NOT NULL DEFAULT 'HUMEDO_SATURADO',
    "cumpleEspecificacion" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "EnsayeCompresion_especimenId_fkey" FOREIGN KEY ("especimenId") REFERENCES "Especimen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EnsayeCompresion_equipoPrensaId_fkey" FOREIGN KEY ("equipoPrensaId") REFERENCES "Equipo" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EnsayeCompresion_operadorEnsayeId_fkey" FOREIGN KEY ("operadorEnsayeId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FotoEnsayeCompresion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ensayeId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ROTURA_FRACTURA',
    "nombreArchivo" TEXT NOT NULL,
    "nombreSeguro" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/webp',
    "tamano" INTEGER NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "rutaRelativa" TEXT NOT NULL,
    "anchoPx" INTEGER,
    "altoPx" INTEGER,
    "capturadaEn" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subidoPorId" TEXT NOT NULL,
    CONSTRAINT "FotoEnsayeCompresion_ensayeId_fkey" FOREIGN KEY ("ensayeId") REFERENCES "EnsayeCompresion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FotoEnsayeCompresion_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SuscripcionLocal_licenciaToken_key" ON "SuscripcionLocal"("licenciaToken");

-- CreateIndex
CREATE INDEX "SuscripcionLocal_plan_estado_idx" ON "SuscripcionLocal"("plan", "estado");

-- CreateIndex
CREATE INDEX "ModuloFeatureFlag_modulo_habilitado_idx" ON "ModuloFeatureFlag"("modulo", "habilitado");

-- CreateIndex
CREATE UNIQUE INDEX "ModuloFeatureFlag_suscripcionId_modulo_key" ON "ModuloFeatureFlag"("suscripcionId", "modulo");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoCalibracion_calibracionId_key" ON "DocumentoCalibracion"("calibracionId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoCalibracion_rutaRelativa_key" ON "DocumentoCalibracion"("rutaRelativa");

-- CreateIndex
CREATE INDEX "DocumentoCalibracion_calibracionId_creadoEn_idx" ON "DocumentoCalibracion"("calibracionId", "creadoEn");

-- CreateIndex
CREATE INDEX "MantenimientoEquipo_equipoId_fechaProgramada_idx" ON "MantenimientoEquipo"("equipoId", "fechaProgramada");

-- CreateIndex
CREATE INDEX "MantenimientoEquipo_estado_fechaProgramada_idx" ON "MantenimientoEquipo"("estado", "fechaProgramada");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoMantenimiento_rutaRelativa_key" ON "DocumentoMantenimiento"("rutaRelativa");

-- CreateIndex
CREATE INDEX "DocumentoMantenimiento_mantenimientoId_idx" ON "DocumentoMantenimiento"("mantenimientoId");

-- CreateIndex
CREATE UNIQUE INDEX "DespachoMuestra_folio_key" ON "DespachoMuestra"("folio");

-- CreateIndex
CREATE INDEX "DespachoMuestra_fechaProgramada_estado_idx" ON "DespachoMuestra"("fechaProgramada", "estado");

-- CreateIndex
CREATE INDEX "DespachoMuestra_choferOperadorId_estado_idx" ON "DespachoMuestra"("choferOperadorId", "estado");

-- CreateIndex
CREATE INDEX "ItemDespachoMuestra_muestraId_idx" ON "ItemDespachoMuestra"("muestraId");

-- CreateIndex
CREATE INDEX "ItemDespachoMuestra_despachoId_estadoItem_idx" ON "ItemDespachoMuestra"("despachoId", "estadoItem");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDespachoMuestra_despachoId_muestraId_especimenId_key" ON "ItemDespachoMuestra"("despachoId", "muestraId", "especimenId");

-- CreateIndex
CREATE UNIQUE INDEX "EnsayeCompresion_especimenId_key" ON "EnsayeCompresion"("especimenId");

-- CreateIndex
CREATE INDEX "EnsayeCompresion_fechaHoraEnsaye_idx" ON "EnsayeCompresion"("fechaHoraEnsaye");

-- CreateIndex
CREATE INDEX "EnsayeCompresion_equipoPrensaId_idx" ON "EnsayeCompresion"("equipoPrensaId");

-- CreateIndex
CREATE INDEX "EnsayeCompresion_operadorEnsayeId_idx" ON "EnsayeCompresion"("operadorEnsayeId");

-- CreateIndex
CREATE UNIQUE INDEX "FotoEnsayeCompresion_rutaRelativa_key" ON "FotoEnsayeCompresion"("rutaRelativa");

-- CreateIndex
CREATE INDEX "FotoEnsayeCompresion_ensayeId_tipo_idx" ON "FotoEnsayeCompresion"("ensayeId", "tipo");

