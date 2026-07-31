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
  cardTitle?: string;
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
    title: "Business Operations Basics: Build a Business That Runs More Smoothly",
    cardTitle: "Business Operations Basics",
    description:
      "Learn how to organize daily work, build repeatable processes, and create a business that runs more consistently — without relying on the owner for everything.",
    readingTime: "10 min read",
    metadataDescription:
      "A beginner's guide to business operations: identify recurring tasks, build process checklists, establish daily and weekly routines, track key metrics, and follow a practical 30-day action plan.",
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
  {
    slug: "how-to-create-standard-operating-procedures",
    category: "run",
    title: "How to Create Simple Standard Operating Procedures for Your Business",
    cardTitle: "How to Create Simple Standard Operating Procedures",
    description:
      "Learn how to turn recurring business tasks into clear, practical instructions that employees, contractors, or future team members can follow consistently.",
    readingTime: "10 min read",
    metadataDescription:
      "Learn how to create simple standard operating procedures for your business by choosing recurring tasks, writing clear steps, assigning responsibility, testing the process, handling exceptions, and keeping SOPs practical and up to date.",
    introduction: [
      "SOP stands for standard operating procedure. It is a documented method for completing a recurring task so the work can be done the same way each time.",
      "Simple SOPs help produce more consistent results, reduce confusion, prevent missed steps, and make the business less dependent on the owner remembering everything. They do not need to be long manuals. In many cases, a short, practical document is more useful than a complicated one that nobody follows.",
    ],
    sections: [
      {
        title: "1. Decide which process to document first",
        paragraphs: [
          "Start with one recurring or important task instead of trying to document the whole company at once. The goal is to make immediate progress on the work that matters most.",
          "Good starting examples include customer communication, billing, onboarding, order handling, and record organization. Choose a process that already happens often enough to benefit from consistency.",
        ],
        bullets: [
          "Responding to a new customer inquiry",
          "Creating and sending an invoice",
          "Onboarding a customer",
          "Processing an order",
          "Handling a refund request",
          "Uploading and organizing a document",
          "Following up on an unpaid invoice",
          "Closing the business at the end of the day",
          "Prioritize tasks that happen frequently",
          "Prioritize tasks that cause repeated mistakes",
          "Prioritize tasks that affect customers or revenue",
          "Prioritize tasks that only the owner currently understands",
          "Prioritize tasks that involve sensitive or regulated information",
          "Prioritize tasks that must be completed within a specific period",
        ],
      },
      {
        title: "2. Define the purpose and expected result",
        paragraphs: [
          "Every SOP should explain what the process is, why it exists, when it should be used, who is responsible, and what success looks like. This keeps the document focused and helps the person doing the work understand the goal instead of just following instructions mechanically.",
          "Example: A new customer inquiry SOP exists so every inquiry is recorded, answered on time, and moved to the right next step. It is used whenever a new lead contacts the business. The sales or customer support role is responsible. Success means the inquiry receives a complete response and the next action is documented.",
        ],
      },
      {
        title: "3. Write the process as clear steps",
        paragraphs: [
          "Write numbered steps in the order they happen. Each step should tell the person exactly what to do next without making them guess.",
          'Vague: "Follow up with the customer quickly."',
          'Clear: "Send the approved follow-up email within one business day and record the next action in the customer record."',
        ],
        bullets: [
          "Start each step with an action verb",
          "Use specific instructions",
          "Avoid vague statements",
          "Name the tool, form, or location used",
          "Include deadlines or response times when relevant",
          "Keep each step focused on one action",
        ],
      },
      {
        title: "4. Include the information someone needs to complete the task",
        paragraphs: [
          "A useful SOP includes the tools, access, and references someone needs to finish the work correctly. Without that information, even a well-written process can fail in practice.",
          "Include required tools, login or access requirements, templates, forms, file locations, approval requirements, escalation instructions, relevant policies, and the expected completion time.",
          "Do not place passwords, payment card data, government identification numbers, private customer information, or other sensitive data directly inside an unsecured SOP document. Store credentials and other sensitive information in an appropriate secure system instead of the SOP itself.",
        ],
      },
      {
        title: "5. Assign responsibility and approval authority",
        paragraphs: [
          "Make it clear who completes the process, who reviews or approves the result, and who handles exceptions. One person may fill more than one role in a small business, but the roles should still be identified clearly.",
          "When ownership is unclear, tasks get missed, duplicated, or delayed because each person assumes someone else is handling the work.",
        ],
      },
      {
        title: "6. Test the SOP with another person",
        paragraphs: [
          "Ask someone unfamiliar with the process to follow the SOP exactly as written. A good test reveals whether the document works in real life instead of only in the owner's head.",
        ],
        bullets: [
          "Missing steps",
          "Unclear wording",
          "Required information that was assumed",
          "Missing tools or permissions",
          "Decisions that require escalation",
          "Steps that are no longer necessary",
        ],
      },
      {
        title: "7. Create rules for exceptions",
        paragraphs: [
          "Not every situation follows the normal process. Your SOP should explain which situations count as exceptions and when the person doing the work must stop and ask for approval.",
          "This article provides general educational information only. For legal, tax, accounting, or regulatory issues, involve a qualified professional when appropriate.",
        ],
        bullets: [
          "A customer disputes a charge",
          "A required document is missing",
          "A payment fails",
          "A deadline cannot be met",
          "Sensitive information is received",
          "A customer requests something outside company policy",
        ],
      },
      {
        title: "8. Store the SOP where the right people can find it",
        paragraphs: [
          "Keep approved SOPs in one central document area with consistent file names so the correct version is easy to find. Limit access to sensitive procedures, use version control if available, maintain backups, and avoid multiple conflicting copies stored in different places.",
        ],
      },
      {
        title: "9. Review and update the SOP",
        paragraphs: [
          "Each SOP should show the owner or responsible person, the date created, the last reviewed date, the version number, and the next review date. That makes it easier to see whether the document is current or stale.",
          "Review an SOP whenever a tool changes, a law or policy changes, responsibilities change, an error exposes a weakness, customers repeatedly experience the same problem, or the process becomes slower or more complicated.",
        ],
      },
      {
        title: "10. Keep SOPs practical",
        paragraphs: [
          "A one-page checklist that people actually use can be more valuable than a long document that gets ignored. The right level of detail depends on the complexity of the task, the experience of the person doing it, the risk of making an error, the importance of consistency, and any legal or compliance requirements.",
        ],
      },
      {
        title: "SOP: Responding to a New Customer Inquiry",
        paragraphs: [
          "Purpose: Make sure every new customer inquiry is recorded, answered promptly, and moved to the correct next step.",
          "When to use it: Use this SOP whenever a new prospective customer contacts the business by email, website form, phone message, or another approved communication channel.",
          "Responsible role: Sales coordinator, office manager, or other assigned team member responsible for first response.",
          "Required tools: Company email account, customer record or CRM, approved response template, and access to the current service or product information.",
          "Escalation conditions: Escalate if the inquiry includes a complaint, a request outside normal pricing or policy, missing contact information that blocks follow-up, or sensitive information that should not stay in an unsecured message.",
          "Expected result: The inquiry receives a complete first response within the required timeframe, the next action is scheduled, and the customer record is updated accurately.",
          "Last reviewed: [enter date]",
        ],
        steps: [
          "Open the inquiry and confirm the sender's name, contact details, and main request.",
          "Create or update the customer record in the CRM or customer record system.",
          "Check whether the inquiry matches an existing customer, lead, or open opportunity before creating a duplicate record.",
          "Send the approved first-response message within one business day using the correct template.",
          "Answer any basic questions using current approved business information only.",
          "Record the date of contact, summary of the request, and response sent in the customer record.",
          "Assign the next action, such as a follow-up call, quote, or handoff, and record the due date.",
          "Escalate to the approved reviewer if the request falls outside company policy or requires a special decision.",
        ],
      },
    ],
    actionPlan: [
      {
        week: "Week 1",
        focus: "Choose the five most important recurring processes.",
      },
      {
        week: "Week 2",
        focus: "Document the first two processes.",
      },
      {
        week: "Week 3",
        focus: "Test the processes with another person and correct unclear steps.",
      },
      {
        week: "Week 4",
        focus: "Publish the approved versions and establish a review schedule.",
      },
    ],
    checklist: [
      "High-priority recurring process selected",
      "Purpose and expected result defined",
      "Responsible person assigned",
      "Required tools and information listed",
      "Steps written in order",
      "Approval and exception rules documented",
      "Sensitive information excluded from the SOP",
      "SOP tested by another person",
      "File stored in the correct location",
      "Review date assigned",
    ],
    categoryCtaHref: "/guide/run",
    categoryCtaLabel: "Back to Run a Business",
    ownwardCtaHref: "/documents",
    ownwardCtaLabel: "Organize your business documents in Ownward",
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
