import type {
  GuideActionPlanWeek,
  GuideArticle,
  GuideArticleSection,
  GuideArticleSource,
  GuideImportantNotice,
  GuideNextAction,
  GuidePlainTerm,
  GuideRelatedArticleRef,
  GuideWorkedExample,
} from './guide-content';

export interface GuideArticleEnhancement
  extends Omit<
    Partial<GuideArticle>,
    'sections' | 'sources' | 'actionPlan' | 'importantNotices' | 'relatedArticles' | 'terms' | 'workedExample' | 'nextAction'
  > {
  supplementalSections?: GuideArticleSection[];
  sources?: GuideArticleSource[];
  actionPlan?: GuideActionPlanWeek[];
  importantNotices?: GuideImportantNotice[];
  relatedArticles?: GuideRelatedArticleRef[];
  terms?: GuidePlainTerm[];
  workedExample?: GuideWorkedExample;
  nextAction?: GuideNextAction;
}

const reviewed = 'August 2, 2026';

const generalEducationNotice: GuideImportantNotice = {
  title: 'General education, not a one-size-fits-all answer',
  body: 'Use this article to improve your judgment and preparation. The right decision can change by industry, contract terms, evidence quality, cash position, and jurisdiction.',
  tone: 'info',
};

const highStakesNotice: GuideImportantNotice = {
  title: 'Professional review may still be necessary',
  body: 'When money, legal rights, financing, tax treatment, employment obligations, privacy, or health risks are material, confirm the decision with the appropriate qualified professional or official authority.',
  tone: 'warning',
};

