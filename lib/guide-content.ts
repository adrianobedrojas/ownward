export const guideCategoryContent = {
  run: {
    title: "Run a Business",
    description:
      "Practical material for existing owners on organization, records, and operations.",
  },
  grow: {
    title: "Grow a Business",
    description:
      "Strategies on customer profitability, value drivers, and growth planning.",
  },
  value: {
    title: "Business Valuation",
    description:
      "Breakdowns of SDE, EBITDA multiples, and valuation estimation.",
  },
  sell: {
    title: "Selling a Business",
    description:
      "Guidance on confidential listings, due diligence, NDAs, and closing.",
  },
  buy: {
    title: "Buying a Business",
    description:
      "How to evaluate listings, verify revenue, and navigate acquisitions.",
  },
  stories: {
    title: "Owner Stories & Founder Notes",
    description: "Real-world lessons and behind-the-scenes building notes.",
  },
  resources: {
    title: "Interactive Resources & Checklists",
    description: "Downloadable checklists, calculators, and assessments.",
  },
} as const;

export type GuideCategorySlug = keyof typeof guideCategoryContent;

interface GuideArticleSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  steps?: string[];
}

interface GuideActionPlanWeek {
  week: string;
  focus: string;
}

export interface GuideArticle {
  slug: string;
  category: GuideCategorySlug;
  title: string;
  description: string;
  readingTime: string;
  metadataDescription: string;
  introduction: string[];
  sections: GuideArticleSection[];
  actionPlan: GuideActionPlanWeek[];
  checklist: string[];
  categoryCtaHref: string;
  categoryCtaLabel: string;
  ownwardCtaHref: string;
  ownwardCtaLabel: string;
}

export const guideArticles: GuideArticle[] = [
  {
    slug: "business-operations-basics",
    category: "run",
    title: "Business Operations Basics",
    description:
      "Learn how to organize daily work, build repeatable processes, and create a business that runs more consistently.",
    readingTime: "10 min read",
    metadataDescription:
      "Learn beginner-friendly business operations basics, including recurring tasks, process checklists, routines, metrics, and a practical 30-day action plan.",
    introduction: [
      "Business operations are the day-to-day activities that keep your company moving. They include the routines, decisions, and systems behind serving customers, collecting money, and delivering work.",
      "When operations are unclear, work gets delayed, responsibilities get confused, and results become inconsistent. Strong operations make your business more stable, easier to manage, and more prepared for growth.",
    ],
    sections: [
      {
        title: "1. Identify recurring business activities",
        paragraphs: [
          "Start by listing the activities your business repeats regularly. Focus on what happens every day, every week, and every month.",
        ],
        bullets: [
          "Serving customers",
          "Processing payments",
          "Managing expenses",
          "Following up with leads",
          "Completing projects or orders",
          "Managing documents",
          "Handling support requests",
        ],
      },
      {
        title: "2. Turn repeated work into simple processes",
        paragraphs: [
          "Once you see repeated tasks, document each one as a short process or checklist. Keep each process simple enough that another person could follow it reliably.",
          "Example process: New customer inquiry",
        ],
        steps: [
          "Record the lead",
          "Respond within a defined period",
          "Ask qualifying questions",
          "Send appropriate information or proposal",
          "Schedule next action",
          "Record result",
        ],
      },
      {
        title: "3. Organize important business information",
        paragraphs: [
          "Store business information in clear, consistent locations so records can be found quickly when needed.",
          "Do not store sensitive data carelessly. Use secure systems, limit access, and follow good security practices for financial and customer information.",
        ],
        bullets: [
          "Contracts",
          "Invoices",
          "Receipts",
          "Tax records",
          "Customer information",
          "Vendor information",
          "Insurance documents",
          "Licenses",
          "Internal procedures",
        ],
      },
      {
        title: "4. Establish operating routines",
        paragraphs: [
          "Routines keep important work from being forgotten. Define when your team checks operations and what each review should cover.",
        ],
        bullets: [
          "Daily: review urgent tasks, customer follow-ups, and payment activity",
          "Weekly: review completed work, outstanding tasks, and operational blockers",
          "Monthly: review financial trends, recurring issues, and process updates",
        ],
      },
      {
        title: "5. Track a small number of useful metrics",
        paragraphs: [
          "Metrics should support decisions. Start small and track only numbers you will actually use to improve operations.",
        ],
        bullets: [
          "Revenue",
          "Expenses",
          "Cash available",
          "Leads received",
          "Customers gained",
          "Conversion rate",
          "Outstanding invoices",
          "Customer response time",
          "Project or order completion time",
        ],
      },
      {
        title: "6. Reduce dependence on the owner",
        paragraphs: [
          "A business that depends on one person is harder to scale and harder to sell. Reduce that dependence with clear documentation, practical delegation, automation where appropriate, and consistent tools.",
          "Do not automate sensitive decisions without oversight. Keep important customer, legal, and financial decisions reviewed by the right person.",
        ],
      },
      {
        title: "7. Review and improve operations",
        paragraphs: [
          "Set time to review where operations break down. Improvement is ongoing, not one-time.",
        ],
        bullets: [
          "Repeated delays",
          "Customer complaints",
          "Duplicate work",
          "Missed follow-ups",
          "Unclear responsibilities",
          "Tasks requiring repeated corrections",
        ],
      },
    ],
    actionPlan: [
      { week: "Week 1", focus: "List recurring activities" },
      { week: "Week 2", focus: "Document the most important processes" },
      {
        week: "Week 3",
        focus: "Organize records and assign responsibilities",
      },
      { week: "Week 4", focus: "Review results and improve weak areas" },
    ],
    checklist: [
      "Recurring tasks identified",
      "Core processes documented",
      "Records organized",
      "Responsibilities assigned",
      "Important metrics selected",
      "Weekly review scheduled",
      "Customer follow-up process created",
      "Backup and access procedures reviewed",
    ],
    categoryCtaHref: "/guide/run",
    categoryCtaLabel: "Back to Run a Business",
    ownwardCtaHref: "/tasks",
    ownwardCtaLabel: "Create your first operations task in Ownward",
  },
];

export function getGuideCategory(slug: string) {
  return guideCategoryContent[slug as GuideCategorySlug] ?? null;
}

export function getGuideArticlesByCategory(category: string) {
  return guideArticles.filter((article) => article.category === category);
}

export function getGuideArticle(category: string, slug: string) {
  return guideArticles.find(
    (article) => article.category === category && article.slug === slug,
  );
}
