if (typeof window !== "undefined") {
  throw new Error("lib/commerce/business-in-a-box-templates must only be imported on the server.");
}

export const BUSINESS_IN_A_BOX_TEMPLATE_KEYS = [
  "remote_consulting",
  "creative_agency",
  "online_tutoring",
  "software_agency",
  "virtual_assistant",
  "marketing_agency",
  "ecommerce",
  "bookkeeping",
] as const;

export type BusinessInABoxTemplateKey = (typeof BUSINESS_IN_A_BOX_TEMPLATE_KEYS)[number];

export type TemplateLocale = "en" | "es";

export type LocalizedText = {
  en: string;
  es: string;
};

export type TemplateItemDefinition = {
  key: string;
  title: LocalizedText;
  description?: LocalizedText;
};

export type BusinessInABoxTemplateDefinition = {
  key: BusinessInABoxTemplateKey;
  active: boolean;
  version: string;
  suitableBusinessType: LocalizedText;
  name: LocalizedText;
  description: LocalizedText;
  clientPipelineStages: TemplateItemDefinition[];
  starterTasks: TemplateItemDefinition[];
  operatingChecklist: TemplateItemDefinition[];
  sopPlaceholders: TemplateItemDefinition[];
  documentChecklist: TemplateItemDefinition[];
  kpiRecommendations: TemplateItemDefinition[];
  onboardingSteps: TemplateItemDefinition[];
  recurringRoutines: TemplateItemDefinition[];
};

export type PublicBusinessInABoxTemplateSummary = {
  key: BusinessInABoxTemplateKey;
  name: string;
  description: string;
  suitableBusinessType: string;
  workflowsIncluded: number;
  tasksIncluded: number;
  clientStageOutline: string[];
  kpiCategories: string[];
  documentPlaceholders: string[];
  sopPlaceholders: string[];
  previewCategories: string[];
};

const TEMPLATE_VERSION = "2026-08-05.1";

function item(key: string, en: string, es: string, enDescription?: string, esDescription?: string): TemplateItemDefinition {
  return {
    key,
    title: { en, es },
    description:
      enDescription && esDescription
        ? {
            en: enDescription,
            es: esDescription,
          }
        : undefined,
  };
}

const SHARED_DOCUMENTS = [
  item("service_agreement", "Service agreement", "Acuerdo de servicios"),
  item("proposal_template", "Proposal template", "Plantilla de propuesta"),
  item("invoice_template", "Invoice template", "Plantilla de factura"),
  item("onboarding_questionnaire", "Onboarding questionnaire", "Cuestionario de incorporación"),
  item("client_information_form", "Client information form", "Formulario de información del cliente"),
  item("privacy_notice", "Privacy notice", "Aviso de privacidad"),
  item("operating_procedures", "Operating procedures", "Procedimientos operativos"),
  item("financial_summary", "Financial summary", "Resumen financiero"),
] as const;

const SHARED_SOPS = [
  item("client_onboarding", "Client onboarding SOP", "POE de incorporación de clientes"),
  item("service_delivery", "Service delivery SOP", "POE de entrega del servicio"),
  item("invoice_follow_up", "Invoice and payment follow-up SOP", "POE de seguimiento de facturas y pagos"),
  item("client_offboarding", "Client offboarding SOP", "POE de cierre con clientes"),
  item("quality_review", "Quality-review SOP", "POE de revisión de calidad"),
  item("data_handling", "Data and document handling SOP", "POE de manejo de datos y documentos"),
] as const;

const SHARED_KPIS = [
  item("monthly_revenue", "Monthly revenue", "Ingresos mensuales"),
  item("unpaid_invoices", "Unpaid invoices", "Facturas pendientes de cobro"),
  item("lead_to_client_conversion", "Lead-to-client conversion", "Conversión de prospecto a cliente"),
  item("client_concentration", "Client concentration", "Concentración de clientes"),
  item("recurring_revenue_pct", "Recurring revenue percentage", "Porcentaje de ingresos recurrentes"),
  item("client_retention", "Client retention", "Retención de clientes"),
  item("delivery_timeliness", "Delivery timeliness", "Puntualidad en entregas"),
  item("owner_dependence", "Owner dependence", "Dependencia del dueño"),
  item("documentation_completeness", "Documentation completeness", "Integridad de documentación"),
] as const;

