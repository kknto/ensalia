# Plan de QA y salida comercial de Ensalia

Este documento define las puertas de calidad para convertir la maqueta en un producto configurable. Una compilación correcta no es evidencia suficiente: cada versión debe probar persistencia, trazabilidad, actualización y recuperación.

## Matriz de aceptación

| Fase | Evidencia mínima | Puerta de salida |
|---|---|---|
| Identidad | Búsqueda de textos heredados, accesos Ensalia y alias anteriores | El nombre anterior sólo aparece en compatibilidad e historia |
| Núcleo configurable | Crear, previsualizar, publicar y restaurar perfiles | Sólo la versión publicada afecta la operación |
| Perfiles cliente | Dos clientes ficticios sobre el mismo ejecutable | No hay cambios de código ni contaminación entre perfiles |
| Formularios y catálogos | Visibilidad, obligatoriedad, orden y desactivación | No se debilitan campos estructurales ni se elimina historia |
| Reglas operativas | Equipos, calibración, unidades, folios y transiciones | La personalización no evade integridad o trazabilidad |
| Exportaciones | Perfiles Operación, Cliente y Auditoría | Los datos históricos conservan su configuración y significado |
| Seguridad | Sesiones y permisos Capturista/Revisor/Administrador | API y UI rechazan toda acción no autorizada |
| Licencia offline | Firma, vigencia, gracia, alteración y renovación | Un vencimiento nunca bloquea consulta, respaldo o exportación |
| Respaldo | Copia, hash, restauración y fallo simulado | Se recuperan base, perfiles, recursos y auditoría |
| Instalador | Windows limpio, actualización y desinstalación | No requiere herramientas de desarrollo ni pierde datos |
| Piloto | Operación real de dos a cuatro semanas | Cero defectos críticos y aceptación documentada |

## Bases permanentes de prueba

Mantener tres bases anonimizadas:

1. Una instalación limpia.
2. Una base histórica migrada con muestras en todos los estados y registros de inventario anteriores.
3. Una base de volumen para tiempos de inicio, búsqueda, respaldo y exportación.

Cada versión debe comprobar conteos, estados, folios, fechas, asignaciones, calibraciones, auditoría, llaves foráneas e índices antes y después de migrar. Las muestras históricas no deben reinterpretarse silenciosamente con el perfil publicado actual.

## Pruebas de perfiles

- La plantilla base se duplica, no se modifica directamente.
- Un borrador no cambia la operación.
- La vista previa no consume folios ni crea datos.
- Una publicación obsoleta responde con conflicto controlado.
- Publicar crea auditoría y respaldo previo.
- Restaurar genera otra versión y conserva la anterior.
- Importar rechaza checksum, versión, propiedades y recursos inválidos.
- Los catálogos usados sólo pueden desactivarse.
- Cada muestra conserva la versión o instantánea de configuración necesaria.

## Roles mínimos

| Acción | Capturista | Revisor | Administrador |
|---|---:|---:|---:|
| Crear y editar borradores | Sí | Sí | Sí |
| Revisar o cerrar | No | Sí | Sí |
| Consultar inventario | Sí | Sí | Sí |
| Cambiar estados críticos | No | Según política | Sí |
| Publicar perfiles | No | No | Sí |
| Restaurar y gestionar usuarios | No | No | Sí |

Los permisos deben comprobarse en las API, no sólo ocultando botones. Las credenciales se almacenarán con hash, las sesiones se invalidarán al desactivar un usuario y las acciones críticas registrarán usuario, fecha, motivo y versión.

## Actualización y recuperación

Una actualización comercial deberá validar espacio y compatibilidad, detener la aplicación, respaldar, instalar, migrar, ejecutar un health check y activar la versión nueva. Ante fallo deberá conservar el respaldo y restaurar los binarios anteriores. Las migraciones destructivas requieren una estrategia explícita; no se debe prometer rollback automático cuando el esquema no lo permite.

El restaurador debe validar manifiesto y SHA-256, preparar el archivo entrante y sustituir la base sólo después de validar. Deben ensayarse corte durante copia, respaldo alterado y recuperación en otra PC autorizada.

## Instalador en PC limpia

Probar en una máquina virtual sin Node.js, npm, Git, Prisma ni variables del proyecto. Cubrir usuario estándar, rutas con espacios, primer y segundo inicio, reinicio de Windows, puerto ocupado, antivirus, actualización con datos, desinstalación sin borrar información y reinstalación. El instalador final debe estar firmado antes de distribución pública.

## Licencia offline

La licencia será un documento firmado y validado con una clave pública incluida en la aplicación. Probar cliente, instalación, módulos, vigencia, gracia, archivo modificado, cambio de fecha, renovación y reactivación. Si vence, podrá detener nuevas operaciones, pero siempre permitirá consulta, respaldo, restauración y exportación de los datos del cliente.

## Severidad

- **P0:** pérdida o corrupción, acceso no autorizado o restauración imposible. Bloquea toda entrega.
- **P1:** flujo principal inutilizable, migración fallida o actualización irrecuperable. Bloquea piloto y producción.
- **P2:** función secundaria con alternativa segura. Requiere plan y fecha.
- **P3:** defecto menor de presentación o texto.

## Definición de listo para comercializar

- Una compilación atiende al menos dos clientes sin cambios de código.
- Perfil, publicación, importación y restauración son versionados y auditables.
- Los datos históricos sobreviven cambios de perfil y migraciones.
- Los roles protegen UI y API.
- Respaldo y restauración fueron demostrados.
- Instalación y actualización funcionan en una PC limpia.
- La licencia offline no secuestra los datos.
- No existen defectos P0 o P1.
- Existen manuales de operación, administración, recuperación y soporte.
- Un cliente piloto completó el periodo acordado y firmó aceptación.
