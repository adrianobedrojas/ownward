import { getGuideArticle } from './guide-content';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AcademyCourseStatus = 'available' | 'coming-soon';
export type AcademyCourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LocalizedAcademyText {
  en: string;
  es: string;
}

export interface LocalizedAcademyListText {
  en: string[];
  es: string[];
}

export interface AcademyLesson {
  id: string;
  guideCategory: string;
  guideArticleSlug: string;
}

export interface PlannedAcademyModule {
  id: string;
  title: LocalizedAcademyText;
}

export interface AcademyCourse {
  slug: string;
  status: AcademyCourseStatus;
  level: AcademyCourseLevel;
  title: LocalizedAcademyText;
  description: LocalizedAcademyText;
  summary: LocalizedAcademyText;
  outcomes: LocalizedAcademyListText;
  prerequisites?: LocalizedAcademyListText;
  deliverable: LocalizedAcademyText;
  estimatedMinutes?: number;
  lessons?: AcademyLesson[];
  plannedModules?: PlannedAcademyModule[];
  disclosure?: LocalizedAcademyText;
}

// ─── Course Data ─────────────────────────────────────────────────────────────

export const academyCourses: AcademyCourse[] = [
  {
    slug: 'start-a-business-foundations',
    status: 'available',
    level: 'beginner',
    title: {
      en: 'Start a Business Foundations',
      es: 'Fundamentos para iniciar un negocio',
    },
    description: {
      en: 'Build a practical path from business idea to validation, first offer, startup budget, LLC formation, and launch.',
      es: 'Crea una ruta práctica desde la idea de negocio hasta la validación, la primera oferta, el presupuesto inicial, la formación de una LLC y el lanzamiento.',
    },
    summary: {
      en: 'A guided startup path that turns broad ambition into evidence, an offer, a basic plan, cost discipline, formation decisions, and a practical launch sequence.',
      es: 'Una ruta guiada de inicio que convierte una ambición amplia en evidencia, una oferta, un plan básico, disciplina de costos, decisiones de constitución y una secuencia práctica de lanzamiento.',
    },
    outcomes: {
      en: ['Validate whether a specific problem is real', 'Choose a first offer and business model you can deliver', 'Leave with a practical launch sequence and setup decisions'],
      es: ['Validar si un problema específico es real', 'Elegir una primera oferta y un modelo de negocio que puedas entregar', 'Salir con una secuencia práctica de lanzamiento y decisiones de constitución'],
    },
    prerequisites: {
      en: ['None required. The course is designed for early-stage founders.'],
      es: ['No se requieren prerrequisitos. El curso está diseñado para fundadores en etapa inicial.'],
    },
    deliverable: {
      en: 'A first-pass startup path with a validated problem, first offer, startup assumptions, and launch priorities.',
      es: 'Una primera ruta de inicio con un problema validado, una primera oferta, supuestos iniciales y prioridades de lanzamiento.',
    },
    estimatedMinutes: 56,
    lessons: [
      {
        id: 'validate-idea',
        guideCategory: 'start',
        guideArticleSlug: 'validate-a-business-idea',
      },
      {
        id: 'business-model-offer',
        guideCategory: 'start',
        guideArticleSlug: 'choose-a-business-model-and-first-offer',
      },
      {
        id: 'one-page-plan',
        guideCategory: 'start',
        guideArticleSlug: 'write-a-one-page-business-plan',
      },
      {
        id: 'startup-costs',
        guideCategory: 'start',
        guideArticleSlug: 'estimate-startup-costs-and-pricing',
      },
      {
        id: 'form-an-llc',
        guideCategory: 'start',
        guideArticleSlug: 'how-to-start-an-llc',
      },
      {
        id: 'launch-checklist',
        guideCategory: 'start',
        guideArticleSlug: 'business-launch-checklist',
      },
    ],
  },
  {
    slug: 'business-foundations',
    status: 'available',
    level: 'beginner',
    title: {
      en: 'Business Foundations',
      es: 'Fundamentos de negocio',
    },
    description: {
      en: 'Build the operational and financial bedrock every small business needs — from day-to-day processes and standard procedures to understanding what your business is really worth.',
      es: 'Construye la base operativa y financiera que todo negocio pequeño necesita, desde los procesos diarios y los procedimientos estándar hasta entender cuánto vale realmente tu negocio.',
    },
    summary: {
      en: 'A calm foundation for owners who want clearer operations, better procedures, sharper customer economics, and a more realistic valuation lens.',
      es: 'Una base serena para dueños que quieren operaciones más claras, mejores procedimientos, economía de clientes más nítida y una visión más realista de valuación.',
    },
    outcomes: {
      en: ['Map and improve one operating loop', 'Document a useful SOP with clear ownership', 'Explain customer profitability and valuation tradeoffs more clearly'],
      es: ['Mapear y mejorar un ciclo operativo', 'Documentar un SOP útil con propiedad clara', 'Explicar mejor la rentabilidad de clientes y los factores de valuación'],
    },
    prerequisites: {
      en: ['Helpful for active owners, but no formal prerequisite is required.'],
      es: ['Es útil para dueños activos, pero no se requiere un prerrequisito formal.'],
    },
    deliverable: {
      en: 'A more usable operating foundation and a clearer explanation of what drives business value.',
      es: 'Una base operativa más utilizable y una explicación más clara de qué impulsa el valor del negocio.',
    },
    estimatedMinutes: 43,
    lessons: [
      {
        id: 'business-operations',
        guideCategory: 'run',
        guideArticleSlug: 'business-operations-basics',
      },
      {
        id: 'standard-operating-procedures',
        guideCategory: 'run',
        guideArticleSlug: 'how-to-create-standard-operating-procedures',
      },
      {
        id: 'profitable-customers',
        guideCategory: 'grow',
        guideArticleSlug: 'identify-most-profitable-customers',
      },
      {
        id: 'business-value',
        guideCategory: 'value',
        guideArticleSlug: 'how-much-is-my-business-worth',
      },
    ],
  },
  {
    slug: 'buying-and-selling-a-business',
    status: 'available',
    level: 'beginner',
    title: {
      en: 'Buying and Selling a Business',
      es: 'Comprar y vender un negocio',
    },
    description: {
      en: 'Learn how to evaluate a business before you buy, qualify for SBA financing, and prepare your own business for a successful sale.',
      es: 'Aprende cómo evaluar un negocio antes de comprarlo, cómo calificar para financiamiento SBA y cómo preparar tu propio negocio para una venta exitosa.',
    },
    summary: {
      en: 'A buyer-seller readiness path that covers diligence, financing preparedness, and the cleanup work behind a stronger sale process.',
      es: 'Una ruta de preparación para compradores y vendedores que cubre la debida diligencia, la preparación para financiamiento y el trabajo de orden detrás de una venta más sólida.',
    },
    outcomes: {
      en: ['Review a target business with stronger evidence discipline', 'Understand what makes an SBA file feel stronger or weaker', 'Prepare a business for buyer diligence and transition'],
      es: ['Revisar un negocio objetivo con mejor disciplina de evidencia', 'Entender qué hace que un expediente SBA se vea más fuerte o más débil', 'Preparar un negocio para la diligencia del comprador y la transición'],
    },
    prerequisites: {
      en: ['Helpful for active buyers or owners preparing for exit; no formal prerequisite required.'],
      es: ['Es útil para compradores activos o dueños que se preparan para salir; no se requiere un prerrequisito formal.'],
    },
    deliverable: {
      en: 'A clearer diligence file, financing-readiness view, and sale-preparation sequence.',
      es: 'Un expediente de diligencia más claro, una visión de preparación para financiamiento y una secuencia de preparación para la venta.',
    },
    estimatedMinutes: 36,
    lessons: [
      {
        id: 'evaluate-a-business',
        guideCategory: 'buy',
        guideArticleSlug: 'how-to-evaluate-a-business-before-you-buy',
      },
      {
        id: 'sba-readiness',
        guideCategory: 'buy',
        guideArticleSlug: 'sba-loan-qualification',
      },
      {
        id: 'prepare-for-sale',
        guideCategory: 'sell',
        guideArticleSlug: 'how-to-prepare-your-business-for-sale',
      },
    ],
  },
  {
    slug: 'owner-life',
    status: 'available',
    level: 'beginner',
    title: {
      en: 'Owner Life',
      es: 'La vida del propietario',
    },
    description: {
      en: 'Navigate the personal side of running a business — urgency, relationships, identity, and decision-making under pressure.',
      es: 'Navega el lado personal de dirigir un negocio: la urgencia, las relaciones, la identidad y la toma de decisiones bajo presión.',
    },
    summary: {
      en: 'A short course on the quieter pressures behind ownership, focused on urgency, relationships, boundaries, and steadier decision-making.',
      es: 'Un curso breve sobre las presiones más silenciosas detrás de ser dueño, enfocado en urgencia, relaciones, límites y decisiones más serenas.',
    },
    outcomes: {
      en: ['Use an urgency framework without treating every problem like an emergency', 'Separate family roles from governance roles more clearly', 'Identify one healthier next step under pressure'],
      es: ['Usar un marco de urgencia sin tratar cada problema como una emergencia', 'Separar con mayor claridad los roles familiares de los roles de gobierno', 'Identificar un siguiente paso más saludable bajo presión'],
    },
    prerequisites: {
      en: ['No prerequisite. This course is educational and not a substitute for medical, mental-health, legal, or family counseling support.'],
      es: ['No hay prerrequisito. Este curso es educativo y no sustituye apoyo médico, de salud mental, legal o de consejería familiar.'],
    },
    deliverable: {
      en: 'A steadier language for pressure and clearer role boundaries in family or close-relationship business decisions.',
      es: 'Un lenguaje más sereno para la presión y límites de rol más claros en decisiones de negocio con familia o relaciones cercanas.',
    },
    estimatedMinutes: 24,
    lessons: [
      {
        id: 'everything-feels-urgent',
        guideCategory: 'owner-life',
        guideArticleSlug: 'when-everything-feels-urgent',
      },
      {
        id: 'love-is-not-governance',
        guideCategory: 'owner-life',
        guideArticleSlug: 'love-is-not-governance',
      },
    ],
    plannedModules: [
      {
        id: 'working-with-family',
        title: {
          en: 'Working With Family Without Losing the Relationship',
          es: 'Trabajar con la familia sin perder la relación',
        },
      },
      {
        id: 'business-not-identity',
        title: {
          en: 'Your Business Is Not Your Entire Identity',
          es: 'Tu negocio no es toda tu identidad',
        },
      },
      {
        id: 'learning-in-public',
        title: {
          en: 'Learning Business in Public',
          es: 'Aprender sobre negocios en público',
        },
      },
      {
        id: 'decisions-under-uncertainty',
        title: {
          en: 'Making Decisions During Uncertainty',
          es: 'Tomar decisiones en la incertidumbre',
        },
      },
    ],
    disclosure: {
      en: 'This course provides general educational information about everyday pressure and decision-making. It does not diagnose or treat medical or mental-health conditions.',
      es: 'Este curso ofrece información educativa general sobre la presión cotidiana y la toma de decisiones. No diagnostica ni trata condiciones médicas ni de salud mental.',
    },
  },
  {
    slug: 'markets-foundations',
    status: 'coming-soon',
    level: 'beginner',
    title: {
      en: 'Markets Foundations',
      es: 'Fundamentos de mercados',
    },
    description: {
      en: 'Understand the mechanics of markets — stocks, futures, trading concepts, and how to think about risk — without the hype.',
      es: 'Comprende la mecánica de los mercados financieros: acciones, futuros, conceptos de trading y cómo pensar en el riesgo, sin el ruido.',
    },
    summary: {
      en: 'A planned introductory sequence for market structure, risk, and trading concepts without signals or hype.',
      es: 'Una secuencia introductoria planificada sobre estructura de mercados, riesgo y conceptos de trading sin señales ni exageraciones.',
    },
    outcomes: {
      en: ['Understand core market mechanics', 'Distinguish investing concepts from trading concepts', 'Approach risk with more discipline and less hype'],
      es: ['Entender la mecánica básica de los mercados', 'Distinguir conceptos de inversión de conceptos de trading', 'Abordar el riesgo con más disciplina y menos ruido'],
    },
    prerequisites: {
      en: ['None yet. Full lessons are not published.'],
      es: ['Ninguno por ahora. Las lecciones completas aún no están publicadas.'],
    },
    deliverable: {
      en: 'A planned foundation for market literacy once the course is published.',
      es: 'Una base planificada de alfabetización de mercados una vez que el curso se publique.',
    },
    plannedModules: [
      { id: 'what-a-stock-represents', title: { en: 'What a Stock Represents', es: 'Qué representa una acción' } },
      { id: 'how-futures-work', title: { en: 'How Futures Contracts Work', es: 'Cómo funcionan los contratos de futuros' } },
      { id: 'investing-vs-trading', title: { en: 'Investing Versus Trading', es: 'Invertir frente a hacer trading' } },
      { id: 'orders-spreads-volume', title: { en: 'Orders, Spreads, Volume, and Liquidity', es: 'Órdenes, spreads, volumen y liquidez' } },
      { id: 'margin-and-leverage', title: { en: 'Margin and Leverage', es: 'Margen y apalancamiento' } },
      { id: 'position-sizing', title: { en: 'Position Sizing and Risk Capital', es: 'Tamaño de posición y capital de riesgo' } },
      { id: 'paper-trading', title: { en: 'Paper Trading and Journaling', es: 'Trading en papel y registro' } },
      { id: 'common-mistakes', title: { en: 'Common Trading Mistakes', es: 'Errores comunes en el trading' } },
    ],
    disclosure: {
      en: 'Educational information only. Ownward does not provide trade signals, personalized investment recommendations, brokerage services, or trade execution.',
      es: 'Solo información educativa. Ownward no proporciona señales de trading, recomendaciones de inversión personalizadas, servicios de corretaje ni ejecución de operaciones.',
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAcademyCourse(slug: string): AcademyCourse | undefined {
  return academyCourses.find((course) => course.slug === slug);
}

export function getAvailableAcademyCourses(): AcademyCourse[] {
  return academyCourses.filter((course) => course.status === 'available');
}

export function getLocalizedAcademyText(
  text: LocalizedAcademyText,
  locale: string,
): string {
  return locale === 'es' ? text.es : text.en;
}

/**
 * Resolve a lesson's corresponding Guide article. Returns null if the article
 * does not exist in guide-content (should not happen in production data).
 */
export function getAcademyLessonArticle(lesson: AcademyLesson) {
  return getGuideArticle(lesson.guideCategory, lesson.guideArticleSlug);
}


export function getAcademyCoursesForArticle(category: string, slug: string): AcademyCourse[] {
  return academyCourses.filter((course) =>
    (course.lessons ?? []).some(
      (lesson) => lesson.guideCategory === category && lesson.guideArticleSlug === slug,
    ),
  );
}

export function getCourseLessonContext(courseSlug: string, category: string, slug: string) {
  const course = getAcademyCourse(courseSlug);
  if (!course?.lessons) return null;
  const lessonIndex = course.lessons.findIndex(
    (lesson) => lesson.guideCategory === category && lesson.guideArticleSlug === slug,
  );
  if (lessonIndex < 0) return null;
  const previousLesson = lessonIndex > 0 ? course.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < course.lessons.length - 1 ? course.lessons[lessonIndex + 1] : null;
  return {
    course,
    lessonIndex,
    lesson: course.lessons[lessonIndex],
    previousLesson,
    nextLesson,
  };
}
