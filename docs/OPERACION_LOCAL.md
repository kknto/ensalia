# Operación local de Ensalia

## Carpetas persistentes

Para una instalación nueva:

- Base de datos: `%LOCALAPPDATA%\Ensalia\data\ensalia.db`
- Logs y diagnósticos: `%LOCALAPPDATA%\Ensalia\logs`
- Recursos visuales administrados: `%LOCALAPPDATA%\Ensalia\assets`
- Respaldos: `%USERPROFILE%\Documents\Ensalia Respaldos`

Para una instalación proveniente de la maqueta anterior, Ensalia detecta `%LOCALAPPDATA%\LABSICO\data\labsico.db` y la utiliza como un alias no destructivo. En ese modo, la base y los logs permanecen en la carpeta anterior; los respaldos nuevos se escriben en `Ensalia Respaldos`. El diagnóstico indica `Modo de datos: legacy-alias`.

La detección no mueve la base real. Si llegaran a existir simultáneamente una base nativa de Ensalia y una base anterior, se utiliza la base nativa y la anterior permanece intacta. La reconciliación debe hacerse con respaldo y revisión humana, nunca combinando archivos directamente.

Estas carpetas están fuera del directorio de instalación para que una actualización no reemplace los datos. No coloque la base activa en OneDrive, una unidad sincronizada o una carpeta de red.

## Inicio

Abra `ENSALIA.cmd`. El lanzador:

1. Detecta de forma segura la ubicación de datos.
2. Reserva una sola instancia, incluso frente al iniciador heredado.
3. Busca un puerto libre entre 3210 y 3299.
4. Crea un respaldo previo cuando corresponde.
5. Aplica migraciones y prepara catálogos.
6. Abre el navegador en `127.0.0.1`.

La aplicación no se publica en la red local. `LABSICO.cmd` continúa funcionando como alias de compatibilidad, pero los accesos nuevos deben apuntar a `ENSALIA.cmd`.

La distribución final debe incluir un runtime privado y las dependencias de producción. Mientras no exista ese instalador, la máquina de preparación requiere Node.js 20 o posterior y `npm install` ejecutado una vez.

## Respaldo

Cierre Ensalia y abra `RESPALDAR-ENSALIA.cmd`. El respaldo es un ZIP con la base y un manifiesto SHA-256. Exigir que la aplicación esté cerrada evita copiar SQLite durante una escritura. El lanzador también crea como máximo un respaldo automático cada 24 horas antes de aplicar migraciones.

Los respaldos nuevos se llaman `Ensalia-AAAAMMDD-HHMMSS.zip`. El formato 2 incluye la instantánea SQLite y los recursos visuales administrados, con un hash SHA-256 por archivo. El manifiesto registra si la fuente se encontraba en disposición nativa o heredada; no contiene credenciales.

Publicar o restaurar una versión de perfil exige primero un respaldo físico. El servidor crea una instantánea consistente mediante SQLite `VACUUM INTO` y entrega esa copia al archivador local; no copia directamente una base abierta. Si el respaldo falla, la publicación no se ejecuta.

## Restauración

```powershell
.\scripts\Restore-Ensalia.ps1 -BackupPath "C:\ruta\Ensalia-20261020-120000.zip"
```

El script valida el manifiesto y el hash, pide confirmación y crea automáticamente otro respaldo antes de sustituir la base. Para validar sin cambiar datos:

```powershell
.\scripts\Restore-Ensalia.ps1 -BackupPath "C:\ruta\respaldo.zip" -WhatIf
```

El restaurador acepta manifiestos `ENSALIA` de formato 2 y los manifiestos históricos `LABSICO` de formato 1. Valida hashes y rechaza rutas de recursos no administradas antes de sustituir datos. La restauración siempre se dirige a la base activa detectada; no crea una segunda base ni mueve la anterior automáticamente.

## Recursos visuales

Los logotipos se almacenan con nombres generados por Ensalia. Se admiten únicamente PNG, JPEG y WebP de hasta 2 MB; se comprueba la firma real del archivo además del MIME declarado. No se usan nombres ni rutas proporcionados por el navegador. Los recursos sólo pueden cambiarse mientras la versión del perfil está en borrador.

## Diagnóstico

Abra `DIAGNOSTICO-ENSALIA.cmd`. El informe evita secretos y contenido de muestras; contiene versiones, rutas, disponibilidad, tamaño de archivos y el modo de compatibilidad de datos.

## Comprobación del rebranding

Antes de distribuir una versión:

- Confirmar que los nuevos accesos muestran Ensalia.
- Confirmar que los alias anteriores abren la misma instalación.
- Comprobar que ambos iniciadores comparten el bloqueo de instancia.
- Ejecutar respaldo nuevo y revisar `product: ENSALIA` y el hash.
- Validar con `-WhatIf` un respaldo Ensalia y uno histórico.
- Confirmar que la base anterior no cambió de ruta por la detección.
- Reiniciar Windows y verificar persistencia.

## Instalador comercial

El instalador deberá incluir runtime, dependencias y build; crear accesos directos hacia `ENSALIA.cmd` o el lanzador empaquetado; conservar tanto `%LOCALAPPDATA%\Ensalia` como una ubicación heredada detectada durante actualizaciones y desinstalaciones; y ofrecer el borrado de datos como una acción independiente, explícita y confirmada.

La prueba de aceptación debe hacerse en una PC o máquina virtual limpia, sin Node.js, npm, Git ni Prisma instalados.
