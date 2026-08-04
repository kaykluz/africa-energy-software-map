export function normaliseGeographyScope(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isAfricaWideCoverageLabel(value: string) {
  return ["africa", "africa wide", "all africa", "pan african"].includes(
    normaliseGeographyScope(value),
  );
}
