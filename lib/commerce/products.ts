/**
 * Server-only product registry for one-time purchasable products.
 *
 * The browser may only send a `productKey`.  All pricing, fulfillment,
 * and configuration is resolved exclusively on the server from this file
 * and from environment variables.
 *
 * Never import this module in a client component.
 */

export const PRODUCT_KEYS = [
  "value_action_sprint",
  "value_dna_snapshot",
  "sale_readiness_blueprint",
  "verified_listing_pack",
  "transaction_workspace",
  "launch_intelligence_pack",
] as const;

export type ProductKey = (typeof PRODUCT_KEYS)[number];

export type PurchaseType = "one_time";

export type EntitlementType = "workspace_access";

export type FulfillmentBehavior = "create_workspace";

export interface ProductDefinition {
  /** Stable, URL/DB-safe key — never changes after first use. */
  key: ProductKey;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  /**
   * The *name* of the environment variable that holds the Stripe Price ID.
   * The server reads `process.env[stripePriceEnvVar]` at runtime.
   * The price ID is never exposed to the client.
   */
  stripePriceEnvVar: string;
  purchaseType: PurchaseType;
  entitlementType: EntitlementType;
  fulfillmentBehavior: FulfillmentBehavior;
  active: boolean;
}

const PRODUCT_REGISTRY: Record<ProductKey, ProductDefinition> = {
  value_action_sprint: {
    key: "value_action_sprint",
    nameEn: "Value Action Sprint",
    nameEs: "Sprint de Acción de Valor",
    descriptionEn:
      "A structured 30-day planning and execution sprint that helps you identify and act on your highest-value business priorities. This is a business planning tool — not a certified appraisal, legal service, tax service, or guarantee of business value.",
    descriptionEs:
      "Un sprint estructurado de 30 días de planificación y ejecución que te ayuda a identificar y actuar sobre las prioridades de mayor valor de tu negocio. Esta es una herramienta de planificación empresarial — no es una tasación certificada, servicio legal, servicio fiscal ni garantía de valor comercial.",
    stripePriceEnvVar: "STRIPE_PRICE_VALUE_ACTION_SPRINT",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "create_workspace",
    active: true,
  },

  // ── Future products (inactive until ready) ─────────────────────────────────
  value_dna_snapshot: {
    key: "value_dna_snapshot",
    nameEn: "Value DNA Snapshot",
    nameEs: "Instantánea de ADN de Valor",
    descriptionEn: "Coming soon.",
    descriptionEs: "Próximamente.",
    stripePriceEnvVar: "STRIPE_PRICE_VALUE_DNA_SNAPSHOT",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "create_workspace",
    active: false,
  },

  sale_readiness_blueprint: {
    key: "sale_readiness_blueprint",
    nameEn: "Sale Readiness Blueprint",
    nameEs: "Plan de Preparación para Venta",
    descriptionEn: "Coming soon.",
    descriptionEs: "Próximamente.",
    stripePriceEnvVar: "STRIPE_PRICE_SALE_READINESS_BLUEPRINT",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "create_workspace",
    active: false,
  },

  verified_listing_pack: {
    key: "verified_listing_pack",
    nameEn: "Verified Listing Pack",
    nameEs: "Paquete de Listado Verificado",
    descriptionEn: "Coming soon.",
    descriptionEs: "Próximamente.",
    stripePriceEnvVar: "STRIPE_PRICE_VERIFIED_LISTING_PACK",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "create_workspace",
    active: false,
  },

  transaction_workspace: {
    key: "transaction_workspace",
    nameEn: "Transaction Workspace",
    nameEs: "Espacio de Trabajo de Transacción",
    descriptionEn: "Coming soon.",
    descriptionEs: "Próximamente.",
    stripePriceEnvVar: "STRIPE_PRICE_TRANSACTION_WORKSPACE",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "create_workspace",
    active: false,
  },

  launch_intelligence_pack: {
    key: "launch_intelligence_pack",
    nameEn: "Launch Intelligence Pack",
    nameEs: "Paquete de Inteligencia de Lanzamiento",
    descriptionEn: "Coming soon.",
    descriptionEs: "Próximamente.",
    stripePriceEnvVar: "STRIPE_PRICE_LAUNCH_INTELLIGENCE_PACK",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "create_workspace",
    active: false,
  },
};

/**
 * Returns the ProductDefinition for a key, or `null` if the key is unknown.
 * Does not filter by `active` status.
 */
export function getProduct(key: string): ProductDefinition | null {
  if (!PRODUCT_KEYS.includes(key as ProductKey)) return null;
  return PRODUCT_REGISTRY[key as ProductKey] ?? null;
}

/**
 * Returns the ProductDefinition only if the product exists **and** is active.
 * Returns `null` for unknown keys and inactive products.
 */
export function getActiveProduct(key: string): ProductDefinition | null {
  const product = getProduct(key);
  if (!product || !product.active) return null;
  return product;
}

/**
 * Resolves the Stripe Price ID for a product from the server environment.
 *
 * @throws if the environment variable is missing or empty.
 *
 * The Price ID is never sourced from client input — only from `process.env`.
 */
export function getStripePriceId(product: ProductDefinition): string {
  const priceId = process.env[product.stripePriceEnvVar];
  if (!priceId) {
    throw new Error(
      `${product.stripePriceEnvVar} is not configured on the server.`
    );
  }
  return priceId;
}
