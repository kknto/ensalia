# Contratos JSON de inventario

Todas las escrituras usan los encabezados existentes `x-operator-id` o `x-operator-name` y, cuando esté configurado, `x-app-access-code`.

## Equipos

- `GET /api/equipos?q=&tipoId=&estado=` devuelve un arreglo de equipos con `tipo`.
- `POST /api/equipos`: `{ tipoId, codigoInterno, numeroSerie?, marca?, modelo?, descripcion?, ubicacion?, notas? }`.
- `codigoInterno` es obligatorio y único en todo el inventario. `numeroSerie` es opcional y corresponde a la identificación del fabricante.
- `GET /api/equipos/:id` incluye tipo, asignaciones y calibraciones.
- `PATCH /api/equipos/:id` acepta campos editables y exige `version`.
- `POST /api/equipos/:id/estado`: `{ estado, motivo, version }`. No admite `ASIGNADO`; ese estado sólo se obtiene mediante una asignación.
- `GET /api/equipos/:id/historial` devuelve movimientos con operador y muestra.
- `GET|POST /api/equipos/tipos`; `PATCH /api/equipos/tipos/:id`. El contrato del tipo incluye `obligatorioEnMuestra`, cuyo valor predeterminado es `false`.

## Calibraciones

- `GET /api/equipos/:id/calibraciones`.
- `POST /api/equipos/:id/calibraciones`: `{ fecha, venceEn?, resultado?, certificado?, proveedor?, observaciones? }`.
- Las fechas son ISO 8601 con zona horaria. `resultado` es `APROBADO`, `RECHAZADO` o `LIMITADO`.

## Equipos de una muestra

- `GET /api/muestras/:id/equipos` devuelve todas las asignaciones, incluidas las devueltas.
- `POST /api/muestras/:id/equipos`: `{ versionMuestra, observaciones?, equipos: [{ equipoId, especimenId? }] }`.
- `POST /api/muestras/:id/equipos/devolver`: `{ versionMuestra, asignacionIds, observaciones?, estadoFinal? }`.
- Una asignación por lote es atómica. Un molde exige `especimenId` y debe corresponder a su tipo.
- Cada escritura incrementa `Muestra.version` o `Equipo.version`; ante HTTP 409, UX debe recargar el registro.

Los errores tienen `{ error: string, details?: object }`. Los indicadores booleanos históricos de `Muestra` se conservan; `inventarioGestionado` distingue registros con trazabilidad individual. Una muestra administrada por inventario no puede revisarse si falta un molde, un tipo activo marcado `obligatorioEnMuestra`, un equipo indicado por las casillas históricas o existe calibración vencida.
