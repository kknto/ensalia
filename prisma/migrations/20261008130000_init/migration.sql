-- CreateTable
CREATE TABLE "Operador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Catalogo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Muestra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idMuestra" TEXT NOT NULL,
    "fechaMuestreo" DATETIME NOT NULL,
    "cliente" TEXT NOT NULL,
    "obra" TEXT NOT NULL,
    "localizacion" TEXT,
    "procedencia" TEXT,
    "elemento" TEXT,
    "revenimientoCm" DECIMAL,
    "fcKgCm2" DECIMAL,
    "edadCilindro" INTEGER,
    "tipoConcreto" TEXT NOT NULL,
    "concretera" TEXT,
    "tmaMm" DECIMAL,
    "cemento" TEXT,
    "noMuestra" TEXT NOT NULL,
    "remision" TEXT,
    "camion" TEXT,
    "volumenM3" DECIMAL,
    "salidaPlanta" DATETIME,
    "llegadaObra" DATETIME,
    "inicioDescarga" DATETIME,
    "finDescarga" DATETIME,
    "revenimientoObtenido" DECIMAL,
    "tempAmbienteC" DECIMAL,
    "observaciones" TEXT,
    "contenidoAirePct" DECIMAL,
    "placaRevenimiento" BOOLEAN NOT NULL DEFAULT false,
    "conoRevenimiento" BOOLEAN NOT NULL DEFAULT false,
    "varilla" BOOLEAN NOT NULL DEFAULT false,
    "cucharon" BOOLEAN NOT NULL DEFAULT false,
    "termometro" BOOLEAN NOT NULL DEFAULT false,
    "carretilla" BOOLEAN NOT NULL DEFAULT false,
    "equipoContenidoAire" BOOLEAN NOT NULL DEFAULT false,
    "cilindro15x30" BOOLEAN NOT NULL DEFAULT false,
    "e15x30" BOOLEAN NOT NULL DEFAULT false,
    "cilindro10x20" BOOLEAN NOT NULL DEFAULT false,
    "e10x20" BOOLEAN NOT NULL DEFAULT false,
    "viga50x15x15" BOOLEAN NOT NULL DEFAULT false,
    "v50" BOOLEAN NOT NULL DEFAULT false,
    "numeroEspecimenes" INTEGER,
    "laboratoristaCampo" TEXT,
    "residenteObra" TEXT,
    "tempConcretoC" DECIMAL,
    "ubicacion" TEXT,
    "estatusBitacora" TEXT NOT NULL DEFAULT 'BORRADOR',
    "estatusRecoleccion" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    "revisadoEn" DATETIME,
    "cerradoEn" DATETIME,
    "creadorId" TEXT NOT NULL,
    "revisorId" TEXT,
    "cerradorId" TEXT,
    CONSTRAINT "Muestra_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Muestra_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Muestra_cerradorId_fkey" FOREIGN KEY ("cerradorId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Especimen" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "muestraId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "edadDias" INTEGER,
    "tipo" TEXT NOT NULL,
    "fechaEnsaye" DATETIME,
    CONSTRAINT "Especimen_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "muestraId" TEXT,
    "operadorId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "estadoAntes" TEXT,
    "estadoDespues" TEXT,
    "motivo" TEXT,
    "cambiosJson" JSONB,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Auditoria_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Auditoria_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Operador_nombre_key" ON "Operador"("nombre");

-- CreateIndex
CREATE INDEX "Catalogo_tipo_activo_idx" ON "Catalogo"("tipo", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Catalogo_tipo_nombre_key" ON "Catalogo"("tipo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Muestra_idMuestra_key" ON "Muestra"("idMuestra");

-- CreateIndex
CREATE INDEX "Muestra_fechaMuestreo_idx" ON "Muestra"("fechaMuestreo");

-- CreateIndex
CREATE INDEX "Muestra_cliente_obra_idx" ON "Muestra"("cliente", "obra");

-- CreateIndex
CREATE INDEX "Muestra_estatusBitacora_estatusRecoleccion_idx" ON "Muestra"("estatusBitacora", "estatusRecoleccion");

-- CreateIndex
CREATE UNIQUE INDEX "Especimen_muestraId_numero_key" ON "Especimen"("muestraId", "numero");

-- CreateIndex
CREATE INDEX "Auditoria_muestraId_creadoEn_idx" ON "Auditoria"("muestraId", "creadoEn");