const REGISTRY: Record<BusinessInABoxTemplateKey, BusinessInABoxTemplateDefinition> = {
  remote_consulting: {
    key: "remote_consulting",
    active: true,
    version: TEMPLATE_VERSION,
    name: { en: "Remote Consulting", es: "Consultoría Remota" },
    description: {
      en: "Built for discovery calls, proposal workflows, delivery reviews, and follow-up discipline.",
      es: "Diseñada para llamadas de descubrimiento, propuestas, revisiones de entregables y seguimiento disciplinado.",
    },
    suitableBusinessType: { en: "Independent consultant or advisory firm", es: "Consultor independiente o firma de asesoría" },
    clientPipelineStages: [
      item("new_lead", "New lead", "Nuevo prospecto"),
      item("discovery", "Discovery", "Descubrimiento"),
      item("proposal_sent", "Proposal sent", "Propuesta enviada"),
      item("awaiting_decision", "Awaiting decision", "Esperando decisión"),
      item("onboarding", "Onboarding", "Incorporación"),
      item("active_client", "Active client", "Cliente activo"),
      item("deliverable_review", "Deliverable review", "Revisión de entregables"),
      item("follow_up", "Follow-up", "Seguimiento"),
      item("completed", "Completed", "Completado"),
    ],
    starterTasks: [
      item("define_offer", "Define primary service offer", "Definir oferta principal"),
      item("pricing_structure", "Confirm pricing structure", "Confirmar estructura de precios"),
      item("proposal_template_task", "Prepare proposal template", "Preparar plantilla de propuesta"),
      item("onboarding_checklist", "Complete client onboarding checklist", "Completar checklist de incorporación"),
      item("weekly_routine", "Document weekly operating routine", "Documentar rutina operativa semanal"),
    ],
    operatingChecklist: [
      item("setup", "Finalize profile and service positioning", "Finalizar perfil y posicionamiento de servicio"),
      item("clients", "Define discovery and follow-up rhythm", "Definir ritmo de descubrimiento y seguimiento"),
      item("finance", "Set invoicing and collections cadence", "Definir ritmo de facturación y cobro"),
      item("operations", "Set deliverable review standards", "Definir estándares de revisión de entregables"),
      item("growth", "Schedule referral and upsell reviews", "Programar revisión de referidos y upsell"),
    ],
    sopPlaceholders: [...SHARED_SOPS],
    documentChecklist: [...SHARED_DOCUMENTS],
    kpiRecommendations: [...SHARED_KPIS],
    onboardingSteps: [
      item("welcome_and_scope", "Confirm scope and communication standards", "Confirmar alcance y estándares de comunicación"),
      item("access_collection", "Collect required access and baseline info", "Recolectar accesos e información base"),
      item("first_delivery", "Deliver first milestone with feedback loop", "Entregar primer hito con ciclo de retroalimentación"),
    ],
    recurringRoutines: [
      item("daily_priorities", "Daily priorities review", "Revisión diaria de prioridades"),
      item("weekly_followup", "Weekly client follow-up review", "Revisión semanal de seguimiento de clientes"),
      item("monthly_kpi_review", "Monthly KPI review", "Revisión mensual de KPI"),
      item("quarterly_sop_review", "Quarterly SOP review", "Revisión trimestral de POE"),
    ],
  },
  creative_agency: {
    key: "creative_agency",
    active: true,
    version: TEMPLATE_VERSION,
    name: { en: "Creative Agency", es: "Agencia Creativa" },
    description: {
      en: "Focused on briefs, revision cycles, approvals, asset delivery, and margin visibility.",
      es: "Enfocada en briefs, ciclos de revisión, aprobaciones, entrega de activos y visibilidad de márgenes.",
    },
    suitableBusinessType: { en: "Branding, design, and production teams", es: "Equipos de branding, diseño y producción" },
    clientPipelineStages: [
      item("new_lead", "New lead", "Nuevo prospecto"),
      item("briefing", "Creative briefing", "Brief creativo"),
      item("proposal_sent", "Proposal sent", "Propuesta enviada"),
      item("in_production", "In production", "En producción"),
      item("revision_cycle", "Revision cycle", "Ciclo de revisiones"),
      item("approval", "Approval", "Aprobación"),
      item("asset_delivery", "Asset delivery", "Entrega de activos"),
      item("retainer_follow_up", "Retainer follow-up", "Seguimiento de retainer"),
    ],
    starterTasks: [
      item("define_offer", "Define service packages", "Definir paquetes de servicio"),
      item("pricing_structure", "Confirm project and retainer pricing", "Confirmar precios por proyecto y retainer"),
      item("proposal_template_task", "Prepare creative proposal template", "Preparar plantilla de propuesta creativa"),
      item("review_standards", "Define revision and approval standards", "Definir estándares de revisión y aprobación"),
      item("margin_check", "Set project margin review routine", "Definir rutina de revisión de márgenes"),
    ],
    operatingChecklist: [
      item("setup", "Define brief intake checklist", "Definir checklist de intake de brief"),
      item("clients", "Document approval contacts and roles", "Documentar contactos y roles de aprobación"),
      item("operations", "Set revision and handoff protocol", "Definir protocolo de revisiones y handoff"),
      item("growth", "Plan showcase and referral loop", "Planificar vitrina de trabajo y referidos"),
    ],
    sopPlaceholders: [...SHARED_SOPS],
    documentChecklist: [...SHARED_DOCUMENTS],
    kpiRecommendations: [...SHARED_KPIS],
    onboardingSteps: [
      item("brief_alignment", "Align on creative brief and success criteria", "Alinear brief creativo y criterios de éxito"),
      item("timeline_setup", "Set timeline with revision windows", "Definir cronograma con ventanas de revisión"),
      item("delivery_protocol", "Confirm final delivery and archive protocol", "Confirmar protocolo de entrega final y archivo"),
    ],
    recurringRoutines: [
      item("daily_priorities", "Daily priorities review", "Revisión diaria de prioridades"),
      item("weekly_client_followup", "Weekly client follow-up review", "Revisión semanal de seguimiento de clientes"),
      item("weekly_team_checkin", "Weekly team check-in", "Revisión semanal del equipo"),
      item("monthly_financial_review", "Monthly financial review", "Revisión financiera mensual"),
    ],
  },
  online_tutoring: {
    key: "online_tutoring",
    active: true,
    version: TEMPLATE_VERSION,
    name: { en: "Online Tutoring", es: "Tutoría en Línea" },
    description: {
      en: "Designed for student intake, lesson planning, progress reviews, and retention follow-up.",
      es: "Diseñada para intake de estudiantes, planificación de lecciones, revisiones de progreso y retención.",
    },
    suitableBusinessType: { en: "Individual tutor or tutoring center", es: "Tutor individual o centro de tutoría" },
    clientPipelineStages: [
      item("new_inquiry", "New inquiry", "Nueva consulta"),
      item("intake", "Student intake", "Intake de estudiante"),
      item("trial_session", "Trial session", "Sesión de prueba"),
      item("plan_confirmed", "Plan confirmed", "Plan confirmado"),
      item("active_student", "Active student", "Estudiante activo"),
      item("progress_review", "Progress review", "Revisión de progreso"),
      item("renewal", "Renewal", "Renovación"),
      item("completed", "Completed", "Completado"),
    ],
    starterTasks: [
      item("define_offer", "Define core tutoring packages", "Definir paquetes de tutoría"),
      item("pricing_structure", "Confirm pricing and session policy", "Confirmar precios y política de sesiones"),
      item("onboarding_checklist", "Complete student onboarding checklist", "Completar checklist de incorporación"),
      item("invoice_workflow", "Prepare invoice follow-up workflow", "Preparar flujo de seguimiento de facturas"),
      item("retention_routine", "Set progress and retention review routine", "Definir rutina de progreso y retención"),
    ],
    operatingChecklist: [
      item("setup", "Set communication and scheduling rules", "Definir reglas de comunicación y agenda"),
      item("clients", "Define intake and learning-goal capture", "Definir intake y captura de metas de aprendizaje"),
      item("operations", "Document lesson prep and review process", "Documentar preparación y revisión de lecciones"),
      item("health", "Track attendance consistency", "Monitorear consistencia de asistencia"),
    ],
    sopPlaceholders: [...SHARED_SOPS],
    documentChecklist: [...SHARED_DOCUMENTS],
    kpiRecommendations: [...SHARED_KPIS],
    onboardingSteps: [
      item("student_profile", "Collect student profile and objectives", "Recolectar perfil y objetivos del estudiante"),
      item("learning_plan", "Prepare first learning plan", "Preparar primer plan de aprendizaje"),
      item("progress_baseline", "Set baseline and review cadence", "Definir línea base y ritmo de revisión"),
    ],
    recurringRoutines: [
      item("daily_priorities", "Daily priorities review", "Revisión diaria de prioridades"),
      item("weekly_followup", "Weekly student follow-up review", "Revisión semanal de seguimiento de estudiantes"),
      item("monthly_kpi_review", "Monthly KPI review", "Revisión mensual de KPI"),
    ],
  },
  software_agency: {
    key: "software_agency",
    active: true,
    version: TEMPLATE_VERSION,
    name: { en: "Software Agency", es: "Agencia de Software" },
    description: {
      en: "Emphasizes discovery, scoping, backlog management, delivery quality, and maintenance handoff.",
      es: "Enfatiza descubrimiento, alcance, gestión de backlog, calidad de entrega y handoff a mantenimiento.",
    },
    suitableBusinessType: { en: "Custom software development teams", es: "Equipos de desarrollo de software a medida" },
    clientPipelineStages: [
      item("new_lead", "New lead", "Nuevo prospecto"),
      item("discovery", "Discovery", "Descubrimiento"),
      item("scoping", "Scoping", "Definición de alcance"),
      item("proposal_sent", "Proposal sent", "Propuesta enviada"),
      item("backlog_setup", "Backlog setup", "Configuración de backlog"),
      item("development", "Development", "Desarrollo"),
      item("testing", "Testing", "Pruebas"),
      item("deployment", "Deployment", "Despliegue"),
      item("maintenance", "Maintenance", "Mantenimiento"),
    ],
    starterTasks: [
      item("define_offer", "Define core software services", "Definir servicios principales"),
      item("pricing_structure", "Confirm pricing model and statement-of-work flow", "Confirmar modelo de precios y flujo de SOW"),
      item("proposal_template_task", "Prepare technical proposal template", "Preparar plantilla de propuesta técnica"),
      item("invoice_workflow", "Prepare invoice and milestone billing workflow", "Preparar flujo de facturación por hitos"),
      item("cadence", "Define delivery and review cadence", "Definir cadencia de entrega y revisión"),
    ],
    operatingChecklist: [
      item("setup", "Define project intake criteria", "Definir criterios de intake de proyectos"),
      item("operations", "Define backlog and QA standards", "Definir estándares de backlog y QA"),
      item("team", "Define engineering handoff protocol", "Definir protocolo de handoff técnico"),
      item("health", "Track delivery timeliness and defects", "Monitorear puntualidad y defectos"),
    ],
    sopPlaceholders: [...SHARED_SOPS],
    documentChecklist: [...SHARED_DOCUMENTS],
    kpiRecommendations: [...SHARED_KPIS],
    onboardingSteps: [
      item("scope_alignment", "Align on scope, timeline, and owner roles", "Alinear alcance, cronograma y roles"),
      item("access_security", "Collect required access and security expectations", "Recolectar accesos y expectativas de seguridad"),
      item("delivery_baseline", "Set sprint baseline and reporting cadence", "Definir línea base de sprint y reportes"),
    ],
    recurringRoutines: [
      item("daily_priorities", "Daily priorities review", "Revisión diaria de prioridades"),
      item("weekly_team_checkin", "Weekly team check-in", "Revisión semanal del equipo"),
      item("monthly_kpi_review", "Monthly KPI review", "Revisión mensual de KPI"),
      item("quarterly_sop_review", "Quarterly SOP review", "Revisión trimestral de POE"),
    ],
  },
  virtual_assistant: {
    key: "virtual_assistant",
    active: true,
    version: TEMPLATE_VERSION,
    name: { en: "Virtual Assistant", es: "Asistente Virtual" },
    description: {
      en: "Tailored for service requests, recurring tasks, handoffs, and response standards.",
      es: "Adaptada para solicitudes de servicio, tareas recurrentes, handoffs y estándares de respuesta.",
    },
    suitableBusinessType: { en: "Solo VA or small VA team", es: "VA independiente o equipo pequeño" },
    clientPipelineStages: [
      item("new_inquiry", "New inquiry", "Nueva consulta"),
      item("needs_review", "Needs review", "Revisión de necesidades"),
      item("proposal_sent", "Proposal sent", "Propuesta enviada"),
      item("onboarding", "Onboarding", "Incorporación"),
      item("active_client", "Active client", "Cliente activo"),
      item("handoff", "Handoff", "Handoff"),
      item("follow_up", "Follow-up", "Seguimiento"),
      item("retention", "Retention", "Retención"),
    ],
    starterTasks: [
      item("define_offer", "Define service bundles", "Definir paquetes de servicio"),
      item("pricing_structure", "Confirm pricing and scope boundaries", "Confirmar precios y límites de alcance"),
      item("onboarding_checklist", "Complete onboarding checklist", "Completar checklist de incorporación"),
      item("invoice_workflow", "Prepare invoice and reminder workflow", "Preparar flujo de facturación y recordatorios"),
      item("response_standards", "Document response-time standards", "Documentar estándares de tiempo de respuesta"),
    ],
    operatingChecklist: [
      item("setup", "Define preferred communication channels", "Definir canales de comunicación preferidos"),
      item("operations", "Define recurring task handoff process", "Definir proceso de handoff de tareas recurrentes"),
      item("clients", "Set escalation and follow-up protocol", "Definir protocolo de escalación y seguimiento"),
      item("growth", "Review upsell opportunities monthly", "Revisar oportunidades de upsell mensualmente"),
    ],
    sopPlaceholders: [...SHARED_SOPS],
    documentChecklist: [...SHARED_DOCUMENTS],
    kpiRecommendations: [...SHARED_KPIS],
    onboardingSteps: [
      item("service_alignment", "Align service scope and communication rhythm", "Alinear alcance y ritmo de comunicación"),
      item("tool_access", "Collect required tool access", "Recolectar accesos a herramientas"),
      item("first_week_plan", "Set first-week execution checklist", "Definir checklist de ejecución de primera semana"),
    ],
    recurringRoutines: [
      item("daily_priorities", "Daily priorities review", "Revisión diaria de prioridades"),
      item("weekly_followup", "Weekly client follow-up review", "Revisión semanal de seguimiento de clientes"),
      item("monthly_financial_review", "Monthly financial review", "Revisión financiera mensual"),
    ],
  },
  marketing_agency: {
    key: "marketing_agency",
    active: true,
    version: TEMPLATE_VERSION,
    name: { en: "Marketing Agency", es: "Agencia de Marketing" },
    description: {
      en: "Focused on campaign intake, content planning, approvals, launch, and reporting cadence.",
      es: "Enfocada en intake de campañas, planificación de contenido, aprobaciones, lanzamiento y reportes.",
    },
    suitableBusinessType: { en: "Performance, content, or full-service agency", es: "Agencia de performance, contenido o servicio completo" },
    clientPipelineStages: [
      item("new_lead", "New lead", "Nuevo prospecto"),
      item("campaign_intake", "Campaign intake", "Intake de campaña"),
      item("proposal_sent", "Proposal sent", "Propuesta enviada"),
      item("planning", "Planning", "Planificación"),
      item("approval", "Approval", "Aprobación"),
      item("launch", "Launch", "Lanzamiento"),
      item("reporting", "Reporting", "Reporte"),
      item("retainer_review", "Retainer review", "Revisión de retainer"),
    ],
    starterTasks: [
      item("define_offer", "Define core campaign offers", "Definir ofertas de campaña"),
      item("pricing_structure", "Confirm pricing and reporting model", "Confirmar precios y modelo de reporte"),
      item("proposal_template_task", "Prepare campaign proposal template", "Preparar plantilla de propuesta de campaña"),
      item("onboarding_checklist", "Complete campaign onboarding checklist", "Completar checklist de incorporación de campañas"),
      item("cadence", "Set reporting and optimization cadence", "Definir cadencia de reporte y optimización"),
    ],
    operatingChecklist: [
      item("setup", "Define intake and qualification checklist", "Definir checklist de intake y calificación"),
      item("clients", "Define approval map and ownership", "Definir mapa de aprobación y responsables"),
      item("operations", "Set campaign QA and launch checklist", "Definir checklist de QA y lanzamiento"),
      item("growth", "Set monthly retention and expansion review", "Definir revisión mensual de retención y expansión"),
    ],
    sopPlaceholders: [...SHARED_SOPS],
    documentChecklist: [...SHARED_DOCUMENTS],
    kpiRecommendations: [...SHARED_KPIS],
    onboardingSteps: [
      item("goal_alignment", "Align campaign goals and channels", "Alinear objetivos y canales de campaña"),
      item("asset_access", "Collect brand assets and account access", "Recolectar activos de marca y accesos"),
      item("launch_baseline", "Set launch baseline and report timeline", "Definir línea base de lanzamiento y calendario de reportes"),
    ],
    recurringRoutines: [
      item("weekly_followup", "Weekly client follow-up review", "Revisión semanal de seguimiento de clientes"),
      item("weekly_team_checkin", "Weekly team check-in", "Revisión semanal del equipo"),
      item("monthly_kpi_review", "Monthly KPI review", "Revisión mensual de KPI"),
    ],
  },
  ecommerce: {
    key: "ecommerce",
    active: true,
    version: TEMPLATE_VERSION,
    name: { en: "Ecommerce Operations", es: "Operaciones Ecommerce" },
    description: {
      en: "Built for product operations, order review, customer service, returns workflow, and supplier docs.",
      es: "Diseñada para operaciones de producto, revisión de pedidos, servicio al cliente, devoluciones y proveedores.",
    },
    suitableBusinessType: { en: "Online store operators", es: "Operadores de tiendas en línea" },
    clientPipelineStages: [
      item("new_order", "New order", "Nuevo pedido"),
      item("order_review", "Order review", "Revisión de pedido"),
      item("fulfillment", "Fulfillment", "Cumplimiento"),
      item("delivery", "Delivery", "Entrega"),
      item("post_purchase", "Post-purchase follow-up", "Seguimiento postcompra"),
      item("returns", "Returns", "Devoluciones"),
      item("retention", "Retention", "Retención"),
    ],
    starterTasks: [
      item("define_offer", "Define flagship products and service standards", "Definir productos estrella y estándares"),
      item("pricing_structure", "Confirm pricing and return policy workflow", "Confirmar precios y flujo de devoluciones"),
      item("invoice_workflow", "Prepare order and invoice follow-up workflow", "Preparar flujo de pedidos y facturas"),
      item("ops_routine", "Document weekly order and support routine", "Documentar rutina semanal de pedidos y soporte"),
      item("kpi_review", "Review service and retention metrics", "Revisar métricas de servicio y retención"),
    ],
    operatingChecklist: [
      item("setup", "Define order-quality checks", "Definir controles de calidad de pedidos"),
      item("operations", "Define returns and exception handling", "Definir manejo de devoluciones y excepciones"),
      item("documents", "Define supplier and fulfillment document checklist", "Definir checklist de documentos de proveedores y cumplimiento"),
      item("health", "Track service and fulfillment timeliness", "Monitorear puntualidad de servicio y cumplimiento"),
    ],
    sopPlaceholders: [...SHARED_SOPS],
    documentChecklist: [...SHARED_DOCUMENTS],
    kpiRecommendations: [...SHARED_KPIS],
    onboardingSteps: [
      item("store_intake", "Capture store setup and service boundaries", "Capturar configuración de tienda y límites de servicio"),
      item("ops_map", "Map order-to-delivery process", "Mapear proceso de pedido a entrega"),
      item("support_baseline", "Set support and return baseline", "Definir línea base de soporte y devoluciones"),
    ],
    recurringRoutines: [
      item("daily_priorities", "Daily priorities review", "Revisión diaria de prioridades"),
      item("weekly_followup", "Weekly customer follow-up review", "Revisión semanal de seguimiento de clientes"),
      item("monthly_financial_review", "Monthly financial review", "Revisión financiera mensual"),
      item("monthly_kpi_review", "Monthly KPI review", "Revisión mensual de KPI"),
    ],
  },
  bookkeeping: {
    key: "bookkeeping",
    active: true,
    version: TEMPLATE_VERSION,
    name: { en: "Bookkeeping Services", es: "Servicios de Teneduría de Libros" },
    description: {
      en: "Designed for intake, document request cadence, monthly close workflow, reconciliations, and delivery timelines.",
      es: "Diseñada para intake, solicitud de documentos, cierre mensual, conciliaciones y calendario de entrega.",
    },
    suitableBusinessType: { en: "Bookkeeping and accounting support teams", es: "Equipos de teneduría y soporte contable" },
    clientPipelineStages: [
      item("new_inquiry", "New inquiry", "Nueva consulta"),
      item("intake", "Client intake", "Intake de cliente"),
      item("document_request", "Document request", "Solicitud de documentos"),
      item("monthly_close", "Monthly close", "Cierre mensual"),
      item("reconciliation", "Reconciliation", "Conciliación"),
      item("report_delivery", "Report delivery", "Entrega de reporte"),
      item("follow_up", "Follow-up", "Seguimiento"),
    ],
    starterTasks: [
      item("define_offer", "Define bookkeeping service tiers", "Definir niveles de servicio"),
      item("pricing_structure", "Confirm pricing and close deadlines", "Confirmar precios y fechas de cierre"),
      item("onboarding_checklist", "Complete client intake checklist", "Completar checklist de intake"),
      item("document_request_workflow", "Prepare document request workflow", "Preparar flujo de solicitud de documentos"),
      item("close_review", "Set monthly close review routine", "Definir rutina de revisión de cierre mensual"),
    ],
    operatingChecklist: [
      item("setup", "Define intake and confidentiality protocol", "Definir protocolo de intake y confidencialidad"),
      item("documents", "Define monthly document checklist", "Definir checklist mensual de documentos"),
      item("operations", "Define reconciliation handoff process", "Definir proceso de handoff de conciliaciones"),
      item("health", "Track close timeliness and backlog", "Monitorear puntualidad de cierres y backlog"),
    ],
    sopPlaceholders: [...SHARED_SOPS],
    documentChecklist: [...SHARED_DOCUMENTS],
    kpiRecommendations: [...SHARED_KPIS],
    onboardingSteps: [
      item("intake_scope", "Confirm scope and reporting cadence", "Confirmar alcance y cadencia de reportes"),
      item("docs_setup", "Set document-request and handoff expectations", "Definir expectativas de solicitud y handoff documental"),
      item("close_calendar", "Set monthly close calendar", "Definir calendario de cierre mensual"),
    ],
    recurringRoutines: [
      item("weekly_team_checkin", "Weekly team check-in", "Revisión semanal del equipo"),
      item("monthly_financial_review", "Monthly financial review", "Revisión financiera mensual"),
      item("monthly_kpi_review", "Monthly KPI review", "Revisión mensual de KPI"),
      item("quarterly_sop_review", "Quarterly SOP review", "Revisión trimestral de POE"),
    ],
  },
};

