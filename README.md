# Ensalia

Ensalia es una aplicación local para la operación y trazabilidad de laboratorios de materiales. La maqueta actual permite capturar, revisar, consultar y exportar hojas de campo de muestreo de concreto, además de administrar inventario, asignaciones y calibraciones.

El producto se está preparando como un núcleo configurable para distintos clientes. El nombre del cliente, su identidad visual y sus reglas operativas deberán vivir en perfiles de personalización; **Ensalia** es la marca del producto y no debe reemplazarse por el nombre de cada laboratorio.

## Uso local en Windows

1. Abra `ENSALIA.cmd` con doble clic.
2. Espere a que el navegador muestre la aplicación.
3. Mantenga abierta la ventana del lanzador mientras use Ensalia.

Los datos se conservan fuera de la carpeta del programa. `RESPALDAR-ENSALIA.cmd` crea una copia consistente cuando la aplicación está cerrada y `DIAGNOSTICO-ENSALIA.cmd` genera un informe técnico sin datos de muestras. Consulte [docs/OPERACION_LOCAL.md](docs/OPERACION_LOCAL.md) para restauración y soporte.

Los accesos `LABSICO.cmd`, `RESPALDAR-LABSICO.cmd` y los scripts `*-LABSICO.ps1` se conservan temporalmente como alias para instalaciones y accesos directos anteriores.

## Compatibilidad de datos durante el cambio de nombre

- Si existe `%LOCALAPPDATA%\LABSICO\data\labsico.db` y todavía no hay una base nativa de Ensalia, el lanzador utiliza la base anterior **en su ubicación actual**.
- No se mueve, renombra ni duplica automáticamente la base existente.
- Las instalaciones nuevas usan `%LOCALAPPDATA%\Ensalia\data\ensalia.db`.
- Los respaldos nuevos se crean en `Documentos\Ensalia Respaldos` con manifiesto `ENSALIA`.
- El restaurador de Ensalia acepta tanto respaldos nuevos como respaldos históricos con manifiesto `LABSICO`.

La migración física de una instalación anterior debe realizarse en una entrega posterior mediante respaldo verificado, prueba de restauración y confirmación explícita. No deben copiarse manualmente archivos SQLite mientras la aplicación está abierta.

## Desarrollo

Durante el desarrollo se requiere Node.js 20 o posterior:

```powershell
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Abrir `http://127.0.0.1:3000`.

Validación recomendada antes de entregar cambios:

```powershell
npm run typecheck
npm test
npm run build
```

## Operación y seguridad

La aplicación se enlaza únicamente a `127.0.0.1`. Cada creación, edición y cambio de estado genera trazabilidad. Antes de usar datos reales se debe completar una muestra, revisar/cerrar, reiniciar, crear un respaldo y validar una restauración sobre una copia.

La distribución comercial deberá incluir el runtime y las dependencias para que el usuario final no tenga que instalar Node.js, PowerShell adicional, Git ni herramientas de desarrollo.

## Alcance posterior

El OCR no forma parte de esta entrega. Si se incorpora, deberá proponer valores con nivel de confianza y exigir confirmación humana antes de guardar.
