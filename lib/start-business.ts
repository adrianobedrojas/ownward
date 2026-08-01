/**
 * lib/start-business.ts
 *
 * Helper module for the Start a Business planner.
 * Pure, deterministic functions — easily unit-testable.
 * No secrets, credentials, or sensitive financial data should be stored
 * in the plan object.
 */

// ─── Storage ──────────────────────────────────────────────────────────────────

export const START_BUSINESS_STORAGE_KEY = 'ownward_start_business_plan_v1';
export const START_BUSINESS_STORAGE_VERSION = 1;

// ─── Plan Types ───────────────────────────────────────────────────────────────

export interface StartBusinessStep1 {
  workingName: string;
  oneSentenceIdea: string;
  problemBeingSolved: string;
  proposedSolution: string;
}

export interface StartBusinessStep2 {
  targetCustomer: string;
  customerLocationOrMarket: string;
  whyProblemMatters: string;
  existingAlternatives: string;
}

export interface StartBusinessStep3 {
  firstProductOrService: string;
  revenueModel: string;
  expectedSellingPrice: string;
  whyCustomerWouldChoose: string;
}

export interface StartBusinessStep4 {
  customerInterviewsCompleted: string;
  preordersOrCommitments: string;
  prototypeOrTestCompleted: string;
  validationNotes: string;
  evidenceCustomersMayPay: string;
}

export interface StartBusinessStep5 {
  estimatedOneTimeStartupCosts: string;
  estimatedMonthlyOperatingCosts: string;
  expectedMonthlySales: string;
  estimatedBreakEvenVolume: string;
  fundingSourceOrBudget: string;
}

export interface StartBusinessStep6 {
  jurisdiction: string;
  intendedLegalStructure: string;
  registrationTasks: string;
  licensesOrPermits: string;
  bankingAndPaymentSetup: string;
  bookkeepingAndTax: string;
  insuranceToInvestigate: string;
  importantOperatingDocuments: string;
}

export interface StartBusinessStep7 {
  targetLaunchDate: string;
  firstMarketingChannel: string;
  firstCustomerStrategy: string;
  initialSalesGoal: string;
  first30DayPriorities: string;
  mainCurrentRisk: string;
}

export interface StartBusinessPlan {
  _version: number;
  step1: StartBusinessStep1;
  step2: StartBusinessStep2;
  step3: StartBusinessStep3;
  step4: StartBusinessStep4;
  step5: StartBusinessStep5;
  step6: StartBusinessStep6;
  step7: StartBusinessStep7;
}

// ─── Step Definitions ─────────────────────────────────────────────────────────

export interface StartBusinessStepField {
  id: string;
  label: string;
  labelEs: string;
  placeholder?: string;
  placeholderEs?: string;
  type: 'text' | 'textarea';
  required?: boolean;
}

export interface StartBusinessStepDef {
  id: string;
  stepNumber: number;
  title: string;
  titleEs: string;
  description?: string;
  descriptionEs?: string;
  fields: StartBusinessStepField[];
}

