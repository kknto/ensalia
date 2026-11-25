/**
 * METADATOS Y PLANTILLA INSTITUCIONAL DEL REPORTE OFICIAL LABSICO
 * ---------------------------------------------------------------------------
 * Formato Oficial: MC-LBS-CC-IE (Informe de Ensayes a Compresión)
 * Revisión: REV 07 | Fecha de Rev: 10/09/2026
 * Acreditación EMA: No. C-1861-357/24 (Laboratorio de Ensayo acreditado por ema, a.c.)
 */

export interface LabsicoReportHeader {
  titular: string;
  nombreComercial: string;
  tituloReporte: string;
  codigoFormato: string;
  revision: string;
  fechaRevision: string;
  sistemaFolio: string;
}

export interface LabsicoClientSection {
  muestra: string;
  reporte: string;
  remision: string;
  fechaMuestreo: string;
  cliente: string;
  direccion: string;
  procedencia: string;
  elaboracion: string;
  obra: string;
}

export interface LabsicoGeneralSection {
  tipoEspecimen: string;
  curado: string;
  tempTanqueC: string;
  fcProyectoKgCm2: string;
  revenimientoDiseno: string;
  elemento: string;
  volumenM3: string;
  concretera: string;
  cemento: string;
  noCamion: string;
  factorCorreccion: string;
}

export interface LabsicoSiteResultsSection {
  revenimientoObtenido: string;
  tempConcretoC: string;
  tempAmbienteC: string;
  horaMuestra: string;
  tma: string;
  edadGarantia: string;
  especificacion: string;
  vibrado: string;
}

export interface LabsicoSpecimenItem {
  itemNumero: number;
  alturaCm: number;
  diametroCm: number;
  areaCm2: number;
  fechaEnsaye: string;
  edadDias: number;
  cargaMaximaKg: number;
  factorLd: number;
  fcObtenidaKgCm2: number;
  fcCorregidaKgCm2: number;
  fcMpa: number;
  porcentajeFc: number;
  tipoFallaTexto: string;
  tipoFallaNumero: number; // 1 a 6
  estaEnsayado: boolean;
}

export interface LabsicoReportData {
  header: LabsicoReportHeader;
  cliente: LabsicoClientSection;
  general: LabsicoGeneralSection;
  sitio: LabsicoSiteResultsSection;
  especimenes: LabsicoSpecimenItem[];
  ubicacionElemento: string;
  observaciones: string;
  esPreliminar: boolean;
  fechaElaboracionInforme: string;
  firmas: {
    ensayaNombre: string;
    ensayaCargo: string;
    revisaNombre: string;
    revisaCargo: string;
    autorizaNombre: string;
    autorizaCargo: string;
  };
}

export const LABSICO_DEFAULT_TEMPLATE = {
  titular: "CARLOS ANTONIO CANTO SANSORES",
  nombreComercial: "Laboratorio al Servicio de la Industria para la Construcción",
  tituloReporte: "Informe de Ensayes a Compresión",
  codigoFormato: "Formato MC-LBS-CC-IE",
  revision: "REV 07",
  fechaRevision: "10/09/2026",
  acreditacionEma: "Laboratorio de Ensayo acreditado por ema, a.c. con acreditación No. *C-1861-357/24*",
  laboratorioContacto: {
    direccion: "SM. 99, MZA. 58, LT. 21 Calle 6, Cancun, Quintana Roo, CP 77536",
    telefono1: "998 604 4075",
    telefono2: "984 309 3578",
    email: "contacto@labsico.mx",
    web: "www.labsico.mx",
    facebook: "Laboratorio Labsico",
    procedimientoQuejas: "Labsico, cuenta con un procedimiento de quejas, solicitar en el momento que lo requiera.",
  },
  metodosPrueba: [
    { norma: "*NMX-C-161-ONNCCE-2013", titulo: "Muestreo de Concreto Fresco" },
    { norma: "*NMX-C-156-ONNCCE-2010", titulo: "Determinación del Revenimiento" },
    { norma: "*NMX-C-435-ONNCCE-2010", titulo: "Determinacion de la temperatura del concreto" },
    { norma: "*NMX-C-159-ONNCCE-2016", titulo: "Elaboracion y Curado" },
    { norma: "*NMX-C-109-ONNCCE-2013", titulo: "Cabeceo de Especimenes" },
    { norma: "*NMX-C-083-ONNCCE-2014", titulo: "Determinacion de la resistencia a compresión" },
  ],
  anexosTexto: [
    ".-Conversion Unidades - 1 MPa = 10.1972 kgf/cm2",
    ".-El presente informe solo afecta a los especimenes sometidos a prueba.",
    ".-Queda Prohibida la reproduccion total o parcial de este informe sin autorizacion.",
    ".-Temperatura Pileta de Curado 23 °C ± 2°C",
    "*Acreditacion solo para especímenes cilíndricos 15 x 30 cm",
  ],
};

