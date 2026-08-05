import { getBusinessInABoxSetupStatusLabel } from "@/lib/commerce/business-in-a-box-status";

describe("Business-in-a-Box setup status labels", () => {
  it("returns English customer-facing labels for all known states", () => {
    expect(getBusinessInABoxSetupStatusLabel("en", "pending")).toBe("Pending");
    expect(getBusinessInABoxSetupStatusLabel("en", "processing")).toBe("Setting up");
    expect(getBusinessInABoxSetupStatusLabel("en", "completed")).toBe("Ready");
    expect(getBusinessInABoxSetupStatusLabel("en", "failed")).toBe("Setup failed");
    expect(getBusinessInABoxSetupStatusLabel("en", "refunded")).toBe("Refunded");
    expect(getBusinessInABoxSetupStatusLabel("en", "partially_reversed")).toBe("Partially reversed");
  });

  it("returns Spanish customer-facing labels for all known states", () => {
    expect(getBusinessInABoxSetupStatusLabel("es", "pending")).toBe("Pendiente");
    expect(getBusinessInABoxSetupStatusLabel("es", "processing")).toBe("Configurando");
    expect(getBusinessInABoxSetupStatusLabel("es", "completed")).toBe("Listo");
    expect(getBusinessInABoxSetupStatusLabel("es", "failed")).toBe("La configuración falló");
    expect(getBusinessInABoxSetupStatusLabel("es", "refunded")).toBe("Reembolsado");
    expect(getBusinessInABoxSetupStatusLabel("es", "partially_reversed")).toBe("Reversión parcial");
  });

  it("falls back to the raw status for unknown values", () => {
    expect(getBusinessInABoxSetupStatusLabel("en", "archived")).toBe("archived");
    expect(getBusinessInABoxSetupStatusLabel("es", "archived")).toBe("archived");
  });
});