export const startBusinessSteps: StartBusinessStepDef[] = [
  {
    id: 'step1',
    stepNumber: 1,
    title: 'Business Idea',
    titleEs: 'Idea de negocio',
    description: 'Describe the core idea behind your business.',
    descriptionEs: 'Describe la idea principal detrás de tu negocio.',
    fields: [
      { id: 'workingName', label: 'Working business name', labelEs: 'Nombre provisional del negocio', type: 'text', placeholder: 'e.g., Bright Paws Pet Services' },
      { id: 'oneSentenceIdea', label: 'One-sentence idea', labelEs: 'Idea en una oración', type: 'textarea', placeholder: 'e.g., Mobile grooming service for busy dog owners in suburban neighborhoods.' },
      { id: 'problemBeingSolved', label: 'Problem being solved', labelEs: 'Problema que se resuelve', type: 'textarea', placeholder: 'Describe the specific problem or pain point your business addresses.' },
      { id: 'proposedSolution', label: 'Proposed solution', labelEs: 'Solución propuesta', type: 'textarea', placeholder: 'How does your business solve this problem?' },
    ],
  },
  {
    id: 'step2',
    stepNumber: 2,
    title: 'Target Customer',
    titleEs: 'Cliente objetivo',
    description: 'Identify who you are solving this problem for.',
    descriptionEs: 'Identifica para quién estás resolviendo este problema.',
    fields: [
      { id: 'targetCustomer', label: 'Target customer', labelEs: 'Cliente objetivo', type: 'text', placeholder: 'e.g., Dog owners aged 30–55 with full-time jobs in suburban areas.' },
      { id: 'customerLocationOrMarket', label: 'Customer location or market', labelEs: 'Ubicación o mercado del cliente', type: 'text', placeholder: 'e.g., Tampa Bay metro area, online, or national.' },
      { id: 'whyProblemMatters', label: 'Why the problem matters to them', labelEs: 'Por qué el problema les importa', type: 'textarea', placeholder: 'Describe the impact or frustration the problem causes.' },
      { id: 'existingAlternatives', label: 'Existing alternatives or competitors', labelEs: 'Alternativas existentes o competidores', type: 'textarea', placeholder: 'What do customers currently do instead? Who else solves this?' },
    ],
  },
  {
    id: 'step3',
    stepNumber: 3,
    title: 'Offer and Business Model',
    titleEs: 'Oferta y modelo de negocio',
    description: 'Define what you will sell and how you will make money.',
    descriptionEs: 'Define qué venderás y cómo ganarás dinero.',
    fields: [
      { id: 'firstProductOrService', label: 'First product or service', labelEs: 'Primer producto o servicio', type: 'text', placeholder: 'e.g., Mobile dog grooming package (bath, trim, nails).' },
      { id: 'revenueModel', label: 'Revenue model', labelEs: 'Modelo de ingresos', type: 'text', placeholder: 'e.g., Per-session fee, monthly subscription, or project-based.' },
      { id: 'expectedSellingPrice', label: 'Expected selling price', labelEs: 'Precio de venta esperado', type: 'text', placeholder: 'e.g., $80 per session. This is an initial estimate, not a guarantee.' },
      { id: 'whyCustomerWouldChoose', label: 'Why a customer would choose this over alternatives', labelEs: 'Por qué un cliente elegiría esto sobre las alternativas', type: 'textarea', placeholder: 'Describe your key advantage or differentiation.' },
    ],
  },
  {
    id: 'step4',
    stepNumber: 4,
    title: 'Validation',
    titleEs: 'Validación',
    description: 'Document the evidence you have collected that customers want this and may pay for it.',
    descriptionEs: 'Documenta la evidencia que has recopilado de que los clientes quieren esto y podrían pagar por ello.',
    fields: [
      { id: 'customerInterviewsCompleted', label: 'Customer interviews completed', labelEs: 'Entrevistas con clientes realizadas', type: 'text', placeholder: 'e.g., Spoke with 6 potential customers. Key findings: ...' },
      { id: 'preordersOrCommitments', label: 'Preorders or commitments', labelEs: 'Pedidos anticipados o compromisos', type: 'text', placeholder: 'e.g., 2 customers agreed to pay for the first session.' },
      { id: 'prototypeOrTestCompleted', label: 'Prototype or test completed', labelEs: 'Prototipo o prueba completada', type: 'text', placeholder: 'e.g., Completed 3 test grooming sessions at reduced rates.' },
      { id: 'validationNotes', label: 'Validation notes', labelEs: 'Notas de validación', type: 'textarea', placeholder: 'Summarize what you learned from testing the idea.' },
      { id: 'evidenceCustomersMayPay', label: 'Evidence that customers may pay', labelEs: 'Evidencia de que los clientes podrían pagar', type: 'textarea', placeholder: 'What specific signals suggest customers will pay the planned price?' },
    ],
  },
  {
    id: 'step5',
    stepNumber: 5,
    title: 'Startup Finances',
    titleEs: 'Finanzas de inicio',
    description: 'Estimate your startup costs and financial requirements. These are rough planning estimates only — not financial advice or guaranteed forecasts.',
    descriptionEs: 'Estima tus costos iniciales y requisitos financieros. Estas son estimaciones de planificación aproximadas únicamente, no asesoramiento financiero ni pronósticos garantizados.',
    fields: [
      { id: 'estimatedOneTimeStartupCosts', label: 'Estimated one-time startup costs', labelEs: 'Costos iniciales únicos estimados', type: 'text', placeholder: 'e.g., Equipment, licenses, website setup: ~$3,000' },
      { id: 'estimatedMonthlyOperatingCosts', label: 'Estimated monthly operating costs', labelEs: 'Costos operativos mensuales estimados', type: 'text', placeholder: 'e.g., Supplies, insurance, fuel, software: ~$600/mo' },
      { id: 'expectedMonthlySales', label: 'Expected monthly sales (rough estimate)', labelEs: 'Ventas mensuales esperadas (estimación aproximada)', type: 'text', placeholder: 'e.g., 20 sessions × $80 = $1,600/mo at start' },
      { id: 'estimatedBreakEvenVolume', label: 'Estimated break-even sales volume', labelEs: 'Volumen de ventas de equilibrio estimado', type: 'text', placeholder: 'e.g., Approximately 8 sessions per month to cover operating costs.' },
      { id: 'fundingSourceOrBudget', label: 'Funding source or available startup budget', labelEs: 'Fuente de financiamiento o presupuesto inicial disponible', type: 'text', placeholder: 'e.g., Personal savings, small business loan, or funds from a current job.' },
    ],
  },
  {
    id: 'step6',
    stepNumber: 6,
    title: 'Formation and Operations',
    titleEs: 'Constitución y operaciones',
    description: 'Organize the legal, operational, and recordkeeping requirements for your business. Formation, licensing, tax, employment, and insurance requirements vary significantly by jurisdiction and should be verified through official government sources and qualified professionals. Nothing in this planner is legal or tax advice.',
    descriptionEs: 'Organiza los requisitos legales, operativos y de registro para tu negocio. Los requisitos de constitución, licencias, impuestos, empleo y seguros varían significativamente según la jurisdicción y deben verificarse a través de fuentes gubernamentales oficiales y profesionales calificados. Nada en este planificador es asesoramiento legal o fiscal.',
    fields: [
      { id: 'jurisdiction', label: 'Country, state, province, or jurisdiction', labelEs: 'País, estado, provincia o jurisdicción', type: 'text', placeholder: 'e.g., Florida, USA' },
      { id: 'intendedLegalStructure', label: 'Intended legal structure to research', labelEs: 'Estructura legal que se desea investigar', type: 'text', placeholder: 'e.g., Sole proprietorship, LLC, or S-Corp. Verify suitability with a professional.' },
      { id: 'registrationTasks', label: 'Registration tasks to investigate', labelEs: 'Tareas de registro a investigar', type: 'textarea', placeholder: 'e.g., State entity registration, DBA filing, EIN application.' },
      { id: 'licensesOrPermits', label: 'Licenses or permits to investigate', labelEs: 'Licencias o permisos a investigar', type: 'textarea', placeholder: 'e.g., Business license, professional license, local zoning. Requirements vary by location.' },
      { id: 'bankingAndPaymentSetup', label: 'Banking and payment setup', labelEs: 'Configuración de banca y pagos', type: 'text', placeholder: 'e.g., Open business checking account, set up payment processor.' },
      { id: 'bookkeepingAndTax', label: 'Bookkeeping and tax preparation', labelEs: 'Contabilidad y preparación de impuestos', type: 'text', placeholder: 'e.g., Spreadsheet, bookkeeping software, or hire a bookkeeper.' },
      { id: 'insuranceToInvestigate', label: 'Insurance to investigate', labelEs: 'Seguros a investigar', type: 'text', placeholder: 'e.g., General liability, professional liability, auto. Consult an insurance professional.' },
      { id: 'importantOperatingDocuments', label: 'Important operating documents', labelEs: 'Documentos operativos importantes', type: 'textarea', placeholder: 'e.g., Service agreement, refund policy, privacy policy, operating agreement.' },
    ],
  },
  {
    id: 'step7',
    stepNumber: 7,
    title: 'Launch Plan',
    titleEs: 'Plan de lanzamiento',
    description: 'Plan your path to your first customers and first 30 days of operation.',
    descriptionEs: 'Planifica tu camino hacia tus primeros clientes y los primeros 30 días de operación.',
    fields: [
      { id: 'targetLaunchDate', label: 'Target launch date', labelEs: 'Fecha objetivo de lanzamiento', type: 'text', placeholder: 'e.g., March 1, 2026 — or a realistic milestone like "8 weeks from now".' },
      { id: 'firstMarketingChannel', label: 'First marketing channel', labelEs: 'Primer canal de marketing', type: 'text', placeholder: 'e.g., Nextdoor, Instagram, referrals from personal network, or local flyers.' },
      { id: 'firstCustomerStrategy', label: 'First-customer strategy', labelEs: 'Estrategia para el primer cliente', type: 'textarea', placeholder: 'How will you get your first paying customer?' },
      { id: 'initialSalesGoal', label: 'Initial sales goal', labelEs: 'Meta inicial de ventas', type: 'text', placeholder: 'e.g., 5 paying customers in the first 30 days.' },
      { id: 'first30DayPriorities', label: 'First 30-day priorities', labelEs: 'Prioridades para los primeros 30 días', type: 'textarea', placeholder: 'List the 3–5 most important actions in your first month.' },
      { id: 'mainCurrentRisk', label: 'Main current risk or uncertainty', labelEs: 'Principal riesgo o incertidumbre actual', type: 'textarea', placeholder: 'What is the biggest assumption you still need to test or risk you need to manage?' },
    ],
  },
];

