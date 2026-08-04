if (typeof window !== "undefined") {
  throw new Error("lib/commerce/products must only be imported on the server.");
}

export const ALLOWED_PUBLIC_PRICES = new Set([0, 5, 10, 20]);

export type ProductCategory =
  | "marketplace_visibility"
  | "business_intelligence"
  | "transactions"
  | "buyer_solutions"
  | "credits"
  | "professional_services"
  | "legacy";

export type ProductAudience = "owner" | "seller" | "buyer" | "team" | "all";

export type ProductGoal =
  | "increase_visibility"
  | "improve_sale_readiness"
  | "improve_valuation"
  | "run_transaction"
  | "evaluate_acquisition"
  | "access_intelligence"
  | "support_transfer";

export type BillingModel =
  | "free"
  | "one_time"
  | "monthly"
  | "annual"
  | "per_target"
  | "per_transaction"
  | "included"
  | "contact";

export type ProductStatus = "active" | "planned" | "coming_soon" | "included" | "contact";

export type PurchaseType = "one_time";

export type EntitlementType =
  | "workspace_access"
  | "report_access"
  | "listing_promotion"
  | "deal_room_access"
  | "credit_balance"
  | "service_access"
  | "none";

export type FulfillmentBehavior =
  | "create_value_action_sprint_workspace"
  | "grant_report_access"
  | "grant_enhanced_valuation_report"
  | "grant_timed_deal_room"
  | "create_timed_deal_room"
  | "apply_listing_promotion"
  | "launch_confidential_sale_listing"
  | "grant_credit_balance"
  | "manual_service"
  | "not_implemented";

export type RequiredTargetType =
  | "none"
  | "listing"
  | "business"
  | "deal_room"
  | "transaction"
  | "acquisition_target";

export type CtaBehavior =
  | "checkout"
  | "coming_soon"
  | "included"
  | "contact"
  | "manage";

export interface ProductDefinition {
  key: ProductKey;
  slug: string;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  outcomeEn: string;
  outcomeEs: string;
  category: ProductCategory;
  audience: ProductAudience[];
  goals: ProductGoal[];
  billingModel: BillingModel;
  displayPrice: number;
  status: ProductStatus;
  billingContextEn: string;
  billingContextEs: string;
  deliverablesEn: string[];
  deliverablesEs: string[];
  detailRoute: string;
  ctaBehavior: CtaBehavior;
  requiresAuth: boolean;
  requiredTargetType: RequiredTargetType;
  stripePriceEnvVar: string | null;
  purchaseType: PurchaseType;
  entitlementType: EntitlementType;
  fulfillmentBehavior: FulfillmentBehavior;
  cancelPath: string;
  disclaimersEn: string[];
  disclaimersEs: string[];
  active: boolean;
  isPublic: boolean;
}

export type PublicSolution = {
  key: ProductKey;
  slug: string;
  name: string;
  description: string;
  outcome: string;
  category: ProductCategory;
  audience: ProductAudience[];
  goals: ProductGoal[];
  billingModel: BillingModel;
  displayPrice: number;
  status: ProductStatus;
  billingContext: string;
  deliverables: string[];
  detailRoute: string;
  ctaBehavior: CtaBehavior;
  requiresAuth: boolean;
  requiredTargetType: RequiredTargetType;
  cancelPath: string;
  disclaimers: string[];
};

export const PRODUCT_KEYS = [
  "quick_boost",
  "featured_listing",
  "market_spotlight",
  "listing_relaunch",
  "confidential_exposure",
  "buyer_lens_memo",
  "customer_risk_scan",
  "owner_dependence_scan",
  "value_dna_snapshot",
  "enhanced_valuation_report",
  "sale_readiness_blueprint",
  "value_improvement_roadmap",
  "value_action_sprint",
  "exit_intelligence_bundle",
  "deal_room_extension",
  "closing_archive",
  "deal_room_90",
  "confidential_sale_launch",
  "transaction_workspace",
  "business_comparison_pack",
  "acquisition_readiness_profile",
  "priority_buyer_verification",
  "acquisition_scout",
  "buyer_diligence_pass",
  "acquisition_workspace",
  "essential_intelligence_pack",
  "enhanced_intelligence_pack",
  "complete_intelligence_pack",
  "verified_listing_pack",
  "launch_intelligence_pack",
] as const;

export type ProductKey = (typeof PRODUCT_KEYS)[number];

