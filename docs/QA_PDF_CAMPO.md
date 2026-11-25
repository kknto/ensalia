# Validación UX de la hoja de campo PDF

Esta revisión se realiza sobre el PDF final renderizado, no sólo sobre el código. Debe probarse con datos cortos, datos cercanos al máximo permitido y una muestra con cuatro especímenes y equipos asignados.

## Encabezado y QR

- El logotipo o nombre comercial, título, número de control, revisión y QR no se superponen.
- El QR tiene al menos 13 mm por lado, conserva margen blanco y puede leerse desde una impresión real.
- Junto al QR se explica qué hace: escanearlo permite abrir, consultar, validar o identificar la muestra/documento.
- Existe una alternativa manual explícita: buscar el folio o número de control impreso.
- El folio o número indicado como alternativa coincide exactamente con el documento emitido.
- No se muestran al técnico tokens, URLs internas, IDs de base de datos ni instrucciones técnicas.

Texto recomendado, sujeto al espacio disponible:

> Escanea este código para consultar esta muestra. Si no puedes escanearlo, busca el número de control impreso.

## Jerarquía y espaciado

- Cada encabezado de sección conserva al menos 8 puntos respecto del contenido anterior y 6 puntos respecto del primer campo.
- Ningún título invade bordes, campos, QR, sello de copia controlada o pie de página.
- Los títulos siguen el orden de trabajo: identificación, datos de campo, especímenes y moldes, equipos, observaciones y firmas.
- Los bloques se distinguen por espacio y borde; no dependen únicamente de color.
- Los textos truncados terminan de forma visible y no cubren campos vecinos.

## Comprensión para el técnico

- Las etiquetas describen el dato esperado y muestran unidades cuando aplican.
- `Código del molde` muestra primero el código interno LABSICO; la serie del fabricante es secundaria y opcional.
- Los espacios de fecha y hora indican claramente qué momento debe registrarse.
- Las firmas identifican a quién corresponde cada línea.
- La página y revisión documental permanecen legibles al imprimir en escala de grises.

## Matriz mínima de impresión

1. Carta al 100 %, impresora láser en escala de grises.
2. Carta con opción del controlador `Ajustar a página`.
3. Exportación a PDF desde el visor de Windows.
4. Reimpresión con sello de copia controlada.
5. Escaneo del QR desde papel y desde pantalla.

La aceptación requiere cero superposiciones, QR legible en los cinco escenarios y que una persona ajena al desarrollo pueda explicar qué hace el QR y cómo localizar la muestra sin escanearlo.
