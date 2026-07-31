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
          "Use these examples to choose a process to document first, then apply the prioritization criteria to decide which one matters most right now.",
        ],
        bullets: [
          "Examples of processes to document:",
          "Responding to a new customer inquiry",
          "Creating and sending an invoice",
          "Onboarding a customer",
          "Processing an order",
          "Handling a refund request",
          "Uploading and organizing a document",
          "Following up on an unpaid invoice",
          "Closing the business at the end of the day",
          "Prioritize processes that:",
          "Happen frequently",
          "Cause repeated mistakes",
          "Affect customers or revenue",
          "Only the owner currently understands",
          "Involve sensitive or regulated information",
          "Must be completed within a specific period",
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
  {
    slug: "identify-most-profitable-customers",
    category: "grow",
    title:
      "How to Identify Your Most Profitable Customers and Grow More Strategically",
    cardTitle: "How to Identify Your Most Profitable Customers",
    description:
      "Learn how to compare customer revenue, direct costs, time requirements, repeat purchases, and retention so you can focus growth efforts on the customers who create the most value.",
    readingTime: "11 min read",
    metadataDescription:
      "Learn how to identify profitable customer groups by comparing revenue, direct costs, servicing time, repeat purchases, retention, and growth potential.",
    introduction: [
      "Growth is not only about attracting more customers. For a small-business owner, the more useful question is often which customers, customer groups, products, or services create the most value for the business.",
      "Some customers generate substantial revenue but also require high costs, repeated follow-up, discounts, and excessive owner time. A customer who looks strong on a sales report may still be difficult to serve profitably.",
      "A smaller customer may create more value because they purchase repeatedly, pay on time, require less support, and are easier to serve. That is why owners should evaluate customer value using several factors instead of revenue alone.",
      "This article provides general educational information only. It is not legal, tax, accounting, or investment advice.",
    ],
    sections: [
      {
        title: "1. Understand the difference between revenue and profitability",
        paragraphs: [
          "Revenue is the amount you charge or collect from a customer. Profitability looks more broadly at what it costs to win, serve, and support that customer.",
          "High revenue does not always mean high profit. If an owner makes decisions based only on sales totals, they may focus energy on customers who keep the business busy without creating enough value.",
          "Consider a simple example. Customer A generates $5,000 in revenue but requires $3,500 in materials, contractor costs, discounts, and repeated support. Customer B generates $3,500 in revenue but requires only $1,000 in direct costs and much less owner time.",
          "Customer B may create more value for the business even though total revenue is lower. This is only a simplified management comparison, not a formal accounting profit calculation, but it is still useful for decision-making.",
        ],
      },
      {
        title: "2. Gather basic customer information",
        paragraphs: [
          "Start by collecting a small set of useful facts for each customer or customer group. You do not need perfect records to begin. If exact information is unavailable, use reasonable estimates and label them clearly so you can improve them later.",
          "Try to gather information that helps you compare both money and effort, not just sales volume.",
          "Collect only information needed for legitimate business purposes, limit access to customer information, do not place sensitive personal information in an unsecured spreadsheet or document, and follow applicable privacy, record-retention, and security requirements.",
        ],
        bullets: [
          "Customer or customer-group name",
          "Products or services purchased",
          "Revenue generated",
          "Direct materials or product costs",
          "Contractor or delivery costs",
          "Discounts and refunds",
          "Payment-processing fees when relevant",
          "Time required to sell, serve, and support the customer",
          "Number of purchases",
          "Payment speed",
          "Length of the customer relationship",
          "Complaints, returns, or rework",
        ],
      },
      {
        title: "3. Estimate customer contribution",
        paragraphs: [
          "A practical starting point is a simple customer contribution estimate: customer revenue minus the direct costs associated with serving that customer.",
          "This is a simplified management estimate, not the same as complete accounting profit. It helps an owner compare customers or groups in a beginner-friendly way.",
          "Direct costs are the costs that would not have occurred without that sale or account. General overhead such as rent, software used across the whole business, and broad administrative expenses may require separate analysis.",
        ],
        bullets: [
          "Product or material costs",
          "Shipping or delivery",
          "Contractor labor",
          "Commissions",
          "Refunds",
          "Discounts",
          "Customer-specific software or service costs",
          "Other costs that would not have occurred without that sale",
        ],
      },
      {
        title: "4. Account for time and service effort",
        paragraphs: [
          "Time has economic value even when the owner does not formally pay themselves by the hour. A customer who requires constant attention can quietly reduce profitability by taking time away from better work, better customers, or business improvement.",
          "Watch for customer behaviors that increase effort and reduce value. These issues do not always mean you should reject a customer, but they may show the need for clearer pricing, boundaries, processes, or service levels.",
        ],
        bullets: [
          "Repeated urgent requests",
          "Frequent revisions",
          "Excessive meetings",
          "Incomplete information",
          "Late approvals",
          "Unpaid custom work",
          "Repeated support for the same issue",
          "Late payments",
          "Scope changes",
        ],
      },
      {
        title: "5. Group customers into useful segments",
        paragraphs: [
          "After reviewing individual customers, look for patterns across groups. Segmentation helps you understand which types of customers are easier to serve, more profitable, and better aligned with your business.",
          "Choose segments that support a real business decision, such as pricing, marketing, service design, or customer selection. Do not base segments on protected or otherwise inappropriate personal characteristics.",
        ],
        bullets: [
          "Product or service purchased",
          "Customer industry",
          "Business size",
          "Geographic area",
          "Acquisition source",
          "First-time versus repeat customer",
          "Subscription versus one-time customer",
          "High-support versus low-support customer",
          "Fast-paying versus slow-paying customer",
          "High-margin versus low-margin work",
        ],
      },
      {
        title: "6. Look beyond the first purchase",
        paragraphs: [
          "The first sale matters, but long-term value often matters more. A customer with a modest first purchase may still become highly valuable if they stay with the business, buy again, and require limited support.",
          "When comparing customers or groups, consider whether they are likely to create value over time. Do not treat future revenue as guaranteed, but do pay attention to signs of healthy repeat business and strategic fit.",
        ],
        bullets: [
          "Repeat purchases",
          "Subscription retention",
          "Renewal rates",
          "Referrals",
          "Upsell opportunities",
          "Payment reliability",
          "Low refund rates",
          "Low support burden",
          "Strategic fit with the business",
        ],
      },
      {
        title: "7. Identify the characteristics of high-value customers",
        paragraphs: [
          "Once you have compared several customers or groups, write down the characteristics that appear most often among the strongest ones. This helps you attract more of the right work instead of simply more work.",
          "The goal is not to treat customers unfairly. The goal is to understand which offers, service models, and customer groups are sustainable for the business.",
        ],
        bullets: [
          "Buy profitable products or services",
          "Purchase repeatedly",
          "Pay on time",
          "Provide complete information",
          "Respect project scope",
          "Require reasonable support",
          "Refer similar customers",
          "Are a good fit for the business's expertise",
          "Are likely to continue needing the service",
        ],
      },
      {
        title: "8. Recognize warning signs",
        paragraphs: [
          "Some patterns suggest that revenue is growing in an unhealthy way. If cash becomes tighter while revenue rises, or if one customer consumes too much time and flexibility, the business may be adding strain instead of strength.",
          "Customer concentration risk means the business depends too heavily on one customer. If that customer reduces spending or leaves, revenue, cash flow, and confidence can drop quickly. There is no universal percentage threshold, but owners should understand when one account has become too important.",
        ],
        bullets: [
          "Revenue increases while cash becomes tighter",
          "A large customer requires continual discounts",
          "The owner spends excessive time on one account",
          "Rework or refunds are frequent",
          "The customer regularly pays late",
          "The work requires tools or skills the company does not normally use",
          "The customer represents an unsafe percentage of total revenue",
          "The business cannot serve the customer without delaying other work",
        ],
      },
      {
        title: "9. Choose an appropriate growth action",
        paragraphs: [
          "After reviewing the evidence, choose one or two focused actions that improve the quality of your growth. Better growth usually comes from clearer choices, not from reacting to every customer the same way.",
          "Test changes carefully instead of making abrupt decisions based on limited data. A small pricing adjustment, process change, or targeting improvement can be enough to show whether you are moving in the right direction.",
        ],
        bullets: [
          "Focus marketing on similar high-value customers",
          "Improve the offer that attracts profitable customers",
          "Raise prices where service demands are consistently underestimated",
          "Create clearer service packages",
          "Establish change-order or revision rules",
          "Require deposits or milestone payments when appropriate",
          "Improve customer onboarding",
          "Reduce unnecessary support work",
          "Stop promoting consistently unprofitable offers",
          "Diversify when one customer represents excessive dependence",
        ],
      },
      {
        title: "10. Review customer profitability regularly",
        paragraphs: [
          "Customer profitability can change over time. Costs rise, customer behavior changes, new competitors appear, and your own delivery process may improve or become more complex.",
          "Review monthly if your business has frequent transactions, quarterly if you work on longer projects, and whenever pricing, costs, staffing, or service delivery changes.",
        ],
      },
      {
        title: "Sample customer comparison",
        paragraphs: [
          "A simple comparison can reveal which customer groups deserve more attention.",
          "One-time custom projects may bring typical revenue of about $4,500 per project, but they often come with higher direct costs, long meetings, revisions, and unpredictable scope. Repeat purchases are limited, payment reliability varies, and the main operational concern is that each project can consume more time than expected.",
          "Monthly service clients may generate about $1,200 per month each, with moderate direct costs and a steadier amount of service time. They often purchase repeatedly by design, usually pay on a predictable schedule, and the main operational concern is keeping service delivery consistent so retention stays strong.",
          "Standard product customers may spend about $250 per order, with clearer direct costs and relatively low service time. Some become repeat buyers, payment is usually immediate, and the main operational concern is maintaining margin after shipping, refunds, and promotions.",
          "In this example, monthly service clients may look most attractive because they combine repeat revenue, better predictability, and manageable service effort. Standard product customers may also be appealing if margins stay healthy and fulfillment remains efficient. One-time custom projects may still be worthwhile, but only if pricing and scope control are strong enough to protect value.",
        ],
      },
    ],
    actionPlan: [
      {
        week: "Week 1",
        focus:
          "Select 10 recent customers or three meaningful customer groups and collect basic revenue, direct-cost, and service-effort information.",
      },
      {
        week: "Week 2",
        focus:
          "Estimate contribution and compare the time required to serve each customer or group.",
      },
      {
        week: "Week 3",
        focus:
          "Identify patterns among the most valuable and least sustainable customers.",
      },
      {
        week: "Week 4",
        focus:
          "Choose one focused growth change, such as improving pricing, targeting a stronger customer group, simplifying an offer, or strengthening service boundaries.",
      },
    ],
    checklist: [
      "Customer or customer groups selected",
      "Revenue information collected",
      "Direct costs estimated",
      "Owner and team time considered",
      "Repeat purchases reviewed",
      "Payment reliability reviewed",
      "Refunds and rework considered",
      "Customer concentration considered",
      "High-value customer characteristics identified",
      "One growth action selected",
      "Review date scheduled",
    ],
    categoryCtaHref: "/guide/grow",
    categoryCtaLabel: "Back to Grow a Business",
    ownwardCtaHref: "/customers",
    ownwardCtaLabel: "Review your customer list in Ownward",
  },
  {
    slug: "how-to-evaluate-a-business-before-you-buy",
    category: "buy",
    title:
      "How to Evaluate a Business Before You Buy It: A Practical Due Diligence Guide",
    cardTitle: "How to Evaluate a Business Before You Buy It",
    description:
      "Learn how to review a business listing, verify its financial performance, identify hidden risks, and decide whether an acquisition deserves further investigation.",
    readingTime: "12 min read",
    metadataDescription:
      "A practical guide to evaluating a small business acquisition, including buyer criteria, financial verification, customer concentration, owner dependence, operations, deal structure, due diligence, and acquisition warning signs.",
    introduction: [
      "Buying an existing business can offer real advantages over starting one from scratch. An established business may already have customers, revenue, trained employees, operating processes, supplier relationships, and a track record you can study before committing your capital and time.",
      "A listing is only the beginning of the investigation, however. Asking price, stated revenue, and seller claims are starting points — not conclusions. The process of confirming those claims, understanding the business's true financial performance, and identifying its risks and obligations is called due diligence.",
      "Due diligence means gathering and verifying the information you need to make an informed decision. It typically covers financial records, operations, customers, employees, contracts, legal obligations, and deal structure. The depth and focus of a review depends on the type of business, the transaction structure, the purchase price, the buyer's experience, the available records, and the applicable laws and regulations.",
      "The objective of due diligence is not to find a completely risk-free business — no such business exists. The objective is to understand the risks well enough to decide whether the opportunity is right for you, at what price, and under what terms. Some risks can be priced into the deal or addressed through the deal structure. Others may make the opportunity unsuitable regardless of price.",
      "This article is educational and general in nature. It is not legal, accounting, tax, lending, valuation, insurance, or investment advice. The appropriate review for any specific acquisition depends on the business, transaction structure, jurisdiction, and buyer circumstances. Consult qualified professionals before committing to an acquisition.",
    ],
    sections: [
      {
        title: "1. Define the type of business you are prepared to own",
        paragraphs: [
          "Before reviewing any listing, define what you are actually looking for. Buyers who begin without clear criteria often spend time on opportunities that are not a good fit, make emotional decisions under pressure, or accept terms that do not work for their situation.",
          "Write down your preferences and limits in advance so you can evaluate each opportunity against them consistently.",
        ],
        bullets: [
          "Preferred industries or types of business",
          "Geographic location or willingness to relocate",
          "Online, physical, mobile, or hybrid operations",
          "Maximum total investment you can consider",
          "Available down payment or equity capital",
          "Desired annual owner income after debt service",
          "Number of employees you are comfortable managing",
          "Time commitment you can realistically make",
          "Active hands-on ownership versus manager-operated ownership",
          "Personal experience, skills, and risk tolerance",
        ],
      },
      {
        title: "2. Treat the listing as a starting point, not proof",
        paragraphs: [
          "A listing presents what the seller wants you to see. Before investing significant time in any opportunity, ask a focused set of questions to determine whether further review is warranted.",
          "A seller who cannot or will not answer basic questions early in the process is a signal worth noting.",
        ],
        bullets: [
          "What is included in the sale — assets, inventory, intellectual property, customer records, equipment, and contracts",
          "Why the owner is selling and the timeline for the transition",
          "What revenue period is being presented and how it was calculated",
          "What property is leased or owned and whether the lease is transferable",
          "How many hours per week the owner currently works in the business",
          "Whether key employees are expected to remain after the sale",
          "Whether important customer, supplier, or licensing agreements are assignable to a new owner",
        ],
      },
      {
        title: "3. Understand what the owner actually earns",
        paragraphs: [
          "Reported net income is rarely the complete picture for a small owner-operated business. Sellers typically present a figure called Seller's Discretionary Earnings, or SDE, which attempts to show the total financial benefit available to one full-time owner-operator.",
          "SDE typically starts with pretax net income and adds back the working owner's compensation and benefits, interest expense, depreciation, amortization, and documented one-time or nonrecurring expenses. Some sellers also add back clearly personal expenses that were run through the business.",
          "Buyers should not automatically accept every proposed add-back. Each adjustment should be supported by documentation, genuinely nonrecurring, and unlikely to continue under new ownership. Add-backs that cannot be verified with records will likely be challenged by a lender or an accountant.",
          "Equally important is the replacement cost of the seller's labor. If the seller works full time in the business and you plan to hire a manager instead of replacing that labor yourself, the cost of that manager reduces your actual earnings. Working capital — the operating cash needed to run the business day to day — and new acquisition debt payments also reduce what you will actually earn after closing.",
        ],
      },
      {
        title: "4. Verify revenue using more than one source",
        paragraphs: [
          "Do not accept revenue figures based on a single document. Verify reported revenue by comparing multiple independent sources. When different sources tell a consistent story, confidence increases. When they do not agree, investigate the discrepancy before proceeding.",
          "Inconsistencies between documents require an explanation, but they do not automatically prove misconduct. Errors, timing differences, and accounting choices can sometimes explain gaps. The important thing is that the seller can explain the differences with supporting evidence.",
        ],
        bullets: [
          "Business tax returns for at least two to three years",
          "Profit-and-loss statements for the same periods",
          "Bank statements showing deposits and withdrawals",
          "Payment-processor reports from platforms such as Stripe, Square, or PayPal",
          "Invoices for significant transactions",
          "Accounts-receivable aging reports",
          "Point-of-sale reports when applicable",
          "Customer contracts that specify payment terms and amounts",
          "Sales-tax returns when the business collects sales tax",
          "Monthly revenue records to identify trends, seasonality, and anomalies",
        ],
      },
      {
        title: "5. Examine the quality and stability of revenue",
        paragraphs: [
          "Not all revenue is equally valuable. Revenue that returns automatically, comes from repeat customers, and requires limited ongoing sales effort is generally more reliable than one-time project revenue that must be continuously replaced.",
          "Review how the business earns its revenue, how stable it has been over time, and what might cause it to change after an ownership transition.",
        ],
        bullets: [
          "Proportion of repeat, recurring, or subscription revenue",
          "Customer retention and churn rates",
          "Seasonal patterns and low-revenue periods",
          "Refund and chargeback rates",
          "Discount practices that reduce effective revenue",
          "Revenue broken down by customer, product, service, employee, or location",
          "Temporary revenue spikes that may not continue",
          "Revenue that depends on the seller's personal relationships or reputation",
        ],
      },
      {
        title: "6. Identify customer concentration risk",
        paragraphs: [
          "Customer concentration risk means the business depends heavily on a small number of customers. If a large customer reduces spending, switches to a competitor, or leaves after the ownership transition, revenue can drop significantly.",
          "There is no universal concentration percentage that makes a business acceptable or unacceptable. The appropriate level depends on the industry, the nature of the customer relationship, the contract terms, and the buyer's ability to replace that revenue. What matters is that you understand the risk clearly and factor it into the price and terms.",
        ],
        bullets: [
          "What share of revenue comes from the top one, three, and five customers",
          "Whether those customers have written contracts in place",
          "Contract expiration dates and termination provisions",
          "Whether contracts are assignable or require customer consent to transfer",
          "Customer satisfaction and any recent complaints or disputes",
          "The likelihood that each major customer continues with a new owner",
        ],
      },
      {
        title: "7. Determine how dependent the company is on the current owner",
        paragraphs: [
          "Owner dependence is one of the most common and significant risks in small-business acquisitions. If the current owner is also the primary salesperson, the most skilled technician, the main contact for every customer, and the person who handles all vendor relationships and internal knowledge, a buyer is not really buying a business — they are buying a job that depends on a person who is leaving.",
          "When the seller's skills, relationships, or daily presence are deeply embedded in operations, replacing that contribution may be difficult, expensive, and not fully achievable. This can reduce the buyer's actual earnings relative to what the seller presented.",
        ],
        bullets: [
          "Sales and business development",
          "Pricing decisions and customer negotiations",
          "Key customer relationships and primary points of contact",
          "Specialized technical or professional skills",
          "Employee management and morale",
          "Vendor relationships and purchasing decisions",
          "Bookkeeping and financial oversight",
          "Marketing and brand identity",
          "Final approvals required for operational decisions",
          "Passwords, credentials, records, and institutional knowledge held only by the owner",
        ],
      },
      {
        title: "8. Review employees, processes, and operational capacity",
        paragraphs: [
          "A business that can operate without relying on the seller's memory is easier to buy and easier to run. Review the people, processes, and tools that support day-to-day operations.",
        ],
        bullets: [
          "Employee roles, compensation, tenure, and key responsibilities",
          "Contractors or freelancers and the nature of those arrangements",
          "Employee turnover history and any recent departures",
          "Documented standard operating procedures for recurring work",
          "Customer onboarding and service delivery processes",
          "Order fulfillment, production, or service workflows",
          "Equipment condition, age, and any deferred maintenance",
          "Inventory levels, accuracy, and any obsolete or damaged stock",
          "Software, subscriptions, and systems the business depends on",
          "Supplier relationships and any single-supplier dependencies",
          "Capacity limits or bottlenecks that restrict growth",
          "Whether the business could operate through a transition without relying on the seller's memory",
        ],
      },
      {
        title: "9. Investigate obligations and potential liabilities",
        paragraphs: [
          "Revenue and earnings are only part of the picture. A business may carry significant obligations — including debt, pending litigation, unpaid taxes, undisclosed warranties, and regulatory requirements — that a buyer could inherit depending on how the transaction is structured.",
          "The distinction between an asset purchase and an equity purchase is important here. In a typical asset purchase, the buyer selects which assets and liabilities to acquire and may not automatically assume all existing obligations. In an equity purchase, the buyer acquires ownership of the legal entity and inherits its history, including liabilities that may not be fully disclosed. The appropriate structure for any specific transaction depends on the business, jurisdiction, financing, and negotiation. Consult qualified legal and tax advisors before committing to a structure.",
        ],
        bullets: [
          "Outstanding loans, lines of credit, or equipment financing",
          "Liens on business assets",
          "Federal, state, and local tax obligations including payroll and sales tax",
          "Pending, threatened, or recent legal disputes or claims",
          "Employee or contractor claims",
          "Customer refunds, returns, warranties, or prepaid services not yet delivered",
          "Lease terms, remaining duration, and assignability",
          "Licenses and permits required to operate legally",
          "Intellectual property ownership — trademarks, copyrights, domain names, software",
          "Insurance coverage and any open or recent claims",
          "Privacy, data security, and cybersecurity obligations",
        ],
      },
      {
        title: "10. Evaluate the deal structure, not only the asking price",
        paragraphs: [
          "The asking price is only one element of the deal. How the transaction is structured can significantly affect what the business costs you in practice, how much risk you take on, and how much capital you have available to run the business after closing.",
          "A lower asking price can still be a poor deal if the buyer receives inadequate working capital, assumes unexpected liabilities, or closes without enough cash to operate. Similarly, a higher price may be reasonable if it comes with strong seller training, favorable financing, and a well-structured transition.",
        ],
        bullets: [
          "Cash at closing and total purchase price",
          "Bank or SBA financing terms and requirements",
          "Seller financing — amount, interest rate, and repayment terms",
          "Earn-outs — payments contingent on future performance",
          "Inventory included or priced separately",
          "Working capital included or excluded from the transaction",
          "Liabilities assumed by the buyer",
          "Seller training period and transition support",
          "Noncompetition and nonsolicitation provisions — scope and duration",
          "Holdbacks or escrow amounts pending post-closing conditions",
          "Conditions that must be satisfied before closing",
        ],
      },
      {
        title: "11. Recognize warning signs",
        paragraphs: [
          "Certain patterns during the evaluation process deserve careful attention. A warning sign does not automatically mean you must walk away. It means you should investigate further before proceeding and, in some cases, adjust the price or terms to account for the risk.",
          "If a seller cannot or will not provide adequate documentation to address a material concern, that itself is important information.",
        ],
        bullets: [
          "Seller refuses to provide financial records or delays their delivery without explanation",
          "Financial statements do not agree with tax returns, bank statements, or other supporting records",
          "Excessive pressure to close quickly or to skip normal due diligence steps",
          "Add-backs that cannot be supported by documentation",
          "Unexplained sharp increases in revenue in the period just before the listing",
          "Important agreements or commitments made verbally rather than in writing",
          "Severe dependence on one customer with no written contract or transferability",
          "Uncertainty about whether key employees will stay after the transition",
          "Required licenses, permits, or contracts that are not transferable to a new owner",
          "Significant owner labor not accounted for in the earnings presentation",
          "Poor record-keeping, unidentified equipment issues, or unexplained inventory gaps",
          "Inconsistent or frequently changing explanations for why the business is being sold",
        ],
      },
      {
        title: "12. Use qualified professionals before committing",
        paragraphs: [
          "For most acquisitions, self-guided evaluation is a useful first step, but not a substitute for professional review when the stakes warrant it. Consider engaging qualified professionals before signing a letter of intent, releasing due diligence contingencies, or closing.",
          "An attorney can review purchase agreements, asset or equity purchase structures, contract assignments, noncompetition clauses, and the legal risks of assuming liabilities. An accountant can verify financial records, identify inconsistencies, evaluate proposed add-backs, and assess the tax implications of the deal. A tax professional can advise on the buyer's and seller's respective tax consequences depending on how the transaction is structured. A lender familiar with business acquisitions can assess financing eligibility, loan terms, and the debt-service impact on post-acquisition earnings. An insurance professional can identify coverage gaps that should be addressed before or after closing. A valuation professional can provide an independent assessment of whether the asking price is supported by the business's actual performance and risk profile. An industry specialist may be appropriate for businesses with technical, regulatory, or licensing requirements that require domain-specific knowledge.",
          "Ownward can help buyers organize listings, questions, documents, and acquisition progress in one place. It does not replace professional legal, accounting, tax, lending, valuation, insurance, or investment advice.",
        ],
      },
    ],
    actionPlan: [
      {
        week: "Week 1",
        focus:
          "Define acquisition criteria: available capital, desired owner income, preferred industries, maximum investment, and operational and time-commitment limits.",
      },
      {
        week: "Week 2",
        focus:
          "Select one opportunity and review the listing, financial history, owner role, expense structure, customer base, and operations.",
      },
      {
        week: "Week 3",
        focus:
          "Create a due-diligence request list and compare seller claims with tax returns, bank records, contracts, and operating records.",
      },
      {
        week: "Week 4",
        focus:
          "Document business strengths, identified risks, unanswered questions, estimated post-acquisition earnings, and the deal terms required before you would proceed.",
      },
    ],
    checklist: [
      "Acquisition criteria defined in writing",
      "Maximum investment and available down payment established",
      "Listing claims separated from independently verified facts",
      "Financial records formally requested",
      "Revenue verified against tax returns, bank statements, and processor reports",
      "Expenses and recurring costs reviewed",
      "Proposed add-backs reviewed and each one assessed for documentation",
      "Replacement cost of the owner's labor considered",
      "Customer concentration evaluated by revenue share and contract terms",
      "Employee retention likelihood considered",
      "Customer, supplier, and licensing contracts reviewed for assignability",
      "Equipment condition and inventory accuracy reviewed",
      "Required licenses and permits identified and transferability confirmed",
      "Outstanding debts, liens, and potential liabilities investigated",
      "Working-capital needs estimated for post-closing operations",
      "Deal structure — financing, working capital, and assumed obligations — reviewed",
      "Seller training period and transition support discussed",
      "Qualified professional review planned for legal, accounting, tax, and lending matters",
      "Warning signs documented and each one followed up",
      "Decision criteria and minimum acceptable terms established before making an offer",
    ],
    categoryCtaHref: "/guide/buy",
    categoryCtaLabel: "Back to Buying a Business",
    ownwardCtaHref: "/buy",
    ownwardCtaLabel: "Explore businesses on Ownward",
  },
  {
    slug: "how-much-is-my-business-worth",
    category: "value",
    title:
      "How Much Is My Business Worth? A Beginner's Guide to Small-Business Valuation",
    cardTitle: "How Much Is My Business Worth?",
    description:
      "Learn how small businesses are commonly valued, how SDE and EBITDA work, what valuation multiples mean, and which factors can increase or reduce a company's estimated value.",
    readingTime: "12 min read",
    metadataDescription:
      "Learn the fundamentals of small-business valuation, including normalized earnings, SDE, EBITDA, valuation multiples, asset-based, market, and income approaches, value drivers, risk factors, and a practical 30-day valuation-preparation plan.",
    introduction: [
      "Business value is not determined by revenue alone. A company with strong sales but thin margins, heavy owner dependence, or concentrated customers may be worth far less than its top-line numbers suggest.",
      "Asking price, estimated value, and final transaction price are three different things. A seller may list a business at any price, but the amount a buyer is willing to pay and the amount that actually closes depend on financial evidence, due diligence, financing terms, and deal structure.",
      "A valuation is an informed estimate, not a guarantee. It is based on financial performance, risk, assets, market evidence, transferability, and deal terms — all evaluated at a specific point in time. Different purposes, different buyers, and different market conditions can produce different conclusions from the same data.",
      "An online estimate or preliminary calculation can be a useful starting point for planning and discussion. It is not a substitute for a qualified professional valuation when one is required for tax reporting, legal proceedings, SBA financing, or other regulated purposes.",
    ],
    sections: [
      {
        title: "1. Understand what business value means",
        paragraphs: [
          "Value depends on the purpose and date of the valuation. A business may be valued differently depending on whether the purpose is a market sale, internal planning, bank financing, tax reporting, litigation, estate planning, or a partner ownership change. The same business can produce different value indications under different standards and methods.",
          "The final sale price may also be affected by factors beyond the business itself, including available financing, seller notes, working capital adjustments, retained liabilities, earnout provisions, and other deal terms negotiated between the buyer and seller.",
          "A seller's emotional investment in the business — the years of effort, personal sacrifices, and professional pride — does not automatically create transferable financial value. Buyers evaluate what the business is expected to produce for them going forward, not what it meant to the person who built it.",
        ],
      },
      {
        title: "2. Gather reliable financial information",
        paragraphs: [
          "A credible valuation requires reliable source material. Incomplete or inconsistent records make the process harder and the conclusion less defensible. Before attempting any estimate, gather the following documents when available.",
          "Consistent, well-organized financial records make the valuation more credible, easier to verify during due diligence, and more likely to support the asking price in a buyer negotiation.",
        ],
        bullets: [
          "Three years of profit-and-loss statements",
          "Business tax returns",
          "Current balance sheet",
          "Year-to-date financial statements",
          "Bank and payment processor records",
          "Payroll information",
          "Debt schedules",
          "Equipment and asset lists",
          "Customer concentration information",
          "Recurring-revenue information",
          "Owner compensation and benefit information",
          "Documentation supporting proposed adjustments",
        ],
      },
      {
        title: "3. Normalize the company's earnings",
        paragraphs: [
          "Normalized earnings are an estimate of the company's maintainable financial performance under ordinary ownership. The normalization process adjusts reported income to remove items that distort the true operating picture, such as one-time events, owner-specific compensation, or expenses that would not continue under new ownership.",
          "Potential adjustments include one working owner's compensation and benefits, interest expense, depreciation, amortization, documented one-time expenses, clearly personal expenses paid through the business, unusual income not expected to continue, below-market or above-market related-party transactions, and necessary operating expenses that have been omitted from the financials.",
          "An adjustment is not valid merely because the owner calls it an add-back. Each adjustment should be documented, reasonable, and unlikely to continue under a new buyer. Adjustments that cannot be supported with records are likely to be challenged or rejected during due diligence.",
          "Normalization also runs in both directions. If the business has omitted necessary operating expenses — such as replacing the owner's labor with hired management — those missing costs may need to be added back as downward adjustments to earnings.",
        ],
      },
      {
        title: "4. Understand Seller's Discretionary Earnings",
        paragraphs: [
          "Seller's Discretionary Earnings, or SDE, is a commonly used earnings measure for smaller owner-operated businesses. It attempts to show the total financial benefit available to one full-time owner-operator before debt service and certain noncash or discretionary items.",
          "A common starting point is pretax business profit, adjusted for one working owner's compensation and benefits, interest, depreciation, amortization, supported nonrecurring expenses, and supported discretionary expenses the owner ran through the business.",
          "SDE is designed for businesses where a single owner-operator works full time in the business. It assumes that the buyer will replace the seller in that role and captures the full economic benefit of doing so.",
          "Common mistakes when calculating SDE include adding back compensation for multiple working owners without accounting for the replacement labor cost, adding back recurring operating expenses that a buyer would still need to pay, adding back undocumented personal costs, ignoring wages needed to replace the current owner's daily work, and double-counting the same adjustment under different labels.",
        ],
      },
      {
        title: "5. Understand EBITDA",
        paragraphs: [
          "EBITDA stands for earnings before interest, taxes, depreciation, and amortization. It is more commonly emphasized for larger or more professionally managed businesses where market-rate management compensation is already included as an operating expense.",
          "Unlike SDE, EBITDA does not add back one owner's full compensation. EBITDA normally assumes that the business is run by hired management at market rates, so the owner's pay is treated as an ordinary operating cost rather than a discretionary item.",
          "Adjusted EBITDA may include documented normalization adjustments for nonrecurring items, related-party transactions, and other distortions — but those adjustments must still be legitimate and defensible.",
          "SDE and EBITDA are not interchangeable. A business can show a higher SDE than EBITDA because SDE may add back one owner's full compensation on top of the other adjustments. Using the wrong measure, or mixing measures with an incompatible multiple, will produce a misleading result.",
        ],
      },
      {
        title: "6. Learn the three broad valuation approaches",
        paragraphs: [
          "Asset approach: The asset approach estimates business value by calculating the value of assets minus liabilities. It may be especially relevant for asset-heavy businesses, holding companies, or businesses with limited earnings. Book value recorded on financial statements may not equal current market value. Intangible assets such as customer relationships, trade names, or proprietary processes may require separate identification and consideration.",
          "Market approach: The market approach compares the business with sales or pricing evidence from similar companies. For the comparison to be meaningful, the selected companies should be similar in industry, size, geographic location, margins, growth trajectory, customer concentration, and operating risk. A multiple should not be selected simply because another company advertised a high asking price. Closed and verified transactions are generally more meaningful than unsupported listing prices, which may not reflect what actually changed hands.",
          "Income approach: The income approach estimates value from expected future economic benefit. It may involve capitalizing a single normalized earnings figure or discounting a series of projected cash flows. Both forecasts and the discount or capitalization rates used must realistically reflect the risk and expected performance of the specific business. Small changes in assumptions — especially in the discount or capitalization rate — can significantly change the resulting value indication.",
          "A credible valuation typically compares evidence from more than one approach rather than mechanically applying a single formula. When multiple approaches produce similar conclusions, confidence in the range increases. When they diverge significantly, it is worth understanding why.",
        ],
      },
      {
        title: "7. Understand valuation multiples",
        paragraphs: [
          "A valuation multiple converts an earnings or revenue measure into a preliminary value indication. For example, normalized SDE multiplied by an appropriate SDE multiple produces an indicated enterprise value. The appropriate multiple depends on market evidence and the risk profile of the specific business.",
          "Revenue multiples should not be applied without understanding profit margins. Two companies with identical revenue can have very different values if their margins, cost structures, and earnings differ significantly.",
          "Factors that may support a stronger multiple include stable or growing normalized earnings, recurring or repeat revenue, diverse customer base, reliable financial records, documented operating procedures, low owner dependence, transferable contracts and relationships, strong employee retention, defensible competitive advantages, limited capital expenditure requirements, and predictable cash flow.",
          "Factors that may reduce a multiple include declining revenue or earnings, dependence on a single customer, excessive dependence on the owner, weak or inconsistent financial records, unresolved legal or regulatory problems, high employee turnover, deferred maintenance, unrecorded cash sales, unusual supplier dependence, revenue that may not transfer to a new owner, significant working-capital requirements, and cybersecurity, privacy, or operational weaknesses.",
        ],
      },
      {
        title: "8. Calculate a simple preliminary estimate",
        paragraphs: [
          "The following is a hypothetical educational example only. It does not establish an appropriate multiple or earnings figure for any specific business.",
          "Hypothetical inputs: reported pretax profit of $90,000; one working owner's compensation and benefits of $70,000; interest expense of $8,000; depreciation and amortization of $7,000; a supported one-time expense of $5,000; and a required replacement or missing operating expense of negative $20,000.",
          "Illustrative normalized SDE: $90,000 + $70,000 + $8,000 + $7,000 + $5,000 − $20,000 = $160,000.",
          "If supported market evidence suggested an illustrative range of 2.5 to 3.25 times SDE, the preliminary value indication for this hypothetical example would be $400,000 to $520,000. These figures are for illustration only. The range 2.5 to 3.25 is not a universal or recommended benchmark and does not apply to every business or industry.",
          "A preliminary estimate may also need adjustments for business debt, excess cash, inventory, real estate, equipment condition, working capital, retained liabilities, and the structure of the transaction. What enterprise value suggests and what the seller actually receives are not the same number.",
        ],
      },
      {
        title: "9. Separate enterprise value from what the seller receives",
        paragraphs: [
          "An indicated business value is not necessarily the seller's net proceeds. Several items may reduce or adjust what the seller actually receives at closing.",
          "Potential deductions or adjustments include outstanding business debt, transaction fees, income and capital gains taxes, legal and accounting costs, broker or M&A advisor fees, required working capital adjustments, retained or assumed liabilities, deferred or contingent payments, seller-financing risk, and escrow or holdback amounts held pending post-closing conditions.",
          "On the other side, excess cash, real estate owned by the business, inventory above or below normalized levels, and other assets may be treated separately depending on how the transaction is structured. Understanding the difference between enterprise value and net seller proceeds early in the process helps avoid surprises later.",
        ],
      },
      {
        title: "10. Improve the quality of the valuation",
        paragraphs: [
          "Steps taken before a valuation — or before going to market — can meaningfully improve both the accuracy of the estimate and the credibility of the result during buyer due diligence.",
        ],
        bullets: [
          "Reconcile accounting records to bank statements",
          "Separate personal and business expenses clearly",
          "Document every proposed normalization adjustment",
          "Track and report customer concentration",
          "Document recurring revenue and churn rates",
          "Prepare a complete asset and liability schedule",
          "Create written operating procedures",
          "Reduce owner dependence in daily operations",
          "Resolve expired licenses, contracts, or compliance issues",
          "Compare multiple years rather than relying on one strong period",
          "Record the assumptions and valuation date",
        ],
      },
      {
        title: "11. Know when professional help may be necessary",
        paragraphs: [
          "A self-calculated preliminary estimate can be useful for internal planning and early conversations, but professional assistance may be appropriate or required in certain situations.",
          "Consider engaging qualified professionals for SBA-financed acquisitions, tax reporting purposes, estate or gift planning, divorce or litigation proceedings, partner disputes, employee ownership transactions, complex intellectual property valuation, real estate-heavy transactions, businesses with unreliable financial records, transactions involving related parties, and large or unusually complex acquisitions.",
          "Qualified professionals who may be involved in business valuation include credentialed business appraisers, certified public accountants, transaction attorneys, tax professionals, business brokers, M&A advisors, and lenders. The right combination depends on the complexity of the situation and the required standard of value. This article does not endorse any specific credential or provider.",
        ],
      },
      {
        title: "12. Treat valuation as a range, not a promise",
        paragraphs: [
          "A preliminary valuation is normally more useful as a range than as a single exact number. The range should come with clearly documented assumptions and a specific valuation date, because conditions that change after that date may change the conclusion.",
          "Buyer demand, financing availability, due diligence findings, market conditions, and transaction terms can all affect what a business ultimately sells for — and none of those factors are fully predictable at the time of the preliminary estimate.",
          "Ownward's valuation tools are organizational and educational tools designed to help owners think through their numbers, document their adjustments, and understand the concepts involved. They are not certified appraisal services and should not be relied on as such when a formal appraisal is legally or professionally required.",
        ],
      },
    ],
    actionPlan: [
      {
        week: "Week 1",
        focus:
          "Gather three years of financial statements, tax returns, current financial information, debt records, and an asset list.",
      },
      {
        week: "Week 2",
        focus:
          "Reconcile the records and identify proposed normalization adjustments, including both legitimate add-backs and missing necessary expenses.",
      },
      {
        week: "Week 3",
        focus:
          "Calculate preliminary normalized SDE or EBITDA and document the assumptions behind each calculation.",
      },
      {
        week: "Week 4",
        focus:
          "Review value drivers, risks, customer concentration, owner dependence, and whether a qualified valuation professional should be consulted.",
      },
    ],
    checklist: [
      "Valuation purpose identified",
      "Valuation date selected",
      "Financial statements gathered",
      "Tax returns gathered",
      "Balance sheet reviewed",
      "Debt schedule prepared",
      "Asset list prepared",
      "Owner compensation documented",
      "Proposed add-backs documented",
      "Missing operating expenses considered",
      "Normalized earnings calculated",
      "SDE and EBITDA differences understood",
      "Customer concentration reviewed",
      "Recurring revenue reviewed",
      "Owner dependence assessed",
      "Multiple assumptions documented",
      "Enterprise value and seller proceeds separated",
      "Professional valuation needs considered",
      "Preliminary estimate labeled as non-certified",
      "Review date scheduled",
    ],
    categoryCtaHref: "/guide/value",
    categoryCtaLabel: "Back to Business Valuation",
    ownwardCtaHref: "/valuation",
    ownwardCtaLabel: "Estimate your business value with Ownward",
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
