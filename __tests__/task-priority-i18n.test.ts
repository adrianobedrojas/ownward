import en from "@/messages/en.json";
import es from "@/messages/es.json";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) =>
    flattenKeys(nestedValue, prefix ? `${prefix}.${key}` : key)
  );
}

describe("task priority compare translations", () => {
  it("keeps the new task metadata keys aligned between English and Spanish", () => {
    const englishKeys = flattenKeys(en.Metadata.tasks).sort();
    const spanishKeys = flattenKeys(es.Metadata.tasks).sort();

    expect(spanishKeys).toEqual(englishKeys);
  });

  it("keeps the new task priority compare keys aligned between English and Spanish", () => {
    const englishKeys = flattenKeys(en.Tasks.priorityCompare).sort();
    const spanishKeys = flattenKeys(es.Tasks.priorityCompare).sort();

    expect(spanishKeys).toEqual(englishKeys);
  });
});
