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
  title: LocalizedAcademyText;
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
