import { getGuideArticle } from './guide-content';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AcademyCourseStatus = 'available' | 'coming-soon';
export type AcademyCourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LocalizedAcademyText {
  en: string;
  es: string;
}

export interface AcademyLesson {
  id: string;
  guideCategory: string;
  guideArticleSlug: string;
}

export interface PlannedAcademyModule {
  id: string;
  title: string;
}

export interface AcademyCourse {
  slug: string;
  status: AcademyCourseStatus;
  level: AcademyCourseLevel;
  title: LocalizedAcademyText;
  description: LocalizedAcademyText;
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
      en: 'Build a practical path from business idea to validation, first offer, startup budget, and launch.',
      es: 'Crea una ruta práctica desde la idea de negocio hasta la validación, la primera oferta, el presupuesto inicial y el lanzamiento.',
    },
    estimatedMinutes: 42,
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
    status: 'coming-soon',
    level: 'beginner',
    title: {
      en: 'Owner Life',
      es: 'La vida del propietario',
    },
    description: {
      en: 'Navigate the personal side of running a business — urgency, relationships, identity, and decision-making under pressure.',
      es: 'Navega el lado personal de dirigir un negocio: la urgencia, las relaciones, la identidad y la toma de decisiones bajo presión.',
    },
    plannedModules: [
      { id: 'everything-feels-urgent', title: 'When Everything Feels Urgent' },
      { id: 'love-is-not-governance', title: 'Love Is Not Governance' },
      { id: 'working-with-family', title: 'Working With Family Without Losing the Relationship' },
      { id: 'business-not-identity', title: 'Your Business Is Not Your Entire Identity' },
      { id: 'learning-in-public', title: 'Learning Business in Public' },
      { id: 'decisions-under-uncertainty', title: 'Making Decisions During Uncertainty' },
    ],
    disclosure: {
      en: 'This future course will provide general educational information about everyday pressure and decision-making. It will not diagnose or treat medical or mental-health conditions.',
      es: 'Este futuro curso proporcionará información educativa general sobre la presión cotidiana y la toma de decisiones. No diagnosticará ni tratará condiciones médicas ni de salud mental.',
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
    plannedModules: [
      { id: 'what-a-stock-represents', title: 'What a Stock Represents' },
      { id: 'how-futures-work', title: 'How Futures Contracts Work' },
      { id: 'investing-vs-trading', title: 'Investing Versus Trading' },
      { id: 'orders-spreads-volume', title: 'Orders, Spreads, Volume, and Liquidity' },
      { id: 'margin-and-leverage', title: 'Margin and Leverage' },
      { id: 'position-sizing', title: 'Position Sizing and Risk Capital' },
      { id: 'paper-trading', title: 'Paper Trading and Journaling' },
      { id: 'common-mistakes', title: 'Common Trading Mistakes' },
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