// ─── Default Plan ─────────────────────────────────────────────────────────────

export function getDefaultPlan(): StartBusinessPlan {
  return {
    _version: START_BUSINESS_STORAGE_VERSION,
    step1: { workingName: '', oneSentenceIdea: '', problemBeingSolved: '', proposedSolution: '' },
    step2: { targetCustomer: '', customerLocationOrMarket: '', whyProblemMatters: '', existingAlternatives: '' },
    step3: { firstProductOrService: '', revenueModel: '', expectedSellingPrice: '', whyCustomerWouldChoose: '' },
    step4: { customerInterviewsCompleted: '', preordersOrCommitments: '', prototypeOrTestCompleted: '', validationNotes: '', evidenceCustomersMayPay: '' },
    step5: { estimatedOneTimeStartupCosts: '', estimatedMonthlyOperatingCosts: '', expectedMonthlySales: '', estimatedBreakEvenVolume: '', fundingSourceOrBudget: '' },
    step6: { jurisdiction: '', intendedLegalStructure: '', registrationTasks: '', licensesOrPermits: '', bankingAndPaymentSetup: '', bookkeepingAndTax: '', insuranceToInvestigate: '', importantOperatingDocuments: '' },
    step7: { targetLaunchDate: '', firstMarketingChannel: '', firstCustomerStrategy: '', initialSalesGoal: '', first30DayPriorities: '', mainCurrentRisk: '' },
  };
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/** Returns all field IDs across all steps */
export function getAllPlanFieldIds(): string[] {
  return startBusinessSteps.flatMap((step) => step.fields.map((f) => `${step.id}.${f.id}`));
}

/** Returns the number of fields that have non-empty values */
export function countFilledFields(plan: StartBusinessPlan): number {
  let filled = 0;
  for (const step of startBusinessSteps) {
    const stepData = plan[step.id as keyof StartBusinessPlan] as unknown as Record<string, string>;
    for (const field of step.fields) {
      if (stepData && typeof stepData[field.id] === 'string' && stepData[field.id].trim().length > 0) {
        filled++;
      }
    }
  }
  return filled;
}

/** Returns 0–100 percent of fields filled */
export function getPlanProgress(plan: StartBusinessPlan): number {
  const total = getAllPlanFieldIds().length;
  if (total === 0) return 0;
  const filled = countFilledFields(plan);
  return Math.round((filled / total) * 100);
}

// ─── Storage Parsing ──────────────────────────────────────────────────────────

/**
 * Safely parses a StartBusinessPlan from localStorage JSON.
 * Returns the default plan on any failure or malformed data.
 * Never throws.
 */
export function parsePlanFromStorage(raw: string | null): StartBusinessPlan {
  const defaults = getDefaultPlan();
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;
    // Merge parsed values into defaults so unknown/missing keys are safe
    return mergePlanWithDefaults(parsed, defaults);
  } catch {
    return defaults;
  }
}

