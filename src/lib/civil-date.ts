export const CIVIL_TIME_ZONE = "America/Cancun";
const civilPattern = /^\d{4}-\d{2}-\d{2}$/;

export function civilDate(value: Date, timeZone = CIVIL_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const item = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${item.year}-${item.month}-${item.day}`;
}

export function addCivilDays(date: string, days: number) {
  if (!civilPattern.test(date) || !Number.isInteger(days)) throw new Error("Fecha civil o edad no valida.");
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}
