export type BusinessInABoxLocale = "en" | "es";

export type BusinessInABoxSetupStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"
  | "partially_reversed";

const STATUS_LABELS: Record<BusinessInABoxLocale, Record<BusinessInABoxSetupStatus, string>> = {
  en: {
    pending: "Pending",
    processing: "Setting up",
    completed: "Ready",
    failed: "Setup failed",
    refunded: "Refunded",
    partially_reversed: "Partially reversed",
  },
  es: {
    pending: "Pendiente",
    processing: "Configurando",
    completed: "Listo",
    failed: "La configuración falló",
    refunded: "Reembolsado",
    partially_reversed: "Reversión parcial",
  },
};

export function getBusinessInABoxSetupStatusLabel(
  locale: BusinessInABoxLocale,
  status: string
): string {
  const labels = STATUS_LABELS[locale] ?? STATUS_LABELS.en;
  return labels[status as BusinessInABoxSetupStatus] ?? status;
}
