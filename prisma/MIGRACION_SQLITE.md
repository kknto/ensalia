# Migración local a SQLite

El esquema activo usa SQLite. La migración inicial de este repositorio fue regenerada para instalaciones locales nuevas.

## Compatibilidad de datos

- No se debe ejecutar esta migración sobre una base PostgreSQL existente.
- Una instalación PostgreSQL previa debe exportarse y luego importarse mediante un proceso explícito que conserve IDs, relaciones, estados, fechas y auditorías.
- Los `Decimal` ya no tienen precisión nativa declarada por PostgreSQL. La aplicación conserva sus límites mediante validación; cualquier proceso de importación debe comprobar escala y redondeo.
- SQLite no ofrece el modificador Prisma `mode: "insensitive"`. Las búsquedas usan `contains`, que con la configuración predeterminada de SQLite es insensible a mayúsculas para caracteres ASCII.
- Cada PC debe usar una ruta absoluta `file:...` fuera del directorio reemplazable de la aplicación. No coloque la base operativa en una carpeta sincronizada mientras esté abierta.

Antes de importar datos reales, cree un respaldo verificable del origen y valide conteos por tabla, claves foráneas y muestras de auditoría en el destino.

La migración `20261014120000_codigo_interno_obligatorio` conserva los códigos internos existentes. Para equipos antiguos sin código genera uno determinista con el número de serie disponible y el ID del equipo; posteriormente aplica unicidad global y obligatoriedad. El número de serie del fabricante pasa a ser opcional.
