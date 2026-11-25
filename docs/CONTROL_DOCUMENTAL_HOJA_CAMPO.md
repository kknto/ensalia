# Control documental de la hoja de campo

## Condicion de uso

Este documento define el contrato operativo propuesto para Ensalia. No declara que la entidad mexicana de acreditacion (ema) obligue de forma universal a usar papel. La necesidad de conservar una hoja fisica debe confirmarse contra el alcance acreditado, los metodos aplicables, el sistema de gestion y la version vigente de los criterios de la entidad.

Antes de utilizar el subsistema en actividades acreditadas, el responsable tecnico y el responsable de calidad deben aprobar el formato, su revision, el flujo, los tiempos de retencion y la validacion del OCR.

## Contrato del documento

Cada hoja y cada pagina debe mostrar:

- codigo controlado del formato y numero de revision;
- folio unico y legible;
- identificador de muestra o servicio;
- fecha de emision;
- pagina `X de Y`;
- identidad del laboratorio o perfil publicado;
- espacio para responsable, firma o identificacion equivalente;
- instrucciones breves de correccion y cancelacion de espacios;
- identificador verificable, como QR, sin depender exclusivamente de el.

Al emitir el PDF se debe conservar la plantilla, el perfil y los datos utilizados, junto con el hash SHA-256 del archivo. El PDF emitido no se modifica ni se reemplaza silenciosamente.

## Matriz minima de controles

| Riesgo | Control preventivo | Evidencia | Aprobacion |
|---|---|---|---|
| Hoja no identificada | Folio, codigo, revision y pagina en cada hoja | PDF emitido y registro de emision | Calidad |
| Uso de formato obsoleto | Una revision vigente por perfil; reimpresion desde el original | Historial de plantillas | Calidad |
| Dato alterado | Original inmutable, hash y eventos anexos | Hash, bitacora y respaldo | Administrador |
| Correccion ilegible | Tachado simple, valor legible, dato nuevo, fecha e identificacion | Hoja escaneada | Tecnico y revisor |
| Espacios utilizables despues | `N/A` o cancelacion controlada | Imagen devuelta | Tecnico |
| Perdida o mezcla de paginas | Folio y pagina `X de Y` en todas las paginas | Lista de recepcion | Custodio |
| Reimpresion indistinguible | Leyenda y consecutivo de reimpresion | Evento de reimpresion | Usuario autorizado |
| OCR incorrecto | Revision humana por campo y bloqueo de campos criticos | Resultado bruto y confirmaciones | Revisor autorizado |
| Perdida del original | Original inmutable, hashes, respaldo y restauracion probada | Paquete documental | Administrador |
| Retencion incorrecta | Politica configurada y aprobada | Calendario de disposicion | Calidad |

## Ciclo y cadena de custodia

Flujo nominal:

`EMITIDA -> ENTREGADA -> DEVUELTA -> ESCANEADA -> VERIFICADA -> CERRADA`

`ANULADA` es terminal y exige motivo. `CERRADA` tambien es terminal. Cada evento debe registrar identificador del documento, usuario, fecha y hora, estado anterior y nuevo, motivo cuando corresponda, y custodio o ubicacion. La custodia del documento puede relacionarse con la cadena de la muestra, pero no la sustituye.

## Llenado y correcciones en papel

El procedimiento aprobado debe indicar al tecnico:

1. Usar tinta indeleble y escritura legible.
2. No usar corrector, borrar ni cubrir el dato original.
3. Corregir con una linea que conserve legible el dato anterior.
4. Escribir el valor correcto e identificar la correccion con iniciales o firma y fecha.
5. Explicar la correccion cuando su causa no sea evidente.
6. Marcar `N/A` o cancelar los espacios previstos que no se utilizaron.
7. Informar inmediatamente paginas faltantes, daño, perdida o ilegibilidad.

La transcripcion digital debe conservar tanto el valor original como el confirmado. Nunca debe reescribir la imagen fuente.

## Reimpresion

Una reimpresion conserva folio, muestra y revision documental, pero muestra `REIMPRESION N`. Debe generar un evento con motivo, usuario y fecha. Si cambian datos o formato, no es reimpresion: se trata de una nueva emision o revision enlazada, conforme al procedimiento aprobado. Los ejemplares sustituidos se anulan de forma trazable; no se eliminan.

## Anulacion

La anulacion exige motivo y usuario autorizado. El documento conserva su folio, archivo, hash e historial. Si existe papel, debe marcarse de forma que no pueda confundirse con un registro vigente. La anulacion no libera ni elimina automaticamente muestras, equipos u otras evidencias relacionadas.

## Escaneo y OCR

Se debe conservar cada imagen original antes de recortar, mejorar contraste o ejecutar OCR. Por archivo se registran hash, tipo, tamano, paginas, fecha, usuario y origen. Las transformaciones son derivados y no reemplazan el original.

El OCR es una ayuda de captura:

- no revisa, cierra ni publica una muestra por si solo;
- conserva motor, modelo, version, texto bruto, confianza y region por campo;
- muestra imagen y valor extraido juntos;
- obliga a confirmar todos los campos; los criticos requieren confirmacion aunque la confianza sea alta;
- registra valor extraido, valor confirmado, usuario, fecha y motivo de cualquier cambio;
- rechaza paginas incompletas, mezcladas, ilegibles o cuyo folio no coincida.

La habilitacion productiva requiere un protocolo aprobado, corpus representativo anonimizado y metricas por campo, instrumento de captura y calidad de imagen. Un promedio global no sustituye la evaluacion de campos criticos.

## Archivo, retencion y disposicion

El paquete documental contiene como minimo:

- PDF emitido y sus metadatos;
- escaneos o fotografias originales;
- archivos derivados;
- hashes;
- salida OCR bruta;
- confirmaciones y correcciones;
- eventos de custodia;
- plantilla, revision y perfil aplicados;
- evidencia de anulacion o reimpresion.

La retencion no debe codificarse como una regla universal. Calidad debe fijar el plazo mayor que resulte del sistema de gestion, requisitos contractuales y disposiciones aplicables. La eliminacion, si procede, requiere autorizacion, vencimiento comprobado, bitacora y exclusiones por investigacion, queja o trabajo no conforme.

## Criterios de aceptacion antes del piloto

- Cien por ciento de paginas incluye folio, codigo, revision y paginacion.
- No se producen folios duplicados en concurrencia.
- El hash detecta cualquier alteracion del PDF o imagen.
- Cualquier reimpresion o anulacion queda visible y auditada.
- Una muestra no puede cerrarse con OCR pendiente en un campo critico.
- Los originales siguen disponibles despues de procesar y corregir.
- Se detectan paginas faltantes y discrepancias de folio.
- Un respaldo restaurado recupera el paquete documental completo.
- Calidad aprueba formato, instrucciones, retencion y resultados del piloto.

## Referencias para revision de Calidad

- ema, criterios de aplicacion de ISO/IEC 17025, documento MP-FE005-13 (2018): https://www.ema.org.mx/descargas_portalV2/alertas/2018/MP-FE005_Criterios_de_aplicacion-ISO-IEC-17025.pdf
- ISO, descripcion oficial de los cambios de ISO/IEC 17025:2017 y reconocimiento de sistemas y registros electronicos: https://www.iso.org/news/ref2250.html

La fecha y version de ambas referencias deben verificarse nuevamente antes de la liberacion comercial o de una evaluacion de acreditacion.
