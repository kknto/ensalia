export interface HelpSection {
  clave: string;
  titulo: string;
  subtitulo: string;
  objetivo: string;
  pasos: {
    numero: number;
    titulo: string;
    descripcion: string;
  }[];
  tips: {
    pregunta: string;
    respuesta: string;
  }[];
}

export const HELP_CONTENT: Record<string, HelpSection> = {
  colados: {
    clave: "colados",
    titulo: "Eventos de Colado (Agrupación de Tomas)",
    subtitulo: "Control centralizado de elementos estructurales y paquetes de muestreo",
    objetivo:
      "Agrupar todas las muestras tomadas en un mismo evento de colado (losa, columnas, cimentación). Evita capturar múltiples veces los datos de obra y permite emitir el paquete completo de hojas de campo foliadas en un solo archivo PDF continuo.",
    pasos: [
      {
        numero: 1,
        titulo: "Crear el Colado",
        descripcion:
          "Haz clic en 'Nuevo colado' y captura una sola vez: Cliente, Obra, Elemento estructural, Resistencia f'c, Concretera y el número de tomas previstas (ej. 4 tomas = 16 cilindros).",
      },
      {
        numero: 2,
        titulo: "Descargar paquete de hojas de campo para salir a obra",
        descripcion:
          "Dentro del detalle del colado, pulsa 'Descargar paquete PDF'. El sistema generará e imprimirá todas las hojas foliadas (Toma 1 de N, Toma 2 de N...) con sus códigos QR inviolables para que el técnico las lleve en su tabla de campo.",
      },
      {
        numero: 3,
        titulo: "Completar cada toma tras el regreso de campo",
        descripcion:
          "Para cada viaje/olla muestreada, haz clic en 'Completar toma' e introduce la remisión, número de camión, horas, revenimiento obtenido y moldes asignados.",
      },
      {
        numero: 4,
        titulo: "Ampliar tomas si colaron más volumen en sitio",
        descripcion:
          "Si en la obra se tomaron más muestras de las previstas, selecciona la cantidad en el selector de tomas y presiona 'Ampliar y agregar tomas'. El sistema adaptará el total automáticamente.",
      },
      {
        numero: 5,
        titulo: "Cerrar el colado",
        descripcion:
          "Cuando todas las tomas estén registradas y revisadas, haz clic en 'Cerrar colado' para consolidar el evento.",
      },
    ],
    tips: [
      {
        pregunta: "¿Por qué usar un Colado en lugar de muestras sueltas?",
        respuesta:
          "Porque el Colado hereda automáticamente los datos generales a todas sus muestras hijas. Además, permite entregarle al cliente reportes consolidados por elemento estructural.",
      },
      {
        pregunta: "¿Qué hago si se planearon 3 tomas pero solo se coló 1?",
        respuesta:
          "No hay problema: completa la toma que sí se ejecutó. Las tomas no utilizadas se pueden descartar o anular sin afectar la muestra válida.",
      },
    ],
  },

  nueva: {
    clave: "nueva",
    titulo: "Captura y Edición de Toma de Concreto",
    subtitulo: "Registro de variables de campo, pruebas en concreto fresco y especímenes",
    objetivo:
      "Registrar los datos particulares de la olla o camión muestreado al pie de obra: número de remisión, tiempos de descarga, revenimiento en cono de Abrams, temperaturas y asignación de cilindros.",
    pasos: [
      {
        numero: 1,
        titulo: "Verificar datos de cabecera",
        descripcion:
          "Confirma que el Cliente, Obra y Elemento coincidan. Si la toma proviene de un Colado, estos datos ya vienen prellenados automáticamente.",
      },
      {
        numero: 2,
        titulo: "Ingresar datos del camión y remisión",
        descripcion:
          "Captura el número de remisión de la concretera (ej. REM-88412), número de camión/olla (ej. OLLA-14) y el volumen suministrado en ese viaje (m³).",
      },
      {
        numero: 3,
        titulo: "Registrar cronología de descarga",
        descripcion:
          "Anota las horas clave: salida de planta, llegada a obra, inicio de descarga y fin de descarga. Esto garantiza el cumplimiento de los tiempos máximos normativos (ASTM C94 / NMX-C-155).",
      },
      {
        numero: 4,
        titulo: "Anotar pruebas de concreto fresco",
        descripcion:
          "Introduce el revenimiento obtenido en cm (ej. 14.5 cm) y las lecturas de temperatura del concreto (°C) y temperatura ambiente.",
      },
      {
        numero: 5,
        titulo: "Revisar la tabla de especímenes (cilindros)",
        descripcion:
          "Verifica que los 4 cilindros tengan sus edades de ensaye correctas (ej. 7, 14, 28 y 28 días) y asigna el código de molde utilizado.",
      },
      {
        numero: 6,
        titulo: "Guardar la muestra",
        descripcion:
          "Haz clic en el botón azul 'Guardar muestra' al final del formulario. La muestra se guardará como 'BORRADOR'.",
      },
    ],
    tips: [
      {
        pregunta: "¿Qué debo hacer después de guardar la muestra?",
        respuesta:
          "Abre el detalle de la muestra y haz clic en 'Marcar revisada'. Esto valida la información de campo y coloca automáticamente los 4 cilindros en el 'Calendario de Ensayes' para su futura rotura.",
      },
      {
        pregunta: "¿Puedo modificar los datos después de guardar?",
        respuesta:
          "Sí, mientras la muestra esté en estado 'BORRADOR' o 'REVISADA', puedes entrar y editar cualquier campo con el botón 'Editar'.",
      },
    ],
  },

  registros: {
    clave: "registros",
    titulo: "Bitácora General de Muestras",
    subtitulo: "Consulta, filtrado y trazabilidad de todas las muestras del laboratorio",
    objetivo:
      "Proporcionar una vista integral de todo el historial de muestras del laboratorio, con filtros rápidos por cliente, obra, fecha y estado de bitácora.",
    pasos: [
      {
        numero: 1,
        titulo: "Búsqueda rápida",
        descripcion:
          "Usa la barra de búsqueda para localizar muestras por folio, cliente, obra o número de remisión.",
      },
      {
        numero: 2,
        titulo: "Filtrar por estado",
        descripcion:
          "Filtra entre muestras en 'BORRADOR' (pendientes de revisar), 'REVISADA' (datos de campo completos y validados), 'CERRADA' (cilindros ensayados) o 'ANULADA'.",
      },
      {
        numero: 3,
        titulo: "Abrir detalle y acciones",
        descripcion:
          "Haz clic en cualquier fila para abrir el panel de detalle, donde puedes ver los cilindros, consultar la hoja de campo PDF con QR o cambiar el estado.",
      },
    ],
    tips: [
      {
        pregunta: "¿Qué significa el estado de cada muestra?",
        respuesta:
          "BORRADOR = recién capturada; REVISADA = supervisada y confirmada para laboratorio; CERRADA = ensayes concluidos e informe listo; ANULADA = cancelada formalmente con motivo registrado en auditoría.",
      },
    ],
  },

  calendario: {
    clave: "calendario",
    titulo: "Calendario y Programación Diaria de Ensayes",
    subtitulo: "Seguimiento riguroso de fechas de rotura a compresión de cilindros",
    objetivo:
      "Organizar y alertar sobre los cilindros que deben ensayarse a compresión en la prensa en la fecha exacta (edades de 3, 7, 14, 28 días) para cumplir con las normas ASTM C39 y NMX-C-083.",
    pasos: [
      {
        numero: 1,
        titulo: "Seleccionar la fecha de ensaye",
        descripcion:
          "Usa el selector de fecha para consultar los cilindros programados para hoy, mañana o cualquier día de la semana.",
      },
      {
        numero: 2,
        titulo: "Descargar la orden diaria de trabajo",
        descripcion:
          "Haz clic en 'Descargar reporte diario (PDF)' o 'Exportar CSV' para entregarle al técnico de prensa la lista de especímenes que debe sacar del tanque de curado.",
      },
      {
        numero: 3,
        titulo: "Preparar descabezado y rotura",
        descripcion:
          "Localiza los cilindros en el tanque de curado húmedo guiándote por el número de muestra y número de molde indicados en la lista.",
      },
    ],
    tips: [
      {
        pregunta: "¿Cómo se calculan las fechas de ensaye?",
        respuesta:
          "Se calculan automáticamente sumando los días exactos (ej. fecha de muestreo + 7 días) con el huso horario oficial del laboratorio, evitando desfases por cambio de horario.",
      },
    ],
  },

  fc_curves: {
    clave: "fc_curves",
    titulo: "Curvas y Análisis Estadístico f'c",
    subtitulo: "Evaluación de control de calidad bajo criterios ACI 214R y ACI 318",
    objetivo:
      "Visualizar gráficamente el comportamiento y dispersión de resistencias del concreto: curva de evolución por edades (3, 7, 14, 28 días), campana de Gauss, desviación estándar y coeficiente de variación de la concretera o de la obra.",
    pasos: [
      {
        numero: 1,
        titulo: "Filtrar por obra o resistencia",
        descripcion:
          "Selecciona el cliente, la obra o la resistencia de diseño f'c específica que deseas auditar.",
      },
      {
        numero: 2,
        titulo: "Interpretar la gráfica de evolución",
        descripcion:
          "Observa si la tendencia de ganancia de resistencia supera la línea punteada del 100% f'c a los 28 días.",
      },
      {
        numero: 3,
        titulo: "Revisar la campana gaussiana y coeficientes",
        descripcion:
          "Verifica el coeficiente de variación (V). Según ACI 214R: menor a 10% es excelente, 10-15% es bueno, y mayor a 15% requiere ajustar el control de la concretera.",
      },
    ],
    tips: [
      {
        pregunta: "¿Para qué sirve este módulo frente al cliente?",
        respuesta:
          "Permite demostrar ante peritos, directores de obra o supervisores que el concreto cumple de manera estadísticamente consistente con los requisitos estructurales.",
      },
    ],
  },

  inventario: {
    clave: "inventario",
    titulo: "Inventario y Calibración de Equipos",
    subtitulo: "Control metrológico de prensas, moldes, termómetros y conos",
    objetivo:
      "Garantizar la trazabilidad ISO/IEC 17025 y NMX-EC-17025 de los equipos del laboratorio: vigencia de certificados de calibración, mantenimientos preventivos y asignación de moldes a muestras.",
    pasos: [
      {
        numero: 1,
        titulo: "Registrar equipos",
        descripcion:
          "Agrega prensas de compresión, conos de revenimiento, termómetros y juegos de moldes cilíndricos con su número de serie y código interno.",
      },
      {
        numero: 2,
        titulo: "Registrar calibraciones vigentes",
        descripcion:
          "Sube los certificados de calibración emitidos por laboratorios acreditados, indicando la fecha de vigencia y la incertidumbre de medición.",
      },
      {
        numero: 3,
        titulo: "Monitorear alertas de vencimiento",
        descripcion:
          "El sistema alertará cuando un equipo esté próximo a vencer su calibración o mantenimiento.",
      },
    ],
    tips: [
      {
        pregunta: "¿Qué pasa si una prensa tiene la calibración vencida?",
        respuesta:
          "El sistema muestra una advertencia visual de aseguramiento de calidad para evitar emitir certificados oficiales con equipos no calibrados.",
      },
    ],
  },

  despachos: {
    clave: "despachos",
    titulo: "Despacho y Recolección de Muestras",
    subtitulo: "Cadena de custodia en el traslado de especímenes de obra al laboratorio",
    objetivo:
      "Gestionar las órdenes de recolección de cilindros en obra por parte de choferes o técnicos de campo, asegurando que los especímenes lleguen al tanque de curado dentro de las 24-48 horas normativas.",
    pasos: [
      {
        numero: 1,
        titulo: "Consultar tomas listas para recolección",
        descripcion:
          "Revisa las muestras que fueron elaboradas en obra el día anterior y requieren traslado al laboratorio.",
      },
      {
        numero: 2,
        titulo: "Generar orden de despacho",
        descripcion:
          "Asigna los cilindros al chofer o técnico recolector y genera la orden de transporte.",
      },
      {
        numero: 3,
        titulo: "Confirmar ingreso al tanque de curado",
        descripcion:
          "Al recibir los cilindros en laboratorio, confirma su ingreso para iniciar el curado normativo a 23 ± 2 °C.",
      },
    ],
    tips: [
      {
        pregunta: "¿Por qué es crítica la hora de recolección?",
        respuesta:
          "Las normas ASTM C31 y NMX-C-160 exigen que los cilindros no permanezcan más de 48 horas en obra sin curado estándar húmedo para no perder resistencia potencial.",
      },
    ],
  },

  personalizacion: {
    clave: "personalizacion",
    titulo: "Personalización y Perfiles de Clientes",
    subtitulo: "Membretes, logotipos y configuración operativa del sistema",
    objetivo:
      "Configurar los formatos de reporte, logotipos del laboratorio o de clientes especiales, reglas de negocio y número de cilindros objetivo por muestra.",
    pasos: [
      {
        numero: 1,
        titulo: "Subir logotipo del laboratorio",
        descripcion:
          "Carga tu logotipo en formato PNG o WebP de alta resolución para que aparezca en el membrete de todas las hojas de campo y certificados emitidos.",
      },
      {
        numero: 2,
        titulo: "Definir datos de identidad",
        descripcion:
          "Introduce el nombre comercial del laboratorio, razón social, dirección física, teléfono y correo de contacto que aparecerán en el encabezado oficial.",
      },
      {
        numero: 3,
        titulo: "Configurar reglas operativas",
        descripcion:
          "Ajusta la cantidad de especímenes por muestra (por defecto 4, ajustable de 1 a 12) y el formato del folio de las muestras.",
      },
    ],
    tips: [
      {
        pregunta: "¿Puedo tener membretes diferentes para clientes específicos?",
        respuesta:
          "Sí, puedes crear perfiles adicionales por cliente para emitir hojas de campo personalizadas cuando un contrato o supervisión lo requiera.",
      },
    ],
  },

  dispositivos: {
    clave: "dispositivos",
    titulo: "Control y Enrolamiento de Dispositivos Móviles",
    subtitulo: "Autorización segura de tabletas y teléfonos de campo (Android)",
    objetivo:
      "Gestionar y autorizar las tabletas y teléfonos de brigadas de campo que sincronizan datos, fotografías forenses y coordenadas GPS. Permite enrolar mediante código QR o código de un solo uso, y revocar o bloquear dispositivos extraviados o no autorizados.",
    pasos: [
      {
        numero: 1,
        titulo: "Vincular nuevo dispositivo",
        descripcion:
          "Haz clic en 'Vincular nuevo dispositivo', escribe un nombre identificador (ej. 'Tableta Obra Norte - Samsung Tab A9') y presiona 'Generar Código y QR'.",
      },
      {
        numero: 2,
        titulo: "Enrolar desde el teléfono o tableta",
        descripcion:
          "En la app móvil de campo, selecciona vincular y escanea el código QR en pantalla con la cámara, o ingresa el código alfanumérico de un solo uso (ej. ENS-8392).",
      },
      {
        numero: 3,
        titulo: "Protección de hardware y sincronización",
        descripcion:
          "Al enrolarse, el hardware del dispositivo queda asegurado con un token único. La tableta podrá capturar muestras sin conexión y sincronizarlas con la PC del laboratorio.",
      },
      {
        numero: 4,
        titulo: "Bloqueo o baja inmediata",
        descripcion:
          "Si un dispositivo se extravía o se sospecha alteración, presiona 'Bloquear' para cortar su acceso inmediatamente, o 'Dar de baja' para liberar el cupo de tu licencia.",
      },
    ],
    tips: [
      {
        pregunta: "¿Qué pasa si se pierde la conexión a internet en obra?",
        respuesta:
          "El dispositivo sigue operando con total normalidad de forma desconectada (offline). Todas las muestras, mediciones y fotos se guardan en la memoria segura del teléfono y se sincronizan al recuperar señal o regresar al Wi-Fi del laboratorio.",
      },
      {
        pregunta: "¿Puede alguien clonar la app a otro teléfono no autorizado?",
        respuesta:
          "No. El enrolamiento vincula criptográficamente el identificador único del hardware del teléfono en el Keystore de Android. Si alguien intenta copiar los datos a otro teléfono, el servidor de ENSALIA lo rechazará con error 403.",
      },
    ],
  },
};
