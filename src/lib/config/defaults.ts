import type { ProfileConfiguration } from "./schema";

export const DEFAULT_PROFILE_KEY = "ENSALIA_DEMO";

export const DEFAULT_PROFILE_CONFIGURATION: ProfileConfiguration = {
  esquema: 1,
  identidad: {
    nombreComercial: "Ensalia", razonSocial: "", colorPrimario: "#174A6E",
    colorSecundario: "#E5A33D", contacto: "", domicilio: "", leyendaDocumental: "",
  },
  modulos: { captura: true, inventario: true, personalizacion: true, reportes: true, programacionEnsayos: true },
  formulario: { campos: {
    cliente: { visible: true, obligatorio: true, etiqueta: "Cliente", orden: 10 },
    obra: { visible: true, obligatorio: true, etiqueta: "Obra", orden: 20 },
    tipoConcreto: { visible: true, obligatorio: true, etiqueta: "Tipo de concreto", orden: 30 },
    observaciones: { visible: true, obligatorio: false, etiqueta: "Observaciones", orden: 900 },
  } },
  operacion: { formatoFolio: "{YYYY}-{SEQ:5}", unidades: { temperatura: "C", longitud: "CM", resistencia: "KG_CM2" } },
  documentos: { programaEnsayos: { titulo: "Programa diario de retiro y ensaye", codigo: "FO-LAB-PE", revision: "00", firmas: ["Preparo", "Tecnico responsable", "Reviso"], mostrarCamposManuales: true } },
  reglas: {
    tiposEspecimenHabilitados: ["CILINDRO_15X30", "CILINDRO_10X20", "VIGA_50X15X15"],
    especimenesObjetivoPorMuestra: 4,
    especimenesMaximosPorMuestra: 4,
    equipos: [],
  },
  exportaciones: [{ clave: "OPERACION", nombre: "Operacion", columnas: ["idMuestra", "fechaMuestreo", "cliente", "obra", "estatusBitacora"], activo: true }],
};
