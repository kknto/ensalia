export type EstadoCurado = "NORMAL" | "ADVERTENCIA" | "CRITICO" | "VENCIDO";

export interface PendingSample {
  id: string;
  idMuestra: string;
  cliente: string;
  obra: string;
  localizacion: string | null;
  elemento: string | null;
  fechaMuestreo: string;
  fcKgCm2: number | null;
  tipoConcreto: string;
  laboratoristaCampo: string | null;
  numeroEspecimenes: number;
  moldesAsignados: string[];
  horasTranscurridas: number;
  estadoCurado: EstadoCurado;
  enDespacho: boolean;
  ultimoDespacho: {
    id: string;
    folio: string;
    estado: string;
    fechaProgramada: string;
  } | null;
}

export interface DispatchItem {
  id: string;
  muestraId: string;
  estadoItem: "PENDIENTE" | "RECOLECTADO" | "NO_LOCALIZADO" | "RECHAZADO" | "DANADO";
  tempRecoleccionC?: number | null;
  condicionEspecimen?: string | null;
  observaciones?: string | null;
  muestra?: {
    id: string;
    idMuestra: string;
    cliente: string;
    obra: string;
    fechaMuestreo: string;
    numeroEspecimenes?: number;
  };
}

export interface DispatchManifest {
  id: string;
  folio: string;
  tipo: "RECOLECCION_OBRA" | "TRASLADO_LABORATORIO" | "ENTREGA_CLIENTE";
  estado: "PROGRAMADO" | "EN_TRANSITO" | "COMPLETADO" | "CANCELADO" | "INCIDENCIA";
  fechaProgramada: string;
  fechaSalida?: string | null;
  fechaRetorno?: string | null;
  choferOperadorId: string;
  choferOperador?: { id: string; nombre: string };
  vehiculo?: string | null;
  placas?: string | null;
  origen?: string | null;
  destino?: string | null;
  observaciones?: string | null;
  items: DispatchItem[];
  creadoEn: string;
}