export function normalizeBusinessInABoxTemplateKey(value: string): string {
  return value.trim().toLowerCase();
}

export function isBusinessInABoxTemplateKey(value: string): value is BusinessInABoxTemplateKey {
  if (!/^[a-z0-9_]+$/.test(value)) {
    return false;
  }
  return BUSINESS_IN_A_BOX_TEMPLATE_KEYS.includes(value as BusinessInABoxTemplateKey);
}

export function getBusinessInABoxTemplate(
  key: string
): BusinessInABoxTemplateDefinition | null {
  const normalized = normalizeBusinessInABoxTemplateKey(key);
  if (!isBusinessInABoxTemplateKey(normalized)) {
    return null;
  }
  return REGISTRY[normalized] ?? null;
}

export function listBusinessInABoxTemplates(): BusinessInABoxTemplateDefinition[] {
  return BUSINESS_IN_A_BOX_TEMPLATE_KEYS.map((key) => REGISTRY[key]);
}

export function listActiveBusinessInABoxTemplates(): BusinessInABoxTemplateDefinition[] {
  return listBusinessInABoxTemplates().filter((template) => template.active);
}

function localized(text: LocalizedText, locale: TemplateLocale): string {
  return locale === "es" ? text.es : text.en;
}

export function toPublicBusinessInABoxTemplateSummary(
  template: BusinessInABoxTemplateDefinition,
  locale: TemplateLocale
): PublicBusinessInABoxTemplateSummary {
  return {
    key: template.key,
    name: localized(template.name, locale),
    description: localized(template.description, locale),
    suitableBusinessType: localized(template.suitableBusinessType, locale),
    workflowsIncluded: template.onboardingSteps.length + template.recurringRoutines.length,
    tasksIncluded: template.starterTasks.length,
    clientStageOutline: template.clientPipelineStages.map((stage) => localized(stage.title, locale)),
    kpiCategories: template.kpiRecommendations.map((kpi) => localized(kpi.title, locale)),
    documentPlaceholders: template.documentChecklist.map((doc) => localized(doc.title, locale)),
    sopPlaceholders: template.sopPlaceholders.map((sop) => localized(sop.title, locale)),
    previewCategories: [
      locale === "es" ? "Etapas de clientes" : "Client stages",
      locale === "es" ? "Tareas iniciales" : "Starter tasks",
      locale === "es" ? "Checklist operativo" : "Operating checklist",
      locale === "es" ? "Plantillas SOP" : "SOP placeholders",
      locale === "es" ? "Checklist documental" : "Document checklist",
      locale === "es" ? "Recomendaciones KPI" : "KPI recommendations",
      locale === "es" ? "Flujo de incorporación" : "Onboarding workflow",
      locale === "es" ? "Rutinas recurrentes" : "Recurring routines",
    ],
  };
}

export function listPublicBusinessInABoxTemplateSummaries(
  locale: TemplateLocale
): PublicBusinessInABoxTemplateSummary[] {
  return listActiveBusinessInABoxTemplates().map((template) =>
    toPublicBusinessInABoxTemplateSummary(template, locale)
  );
}

export function buildTemplateItemKey(resourceType: string, templateKey: string, itemKey: string): string {
  return `${resourceType}:${templateKey}:${itemKey}`;
}