const PRODUCT_REGISTRY: Record<ProductKey, ProductDefinition> = {
  quick_boost: {
    key: "quick_boost",
    slug: "quick-boost",
    nameEn: "Quick Boost",
    nameEs: "Impulso Rápido",
    descriptionEn: "Short visibility boost for public listings.",
    descriptionEs: "Impulso de visibilidad breve para listados públicos.",
    outcomeEn: "Increase listing impressions quickly.",
    outcomeEs: "Aumenta rápidamente las impresiones del listado.",
    category: "marketplace_visibility",
    audience: ["seller"],
    goals: ["increase_visibility"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Temporary ranking boost"],
    deliverablesEs: ["Impulso temporal de posicionamiento"],
    detailRoute: "/solutions/quick-boost",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "listing",
    stripePriceEnvVar: "STRIPE_PRICE_QUICK_BOOST",
    purchaseType: "one_time",
    entitlementType: "listing_promotion",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/sell",
    disclaimersEn: ["Availability depends on listing quality checks."],
    disclaimersEs: ["La disponibilidad depende de verificaciones de calidad del listado."],
    active: false,
    isPublic: true,
  },
  featured_listing: {
    key: "featured_listing",
    slug: "featured-listing",
    nameEn: "Featured Listing",
    nameEs: "Listado Destacado",
    descriptionEn: "Promote a published listing in priority placements.",
    descriptionEs: "Promociona un listado publicado en ubicaciones prioritarias.",
    outcomeEn: "Improve discoverability with timed premium placement.",
    outcomeEs: "Mejora la visibilidad con posicionamiento premium por tiempo limitado.",
    category: "marketplace_visibility",
    audience: ["seller"],
    goals: ["increase_visibility"],
    billingModel: "one_time",
    displayPrice: 10,
    status: "active",
    billingContextEn: "one-time per listing",
    billingContextEs: "pago único por listado",
    deliverablesEn: ["Featured placement", "Promotion tracking"],
    deliverablesEs: ["Ubicación destacada", "Seguimiento de promoción"],
    detailRoute: "/solutions/featured-listing",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "listing",
    stripePriceEnvVar: "STRIPE_PRICE_FEATURED_LISTING",
    purchaseType: "one_time",
    entitlementType: "listing_promotion",
    fulfillmentBehavior: "apply_listing_promotion",
    cancelPath: "/dashboard?featured=canceled",
    disclaimersEn: ["Listing must remain public and published."],
    disclaimersEs: ["El listado debe permanecer público y publicado."],
    active: true,
    isPublic: true,
  },
  market_spotlight: {
    key: "market_spotlight",
    slug: "market-spotlight",
    nameEn: "Market Spotlight",
    nameEs: "Foco de Mercado",
    descriptionEn: "Expanded visibility package for competitive categories.",
    descriptionEs: "Paquete de visibilidad ampliada para categorías competitivas.",
    outcomeEn: "Drive more qualified buyer traffic.",
    outcomeEs: "Atrae más tráfico de compradores calificados.",
    category: "marketplace_visibility",
    audience: ["seller"],
    goals: ["increase_visibility"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Premium placement set"],
    deliverablesEs: ["Conjunto de ubicaciones premium"],
    detailRoute: "/solutions/market-spotlight",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "listing",
    stripePriceEnvVar: "STRIPE_PRICE_MARKET_SPOTLIGHT",
    purchaseType: "one_time",
    entitlementType: "listing_promotion",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/sell",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  listing_relaunch: {
    key: "listing_relaunch",
    slug: "listing-relaunch",
    nameEn: "Listing Relaunch",
    nameEs: "Relanzamiento de Listado",
    descriptionEn: "Refresh a listing campaign for renewed exposure.",
    descriptionEs: "Reinicia una campaña de listado para nueva exposición.",
    outcomeEn: "Recover marketplace momentum after edits.",
    outcomeEs: "Recupera impulso en el marketplace después de ajustes.",
    category: "marketplace_visibility",
    audience: ["seller"],
    goals: ["increase_visibility"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Relaunch support"],
    deliverablesEs: ["Soporte de relanzamiento"],
    detailRoute: "/solutions/listing-relaunch",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "listing",
    stripePriceEnvVar: "STRIPE_PRICE_LISTING_RELAUNCH",
    purchaseType: "one_time",
    entitlementType: "listing_promotion",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/sell",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  confidential_exposure: {
    key: "confidential_exposure",
    slug: "confidential-exposure",
    nameEn: "Confidential Exposure",
    nameEs: "Exposición Confidencial",
    descriptionEn: "Visibility enhancement for private-market listings.",
    descriptionEs: "Mejora de visibilidad para listados de mercado privado.",
    outcomeEn: "Reach vetted buyers while maintaining confidentiality.",
    outcomeEs: "Llega a compradores verificados manteniendo la confidencialidad.",
    category: "marketplace_visibility",
    audience: ["seller"],
    goals: ["increase_visibility"],
    billingModel: "one_time",
    displayPrice: 10,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Confidential distribution controls"],
    deliverablesEs: ["Controles de distribución confidencial"],
    detailRoute: "/solutions/confidential-exposure",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "listing",
    stripePriceEnvVar: "STRIPE_PRICE_CONFIDENTIAL_EXPOSURE",
    purchaseType: "one_time",
    entitlementType: "listing_promotion",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/sell",
    disclaimersEn: ["Requires confidential listing eligibility."],
    disclaimersEs: ["Requiere elegibilidad para listado confidencial."],
    active: false,
    isPublic: true,
  },
  buyer_lens_memo: {
    key: "buyer_lens_memo",
    slug: "buyer-lens-memo",
    nameEn: "Buyer Lens Memo",
    nameEs: "Memo de Enfoque Comprador",
    descriptionEn: "Concise buyer-facing brief for positioning and fit.",
    descriptionEs: "Resumen breve orientado al comprador sobre posicionamiento y ajuste.",
    outcomeEn: "Clarify buyer narrative and next actions.",
    outcomeEs: "Aclara la narrativa para compradores y próximos pasos.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_sale_readiness", "improve_valuation"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "active",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Downloadable memo"],
    deliverablesEs: ["Memo descargable"],
    detailRoute: "/solutions/buyer-lens-memo",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "business",
    stripePriceEnvVar: "STRIPE_PRICE_BUYER_LENS_MEMO",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "grant_report_access",
    cancelPath: "/solutions/buyer-lens-memo",
    disclaimersEn: ["Informational report only."],
    disclaimersEs: ["Informe únicamente informativo."],
    active: true,
    isPublic: true,
  },
  customer_risk_scan: {
    key: "customer_risk_scan",
    slug: "customer-risk-scan",
    nameEn: "Customer Risk Scan",
    nameEs: "Escaneo de Riesgo de Clientes",
    descriptionEn: "Customer concentration and risk scan.",
    descriptionEs: "Escaneo de concentración y riesgo de clientes.",
    outcomeEn: "Identify concentration vulnerabilities quickly.",
    outcomeEs: "Identifica rápidamente vulnerabilidades de concentración.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_sale_readiness"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "active",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Risk summary"],
    deliverablesEs: ["Resumen de riesgo"],
    detailRoute: "/solutions/customer-risk-scan",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "business",
    stripePriceEnvVar: "STRIPE_PRICE_CUSTOMER_RISK_SCAN",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "grant_report_access",
    cancelPath: "/solutions/customer-risk-scan",
    disclaimersEn: ["Informational output; not legal advice."],
    disclaimersEs: ["Salida informativa; no es asesoría legal."],
    active: true,
    isPublic: true,
  },
  owner_dependence_scan: {
    key: "owner_dependence_scan",
    slug: "owner-dependence-scan",
    nameEn: "Owner Dependence Scan",
    nameEs: "Escaneo de Dependencia del Dueño",
    descriptionEn: "Measure transfer risk tied to owner dependency.",
    descriptionEs: "Mide el riesgo de transferencia ligado a la dependencia del dueño.",
    outcomeEn: "Prioritize delegation and process safeguards.",
    outcomeEs: "Prioriza delegación y resguardos de procesos.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_sale_readiness"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "active",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Owner dependence report"],
    deliverablesEs: ["Informe de dependencia del dueño"],
    detailRoute: "/solutions/owner-dependence-scan",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "business",
    stripePriceEnvVar: "STRIPE_PRICE_OWNER_DEPENDENCE_SCAN",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "grant_report_access",
    cancelPath: "/solutions/owner-dependence-scan",
    disclaimersEn: ["Guidance only."],
    disclaimersEs: ["Solo orientación."],
    active: true,
    isPublic: true,
  },
  value_dna_snapshot: {
    key: "value_dna_snapshot",
    slug: "value-dna-snapshot",
    nameEn: "Value DNA Snapshot",
    nameEs: "Instantánea de ADN de Valor",
    descriptionEn: "Fast baseline of value drivers.",
    descriptionEs: "Línea base rápida de impulsores de valor.",
    outcomeEn: "Reveal top value drivers and blockers.",
    outcomeEs: "Revela principales impulsores y bloqueadores de valor.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_valuation"],
    billingModel: "one_time",
    displayPrice: 10,
    status: "active",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Driver map", "Action summary"],
    deliverablesEs: ["Mapa de impulsores", "Resumen de acciones"],
    detailRoute: "/solutions/value-dna-snapshot",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "business",
    stripePriceEnvVar: "STRIPE_PRICE_VALUE_DNA_SNAPSHOT",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "grant_report_access",
    cancelPath: "/solutions/value-dna-snapshot",
    disclaimersEn: ["Not a certified appraisal."],
    disclaimersEs: ["No es una tasación certificada."],
    active: true,
    isPublic: true,
  },
  enhanced_valuation_report: {
    key: "enhanced_valuation_report",
    slug: "enhanced-valuation-report",
    nameEn: "Enhanced Valuation Report",
    nameEs: "Informe de Valuacion Mejorado",
    descriptionEn: "Comprehensive valuation report for transfer planning.",
    descriptionEs: "Informe integral de valuacion para planificar la transferencia.",
    outcomeEn: "Get deeper valuation context before major decisions.",
    outcomeEs: "Obtiene un contexto de valuacion mas profundo antes de decisiones importantes.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_valuation", "improve_sale_readiness"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "active",
    billingContextEn: "one-time",
    billingContextEs: "pago unico",
    deliverablesEn: ["Enhanced valuation report"],
    deliverablesEs: ["Informe de valuacion mejorado"],
    detailRoute: "/solutions/enhanced-valuation-report",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "business",
    stripePriceEnvVar: "STRIPE_PRICE_ENHANCED_VALUATION_REPORT",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "grant_enhanced_valuation_report",
    cancelPath: "/solutions/enhanced-valuation-report",
    disclaimersEn: [
      "Business planning and valuation support only.",
      "Not legal, tax, or certified appraisal advice.",
    ],
    disclaimersEs: [
      "Solo apoyo de planificacion empresarial y valuacion.",
      "No constituye asesoria legal, fiscal ni tasacion certificada.",
    ],
    active: true,
    isPublic: true,
  },
  sale_readiness_blueprint: {
    key: "sale_readiness_blueprint",
    slug: "sale-readiness-blueprint",
    nameEn: "Sale-Readiness Blueprint",
    nameEs: "Plano de Preparación para Venta",
    descriptionEn: "Prioritized sale-readiness action blueprint.",
    descriptionEs: "Plan de acción priorizado de preparación para la venta.",
    outcomeEn: "Turn readiness gaps into a practical roadmap.",
    outcomeEs: "Convierte brechas de preparación en una hoja de ruta práctica.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_sale_readiness"],
    billingModel: "one_time",
    displayPrice: 10,
    status: "active",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Blueprint report"],
    deliverablesEs: ["Informe de plan"],
    detailRoute: "/solutions/sale-readiness-blueprint",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "business",
    stripePriceEnvVar: "STRIPE_PRICE_SALE_READINESS_BLUEPRINT",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "grant_report_access",
    cancelPath: "/solutions/sale-readiness-blueprint",
    disclaimersEn: ["Guidance tool only."],
    disclaimersEs: ["Solo herramienta de orientación."],
    active: true,
    isPublic: true,
  },
  value_improvement_roadmap: {
    key: "value_improvement_roadmap",
    slug: "value-improvement-roadmap",
    nameEn: "Value Improvement Roadmap",
    nameEs: "Hoja de Ruta de Mejora de Valor",
    descriptionEn: "Action roadmap to improve transferable value.",
    descriptionEs: "Hoja de ruta para mejorar el valor transferible.",
    outcomeEn: "Focus on high-impact value improvements.",
    outcomeEs: "Enfoca mejoras de valor de alto impacto.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_valuation"],
    billingModel: "one_time",
    displayPrice: 10,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Improvement roadmap"],
    deliverablesEs: ["Hoja de ruta de mejora"],
    detailRoute: "/solutions/value-improvement-roadmap",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "business",
    stripePriceEnvVar: "STRIPE_PRICE_VALUE_IMPROVEMENT_ROADMAP",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/solutions/value-improvement-roadmap",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  value_action_sprint: {
    key: "value_action_sprint",
    slug: "value-action-sprint",
    nameEn: "Value Action Sprint",
    nameEs: "Sprint de Acción de Valor",
    descriptionEn: "Structured 30-day planning and execution sprint.",
    descriptionEs: "Sprint estructurado de 30 días de planificación y ejecución.",
    outcomeEn: "Ship focused value actions in one month.",
    outcomeEs: "Ejecuta acciones de valor enfocadas en un mes.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_valuation", "improve_sale_readiness"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "active",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Workspace", "Guided action sequence"],
    deliverablesEs: ["Espacio de trabajo", "Secuencia guiada de acciones"],
    detailRoute: "/products/value-action-sprint",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_VALUE_ACTION_SPRINT",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "create_value_action_sprint_workspace",
    cancelPath: "/products/value-action-sprint",
    disclaimersEn: [
      "Business planning tool only.",
      "Not legal, tax, or certified valuation advice.",
    ],
    disclaimersEs: [
      "Solo herramienta de planificación empresarial.",
      "No constituye asesoría legal, fiscal ni valuación certificada.",
    ],
    active: true,
    isPublic: true,
  },
  exit_intelligence_bundle: {
    key: "exit_intelligence_bundle",
    slug: "exit-intelligence-bundle",
    nameEn: "Exit Intelligence Bundle",
    nameEs: "Paquete de Inteligencia de Salida",
    descriptionEn: "Combined sale-prep intelligence package.",
    descriptionEs: "Paquete combinado de inteligencia para preparación de salida.",
    outcomeEn: "Bundle critical insights for an exit path.",
    outcomeEs: "Agrupa ideas críticas para una ruta de salida.",
    category: "business_intelligence",
    audience: ["owner", "seller"],
    goals: ["improve_sale_readiness", "improve_valuation"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Multi-report package"],
    deliverablesEs: ["Paquete multi-informe"],
    detailRoute: "/solutions/exit-intelligence-bundle",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "business",
    stripePriceEnvVar: "STRIPE_PRICE_EXIT_INTELLIGENCE_BUNDLE",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/solutions/exit-intelligence-bundle",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  deal_room_extension: {
    key: "deal_room_extension",
    slug: "deal-room-extension",
    nameEn: "Deal Room Extension",
    nameEs: "Extensión de Deal Room",
    descriptionEn: "Extend a deal-room timeline.",
    descriptionEs: "Extiende la duración de un deal room.",
    outcomeEn: "Keep due diligence moving without interruption.",
    outcomeEs: "Mantén la debida diligencia avanzando sin interrupciones.",
    category: "transactions",
    audience: ["seller", "buyer", "team"],
    goals: ["run_transaction"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "planned",
    billingContextEn: "one-time per room",
    billingContextEs: "pago único por sala",
    deliverablesEn: ["Time extension"],
    deliverablesEs: ["Extensión de tiempo"],
    detailRoute: "/solutions/deal-room-extension",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "deal_room",
    stripePriceEnvVar: "STRIPE_PRICE_DEAL_ROOM_EXTENSION",
    purchaseType: "one_time",
    entitlementType: "deal_room_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/deals",
    disclaimersEn: ["Deal-room eligibility required."],
    disclaimersEs: ["Requiere elegibilidad de deal room."],
    active: false,
    isPublic: true,
  },
  closing_archive: {
    key: "closing_archive",
    slug: "closing-archive",
    nameEn: "Closing Archive",
    nameEs: "Archivo de Cierre",
    descriptionEn: "Archive package for closed transactions.",
    descriptionEs: "Paquete de archivo para transacciones cerradas.",
    outcomeEn: "Retain critical closing artifacts.",
    outcomeEs: "Conserva artefactos críticos del cierre.",
    category: "transactions",
    audience: ["seller", "buyer"],
    goals: ["run_transaction"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Archive retention bundle"],
    deliverablesEs: ["Paquete de conservación de archivo"],
    detailRoute: "/solutions/closing-archive",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "transaction",
    stripePriceEnvVar: "STRIPE_PRICE_CLOSING_ARCHIVE",
    purchaseType: "one_time",
    entitlementType: "deal_room_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/deals",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  deal_room_90: {
    key: "deal_room_90",
    slug: "deal-room-90",
    nameEn: "Deal Room 90",
    nameEs: "Deal Room 90",
    descriptionEn: "Ninety-day premium deal-room package.",
    descriptionEs: "Paquete premium de deal room por 90 días.",
    outcomeEn: "Run longer diligence cycles with structure.",
    outcomeEs: "Ejecuta ciclos de diligencia más largos con estructura.",
    category: "transactions",
    audience: ["seller", "buyer", "team"],
    goals: ["run_transaction"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "active",
    billingContextEn: "one-time per room",
    billingContextEs: "pago único por sala",
    deliverablesEn: ["Extended secure workspace"],
    deliverablesEs: ["Espacio seguro extendido"],
    detailRoute: "/solutions/deal-room-90",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "transaction",
    stripePriceEnvVar: "STRIPE_PRICE_DEAL_ROOM_90",
    purchaseType: "one_time",
    entitlementType: "deal_room_access",
    fulfillmentBehavior: "create_timed_deal_room",
    cancelPath: "/deals",
    disclaimersEn: [
      "Purchase applies to one eligible seller transaction target.",
      "Access expires after 90 days and is revoked on full refund.",
    ],
    disclaimersEs: [
      "La compra aplica a un objetivo de transaccion elegible del vendedor.",
      "El acceso vence en 90 dias y se revoca con reembolso total.",
    ],
    active: true,
    isPublic: true,
  },
  confidential_sale_launch: {
    key: "confidential_sale_launch",
    slug: "confidential-sale-launch",
    nameEn: "Confidential Sale Launch",
    nameEs: "Lanzamiento de Venta Confidencial",
    descriptionEn: "Launch support for confidential sale workflows.",
    descriptionEs: "Soporte de lanzamiento para flujos de venta confidencial.",
    outcomeEn: "Prepare a controlled confidential process.",
    outcomeEs: "Prepara un proceso confidencial controlado.",
    category: "transactions",
    audience: ["seller"],
    goals: ["run_transaction", "support_transfer"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "active",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Launch checklist"],
    deliverablesEs: ["Checklist de lanzamiento"],
    detailRoute: "/solutions/confidential-sale-launch",
    ctaBehavior: "checkout",
    requiresAuth: true,
    requiredTargetType: "listing",
    stripePriceEnvVar: "STRIPE_PRICE_CONFIDENTIAL_SALE_LAUNCH",
    purchaseType: "one_time",
    entitlementType: "listing_promotion",
    fulfillmentBehavior: "launch_confidential_sale_listing",
    cancelPath: "/sell",
    disclaimersEn: [
      "Listing must remain published and include a teaser title.",
      "Confidential state is reversed on full refund when no other active launch exists.",
    ],
    disclaimersEs: [
      "El listado debe mantenerse publicado e incluir un titulo teaser.",
      "El estado confidencial se revierte con reembolso total si no existe otro lanzamiento activo.",
    ],
    active: true,
    isPublic: true,
  },
  transaction_workspace: {
    key: "transaction_workspace",
    slug: "transaction-workspace",
    nameEn: "Transaction Workspace",
    nameEs: "Espacio de Trabajo de Transacción",
    descriptionEn: "Transaction-focused workspace package.",
    descriptionEs: "Paquete de espacio de trabajo enfocado en transacciones.",
    outcomeEn: "Coordinate buyer-seller workflow in one place.",
    outcomeEs: "Coordina el flujo comprador-vendedor en un solo lugar.",
    category: "transactions",
    audience: ["seller", "buyer", "team"],
    goals: ["run_transaction"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "planned",
    billingContextEn: "per transaction",
    billingContextEs: "por transacción",
    deliverablesEn: ["Dedicated transaction workspace"],
    deliverablesEs: ["Espacio de trabajo dedicado a transacciones"],
    detailRoute: "/solutions/transaction-workspace",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "transaction",
    stripePriceEnvVar: "STRIPE_PRICE_TRANSACTION_WORKSPACE",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/deals",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  business_comparison_pack: {
    key: "business_comparison_pack",
    slug: "business-comparison-pack",
    nameEn: "Business Comparison Pack",
    nameEs: "Paquete de Comparación de Negocios",
    descriptionEn: "Comparison toolkit for shortlisted acquisitions.",
    descriptionEs: "Kit de comparación para adquisiciones preseleccionadas.",
    outcomeEn: "Compare opportunities with consistent criteria.",
    outcomeEs: "Compara oportunidades con criterios consistentes.",
    category: "buyer_solutions",
    audience: ["buyer"],
    goals: ["evaluate_acquisition"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Comparison worksheet set"],
    deliverablesEs: ["Conjunto de hojas de comparación"],
    detailRoute: "/solutions/business-comparison-pack",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "acquisition_target",
    stripePriceEnvVar: "STRIPE_PRICE_BUSINESS_COMPARISON_PACK",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/buy",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  acquisition_readiness_profile: {
    key: "acquisition_readiness_profile",
    slug: "acquisition-readiness-profile",
    nameEn: "Acquisition Readiness Profile",
    nameEs: "Perfil de Preparación de Adquisición",
    descriptionEn: "Buyer readiness profile with next-step guidance.",
    descriptionEs: "Perfil de preparación del comprador con guía de próximos pasos.",
    outcomeEn: "Clarify acquisition readiness before outreach.",
    outcomeEs: "Aclara tu preparación para adquirir antes de contactar.",
    category: "buyer_solutions",
    audience: ["buyer"],
    goals: ["evaluate_acquisition"],
    billingModel: "one_time",
    displayPrice: 10,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Readiness report"],
    deliverablesEs: ["Informe de preparación"],
    detailRoute: "/solutions/acquisition-readiness-profile",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_ACQUISITION_READINESS_PROFILE",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/buy",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  priority_buyer_verification: {
    key: "priority_buyer_verification",
    slug: "priority-buyer-verification",
    nameEn: "Priority Buyer Verification",
    nameEs: "Verificación Prioritaria de Comprador",
    descriptionEn: "Identity and seriousness verification workflow.",
    descriptionEs: "Flujo de verificación de identidad y seriedad.",
    outcomeEn: "Improve trust during deal intake.",
    outcomeEs: "Mejora la confianza durante la evaluación de oportunidades.",
    category: "buyer_solutions",
    audience: ["buyer"],
    goals: ["evaluate_acquisition"],
    billingModel: "annual",
    displayPrice: 10,
    status: "planned",
    billingContextEn: "annual",
    billingContextEs: "anual",
    deliverablesEn: ["Verification status"],
    deliverablesEs: ["Estado de verificación"],
    detailRoute: "/solutions/priority-buyer-verification",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_PRIORITY_BUYER_VERIFICATION",
    purchaseType: "one_time",
    entitlementType: "service_access",
    fulfillmentBehavior: "manual_service",
    cancelPath: "/buy",
    disclaimersEn: ["Annual add-on planned."],
    disclaimersEs: ["Complemento anual planificado."],
    active: false,
    isPublic: true,
  },
  acquisition_scout: {
    key: "acquisition_scout",
    slug: "acquisition-scout",
    nameEn: "Acquisition Scout",
    nameEs: "Explorador de Adquisición",
    descriptionEn: "Recurring scout workflow for buyer opportunities.",
    descriptionEs: "Flujo recurrente de scouting de oportunidades para compradores.",
    outcomeEn: "Maintain a curated target pipeline.",
    outcomeEs: "Mantén un pipeline curado de objetivos.",
    category: "buyer_solutions",
    audience: ["buyer"],
    goals: ["evaluate_acquisition"],
    billingModel: "monthly",
    displayPrice: 10,
    status: "planned",
    billingContextEn: "monthly",
    billingContextEs: "mensual",
    deliverablesEn: ["Scout queue"],
    deliverablesEs: ["Cola de scouting"],
    detailRoute: "/solutions/acquisition-scout",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_ACQUISITION_SCOUT",
    purchaseType: "one_time",
    entitlementType: "service_access",
    fulfillmentBehavior: "manual_service",
    cancelPath: "/buy",
    disclaimersEn: ["Recurring add-on planned."],
    disclaimersEs: ["Complemento recurrente planificado."],
    active: false,
    isPublic: true,
  },
  buyer_diligence_pass: {
    key: "buyer_diligence_pass",
    slug: "buyer-diligence-pass",
    nameEn: "Buyer Diligence Pass",
    nameEs: "Pase de Diligencia de Comprador",
    descriptionEn: "Per-target diligence support pass.",
    descriptionEs: "Pase de soporte de diligencia por objetivo.",
    outcomeEn: "Structure diligence for each target.",
    outcomeEs: "Estructura la diligencia para cada objetivo.",
    category: "buyer_solutions",
    audience: ["buyer"],
    goals: ["evaluate_acquisition"],
    billingModel: "per_target",
    displayPrice: 20,
    status: "planned",
    billingContextEn: "per target",
    billingContextEs: "por objetivo",
    deliverablesEn: ["Target diligence packet"],
    deliverablesEs: ["Paquete de diligencia por objetivo"],
    detailRoute: "/solutions/buyer-diligence-pass",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "acquisition_target",
    stripePriceEnvVar: "STRIPE_PRICE_BUYER_DILIGENCE_PASS",
    purchaseType: "one_time",
    entitlementType: "report_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/buy",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  acquisition_workspace: {
    key: "acquisition_workspace",
    slug: "acquisition-workspace",
    nameEn: "Acquisition Workspace",
    nameEs: "Espacio de Trabajo de Adquisición",
    descriptionEn: "Per-transaction buyer workspace.",
    descriptionEs: "Espacio de trabajo de comprador por transacción.",
    outcomeEn: "Coordinate acquisition execution in one place.",
    outcomeEs: "Coordina la ejecución de adquisición en un solo lugar.",
    category: "buyer_solutions",
    audience: ["buyer"],
    goals: ["evaluate_acquisition", "run_transaction"],
    billingModel: "per_transaction",
    displayPrice: 20,
    status: "planned",
    billingContextEn: "per transaction",
    billingContextEs: "por transacción",
    deliverablesEn: ["Acquisition workspace"],
    deliverablesEs: ["Espacio de trabajo de adquisición"],
    detailRoute: "/solutions/acquisition-workspace",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "transaction",
    stripePriceEnvVar: "STRIPE_PRICE_ACQUISITION_WORKSPACE",
    purchaseType: "one_time",
    entitlementType: "workspace_access",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/buy",
    disclaimersEn: ["Rollout planned."],
    disclaimersEs: ["Lanzamiento planificado."],
    active: false,
    isPublic: true,
  },
  essential_intelligence_pack: {
    key: "essential_intelligence_pack",
    slug: "essential-intelligence-pack",
    nameEn: "Essential Intelligence Pack",
    nameEs: "Paquete de Inteligencia Esencial",
    descriptionEn: "Starter intelligence credit pack.",
    descriptionEs: "Paquete inicial de créditos de inteligencia.",
    outcomeEn: "Unlock additional intelligence usage.",
    outcomeEs: "Desbloquea uso adicional de inteligencia.",
    category: "credits",
    audience: ["owner", "seller", "buyer"],
    goals: ["access_intelligence"],
    billingModel: "one_time",
    displayPrice: 5,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Credit balance increase"],
    deliverablesEs: ["Incremento de saldo de créditos"],
    detailRoute: "/solutions/essential-intelligence-pack",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_ESSENTIAL_INTELLIGENCE_PACK",
    purchaseType: "one_time",
    entitlementType: "credit_balance",
    fulfillmentBehavior: "grant_credit_balance",
    cancelPath: "/solutions/essential-intelligence-pack",
    disclaimersEn: ["Credit packs remain planned."],
    disclaimersEs: ["Los paquetes de créditos permanecen planificados."],
    active: false,
    isPublic: true,
  },
  enhanced_intelligence_pack: {
    key: "enhanced_intelligence_pack",
    slug: "enhanced-intelligence-pack",
    nameEn: "Enhanced Intelligence Pack",
    nameEs: "Paquete de Inteligencia Mejorado",
    descriptionEn: "Mid-tier intelligence credit pack.",
    descriptionEs: "Paquete de créditos de inteligencia intermedio.",
    outcomeEn: "Increase report and analysis capacity.",
    outcomeEs: "Aumenta capacidad de reportes y análisis.",
    category: "credits",
    audience: ["owner", "seller", "buyer"],
    goals: ["access_intelligence"],
    billingModel: "one_time",
    displayPrice: 10,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Credit balance increase"],
    deliverablesEs: ["Incremento de saldo de créditos"],
    detailRoute: "/solutions/enhanced-intelligence-pack",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_ENHANCED_INTELLIGENCE_PACK",
    purchaseType: "one_time",
    entitlementType: "credit_balance",
    fulfillmentBehavior: "grant_credit_balance",
    cancelPath: "/solutions/enhanced-intelligence-pack",
    disclaimersEn: ["Credit packs remain planned."],
    disclaimersEs: ["Los paquetes de créditos permanecen planificados."],
    active: false,
    isPublic: true,
  },
  complete_intelligence_pack: {
    key: "complete_intelligence_pack",
    slug: "complete-intelligence-pack",
    nameEn: "Complete Intelligence Pack",
    nameEs: "Paquete de Inteligencia Completo",
    descriptionEn: "Highest-tier intelligence credit pack.",
    descriptionEs: "Paquete de créditos de inteligencia de mayor nivel.",
    outcomeEn: "Support deeper analysis programs.",
    outcomeEs: "Soporta programas de análisis más profundos.",
    category: "credits",
    audience: ["owner", "seller", "buyer"],
    goals: ["access_intelligence"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "planned",
    billingContextEn: "one-time",
    billingContextEs: "pago único",
    deliverablesEn: ["Credit balance increase"],
    deliverablesEs: ["Incremento de saldo de créditos"],
    detailRoute: "/solutions/complete-intelligence-pack",
    ctaBehavior: "coming_soon",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_COMPLETE_INTELLIGENCE_PACK",
    purchaseType: "one_time",
    entitlementType: "credit_balance",
    fulfillmentBehavior: "grant_credit_balance",
    cancelPath: "/solutions/complete-intelligence-pack",
    disclaimersEn: ["Credit packs remain planned."],
    disclaimersEs: ["Los paquetes de créditos permanecen planificados."],
    active: false,
    isPublic: true,
  },
  verified_listing_pack: {
    key: "verified_listing_pack",
    slug: "verified-listing-pack-legacy",
    nameEn: "Verified Listing Pack (Legacy)",
    nameEs: "Paquete de Listado Verificado (Legado)",
    descriptionEn: "Legacy key retained for historical compatibility.",
    descriptionEs: "Clave heredada mantenida por compatibilidad histórica.",
    outcomeEn: "Preserve historical purchase resolution.",
    outcomeEs: "Preserva la resolución de compras históricas.",
    category: "legacy",
    audience: ["all"],
    goals: ["increase_visibility"],
    billingModel: "one_time",
    displayPrice: 10,
    status: "included",
    billingContextEn: "legacy",
    billingContextEs: "legado",
    deliverablesEn: ["Historical compatibility only"],
    deliverablesEs: ["Solo compatibilidad histórica"],
    detailRoute: "/solutions/featured-listing",
    ctaBehavior: "included",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_VERIFIED_LISTING_PACK",
    purchaseType: "one_time",
    entitlementType: "none",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/solutions",
    disclaimersEn: ["Legacy key."],
    disclaimersEs: ["Clave heredada."],
    active: false,
    isPublic: false,
  },
  launch_intelligence_pack: {
    key: "launch_intelligence_pack",
    slug: "launch-intelligence-pack-legacy",
    nameEn: "Launch Intelligence Pack (Legacy)",
    nameEs: "Paquete de Inteligencia de Lanzamiento (Legado)",
    descriptionEn: "Legacy key retained for historical compatibility.",
    descriptionEs: "Clave heredada mantenida por compatibilidad histórica.",
    outcomeEn: "Preserve historical purchase resolution.",
    outcomeEs: "Preserva la resolución de compras históricas.",
    category: "legacy",
    audience: ["all"],
    goals: ["access_intelligence"],
    billingModel: "one_time",
    displayPrice: 20,
    status: "included",
    billingContextEn: "legacy",
    billingContextEs: "legado",
    deliverablesEn: ["Historical compatibility only"],
    deliverablesEs: ["Solo compatibilidad histórica"],
    detailRoute: "/solutions/exit-intelligence-bundle",
    ctaBehavior: "included",
    requiresAuth: true,
    requiredTargetType: "none",
    stripePriceEnvVar: "STRIPE_PRICE_LAUNCH_INTELLIGENCE_PACK",
    purchaseType: "one_time",
    entitlementType: "none",
    fulfillmentBehavior: "not_implemented",
    cancelPath: "/solutions",
    disclaimersEn: ["Legacy key."],
    disclaimersEs: ["Clave heredada."],
    active: false,
    isPublic: false,
  },
};

function assertRegistryInvariants(): void {
  const keys = new Set<string>();
  const slugs = new Set<string>();
  const checkoutPriceEnvVars = new Set<string>();
  const implementedBehaviors = new Set<FulfillmentBehavior>([
    "create_value_action_sprint_workspace",
    "grant_report_access",
    "grant_enhanced_valuation_report",
    "create_timed_deal_room",
    "apply_listing_promotion",
    "launch_confidential_sale_listing",
  ]);

  for (const key of PRODUCT_KEYS) {
    const product = PRODUCT_REGISTRY[key];
    if (!product) {
      throw new Error(`Missing product definition for key: ${key}`);
    }
    if (keys.has(product.key)) {
      throw new Error(`Duplicate product key: ${product.key}`);
    }
    keys.add(product.key);

    if (slugs.has(product.slug)) {
      throw new Error(`Duplicate product slug: ${product.slug}`);
    }
    slugs.add(product.slug);

    if (product.active && product.isPublic && product.displayPrice > 0) {
      if (!ALLOWED_PUBLIC_PRICES.has(product.displayPrice)) {
        throw new Error(`Invalid public price for ${product.key}: $${product.displayPrice}`);
      }
    }

    if (product.status === "active" && product.ctaBehavior === "checkout") {
      if (!product.stripePriceEnvVar) {
        throw new Error(`Active checkout product must declare stripePriceEnvVar: ${product.key}`);
      }
      if (checkoutPriceEnvVars.has(product.stripePriceEnvVar)) {
        throw new Error(
          `Stripe price env var must be unique per product: ${product.stripePriceEnvVar}`
        );
      }
      checkoutPriceEnvVars.add(product.stripePriceEnvVar);

      if (!implementedBehaviors.has(product.fulfillmentBehavior)) {
        throw new Error(
          `Active checkout product has unimplemented fulfillment: ${product.key} -> ${product.fulfillmentBehavior}`
        );
      }
    }
  }
}

assertRegistryInvariants();

const HISTORICAL_PRODUCT_KEY_ALIASES: Partial<Record<string, ProductKey>> = {
  full_deal_room: "deal_room_90",
  confidential_sale_listing: "confidential_sale_launch",
  confidential_sale_launch_pack: "confidential_sale_launch",
};

const STRIPE_ENV_FALLBACK_BY_PRODUCT_KEY: Partial<Record<ProductKey, readonly string[]>> = {
  deal_room_90: ["STRIPE_PRICE_FULL_DEAL_ROOM"],
  confidential_sale_launch: [
    "STRIPE_PRICE_CONFIDENTIAL_SALE_LISTING",
    "STRIPE_PRICE_CONFIDENTIAL_SALE_LAUNCH_PACK",
  ],
};

function resolveCanonicalProductKey(key: string): ProductKey | null {
  const normalized = key.trim();
  if (!normalized) return null;
  if (PRODUCT_KEYS.includes(normalized as ProductKey)) {
    return normalized as ProductKey;
  }
  return HISTORICAL_PRODUCT_KEY_ALIASES[normalized] ?? null;
}

function resolveStripePriceFromEnv(product: ProductDefinition): string | null {
  const envVarCandidates = [
    product.stripePriceEnvVar,
    ...(STRIPE_ENV_FALLBACK_BY_PRODUCT_KEY[product.key] ?? []),
  ].filter((value): value is string => Boolean(value));

  for (const envVarName of envVarCandidates) {
    const candidate = process.env[envVarName]?.trim();
    if (candidate && /^price_[A-Za-z0-9_]+$/.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getProduct(key: string): ProductDefinition | null {
  const canonicalKey = resolveCanonicalProductKey(key);
  if (!canonicalKey) return null;
  return PRODUCT_REGISTRY[canonicalKey] ?? null;
}

export function getActiveProduct(key: string): ProductDefinition | null {
  const product = getProduct(key);
  if (!product || !product.active) return null;
  return product;
}

export function getPurchasableProduct(key: string): ProductDefinition | null {
  const product = getProduct(key);
  if (!product) return null;
  if (!product.active || product.status !== "active") return null;
  if (!product.isPublic) return null;
  if (product.ctaBehavior !== "checkout") return null;
  return product;
}

export function isProductConfigured(product: ProductDefinition): boolean {
  if (!product.stripePriceEnvVar) return product.ctaBehavior !== "checkout";
  return Boolean(resolveStripePriceFromEnv(product));
}

export function getStripePriceId(product: ProductDefinition): string {
  if (!product.stripePriceEnvVar) {
    throw new Error(`Product ${product.key} has no stripePriceEnvVar.`);
  }

  const priceId = resolveStripePriceFromEnv(product);
  if (!priceId) {
    throw new Error(`${product.stripePriceEnvVar} is not configured on the server.`);
  }
  return priceId;
}

export function toPublicSolution(
  product: ProductDefinition,
  locale: "en" | "es" = "en"
): PublicSolution {
  const isSpanish = locale === "es";

  return {
    key: product.key,
    slug: product.slug,
    name: isSpanish ? product.nameEs : product.nameEn,
    description: isSpanish ? product.descriptionEs : product.descriptionEn,
    outcome: isSpanish ? product.outcomeEs : product.outcomeEn,
    category: product.category,
    audience: product.audience,
    goals: product.goals,
    billingModel: product.billingModel,
    displayPrice: product.displayPrice,
    status: product.status,
    billingContext: isSpanish ? product.billingContextEs : product.billingContextEn,
    deliverables: isSpanish ? product.deliverablesEs : product.deliverablesEn,
    detailRoute: product.detailRoute,
    ctaBehavior: product.ctaBehavior,
    requiresAuth: product.requiresAuth,
    requiredTargetType: product.requiredTargetType,
    cancelPath: product.cancelPath,
    disclaimers: isSpanish ? product.disclaimersEs : product.disclaimersEn,
  };
}

export function getCatalogSolutions(): ProductDefinition[] {
  return PRODUCT_KEYS.map((key) => PRODUCT_REGISTRY[key]).filter((p) => p.isPublic);
}

export function getCatalogSolutionBySlug(slug: string): ProductDefinition | null {
  const normalized = slug.trim().toLowerCase();
  return getCatalogSolutions().find((product) => product.slug === normalized) ?? null;
}

export function getCatalogSolutionsByCategory(
  category: ProductCategory
): ProductDefinition[] {
  return getCatalogSolutions().filter((product) => product.category === category);
}
