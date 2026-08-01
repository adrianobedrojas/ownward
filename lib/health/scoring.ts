/**
 * Health assessment question definitions and scoring logic.
 * Pure utilities — no server-side dependencies.
 */

export const HEALTH_QUESTIONS: {
  id: string;
  category: string;
  text: string;
}[] = [
  { id: "q_registered", category: "foundation", text: "Is your business legally registered with all required licenses?" },
  { id: "q_bank_account", category: "foundation", text: "Do you have a dedicated business bank account?" },
  { id: "q_bookkeeping", category: "financial_org", text: "Do you track income and expenses monthly?" },
  { id: "q_tax_current", category: "financial_org", text: "Are your business taxes current and filed on time?" },
  { id: "q_repeat_customers", category: "customers_revenue", text: "Do you have recurring or repeat customers?" },
  { id: "q_customer_concentration", category: "customers_revenue", text: "No single customer accounts for more than 30% of revenue?" },
  { id: "q_documented_processes", category: "operations", text: "Are your key business processes documented?" },
  { id: "q_systems", category: "operations", text: "Do you use software/systems to run the business efficiently?" },
  { id: "q_key_contracts", category: "documents_records", text: "Are your key contracts (customers, suppliers, leases) documented and accessible?" },
  { id: "q_financial_records", category: "documents_records", text: "Do you have at least 2 years of organized financial records?" },
  { id: "q_owner_independence", category: "owner_independence", text: "Can the business operate for 2+ weeks without you?" },
  { id: "q_staff_documented", category: "owner_independence", text: "Do key staff have documented responsibilities and training?" },
];

const CATEGORY_WEIGHTS: Record<string, number> = {
  foundation: 20,
  financial_org: 20,
  customers_revenue: 20,
  operations: 15,
  documents_records: 15,
  owner_independence: 10,
};

const ANSWER_SCORES: Record<string, number> = {
  yes: 1,
  in_progress: 0.5,
  not_yet: 0,
  not_applicable: 0.75,
};

export function calculateHealthScores(answers: Record<string, string>): {
  overallScore: number;
  categoryScores: Record<string, number>;
  topActions: string[];
} {
  const byCategory: Record<string, typeof HEALTH_QUESTIONS> = {};
  for (const q of HEALTH_QUESTIONS) {
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push(q);
  }

  const categoryScores: Record<string, number> = {};
  const actionItems: { question: string; score: number }[] = [];

  for (const [cat, questions] of Object.entries(byCategory)) {
    let total = 0;
    for (const q of questions) {
      const ans = answers[q.id] ?? "not_yet";
      const score = ANSWER_SCORES[ans] ?? 0;
      total += score;
      if (score < 1 && ans !== "not_applicable") {
        actionItems.push({ question: q.text, score });
      }
    }
    categoryScores[cat] = Math.round((total / questions.length) * 100);
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (const [cat, score] of Object.entries(categoryScores)) {
    const w = CATEGORY_WEIGHTS[cat] ?? 10;
    weightedSum += score * w;
    totalWeight += w;
  }
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  const topActions = actionItems
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((a) => a.question);

  return { overallScore, categoryScores, topActions };
}
