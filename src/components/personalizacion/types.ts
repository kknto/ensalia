import type { ProfileConfiguration } from "@/lib/config/schema";

export type ProfileVersion = {
  id: string;
  numeroVersion: number;
  estado: "BORRADOR" | "VALIDADA" | "PUBLICADA" | "ARCHIVADA";
  configuracionJson: ProfileConfiguration;
  creadaEn?: string;
  publicadaEn?: string | null;
};

export type CustomizationProfile = {
  id: string;
  clave: string;
  nombreInterno: string;
  esPlantillaSistema: boolean;
  versionPublicadaId?: string | null;
  versiones: ProfileVersion[];
};

export type ClientIdentity = ProfileConfiguration["identidad"];
