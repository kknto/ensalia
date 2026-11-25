-- AlterTable
ALTER TABLE "Colado" ADD COLUMN "altitudM" REAL;
ALTER TABLE "Colado" ADD COLUMN "gpsCapturadoEn" DATETIME;
ALTER TABLE "Colado" ADD COLUMN "gpsEstado" TEXT;
ALTER TABLE "Colado" ADD COLUMN "latitud" REAL;
ALTER TABLE "Colado" ADD COLUMN "longitud" REAL;
ALTER TABLE "Colado" ADD COLUMN "precisionM" REAL;

-- CreateTable
CREATE TABLE "DispositivoMovil" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceUuid" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modelo" TEXT,
    "plataforma" TEXT NOT NULL DEFAULT 'ANDROID',
    "appVersion" TEXT,
    "codigoEnrolamiento" TEXT,
    "codigoExpiraEn" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "ultimoAcceso" DATETIME,
    "ipUltimoAcceso" TEXT,
    "tokenRevocadoEn" DATETIME,
    "operadorAsignadoId" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "DispositivoMovil_operadorAsignadoId_fkey" FOREIGN KEY ("operadorAsignadoId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FotoMuestra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "muestraId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'MUESTREO_OLLA',
    "nombreSeguro" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "tamanoBytes" INTEGER NOT NULL,
    "hashSha256" TEXT NOT NULL,
    "rutaRelativa" TEXT NOT NULL,
    "anchoPx" INTEGER,
    "altoPx" INTEGER,
    "latitud" REAL,
    "longitud" REAL,
    "precisionM" REAL,
    "exifJson" TEXT,
    "capturadaEnDispositivo" DATETIME NOT NULL,
    "sincronizadaEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispositivoId" TEXT,
    "subidoPorId" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FotoMuestra_muestraId_fkey" FOREIGN KEY ("muestraId") REFERENCES "Muestra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FotoMuestra_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "DispositivoMovil" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FotoMuestra_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Muestra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idMuestra" TEXT NOT NULL,
    "fechaMuestreo" DATETIME NOT NULL,
    "cliente" TEXT NOT NULL,
    "obra" TEXT NOT NULL,
    "localizacion" TEXT,
    "procedencia" TEXT,
    "elemento" TEXT,
    "ciudad" TEXT,
    "coordenadasColado" TEXT,
    "direccion" TEXT,
    "sistema" TEXT,
    "revenimientoCm" DECIMAL,
    "toleranciaRevenimiento" TEXT,
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
    "elaboracionMuestra" DATETIME,
    "revenimientoObtenido" DECIMAL,
    "revenimientoObtenido2" DECIMAL,
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
    "version" INTEGER NOT NULL DEFAULT 0,
    "inventarioGestionado" BOOLEAN NOT NULL DEFAULT false,
    "perfilClienteId" TEXT,
    "versionPerfilId" TEXT,
    "configuracionSnapshotJson" JSONB,
    "coladoId" TEXT,
    "numeroDentroColado" INTEGER,
    "latitud" REAL,
    "longitud" REAL,
    "precisionM" REAL,
    "altitudM" REAL,
    "gpsCapturadoEn" DATETIME,
    "gpsEstado" TEXT,
    "dispositivoOrigenId" TEXT,
    CONSTRAINT "Muestra_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Muestra_revisorId_fkey" FOREIGN KEY ("revisorId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Muestra_cerradorId_fkey" FOREIGN KEY ("cerradorId") REFERENCES "Operador" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Muestra_perfilClienteId_fkey" FOREIGN KEY ("perfilClienteId") REFERENCES "PerfilCliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Muestra_versionPerfilId_fkey" FOREIGN KEY ("versionPerfilId") REFERENCES "VersionPerfil" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Muestra_coladoId_fkey" FOREIGN KEY ("coladoId") REFERENCES "Colado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Muestra_dispositivoOrigenId_fkey" FOREIGN KEY ("dispositivoOrigenId") REFERENCES "DispositivoMovil" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Muestra" ("actualizadoEn", "camion", "carretilla", "cemento", "cerradoEn", "cerradorId", "cilindro10x20", "cilindro15x30", "ciudad", "cliente", "coladoId", "concretera", "configuracionSnapshotJson", "conoRevenimiento", "contenidoAirePct", "coordenadasColado", "creadoEn", "creadorId", "cucharon", "direccion", "e10x20", "e15x30", "edadCilindro", "elaboracionMuestra", "elemento", "equipoContenidoAire", "estatusBitacora", "estatusRecoleccion", "fcKgCm2", "fechaMuestreo", "finDescarga", "id", "idMuestra", "inicioDescarga", "inventarioGestionado", "laboratoristaCampo", "llegadaObra", "localizacion", "noMuestra", "numeroDentroColado", "numeroEspecimenes", "obra", "observaciones", "perfilClienteId", "placaRevenimiento", "procedencia", "remision", "residenteObra", "revenimientoCm", "revenimientoObtenido", "revenimientoObtenido2", "revisadoEn", "revisorId", "salidaPlanta", "sistema", "tempAmbienteC", "tempConcretoC", "termometro", "tipoConcreto", "tmaMm", "toleranciaRevenimiento", "ubicacion", "v50", "varilla", "version", "versionPerfilId", "viga50x15x15", "volumenM3") SELECT "actualizadoEn", "camion", "carretilla", "cemento", "cerradoEn", "cerradorId", "cilindro10x20", "cilindro15x30", "ciudad", "cliente", "coladoId", "concretera", "configuracionSnapshotJson", "conoRevenimiento", "contenidoAirePct", "coordenadasColado", "creadoEn", "creadorId", "cucharon", "direccion", "e10x20", "e15x30", "edadCilindro", "elaboracionMuestra", "elemento", "equipoContenidoAire", "estatusBitacora", "estatusRecoleccion", "fcKgCm2", "fechaMuestreo", "finDescarga", "id", "idMuestra", "inicioDescarga", "inventarioGestionado", "laboratoristaCampo", "llegadaObra", "localizacion", "noMuestra", "numeroDentroColado", "numeroEspecimenes", "obra", "observaciones", "perfilClienteId", "placaRevenimiento", "procedencia", "remision", "residenteObra", "revenimientoCm", "revenimientoObtenido", "revenimientoObtenido2", "revisadoEn", "revisorId", "salidaPlanta", "sistema", "tempAmbienteC", "tempConcretoC", "termometro", "tipoConcreto", "tmaMm", "toleranciaRevenimiento", "ubicacion", "v50", "varilla", "version", "versionPerfilId", "viga50x15x15", "volumenM3" FROM "Muestra";
DROP TABLE "Muestra";
ALTER TABLE "new_Muestra" RENAME TO "Muestra";
CREATE UNIQUE INDEX "Muestra_idMuestra_key" ON "Muestra"("idMuestra");
CREATE INDEX "Muestra_fechaMuestreo_idx" ON "Muestra"("fechaMuestreo");
CREATE INDEX "Muestra_cliente_obra_idx" ON "Muestra"("cliente", "obra");
CREATE INDEX "Muestra_estatusBitacora_estatusRecoleccion_idx" ON "Muestra"("estatusBitacora", "estatusRecoleccion");
CREATE INDEX "Muestra_perfilClienteId_versionPerfilId_idx" ON "Muestra"("perfilClienteId", "versionPerfilId");
CREATE INDEX "Muestra_coladoId_creadoEn_idx" ON "Muestra"("coladoId", "creadoEn");
CREATE UNIQUE INDEX "Muestra_coladoId_numeroDentroColado_key" ON "Muestra"("coladoId", "numeroDentroColado");
CREATE TABLE "new_Operador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rol" TEXT NOT NULL DEFAULT 'OPERADOR_CAMPO',
    "pinHash" TEXT
);
INSERT INTO "new_Operador" ("activo", "creadoEn", "id", "nombre") SELECT "activo", "creadoEn", "id", "nombre" FROM "Operador";
DROP TABLE "Operador";
ALTER TABLE "new_Operador" RENAME TO "Operador";
CREATE UNIQUE INDEX "Operador_nombre_key" ON "Operador"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoMovil_deviceUuid_key" ON "DispositivoMovil"("deviceUuid");

-- CreateIndex
CREATE UNIQUE INDEX "DispositivoMovil_codigoEnrolamiento_key" ON "DispositivoMovil"("codigoEnrolamiento");

-- CreateIndex
CREATE INDEX "DispositivoMovil_estado_idx" ON "DispositivoMovil"("estado");

-- CreateIndex
CREATE INDEX "DispositivoMovil_codigoEnrolamiento_idx" ON "DispositivoMovil"("codigoEnrolamiento");

-- CreateIndex
CREATE UNIQUE INDEX "FotoMuestra_rutaRelativa_key" ON "FotoMuestra"("rutaRelativa");

-- CreateIndex
CREATE INDEX "FotoMuestra_muestraId_idx" ON "FotoMuestra"("muestraId");

-- CreateIndex
CREATE INDEX "FotoMuestra_dispositivoId_idx" ON "FotoMuestra"("dispositivoId");

-- CreateIndex
CREATE INDEX "FotoMuestra_categoria_idx" ON "FotoMuestra"("categoria");