function mergePlanWithDefaults(parsed: Record<string, unknown>, defaults: StartBusinessPlan): StartBusinessPlan {
  const result = { ...defaults } as StartBusinessPlan;
  for (const step of startBusinessSteps) {
    const key = step.id as keyof StartBusinessPlan;
    const parsedStep = parsed[key];
    const defaultStep = defaults[key] as unknown as Record<string, string>;
    if (parsedStep && typeof parsedStep === 'object' && !Array.isArray(parsedStep)) {
      const merged: Record<string, string> = { ...defaultStep };
      for (const field of step.fields) {
        const val = (parsedStep as Record<string, unknown>)[field.id];
        if (typeof val === 'string') {
          merged[field.id] = val;
        }
      }
      (result as unknown as Record<string, unknown>)[key] = merged;
    }
  }
  return result;
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Serializes the plan for export as a plain-text or JSON file.
 * Excludes internal implementation-only fields (like _version).
 */
export function exportPlanAsText(plan: StartBusinessPlan): string {
  const lines: string[] = ['OWNWARD STARTUP PLAN', '====================', ''];
  for (const stepDef of startBusinessSteps) {
    lines.push(`## ${stepDef.stepNumber}. ${stepDef.title}`);
    lines.push('');
    const stepData = plan[stepDef.id as keyof StartBusinessPlan] as unknown as Record<string, string>;
    for (const field of stepDef.fields) {
      const value = stepData?.[field.id] ?? '';
      lines.push(`${field.label}:`);
      lines.push(value.trim() || '(not filled)');
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function exportPlanAsJson(plan: StartBusinessPlan): string {
  // Exclude _version from the exported object
  const { _version: _v, ...exportable } = plan;
  const out: Record<string, Record<string, string>> = {};
  for (const stepDef of startBusinessSteps) {
    const stepData = plan[stepDef.id as keyof StartBusinessPlan] as unknown as Record<string, string>;
    out[stepDef.title] = {};
    for (const field of stepDef.fields) {
      out[stepDef.title][field.label] = stepData?.[field.id] ?? '';
    }
  }
  void _v;
  void exportable;
  return JSON.stringify(out, null, 2);
}