export const guideArticleEnhancements: Record<string, GuideArticleEnhancement> = {
  'business-operations-basics': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Owners who need a calmer operating system for a small business that still depends too heavily on them.',
    learningOutcome: 'Map one operating loop, assign ownership, and decide which signals show the work is actually improving.',
    keyTakeaways: [
      'Operations work best when you define the loop: inputs, work, quality checks, customer outcome, and feedback.',
      'Owner oversight is still useful, but it should happen through decision rights and review rhythms rather than constant interruption.',
      'Leading indicators tell you whether a process is drifting before lagging results show the damage.',
      'Exception handling matters as much as the happy path because real businesses rarely operate in perfect conditions.',
    ],
    learningObjectives: [
      'Define the parts of a basic operating system in plain language',
      'Assign responsibility, approval authority, and exception ownership',
      'Choose a few useful leading and lagging indicators without building a dashboard zoo',
    ],
    terms: [
      { term: 'Input', definition: 'The information, materials, people, or requests that start the work.' },
      { term: 'Control', definition: 'A checkpoint that reduces error, fraud, waste, or rework.' },
      { term: 'Leading indicator', definition: 'A measure that changes before the final result changes.' },
    ],
    importantNotices: [generalEducationNotice],
    workedExample: {
      title: 'Worked example: a local catering company',
      summary: 'Hypothetical example only. A three-person catering business wants fewer last-minute errors without making the owner approve every detail.',
      assumptions: [
        'Orders arrive through email and phone, then are copied into a spreadsheet.',
        'The owner currently checks every quote, every schedule change, and every payment exception.',
        'Customer complaints usually come from missing dietary notes or pickup timing errors.',
      ],
      steps: [
        { label: 'Map the loop', detail: 'Order request → quote → deposit → production sheet → quality check → delivery/pickup → customer feedback.' },
        { label: 'Assign ownership', detail: 'The coordinator owns order intake, the kitchen lead owns production readiness, and the owner approves only custom quotes above a threshold.' },
        { label: 'Track signals', detail: 'Leading indicators: quote turnaround, missing-order-field rate, and production-sheet completion. Lagging indicators: complaints, refunds, and repeat bookings.' },
      ],
      takeaway: 'The owner still sees the business clearly, but no longer has to touch every routine decision to maintain quality.',
    },
    visuals: [
      {
        kind: 'process',
        title: 'Operating loop: from request to feedback',
        caption: 'A useful operating system closes the loop instead of stopping at task completion.',
        accessibleLabel: 'Operating loop diagram for a small business',
        accessibleDescription: 'A five-step loop with inputs, work, quality check, customer outcome, and feedback feeding the next round of work.',
        steps: [
          { label: 'Input', detail: 'Requests, materials, schedules, and information enter the system.' },
          { label: 'Work', detail: 'The team performs the service or produces the deliverable.' },
          { label: 'Quality check', detail: 'A control confirms accuracy, completeness, and timing.' },
          { label: 'Customer outcome', detail: 'The customer receives the product, service, or answer.' },
          { label: 'Feedback', detail: 'Results, complaints, delays, and repeat behavior shape the next cycle.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Responsibility, approvals, and exceptions',
        paragraphs: [
          'A process does not become stronger simply because you documented it. It becomes stronger when people know who owns the result, what needs approval, and what should happen when the normal process no longer fits the facts.',
          'One practical rule is to separate ownership from escalation. The person doing the work should usually own routine execution. Approval should sit only where cost, risk, or customer impact genuinely require it. Exceptions should have a defined path so the team does not improvise in panic.',
        ],
        bullets: [
          'Owner: who is accountable for the result',
          'Approver: who must sign off when cost, legal exposure, or customer impact crosses a threshold',
          'Evidence: what record proves the step was completed',
          'Exception path: where unusual or high-risk cases go next',
        ],
      },
      {
        title: '7. Common mistakes and real limits',
        paragraphs: [
          'Many small businesses swing between two extremes: the owner controls everything, or the team is told to "just handle it" without enough structure. Both create instability. A better system gives the team enough clarity to act and enough escalation paths to avoid preventable damage.',
          'Operations design also has limits. If pricing is wrong, staffing is too thin, or the business is selling to the wrong customers, a cleaner process will not solve the underlying strategy problem. Operations should reduce avoidable friction, not disguise weak economics.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'run', slug: 'how-to-create-standard-operating-procedures', reason: 'Turn recurring work into instructions that someone else can follow.' },
      { category: 'grow', slug: 'identify-most-profitable-customers', reason: 'Use operating data to decide which customers are worth serving more deeply.' },
    ],
    academyCourseSlugs: ['business-foundations'],
    nextAction: {
      title: 'Capture one real operating loop',
      description: 'Document one recurring workflow in your business and decide where ownership, approval, and exception handling should live.',
      href: '/dashboard',
      label: 'Open your dashboard',
    },
  },
  'how-to-create-standard-operating-procedures': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Owners who want repeatable execution without flattening every task into a script.',
    learningOutcome: 'Draft one SOP that includes trigger, owner, evidence, and exception handling, then decide where judgment still belongs.',
    keyTakeaways: [
      'An SOP is useful when the work recurs, quality matters, and preventable variation is expensive.',
      'A good SOP explains purpose, trigger, inputs, expected output, owner, approver, exceptions, and review date.',
      'The best test is whether someone other than the author can follow the SOP successfully.',
      'Sensitive procedures may need access control, not just better wording.',
    ],
    learningObjectives: [
      'Recognize when an SOP helps and when judgment should stay flexible',
      'Build a concise SOP structure with clear evidence and ownership',
      'Review an SOP for usability, access control, and version discipline',
    ],
    terms: [
      { term: 'Trigger', definition: 'The event that tells someone the SOP should begin.' },
      { term: 'Evidence', definition: 'The record, screenshot, signature, or file that proves the step happened.' },
      { term: 'Version history', definition: 'A simple record of what changed, when, and who approved it.' },
    ],
    importantNotices: [generalEducationNotice],
    workedExample: {
      title: 'Worked example: customer refund SOP',
      summary: 'Hypothetical example only. A retail business wants fewer inconsistent refund decisions and better records.',
      assumptions: [
        'Refund requests currently arrive by phone, email, and in person.',
        'Managers handle exceptions, but staff do not know when to escalate.',
        'Chargebacks increased after missing documentation and unclear approval boundaries.',
      ],
      steps: [
        { label: 'Purpose and trigger', detail: 'When any refund request is received, staff check purchase date, payment method, and policy eligibility.' },
        { label: 'Decision rules', detail: 'Routine refunds under a threshold are handled by staff; damaged goods, high-dollar orders, or fraud concerns escalate to a manager.' },
        { label: 'Evidence and review', detail: 'The request, receipt, reason code, and approval record are stored in the order folder and reviewed monthly.' },
      ],
      takeaway: 'The SOP reduces inconsistency, but it still leaves room for judgment when facts do not fit the normal pattern.',
    },
    visuals: [
      {
        kind: 'process',
        title: 'Anatomy of a useful SOP',
        caption: 'A short SOP should answer the practical questions someone has while doing the work.',
        accessibleLabel: 'Annotated SOP structure',
        accessibleDescription: 'A sequence listing purpose, owner, trigger, inputs, steps, exceptions, evidence, and review date.',
        steps: [
          { label: 'Purpose', detail: 'Why the SOP exists and what outcome it protects.' },
          { label: 'Owner and approver', detail: 'Who maintains it and who signs off on material changes.' },
          { label: 'Trigger and inputs', detail: 'What starts the process and what information or materials are required.' },
          { label: 'Steps and exceptions', detail: 'What normally happens and where unusual cases go.' },
          { label: 'Evidence and review date', detail: 'What proves completion and when the SOP should be checked again.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. When judgment should not be replaced by a script',
        paragraphs: [
          'Not all work should be forced into a rigid procedure. Negotiation, hiring, conflict conversations, design choices, and complex troubleshooting usually need principles, examples, and escalation rules more than a step-by-step script.',
          'If the work changes materially each time, an SOP may still define preparation, approvals, records, and safety boundaries — but the core decision may still depend on judgment.',
        ],
      },
      {
        title: '7. Testing, access, and version control',
        paragraphs: [
          'An SOP is not finished when the author thinks it is clear. It is finished when another person can use it correctly. That test reveals missing assumptions, overloaded steps, and instructions that only made sense to the person who wrote them.',
          'If the SOP contains passwords, payroll procedures, pricing authority, or sensitive customer information, keep the document secure and give access only to the people who need it. Security is part of maintainability.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'run', slug: 'business-operations-basics', reason: 'Map the system before documenting the procedure.' },
      { category: 'start', slug: 'business-launch-checklist', reason: 'Use SOPs to support launch tasks that need repeatability.' },
    ],
    academyCourseSlugs: ['business-foundations'],
    nextAction: {
      title: 'Write one SOP someone else can test',
      description: 'Choose one recurring task, document the trigger, decision boundaries, and evidence, then ask another person to follow it.',
      href: '/dashboard',
      label: 'Organize a workflow',
    },
  },
  'identify-most-profitable-customers': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Owners who know top-line revenue but want a cleaner view of gross profit, cost to serve, and repeat value.',
    learningOutcome: 'Compare customer segments on economic value and service burden instead of assuming the biggest buyer is the best buyer.',
    keyTakeaways: [
      'Revenue alone can hide low-margin or high-friction customer relationships.',
      'Contribution margin improves when you include payment fees, support time, returns, and fulfillment complexity.',
      'Retention and repeat purchasing matter, but simplistic lifetime-value math can overstate certainty.',
      'Segment customers by business fit and economics, not by personal or discriminatory judgments.',
    ],
    learningObjectives: [
      'Separate revenue, gross profit, and contribution margin in plain language',
      'Estimate cost-to-serve factors without pretending to have laboratory precision',
      'Identify segments worth protecting, improving, or serving differently',
    ],
    terms: [
      { term: 'Gross profit', definition: 'Revenue minus the direct cost of producing or delivering the order.' },
      { term: 'Contribution margin', definition: 'What remains after direct costs and the variable cost of serving the customer.' },
      { term: 'Cost to serve', definition: 'The extra time, service, refunds, and processing burden created by a customer or segment.' },
    ],
    importantNotices: [generalEducationNotice],
    workedExample: {
      title: 'Worked example: three customer segments for a niche wholesaler',
      summary: 'Hypothetical example only. The company sells to small boutiques, regional chains, and custom event buyers.',
      assumptions: [
        'Regional chains buy the most volume but negotiate the hardest on price.',
        'Event buyers pay faster but generate more last-minute changes and support time.',
        'Boutiques place smaller orders with steadier margins and lower return rates.',
      ],
      steps: [
        { label: 'Start with gross profit', detail: 'Chains lead in revenue, but boutiques and event buyers produce similar or better gross profit percentages.' },
        { label: 'Add cost to serve', detail: 'Event buyers lose points for rush work and support burden; chains lose points for payment delays and compliance overhead.' },
        { label: 'Decide the response', detail: 'Keep chains, but tighten terms; protect boutiques; redesign the event offer so rush requests pay for rush service.' },
      ],
      takeaway: 'The answer is not always to fire the hardest customers. Often it is to reprice, redesign, or limit the offer more intelligently.',
    },
    visuals: [
      {
        kind: 'matrix',
        title: 'Customer matrix: economic value vs. cost to serve',
        caption: 'Segments are easier to judge when you compare their economics to the burden they create.',
        accessibleLabel: 'Matrix comparing customer value and service burden',
        accessibleDescription: 'A four-quadrant matrix with high and low economic value on one axis and high and low cost to serve on the other.',
        columns: ['Low cost to serve', 'High cost to serve'],
        rows: [
          { label: 'High economic value', values: ['Protect and deepen', 'Reprice or redesign'] },
          { label: 'Low economic value', values: ['Automate or simplify', 'Question whether to keep'] },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. What a customer-segment comparison should include',
        paragraphs: [
          'A useful segment review does not need perfect data, but it should include more than sales totals. Compare at least margin, returns, support time, payment behavior, and whether the segment tends to repeat or refer.',
          'If your business cannot yet measure acquisition cost or retention reliably, say so plainly. An honest rough model beats a confident fiction.',
        ],
      },
      {
        title: '7. Common mistakes and ethical guardrails',
        paragraphs: [
          'Do not confuse "least profitable" with "least deserving." Segmenting customers is about the economics of the offer, not about making personal, sensitive, or discriminatory judgments about people. The goal is to design better terms, better service levels, or a better offer mix.',
          'Another common mistake is overreacting to one loud account. A high-maintenance customer can feel enormous in the moment while contributing very little to the annual picture. Look at patterns, not only memory.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'run', slug: 'business-operations-basics', reason: 'Operations often explain why some customers are more expensive to serve.' },
      { category: 'value', slug: 'how-much-is-my-business-worth', reason: 'Customer quality and concentration shape business value.' },
    ],
    academyCourseSlugs: ['business-foundations'],
    nextAction: {
      title: 'Compare three customer groups',
      description: 'List three customer segments and score each one on margin, service burden, payment behavior, and repeat potential.',
      href: '/grow',
      label: 'Open growth planning',
    },
  },
  'how-to-evaluate-a-business-before-you-buy': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Buyers who need a disciplined way to separate seller claims from verified evidence before committing to a transaction.',
    learningOutcome: 'Build a diligence view that distinguishes facts, assumptions, and unresolved risk before you decide what the business is worth to you.',
    keyTakeaways: [
      'Evidence quality matters: independently verified records should carry more weight than seller summaries or memory.',
      'A business can look attractive on revenue while hiding weak normalized earnings, deferred maintenance, or customer concentration risk.',
      'Working capital, debt, technology, privacy, and transition risk are part of the purchase, even when they are not obvious in the listing.',
      'A deal structure can create or remove risk even when the headline price is unchanged.',
    ],
    learningObjectives: [
      'Rank diligence evidence by confidence and independence',
      'Review earnings, working capital, debt, and owner dependence without skipping operational reality',
      'Separate open questions from proven findings before negotiating',
    ],
    importantNotices: [generalEducationNotice, highStakesNotice],
    workedExample: {
      title: 'Worked example: evaluating a service business listing',
      summary: 'Hypothetical example only. A buyer reviews a local commercial cleaning company represented as highly recurring and easy to scale.',
      assumptions: [
        'Seller provides internally prepared statements first, then tax returns and bank statements later.',
        'Two customers account for nearly half of revenue.',
        'Several vehicles and equipment items are nearing replacement even though current profits look healthy.',
      ],
      steps: [
        { label: 'Facts', detail: 'Tax returns, bank deposits, lease documents, payroll records, and signed customer contracts support the revenue story unevenly.' },
        { label: 'Assumptions', detail: 'Normalization assumes the owner salary can be replaced at a lower market rate and that one expiring customer contract renews.' },
        { label: 'Unresolved questions', detail: 'Vehicle replacement cost, transition support, and a large customer concentration issue still need pricing or structure adjustments.' },
      ],
      takeaway: 'Good diligence does not remove uncertainty. It turns uncertainty into named items that can be priced, structured, or declined.',
    },
    visuals: [
      {
        kind: 'evidence-ladder',
        title: 'Evidence-confidence ladder for buyer diligence',
        caption: 'The higher the independence and documentation quality, the more confidence a buyer should place in the claim.',
        accessibleLabel: 'Evidence ladder for acquisition diligence',
        accessibleDescription: 'A ladder moving from seller statements to internal reports to third-party records and independently verified evidence.',
        steps: [
          { label: 'Seller statement', detail: 'Useful for context, weak for proof.' },
          { label: 'Internal report', detail: 'Helpful if it ties cleanly to source records.' },
          { label: 'Filed or contractual record', detail: 'Tax returns, payroll filings, leases, and signed agreements carry more weight.' },
          { label: 'Independent verification', detail: 'Bank statements, third-party confirmations, and direct testing produce the strongest confidence.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Revenue verification is not the same as revenue explanation',
        paragraphs: [
          'A seller may be able to explain why revenue is strong, but the explanation is not the proof. Reconcile revenue to tax returns, bank statements, customer contracts, and the underlying operating reality. If the business says a customer is recurring, verify what recurring actually means in signed terms and payment history.',
          'The same discipline applies to add-backs and normalized earnings. Some adjustments may be reasonable; others are optimism wearing accounting vocabulary.',
        ],
      },
      {
        title: '7. Risk does not end with the financial statements',
        paragraphs: [
          'Legal, technology, privacy, cybersecurity, licensing, supplier concentration, and transition risk can easily outrun what the income statement suggests. A stable-looking business can still have fragile systems, poor data practices, or one irreplaceable owner relationship.',
          'Deal terms matter for the same reason. Seller notes, holdbacks, earnouts, working-capital targets, transition support, and noncompete structure can shift risk dramatically without changing the listed price.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'buy', slug: 'sba-loan-qualification', reason: 'Understand how a lender may view your transaction and documentation.' },
      { category: 'sell', slug: 'how-to-prepare-your-business-for-sale', reason: 'See the same process from the seller side to understand what well-prepared diligence looks like.' },
    ],
    academyCourseSlugs: ['buying-and-selling-a-business'],
    nextAction: {
      title: 'Open a diligence checklist before you negotiate further',
      description: 'List the claims you need to verify, the records that would prove them, and the unresolved questions that still affect price or structure.',
      href: '/buy',
      label: 'Review acquisition planning',
    },
  },
  'how-much-is-my-business-worth': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Owners and buyers who want a more realistic view of valuation before they confuse an estimate with a final deal outcome.',
    learningOutcome: 'Bridge reported earnings to normalized earnings, choose an approach that fits the business, and describe value as a range instead of a promise.',
    keyTakeaways: [
      'SDE, EBITDA, asset, revenue, and market approaches answer different questions and fit different business types.',
      'Normalization adjustments matter because reported earnings often reflect owner-specific decisions rather than transferable economics.',
      'Multiples are not magic numbers; they reflect risk, transferability, concentration, and deal quality.',
      'The transaction outcome can move above or below an estimate once debt, cash, working capital, and structure are negotiated.',
    ],
    learningObjectives: [
      'Recognize when common valuation approaches may or may not fit a business',
      'Apply normalization thinking without overstating certainty',
      'Explain why deal terms and transferability affect what a buyer may actually pay',
    ],
    importantNotices: [generalEducationNotice, highStakesNotice],
    workedExample: {
      title: 'Worked example: a valuation bridge for a small agency',
      summary: 'Hypothetical example only. The owner wants to understand a possible value range before talking with a broker or buyer.',
      assumptions: [
        'Reported profit includes the owner’s above-market salary, a family vehicle, and one-time legal expenses.',
        'Two customers make up 38 percent of revenue.',
        'The owner still handles most sales and final client approval.',
      ],
      steps: [
        { label: 'Normalize earnings', detail: 'Adjust for owner-specific compensation, nonrecurring expenses, and personal items, but document each assumption plainly.' },
        { label: 'Choose a range, not a point', detail: 'A lower multiple reflects concentration and owner dependence; a higher multiple assumes those risks are reduced.' },
        { label: 'Account for deal specifics', detail: 'Debt, excess cash, working-capital expectations, and transition support affect what the seller actually receives.' },
      ],
      takeaway: 'An estimate becomes more useful when it explains the drivers of range rather than pretending the middle number is destiny.',
    },
    visuals: [
      {
        kind: 'process',
        title: 'Valuation bridge: reported earnings to deal reality',
        caption: 'Value moves through several layers before it becomes a transaction outcome.',
        accessibleLabel: 'Valuation bridge from reported earnings to deal-specific value',
        accessibleDescription: 'A step sequence moving from reported earnings to normalization, valuation range, and deal adjustments.',
        steps: [
          { label: 'Reported earnings', detail: 'Start with the financial picture as recorded.' },
          { label: 'Normalization', detail: 'Adjust for owner-specific, nonrecurring, or nonoperating items.' },
          { label: 'Value range', detail: 'Apply an approach and a range of multiples or methods suited to the business.' },
          { label: 'Deal adjustments', detail: 'Working capital, debt, cash, and structure move the final result.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Matching the method to the business',
        paragraphs: [
          'SDE is often used for owner-operated small businesses because the buyer is effectively purchasing a job-plus-investment. EBITDA is more common when management can be separated from ownership. Asset approaches matter more when earnings are weak but assets are meaningful. Revenue multiples can be shorthand in some sectors, but they are dangerous when margins vary widely.',
          'Market evidence helps, but market evidence is never a substitute for understanding this specific business and its transfer risk.',
        ],
      },
      {
        title: '7. Why article estimates stop short of a valuation engagement',
        paragraphs: [
          'An educational estimate can help you frame questions, identify value drivers, and prepare for a conversation. It does not replace a qualified valuation, broker opinion, lender analysis, legal review, or tax planning.',
          'That distinction matters most when succession, litigation, financing, tax elections, divorce, estate planning, or shareholder disputes are involved. Those situations require a more formal process and defensible documentation.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'sell', slug: 'how-to-prepare-your-business-for-sale', reason: 'Improve the records and transferability that influence value.' },
      { category: 'grow', slug: 'identify-most-profitable-customers', reason: 'Customer quality and concentration often influence the multiple.' },
    ],
    academyCourseSlugs: ['business-foundations'],
    nextAction: {
      title: 'Run an estimate, then document the assumptions behind it',
      description: 'Use Ownward’s valuation tools as a starting point and keep a written list of every adjustment and risk factor you used.',
      href: '/valuation',
      label: 'Estimate business value',
    },
  },
  'the-day-my-side-project-asked-for-paperwork': {
    articleKind: 'story',
    lastReviewed: reviewed,
    targetAudience: 'Founders deciding whether an experiment has started carrying real obligations.',
    learningOutcome: 'Use the story to recognize when a project begins asking for structure, accountability, and a legal home.',
    keyTakeaways: [
      'A side project becomes harder to treat casually once it starts carrying real responsibilities.',
      'Legal formation does not create the business, but it can mark a useful shift from possibility to deliberate stewardship.',
      'The emotional resistance to structure is often different from the practical argument against it.',
    ],
    reflectionPrompts: [
      'What has changed in your project that now creates obligations to customers, collaborators, or future you?',
      'Are you delaying structure because it is unnecessary, or because it makes the commitment feel more real?',
      'What would responsible next-step structure look like without overbuilding too early?',
    ],
    visuals: [
      {
        kind: 'timeline',
        title: 'Decision timeline: when the project stopped feeling hypothetical',
        caption: 'This timeline uses only events and realizations stated in the narrative.',
        accessibleLabel: 'Timeline of the founder narrative',
        accessibleDescription: 'A short timeline moving from idea stage to growing responsibility to the LLC decision.',
        steps: [
          { label: 'Idea stage', detail: 'Ownward existed as a named project with a site, features, plans, and ongoing experiments.' },
          { label: 'Responsibility stage', detail: 'Payments, documents, private communication, and trust implications made the platform feel less casual.' },
          { label: 'Decision stage', detail: 'The LLC became part of treating the business seriously rather than waiting for certainty first.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: 'What another founder can reasonably learn from this story',
        paragraphs: [
          'The lesson is not that every project should immediately form an entity. The lesson is that a founder should notice when the business has moved beyond exploration into obligations that benefit from clearer structure.',
          'That threshold often appears when money, contracts, customer data, collaborators, or continuing commitments become real rather than hypothetical.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'start', slug: 'how-to-start-an-llc', reason: 'Continue with the practical formation article if your project now needs a legal structure.' },
      { category: 'start', slug: 'business-launch-checklist', reason: 'See the wider set of launch responsibilities that often arrive once a business gets serious.' },
    ],
    nextAction: {
      title: 'Decide whether your experiment now carries business obligations',
      description: 'If customers, payments, contracts, or sensitive data are now involved, use the formation and launch guides to decide what structure belongs next.',
      href: '/guide/start',
      label: 'Browse startup guides',
    },
  },
  'sba-loan-qualification': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Buyers and existing owners preparing for an SBA-backed acquisition or another lender conversation where readiness matters.',
    learningOutcome: 'Separate eligibility from lender underwriting, identify missing documentation, and decide what would make your file stronger before you commit further.',
    keyTakeaways: [
      'Basic SBA eligibility is only the first filter; lender underwriting may still pause the deal for cash flow, experience, liquidity, or documentation reasons.',
      'Borrower readiness, business readiness, and transaction readiness are different layers of the same file.',
      'Equity injection, seller financing, and working capital should be discussed as structure questions, not universal formulas.',
      'A lender pause is often a signal to strengthen the file rather than a verdict on the opportunity itself.',
    ],
    learningObjectives: [
      'Explain the difference between SBA program eligibility and lender underwriting',
      'Review buyer, business, and transaction factors that shape readiness',
      'Use the interactive tool without treating it as approval advice',
    ],
    importantNotices: [
      {
        title: 'Current SBA rules still need verification at application time',
        body: 'Program rules, SOP details, lender overlays, and transaction structures can change. Confirm the current requirements with an SBA-participating lender before making a deposit, relocation decision, or binding commitment.',
        tone: 'warning',
      },
      highStakesNotice,
    ],
    workedExample: {
      title: 'Worked example: a hypothetical acquisition file',
      summary: 'Hypothetical example only. A buyer is evaluating a service business and wants to know whether the file is ready for lender conversations.',
      assumptions: [
        'The buyer has industry-adjacent management experience but has never owned this specific type of company.',
        'The seller is willing to carry a note, but only some of it may qualify for standby treatment.',
        'The business appears cash-flow positive, but customer concentration and lease renewal terms still need review.',
      ],
      steps: [
        { label: 'Eligibility', detail: 'The transaction appears to fit SBA size and business-type requirements, but that alone does not solve repayment risk.' },
        { label: 'Borrower and business readiness', detail: 'The lender still wants liquidity evidence, a credible management story, and clean tax returns and interim financials.' },
        { label: 'Transaction readiness', detail: 'The purchase price, project cost, working capital, and seller note structure all affect whether the lender sees the file as prudent.' },
      ],
      takeaway: 'The strongest files answer not only "am I eligible?" but also "why should a lender be comfortable with this exact borrower, business, and deal?"',
    },
    visuals: [
      {
        kind: 'process',
        title: 'SBA readiness funnel',
        caption: 'Each stage narrows the file from basic program fit to a lender’s final comfort with the deal.',
        accessibleLabel: 'SBA loan readiness funnel',
        accessibleDescription: 'A five-stage funnel covering eligibility, borrower readiness, business readiness, transaction structure, and lender review.',
        steps: [
          { label: 'Eligibility', detail: 'Basic SBA size, location, ownership, and business-type fit.' },
          { label: 'Borrower readiness', detail: 'Credit, liquidity, experience, guarantees, and documentation.' },
          { label: 'Business readiness', detail: 'Cash flow, records, customer risk, and transfer realities.' },
          { label: 'Transaction structure', detail: 'Project cost, equity injection, seller note, working capital, and terms.' },
          { label: 'Lender review', detail: 'The lender decides whether the whole file is prudent under current policy and its own standards.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. What lenders may pause on even when eligibility is clear',
        paragraphs: [
          'A buyer can appear eligible and still have a weak file. Common lender concerns include thin post-closing liquidity, unclear source of funds, strained personal debt service, overoptimistic projections, unresolved lease or licensing issues, and incomplete tax or financial records.',
          'The lender may also pause because the transition plan depends too heavily on the seller staying involved longer than the documents support.',
        ],
      },
      {
        title: '7. Project cost means more than purchase price',
        paragraphs: [
          'When owners talk about the deal, they often focus only on the purchase price. Lenders usually think in terms of the whole project: purchase price, fees, required working capital, equipment needs, and whether the deal structure leaves enough room for the business to keep operating after closing.',
          'That is why seller financing, working capital, and reserve planning matter. A "funded" deal can still be a weak deal if the business is cash-starved on day one.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'buy', slug: 'how-to-evaluate-a-business-before-you-buy', reason: 'Strengthen the diligence behind the lender file.' },
      { category: 'sell', slug: 'how-to-prepare-your-business-for-sale', reason: 'Understand what a lender and buyer hope the seller has already prepared.' },
    ],
    academyCourseSlugs: ['buying-and-selling-a-business'],
    nextAction: {
      title: 'Strengthen the lender file before the high-pressure stage',
      description: 'Use the readiness tool, then collect the documents and explanations a lender is likely to ask for next.',
      href: '/buy',
      label: 'Prepare your acquisition plan',
    },
    sources: [
      { label: 'SBA 7(a) loans', href: 'https://www.sba.gov/funding-programs/loans/7a-loans' },
      { label: 'SBA 7(a) terms, conditions, and eligibility', href: 'https://www.sba.gov/partners/lenders/7a-loan-program/terms-conditions-eligibility' },
      { label: 'SBA SOP 50 10 lender and development company loan programs', href: 'https://www.sba.gov/document/sop-50-10-lender-development-company-loan-programs' },
    ],
  },
  'how-to-prepare-your-business-for-sale': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Owners who want to improve sale readiness before buyers and lenders force the issues under time pressure.',
    learningOutcome: 'Organize financial clarity, transferability, controlled disclosure, and transition planning before the market asks for them all at once.',
    keyTakeaways: [
      'Sale preparation is not just polishing numbers; it is reducing uncertainty for the next owner.',
      'Clear records, normalized earnings, and documented operations often matter more than a dramatic cosmetic makeover.',
      'Confidentiality should become tighter as buyer access increases, not looser because interest appears promising.',
      'Headline price is only one part of the outcome; working capital, terms, and transition obligations matter too.',
    ],
    learningObjectives: [
      'Identify the records and operating issues buyers will pressure-test first',
      'Prepare controlled diligence materials without oversharing too early',
      'Plan for buyer qualification and transition risk before accepting interest as quality',
    ],
    importantNotices: [generalEducationNotice, highStakesNotice],
    workedExample: {
      title: 'Worked example: sale readiness for a specialty distributor',
      summary: 'Hypothetical example only. The owner wants to sell within a year, but the company still relies on them for key supplier relationships and ad hoc reporting.',
      assumptions: [
        'Financial statements exist, but normalization notes are not yet organized.',
        'One customer accounts for 29 percent of revenue.',
        'Vendor relationships and renewal terms live mostly in the owner’s inbox.',
      ],
      steps: [
        { label: 'Internal cleanup', detail: 'Reconcile records, document add-backs, and list contracts, licenses, and security responsibilities.' },
        { label: 'Controlled diligence setup', detail: 'Build a data-room structure and stage confidential access by buyer quality and deal stage.' },
        { label: 'Transition planning', detail: 'Define what knowledge transfer, customer introduction, and seller support the business can realistically offer.' },
      ],
      takeaway: 'The goal is not to look perfect. It is to make the business easier to understand, trust, and transfer.',
    },
    visuals: [
      {
        kind: 'timeline',
        title: 'Sale-readiness timeline',
        caption: 'Preparation usually moves from internal cleanup to controlled diligence and then to transition planning.',
        accessibleLabel: 'Timeline for preparing a business for sale',
        accessibleDescription: 'A four-step timeline covering cleanup, normalization, controlled buyer diligence, and transition.',
        steps: [
          { label: 'Internal cleanup', detail: 'Financial clarity, contract review, licenses, records, and owner-dependence mapping.' },
          { label: 'Readiness packaging', detail: 'Normalized earnings notes, buyer materials, and data-room structure.' },
          { label: 'Controlled diligence', detail: 'Qualified buyers receive staged access under confidentiality boundaries.' },
          { label: 'Transition planning', detail: 'Knowledge transfer, continuity, and post-close expectations are defined.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Confidentiality and disclosure should be staged',
        paragraphs: [
          'Not every interested person should receive the same information at the same time. Early conversations may justify broad facts. Serious buyers with signed confidentiality protections and stronger qualifications may justify deeper financial and operational detail.',
          'This protects customer relationships, staff confidence, and sensitive data while still moving the deal forward.',
        ],
      },
      {
        title: '7. Deal terms beyond price',
        paragraphs: [
          'Owners often focus on the headline number because it is easy to compare. Buyers and lenders pay just as much attention to working-capital expectations, seller support, holdbacks, earnouts, debt treatment, and representations that survive closing.',
          'Preparing for sale means understanding those terms early enough to negotiate intentionally rather than react defensively.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'value', slug: 'how-much-is-my-business-worth', reason: 'Understand how readiness and transferability affect value ranges.' },
      { category: 'buy', slug: 'how-to-evaluate-a-business-before-you-buy', reason: 'See the diligence questions buyers are likely to bring to your file.' },
    ],
    academyCourseSlugs: ['buying-and-selling-a-business'],
    nextAction: {
      title: 'Start a controlled sale-readiness review',
      description: 'List the financial, contractual, operational, and transition items a qualified buyer would ask for and identify what is still messy.',
      href: '/sell',
      label: 'Prepare your business for sale',
    },
  },
  'when-everything-feels-urgent': {
    articleKind: 'owner-life',
    lastReviewed: reviewed,
    learningOutcome: 'Use the four-door urgency framework to create decision space when pressure is real but not truly immediate.',
    keyTakeaways: [
      'Real urgency is narrower than the feeling of urgency.',
      'The four-door framework helps separate danger, deadlines, difficult decisions, and preservable options.',
      'A short reset can improve judgment without ignoring real risks.',
      'The interactive triage is educational only and keeps answers in session memory, not storage.',
    ],
    importantNotices: [
      {
        title: 'Safety boundary',
        body: 'If there is immediate danger, severe physical symptoms, or concern about a mental-health crisis, use urgent professional or emergency support instead of this framework.',
        tone: 'critical',
      },
    ],
    visuals: [
      {
        kind: 'comparison',
        title: 'Three clocks and four decision doors',
        caption: 'The point is not to diagnose a situation. It is to decide what kind of response the situation deserves.',
        accessibleLabel: 'Comparison between urgency clocks and decision doors',
        accessibleDescription: 'A comparison showing bodily stress clock, calendar clock, consequence clock, and four decision doors: safety, deadline, hard-to-reverse decision, and option-preserving move.',
        columns: ['What to check', 'What it means'],
        rows: [
          { label: 'Body clock', values: ['Your nervous system may be activated even when the facts are not an emergency.'] },
          { label: 'Calendar clock', values: ['A real external deadline may require faster action.'] },
          { label: 'Consequence clock', values: ['Some delays create harm; others only create discomfort.'] },
          { label: 'Four doors', values: ['Safety first, then hard deadline, then hard-to-reverse decision, then option-preserving next step.'] },
        ],
      },
    ],
    relatedArticles: [
      { category: 'owner-life', slug: 'love-is-not-governance', reason: 'Use a calmer framework when family, role tension, and pressure mix together.' },
      { category: 'stories', slug: 'the-day-my-side-project-asked-for-paperwork', reason: 'See how quieter decisions can still feel emotionally heavy without being emergencies.' },
    ],
    academyCourseSlugs: ['owner-life'],
    nextAction: {
      title: 'Use the fifteen-minute reset before the next non-emergency decision',
      description: 'Run the framework, then decide what can be delayed, delegated, or clarified before you answer under pressure.',
      href: '/academy/owner-life',
      label: 'Continue Owner Life',
    },
  },
  'love-is-not-governance': {
    articleKind: 'owner-life',
    lastReviewed: reviewed,
    learningOutcome: 'Separate family love, ownership, management, and employment roles so decisions stop leaning on personal loyalty alone.',
    keyTakeaways: [
      'Family loyalty and business governance solve different problems and should not be forced to do the same job.',
      'Written roles, compensation logic, and decision rights often protect relationships rather than harm them.',
      'Accountability is easier when disagreements can be tied to a role or policy instead of to identity or history.',
      'Some conflicts need professional legal, financial, mediation, or family support rather than another family meeting.',
    ],
    importantNotices: [
      {
        title: 'Boundary note',
        body: 'Family-business conflict can involve legal, tax, employment, ownership, and personal issues at the same time. Escalate to the appropriate professional when the disagreement affects rights, money, safety, or family stability.',
        tone: 'warning',
      },
    ],
    visuals: [
      {
        kind: 'comparison',
        title: 'Role map: family member is not a job description',
        caption: 'A person can hold several roles at once, but the rights and responsibilities attached to each role are different.',
        accessibleLabel: 'Comparison of family business roles',
        accessibleDescription: 'A role map comparing owner, governing participant, manager, worker, lender or investor, and family-member roles.',
        columns: ['Primary question', 'Typical responsibility'],
        rows: [
          { label: 'Owner', values: ['Who carries economic rights, major decisions, and capital risk?'] },
          { label: 'Governing participant', values: ['Who sets rules, approvals, and escalation paths?'] },
          { label: 'Manager or worker', values: ['Who is accountable for day-to-day execution and performance?'] },
          { label: 'Lender or investor', values: ['Who supplies capital under defined terms?'] },
          { label: 'Family member', values: ['Who holds the personal relationship that should not have to carry all governance decisions?'] },
        ],
      },
    ],
    relatedArticles: [
      { category: 'owner-life', slug: 'when-everything-feels-urgent', reason: 'Pressure often distorts family-business decisions that already need clearer roles.' },
      { category: 'run', slug: 'how-to-create-standard-operating-procedures', reason: 'Documented authority and process reduce role confusion in family firms.' },
    ],
    academyCourseSlugs: ['owner-life'],
    nextAction: {
      title: 'Write down the roles before debating the personalities',
      description: 'List who is acting as owner, manager, worker, lender, and family member in the current conflict so the decision can move onto clearer ground.',
      href: '/academy/owner-life',
      label: 'Continue Owner Life',
    },
  },
  'validate-a-business-idea': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Founders who need evidence that a problem matters before spending heavily on branding, software, or legal structure.',
    learningOutcome: 'Design a narrow validation experiment that produces stronger evidence than compliments or vague encouragement.',
    keyTakeaways: [
      'Problem evidence is stronger than praise for the founder or product concept.',
      'A narrow customer definition improves interview quality and experiment design.',
      'Observed behavior, commitment, payment, and retention carry more weight than opinions alone.',
      'Stop criteria matter because a failed experiment can still be a successful learning step.',
    ],
    learningObjectives: [
      'Distinguish problem evidence from polite encouragement',
      'Design interviews and prototypes that test the right thing',
      'Set ethical offer boundaries and measurable stop criteria',
    ],
    importantNotices: [generalEducationNotice],
    workedExample: {
      title: 'Worked example: testing a bookkeeping cleanup offer',
      summary: 'Hypothetical example only. A founder wants to help small service businesses clean up messy monthly books.',
      assumptions: [
        'The founder has heard general interest but little evidence of actual willingness to pay.',
        'The target segment is local businesses with fewer than ten employees and inconsistent books.',
        'The founder can build a manual prototype before investing in software.',
      ],
      steps: [
        { label: 'Interview narrowly', detail: 'Ask recent, specific questions about the last bookkeeping problem rather than asking whether the idea sounds useful.' },
        { label: 'Prototype ethically', detail: 'Offer a manual cleanup pilot with a clear scope, timing, and refund expectations instead of pretending a finished platform exists.' },
        { label: 'Set criteria', detail: 'Advance only if a minimum number of target customers complete the pilot or place a deposit under clear terms.' },
      ],
      takeaway: 'Validation improves when the founder is willing to learn from refusal, delay, and indifference rather than chasing compliments.',
    },
    visuals: [
      {
        kind: 'evidence-ladder',
        title: 'Validation evidence ladder',
        caption: 'Higher rungs rely less on opinion and more on costly or observable customer behavior.',
        accessibleLabel: 'Evidence ladder for validating a business idea',
        accessibleDescription: 'A ladder moving from opinion to observed behavior, commitment, payment, retention, and referral.',
        steps: [
          { label: 'Opinion', detail: 'Interesting, but weak evidence on its own.' },
          { label: 'Observed behavior', detail: 'Real examples of the problem happening now.' },
          { label: 'Commitment', detail: 'A booked meeting, completed pilot, or signed interest step.' },
          { label: 'Payment', detail: 'Money changing hands under clear terms.' },
          { label: 'Retention or referral', detail: 'The customer returns or tells someone else because the offer solved something real.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Ethical smoke tests and preorder boundaries',
        paragraphs: [
          'A smoke test should never imply certainty that you do not have. Be direct about whether the offer is a pilot, whether fulfillment is manual, what happens if you cannot deliver, and how refunds will work if you collect money before full launch.',
          'That honesty does more than protect trust. It gives you cleaner evidence, because the customer is responding to the real offer rather than a polished fiction.',
        ],
      },
      {
        title: '7. Stop criteria are part of validation discipline',
        paragraphs: [
          'A founder who never defines stop criteria can misread endless motion as progress. Decide in advance what evidence would justify continuing, pausing, changing the segment, or abandoning the idea.',
          'That keeps the experiment small enough to teach you something before it becomes an expensive identity project.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'start', slug: 'choose-a-business-model-and-first-offer', reason: 'Turn early evidence into a concrete offer and revenue model.' },
      { category: 'start', slug: 'write-a-one-page-business-plan', reason: 'Capture what is fact, what is assumed, and what still needs testing.' },
    ],
    academyCourseSlugs: ['start-a-business-foundations'],
    nextAction: {
      title: 'Run one narrow validation experiment',
      description: 'Choose a specific customer segment, define the evidence you need, and test the smallest honest version of the offer.',
      href: '/start',
      label: 'Build your startup plan',
    },
  },
  'choose-a-business-model-and-first-offer': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Founders moving from idea to offer and needing a model that fits delivery capacity, margins, and cash timing.',
    learningOutcome: 'Compare a few realistic business models, then choose the simplest first offer you can deliver well and price coherently.',
    keyTakeaways: [
      'Business models shape cash timing, delivery burden, and predictability — not just marketing language.',
      'A first offer should be small enough to deliver consistently and specific enough to price clearly.',
      'Recurring revenue can be attractive, but it also creates service promises that must be fulfilled repeatedly.',
      'Scope boundaries often protect margin more effectively than clever pricing formulas alone.',
    ],
    learningObjectives: [
      'Compare common business-model tradeoffs in plain language',
      'Define a first offer with explicit scope and delivery boundaries',
      'Choose a pricing logic that matches the value and the work involved',
    ],
    importantNotices: [generalEducationNotice],
    workedExample: {
      title: 'Worked example: a founder choosing between service and subscription',
      summary: 'Hypothetical example only. A founder can offer monthly advisory support, a one-time setup package, or a lightweight recurring tool.',
      assumptions: [
        'The founder has expertise but limited delivery capacity.',
        'Customers need guidance now, while software demand is still uncertain.',
        'Cash flow matters more than rapid scaling in the first stage.',
      ],
      steps: [
        { label: 'Compare models', detail: 'A one-time service produces faster cash and clearer proof of demand; a subscription promises smoother revenue later but requires repeatable delivery from day one.' },
        { label: 'Choose the first offer', detail: 'The founder launches a fixed-scope advisory package first because it is easier to sell, deliver, and learn from.' },
        { label: 'Delay expansion', detail: 'Only after repeated demand appears does the founder test a recurring support tier.' },
      ],
      takeaway: 'The best first model is often the one that produces learning and cash without requiring a larger machine than the business currently has.',
    },
    visuals: [
      {
        kind: 'comparison',
        title: 'Business model comparison',
        caption: 'Different models trade off cash timing, delivery burden, predictability, and scaling constraints in different ways.',
        accessibleLabel: 'Comparison of common business models',
        accessibleDescription: 'A comparison table covering service, product, subscription, marketplace, licensing, and mixed models.',
        columns: ['Cash timing', 'Delivery burden', 'Predictability', 'Scaling constraint'],
        rows: [
          { label: 'Service', values: ['Often fast', 'High', 'Low to medium', 'Founder capacity'] },
          { label: 'Product', values: ['Depends on inventory cycle', 'Medium', 'Medium', 'Fulfillment and margin discipline'] },
          { label: 'Subscription', values: ['Compounds over time', 'Ongoing', 'Higher when retention is real', 'Churn and support load'] },
          { label: 'Marketplace or licensing', values: ['Can be delayed', 'Model-specific', 'Variable', 'Requires strong trust and coordination'] },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Scope boundaries are part of pricing',
        paragraphs: [
          'Many first offers fail because the founder prices a category of work instead of a defined promise. Clear boundaries around what is included, what is excluded, how many revisions or support cycles are covered, and what timeline applies often protect margin more than a slightly higher price alone.',
        ],
      },
      {
        title: '7. Test before you broaden the menu',
        paragraphs: [
          'A broad offer menu can make a young business feel more legitimate, but it often slows learning and weakens delivery quality. Start with one offer that fits the evidence you already have, then expand only after demand and operations justify it.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'start', slug: 'validate-a-business-idea', reason: 'Use evidence from validation to decide which model is realistic.' },
      { category: 'start', slug: 'estimate-startup-costs-and-pricing', reason: 'Pressure-test your pricing and margins before launch.' },
    ],
    academyCourseSlugs: ['start-a-business-foundations'],
    nextAction: {
      title: 'Define one offer you can deliver well',
      description: 'Write down the model, scope, exclusions, and pricing logic for the smallest useful version of your first offer.',
      href: '/start',
      label: 'Plan your first offer',
    },
  },
  'write-a-one-page-business-plan': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Founders who need a decision document, not a ceremonial binder.',
    learningOutcome: 'Build a one-page plan that separates facts from assumptions and tells you what to test or execute over the next ninety days.',
    keyTakeaways: [
      'A useful one-page plan clarifies decisions, owners, indicators, and open assumptions.',
      'Short plans become stronger when they name uncertainty directly instead of pretending everything is settled.',
      'Channels, economics, operations, and risks belong on the page because they change execution, not because investors expect them.',
      'The plan should create a learning cycle, not sit untouched after it is written.',
    ],
    learningObjectives: [
      'Separate facts, assumptions, and priorities in a one-page format',
      'Capture customer, offer, channels, economics, operations, risks, and ownership clearly',
      'Use a ninety-day review cycle to update the plan as evidence improves',
    ],
    importantNotices: [generalEducationNotice],
    workedExample: {
      title: 'Worked example: a one-page plan for a mobile pet-grooming startup',
      summary: 'Hypothetical example only. The founder wants a practical decision tool, not a pitch deck.',
      assumptions: [
        'Demand appears strongest among busy households in a narrow service area.',
        'The founder can start with one vehicle and a fixed weekly route.',
        'Pricing and repeat booking behavior still need testing.',
      ],
      steps: [
        { label: 'Facts', detail: 'Target customer, current capacity, available capital, and geographic service boundaries are known.' },
        { label: 'Assumptions', detail: 'Monthly repeat rate, marketing channel efficiency, and acceptable travel time are still hypotheses.' },
        { label: 'Ninety-day priorities', detail: 'Test route density, repeat-booking rate, and pricing, while tracking who owns each action and indicator.' },
      ],
      takeaway: 'A one-page plan becomes valuable when it tells you what must be learned next, not only what sounds good today.',
    },
    visuals: [
      {
        kind: 'comparison',
        title: 'One-page plan canvas',
        caption: 'Each block should be readable at mobile width and specific enough to guide action.',
        accessibleLabel: 'Readable one-page business plan canvas',
        accessibleDescription: 'A two-column canvas covering customer, problem, offer, channels, economics, operations, risks, and ninety-day priorities.',
        columns: ['Plan area', 'What belongs there'],
        rows: [
          { label: 'Customer and problem', values: ['Who the plan serves and what problem is being solved now.'] },
          { label: 'Offer and channels', values: ['What is being sold and how customers will first find it.'] },
          { label: 'Economics and operations', values: ['How money and delivery work in the real business.'] },
          { label: 'Risks and priorities', values: ['What is uncertain, who owns the next step, and which indicator will matter.'] },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Facts, assumptions, and owners belong on the same page',
        paragraphs: [
          'A plan becomes vague when it lists goals without naming who owns them or what facts still need evidence. Mark assumptions clearly. Then assign each important next step to a person and an indicator. That makes the plan operational rather than ornamental.',
        ],
      },
      {
        title: '7. The ninety-day learning cycle',
        paragraphs: [
          'Review the plan on a fixed rhythm. What moved from assumption to fact? What remained uncertain? What priority no longer matters? In a young business, the plan is supposed to change as evidence improves. If it never changes, it is probably not guiding the business.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'start', slug: 'validate-a-business-idea', reason: 'Validation improves the assumptions inside the plan.' },
      { category: 'start', slug: 'business-launch-checklist', reason: 'Use the plan to sequence what must happen before launch.' },
    ],
    academyCourseSlugs: ['start-a-business-foundations'],
    nextAction: {
      title: 'Draft the plan as a decision document',
      description: 'Write one page that states what you know, what you assume, who owns the next step, and what success would look like in ninety days.',
      href: '/start',
      label: 'Open startup planner',
    },
  },
  'estimate-startup-costs-and-pricing': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Founders who need a grounded view of startup cash needs, contribution margin, and price sensitivity before launch.',
    learningOutcome: 'Estimate startup costs and a first-pass price using labeled assumptions rather than wishful averages.',
    keyTakeaways: [
      'Separate one-time, recurring, and per-sale costs so early pricing decisions are not built on a blur of expenses.',
      'Contribution margin matters because revenue that barely covers variable costs does not create room for the business to survive.',
      'Cash timing can hurt even when accounting profit looks acceptable on paper.',
      'Pricing should be tested with sensitivity, not treated as a single revealed answer.',
    ],
    learningObjectives: [
      'Organize startup costs into practical buckets',
      'Use contribution-margin reasoning without inventing false precision',
      'Test how pricing changes affect break-even and cash pressure',
    ],
    importantNotices: [generalEducationNotice],
    workedExample: {
      title: 'Worked example: pricing a small recurring service offer',
      summary: 'Hypothetical example only. A founder is pricing a monthly service with setup work, payment fees, and occasional refunds.',
      assumptions: [
        'There is a one-time setup cost in labor and tools.',
        'The business pays payment processing fees and sees a small refund rate.',
        'The founder wants owner compensation included in the model instead of pretending free labor is normal.',
      ],
      steps: [
        { label: 'List costs by type', detail: 'Separate one-time launch costs, monthly overhead, and variable cost per customer.' },
        { label: 'Calculate contribution margin', detail: 'Price minus direct delivery costs, payment fees, and expected refund effect shows what is left to cover overhead and owner pay.' },
        { label: 'Stress-test price', detail: 'Review how a lower price, higher refund rate, or slower payment timing changes break-even and cash needs.' },
      ],
      takeaway: 'The useful number is not only what price sounds competitive, but what price still leaves a business that can keep operating.',
    },
    visuals: [
      {
        kind: 'formula',
        title: 'Cost stack and contribution-margin formula',
        caption: 'A simple pricing model is more useful when every term is defined in plain language.',
        accessibleLabel: 'Formula for contribution margin and cost stack',
        accessibleDescription: 'A formula showing price minus direct costs, payment fees, refunds, and variable support burden to calculate contribution margin.',
        expression: 'Contribution margin = price - direct delivery cost - payment fees - expected returns/refunds - variable service burden',
        terms: [
          { term: 'Direct delivery cost', meaning: 'Labor, materials, or fulfillment cost directly tied to the sale.' },
          { term: 'Payment fees', meaning: 'Card processing or platform fees charged when a customer pays.' },
          { term: 'Expected returns/refunds', meaning: 'The realistic portion of revenue you may need to give back.' },
          { term: 'Variable service burden', meaning: 'Support or handling effort that increases with each additional sale.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Owner compensation and contingency are real costs',
        paragraphs: [
          'A startup model that works only because the owner is assumed to work for free is usually hiding a problem. Include at least a practical target for owner compensation and some contingency for mistakes, delays, or small surprises. Otherwise, the business may look healthier on paper than it will feel in reality.',
        ],
      },
      {
        title: '7. Break-even is not the same as healthy cash flow',
        paragraphs: [
          'You can reach an accounting break-even point and still struggle because cash arrives late, inventory must be purchased early, or refunds and delays force working capital needs higher than expected. Pricing and launch planning should both respect timing, not only totals.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'start', slug: 'choose-a-business-model-and-first-offer', reason: 'Pricing becomes clearer once the model and offer are defined.' },
      { category: 'start', slug: 'business-launch-checklist', reason: 'Use your estimates to decide what the business can afford before launch.' },
    ],
    academyCourseSlugs: ['start-a-business-foundations'],
    nextAction: {
      title: 'Model your first offer with labeled assumptions',
      description: 'List the one-time, recurring, and per-sale costs behind your offer and test whether the price leaves room for owner pay and errors.',
      href: '/start',
      label: 'Estimate startup costs',
    },
  },
  'how-to-start-an-llc': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Founders who believe an LLC may be the right structure but want to separate formation paperwork from operating readiness.',
    learningOutcome: 'Distinguish what an LLC does and does not do, then sequence the formation and follow-up tasks that make the entity usable in practice.',
    keyTakeaways: [
      'An LLC can help create legal and operational separation, but it does not automatically solve tax, licensing, banking, or compliance work.',
      'Formation rules are jurisdiction-specific, so state filing requirements should never be treated as universal.',
      'Name availability, trademark checks, operating agreements, and tax treatment all answer different questions.',
      'Entity formation and business activation are related, but they are not the same job.',
    ],
    learningObjectives: [
      'Explain what an LLC does and does not accomplish',
      'Sequence state formation, EIN, banking, recordkeeping, and compliance tasks',
      'Recognize when legal or tax advice is warranted because the structure or activities are more complex',
    ],
    importantNotices: [
      {
        title: 'Jurisdiction matters',
        body: 'State rules on formation, annual reporting, tax registration, foreign qualification, and licensing vary. Verify the current requirements with the relevant state filing authority and tax agencies before filing.',
        tone: 'warning',
      },
      highStakesNotice,
    ],
    visuals: [
      {
        kind: 'timeline',
        title: 'LLC setup in two lanes',
        caption: 'Filing the entity and making it operational are connected but different tracks of work.',
        accessibleLabel: 'Two-lane LLC timeline',
        accessibleDescription: 'A timeline separating entity formation tasks from post-formation operating tasks.',
        steps: [
          { label: 'Entity formation lane', detail: 'Choose jurisdiction, confirm name availability, appoint a registered agent, file the formation document, and preserve records.' },
          { label: 'Operating lane', detail: 'Get an EIN when needed, set banking and bookkeeping, confirm tax treatment, address licenses, insurance, and ongoing compliance.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '11. Multi-state activity and foreign qualification',
        paragraphs: [
          'Owners often treat the formation state as the only relevant jurisdiction, but ongoing activity may create obligations elsewhere. If the business hires people, signs leases, stores inventory, or operates physically in another state, confirm whether foreign qualification, local tax registration, or licensing is required there too.',
        ],
      },
      {
        title: '12. Current beneficial-ownership reporting context',
        paragraphs: [
          'Federal beneficial-ownership reporting rules have changed significantly, and owners should verify the current FinCEN guidance instead of relying on broad claims that may already be outdated. The current federal treatment for many domestic entities differs from earlier expectations, but it is still wise to confirm the latest official position at the time you act.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'stories', slug: 'the-day-my-side-project-asked-for-paperwork', reason: 'See the founder-side decision about when a project needs a legal home.' },
      { category: 'start', slug: 'business-launch-checklist', reason: 'Use the launch sequence to cover the non-formation work that still remains.' },
    ],
    academyCourseSlugs: ['start-a-business-foundations'],
    nextAction: {
      title: 'Sequence formation and activation separately',
      description: 'Use the article to decide whether an LLC fits, then list the filing tasks and the post-filing operating tasks that still need owners and deadlines.',
      href: '/start',
      label: 'Plan your business setup',
    },
    sources: [
      { label: 'IRS — Limited liability company (LLC)', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/limited-liability-company-llc' },
      { label: 'IRS — Starting a business', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/starting-a-business' },
      { label: 'IRS — Apply for an employer identification number (EIN) online', href: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online' },
      { label: 'SBA — Register your business', href: 'https://www.sba.gov/business-guide/launch-your-business/register-your-business' },
      { label: 'FinCEN — Beneficial ownership information reporting', href: 'https://www.fincen.gov/boi' },
    ],
  },
  'business-launch-checklist': {
    articleKind: 'instructional',
    lastReviewed: reviewed,
    targetAudience: 'Founders preparing to launch and needing to sequence what actually matters before, during, and after day one.',
    learningOutcome: 'Turn a flat launch checklist into a dependency-aware sequence that protects validation, compliance, payment readiness, privacy, and post-launch follow-through.',
    keyTakeaways: [
      'Not every launch task is equally urgent; some items depend on earlier decisions and should not be rushed out of order.',
      'Validation should usually happen before expensive commitments, not after them.',
      'Payment collection, support, privacy, accessibility, and rollback planning are part of launch readiness, not afterthoughts.',
      'The first thirty days after launch deserve a review plan of their own.',
    ],
    learningObjectives: [
      'Sequence launch work by dependency instead of by enthusiasm',
      'Recognize the operational tasks that often get ignored in early launch plans',
      'Plan a short post-launch review cycle before the launch happens',
    ],
    importantNotices: [generalEducationNotice],
    workedExample: {
      title: 'Worked example: launching a niche digital service',
      summary: 'Hypothetical example only. The founder has validated demand lightly and now wants an orderly launch instead of a last-minute scramble.',
      assumptions: [
        'The offer is defined, but contracts, support flow, and analytics consent settings are not yet finalized.',
        'Payments will be collected online from the first customer.',
        'A failed deployment would interrupt the launch day experience if there is no rollback path.',
      ],
      steps: [
        { label: 'Before launch', detail: 'Confirm offer, pricing, payment collection, privacy boundaries, contracts, support channel, and minimum accessibility checks.' },
        { label: 'Launch window', detail: 'Monitor signups, support questions, failed payments, and incident response with a defined rollback path.' },
        { label: 'After launch', detail: 'Review real customer behavior, delivery friction, and whether the launch assumptions held up after thirty days.' },
      ],
      takeaway: 'A calmer launch comes from dependency order and follow-up discipline more than from a dramatic launch announcement.',
    },
    visuals: [
      {
        kind: 'timeline',
        title: 'Dependency-based launch sequence',
        caption: 'Some tasks belong before launch, some during launch, and some only make sense after real customers arrive.',
        accessibleLabel: 'Launch sequence by dependency',
        accessibleDescription: 'A three-stage sequence covering before launch, launch window, and post-launch review.',
        steps: [
          { label: 'Before launch', detail: 'Validate demand, finish legal and financial setup, confirm payments, privacy, support, and accessibility basics.' },
          { label: 'During launch', detail: 'Watch real transactions, support load, incidents, and customer communication closely.' },
          { label: 'After launch', detail: 'Run a thirty-day review of demand, delivery quality, analytics consent, backups, and priorities.' },
        ],
      },
    ],
    supplementalSections: [
      {
        title: '6. Privacy, security, and accessibility are launch tasks',
        paragraphs: [
          'Early teams sometimes postpone privacy, security, or accessibility because they feel like enterprise concerns. In reality, they shape customer trust from the first interaction. If you collect payment, personal information, or account data, basic boundaries should exist before the launch happens.',
        ],
      },
      {
        title: '7. Plan the first thirty-day review before day one',
        paragraphs: [
          'The launch is not the finish line. Decide in advance what you will review after the first thirty days: failed payments, support patterns, customer questions, refund causes, accessibility complaints, and whether your demand assumptions were accurate enough to keep building.',
        ],
      },
    ],
    relatedArticles: [
      { category: 'start', slug: 'estimate-startup-costs-and-pricing', reason: 'Use your cost and pricing assumptions to avoid launching into a cash problem.' },
      { category: 'start', slug: 'how-to-start-an-llc', reason: 'Confirm whether legal structure and financial separation tasks still need attention before launch.' },
    ],
    academyCourseSlugs: ['start-a-business-foundations'],
    nextAction: {
      title: 'Turn launch into a sequence, not a pile',
      description: 'Identify what must happen before launch, what you need to monitor during launch, and what you will review after the first month.',
      href: '/business/new?business_stage=idea',
      label: 'Create your business workspace',
    },
  },
};
