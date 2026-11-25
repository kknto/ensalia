export type TipoFallaConcreto =
  | "CONO_TIPO_1"
  | "CONO_Y_DIVIDIDO_TIPO_2"
  | "COLUMNA_TIPO_3"
  | "CIZALLA_TIPO_4"
  | "ESQUINA_TIPO_5"
  | "PUNTUAL_TIPO_6"
  | "OTRA";

export interface FotoEnsaye {
  id: string;
  ensayeId: string;
  tipo: "PRE_ROTURA" | "ROTURA_FRACTURA" | "DETALLE_FALLA" | "MANOMETRO_PRENSA";
  nombreArchivo: string;
  mimeType: string;
  tamano: number;
  hashSha256: string;
  rutaRelativa: string;
  capturadaEn: string | null;
}

export interface EnsayeItem {
  id: string;
  especimenId: string;
  equipoPrensaId?: string | null;
  fechaHoraEnsaye: string;
  edadRealDias: number;
  diametroMm: number;
  longitudMm: number;
  areaCm2: number;
  masaG?: number | null;
  densidadKgM3?: number | null;
  cargaMaximaKn: number;
  cargaMaximaKg: number;
  resistenciaKgCm2: number;
  porcentajeFc?: number | null;
  tipoFalla: TipoFallaConcreto;
  condicionHumedad: "HUMEDO_SATURADO" | "SUPERFICIALMENTE_SECO" | "SECO_AIRE";
  cumpleEspecificacion: boolean;
  observaciones?: string | null;
  fotos: FotoEnsaye[];
  especimen?: {
    id: string;
    numero: number;
    edadDias?: number | null;
    tipo: string;
    muestra: {
      id: string;
      idMuestra: string;
      cliente: string;
      obra: string;
      fcKgCm2?: number | null;
      tipoConcreto: string;
      fechaMuestreo: string;
    };
  };
  equipoPrensa?: { id: string; codigoInterno: string } | null;
  operadorEnsaye?: { id: string; nombre: string } | null;
}

export interface EstadisticasFc {
  totalMuestras: number;
  media: number;
  desviacionEstandar: number;
  coeficienteVariacionPct: number;
  minimo: number;
  maximo: number;
  calificacionAci: "EXCELENTE" | "BUENA" | "REGULAR" | "DEFICIENTE" | "INSUFICIENTE_DATOS";
}

