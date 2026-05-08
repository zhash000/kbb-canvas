import { createHash } from "node:crypto";

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const result: Record<string, unknown> = {};
    for (const [key, nested] of entries) {
      result[key] = normalize(nested);
    }
    return result;
  }

  return value;
}

export function buildRequestHash(input: unknown): string {
  const normalized = normalize(input);
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
