export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === "object" && item?.constructor?.name === "Decimal" ? Number(item) : item));
}
