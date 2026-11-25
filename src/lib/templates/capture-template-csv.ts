import { CONCRETE_CAPTURE_TEMPLATE_V1 } from "./capture-template";

type TemplateSample = Record<string, unknown> & {
  especimenes?: Array<Record<string, unknown>>;
};

function quoteCsv(value: unknown) {
  const text = String(value ?? "");
  const protectedText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

function sourceValue(sample: TemplateSample, source: string): unknown {
  const specimen = /^especimenes\[(\d)\]\.(edadDias|fechaEnsaye)$/.exec(source);
  if (specimen) return sample.especimenes?.[Number(specimen[1])]?.[specimen[2]];
  return sample[source];
}

function formatValue(value: unknown, type: string) {
  if (value == null) return "";
  if (type === "boolean") return value ? "SI" : "NO";
  if (value instanceof Date) return type === "date" ? value.toISOString().slice(0, 10) : value.toISOString();
  if (type === "date") return String(value).slice(0, 10);
  return value;
}

export function concreteCaptureTemplateRow(sample: TemplateSample) {
  const specimens = [...(sample.especimenes ?? [])].sort((left, right) => Number(left.numero ?? 0) - Number(right.numero ?? 0));
  const orderedSample: TemplateSample = { ...sample, especimenes: specimens };
  return CONCRETE_CAPTURE_TEMPLATE_V1.fields.map((field) => formatValue(sourceValue(orderedSample, field.source), field.type));
}

export function renderConcreteCaptureTemplateCsv(samples: TemplateSample[]) {
  const header = CONCRETE_CAPTURE_TEMPLATE_V1.fields.map((field) => quoteCsv(field.header)).join(",");
  const rows = samples.map((sample) => concreteCaptureTemplateRow(sample).map(quoteCsv).join(","));
  return "\uFEFF" + [header, ...rows].join("\r\n");
}

