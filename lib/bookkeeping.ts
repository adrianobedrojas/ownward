/**
 * lib/bookkeeping.ts
 *
 * Pure helpers for Ownward Books.
 * No Supabase imports — all functions are safe for Jest unit testing.
 *
 * DISCLAIMER: Financial summaries are organizational estimates only.
 * They do not constitute accounting, tax, audit, or legal advice.
 * Consult a qualified professional for your specific situation.
 */

// ─── Category definitions ──────────────────────────────────────────────────

export const REVENUE_CATEGORIES = [
  { value: "sales", label: "Sales" },
  { value: "services", label: "Services" },
  { value: "product_revenue", label: "Product revenue" },
  { value: "subscription_revenue", label: "Subscription revenue" },
  { value: "other_income", label: "Other income" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "advertising_marketing", label: "Advertising and marketing" },
  { value: "bank_fees", label: "Bank fees" },
  { value: "contractors", label: "Contractors" },
  { value: "cost_of_goods_sold", label: "Cost of goods sold" },
  { value: "equipment", label: "Equipment" },
  { value: "insurance", label: "Insurance" },
  { value: "legal_professional", label: "Legal and professional services" },
  { value: "meals", label: "Meals" },
  { value: "office_expenses", label: "Office expenses" },
  { value: "payroll", label: "Payroll" },
  { value: "rent", label: "Rent" },
  { value: "repairs_maintenance", label: "Repairs and maintenance" },
  { value: "software_subscriptions", label: "Software and subscriptions" },
  { value: "supplies", label: "Supplies" },
  { value: "taxes_licenses", label: "Taxes and licenses" },
  { value: "travel", label: "Travel" },
  { value: "utilities", label: "Utilities" },
  { value: "vehicle_expenses", label: "Vehicle expenses" },
  { value: "other_expense", label: "Other expense" },
] as const;

export type RevenueCategoryValue = (typeof REVENUE_CATEGORIES)[number]["value"];
export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number]["value"];
export type CategoryValue = RevenueCategoryValue | ExpenseCategoryValue;

const REVENUE_CATEGORY_VALUES = new Set<string>(
  REVENUE_CATEGORIES.map((c) => c.value)
);
const EXPENSE_CATEGORY_VALUES = new Set<string>(
  EXPENSE_CATEGORIES.map((c) => c.value)
);
const ALL_CATEGORY_VALUES = new Set<string>([
  ...REVENUE_CATEGORY_VALUES,
  ...EXPENSE_CATEGORY_VALUES,
]);

const CATEGORY_LABEL_MAP = new Map<string, string>([
  ...REVENUE_CATEGORIES.map(({ value, label }) => [value, label] as [string, string]),
  ...EXPENSE_CATEGORIES.map(({ value, label }) => [value, label] as [string, string]),
]);

/** Return the human-readable label for a category value, or the raw value if unknown. */
export function getCategoryLabel(value: string): string {
  return CATEGORY_LABEL_MAP.get(value) ?? value;
}

/** True if the category value is in the controlled standard list. */
export function isValidCategory(value: string): value is CategoryValue {
  return ALL_CATEGORY_VALUES.has(value);
}

/** True if the category is a recognised revenue category. */
export function isRevenueCategory(value: string): boolean {
  return REVENUE_CATEGORY_VALUES.has(value);
}

/** True if the category is a recognised expense category. */
export function isExpenseCategory(value: string): boolean {
  return EXPENSE_CATEGORY_VALUES.has(value);
}

// ─── Payment methods ───────────────────────────────────────────────────────

export const PAYMENT_METHODS = [
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "ach", label: "ACH" },
  { value: "wire", label: "Wire transfer" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];
const PAYMENT_METHOD_VALUES = new Set<string>(PAYMENT_METHODS.map((p) => p.value));

export function isValidPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHOD_VALUES.has(value);
}

export function getPaymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((p) => p.value === value)?.label ?? value;
}

// ─── Transaction types ─────────────────────────────────────────────────────

export const ALLOWED_TRANSACTION_TYPES = ["revenue", "expense"] as const;
export type AllowedTransactionType = (typeof ALLOWED_TRANSACTION_TYPES)[number];

export function isAllowedTransactionType(
  value: string
): value is AllowedTransactionType {
  return (ALLOWED_TRANSACTION_TYPES as readonly string[]).includes(value);
}

// ─── Review / source status ────────────────────────────────────────────────

export const REVIEW_STATUSES = ["needs_review", "reviewed"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export function isValidReviewStatus(value: string): value is ReviewStatus {
  return (REVIEW_STATUSES as readonly string[]).includes(value);
}

// ─── Month boundary utilities ──────────────────────────────────────────────

/** Parse "YYYY-MM" to { start: Date, end: Date } covering the full calendar month. */
export function parseMonthParam(param: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(param)) return null;
  const [year, month] = param.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // last day of month
  return { start, end };
}

/** Format a Date as "YYYY-MM". */
export function formatMonthParam(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Return the current month as "YYYY-MM". */
export function currentMonthParam(): string {
  return formatMonthParam(new Date());
}

/** Return the first day of a month as an ISO date string "YYYY-MM-DD". */
export function monthStartIso(param: string): string {
  return `${param}-01`;
}

/** Return the last day of a month as an ISO date string "YYYY-MM-DD". */
export function monthEndIso(param: string): string {
  const bounds = parseMonthParam(param);
  if (!bounds) return `${param}-31`;
  const d = bounds.end;
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Return a human-readable month label, e.g. "July 2026". */
export function formatMonthLabel(param: string): string {
  const bounds = parseMonthParam(param);
  if (!bounds) return param;
  return bounds.start.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Add/subtract months from a "YYYY-MM" param. */
export function shiftMonth(param: string, delta: number): string {
  const bounds = parseMonthParam(param);
  if (!bounds) return param;
  const d = bounds.start;
  d.setUTCMonth(d.getUTCMonth() + delta);
  return formatMonthParam(d);
}

// ─── Currency helpers ──────────────────────────────────────────────────────

/** Round to two decimal places using standard rounding (avoiding float drift). */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Format as USD with cents. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Summary calculations ──────────────────────────────────────────────────

export interface TransactionForSummary {
  type: string;
  status: string;
  amount: number | string;
}

/** Sum paid revenue transactions (excludes invoice-type to prevent double-counting). */
export function calcRevenue(transactions: TransactionForSummary[]): number {
  return roundCents(
    transactions
      .filter((t) => t.type === "revenue" && t.status === "paid")
      .reduce((acc, t) => acc + Number(t.amount), 0)
  );
}

/** Sum expense transactions. */
export function calcExpenses(transactions: TransactionForSummary[]): number {
  return roundCents(
    transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + Number(t.amount), 0)
  );
}

/** Estimated profit = revenue - expenses. */
export function calcProfit(revenue: number, expenses: number): number {
  return roundCents(revenue - expenses);
}

/** Sum unpaid invoice-type transactions (legacy display only, not counted as revenue). */
export function calcUnpaidInvoiceTotal(
  transactions: TransactionForSummary[]
): number {
  return roundCents(
    transactions
      .filter((t) => t.type === "invoice" && t.status === "pending")
      .reduce((acc, t) => acc + Number(t.amount), 0)
  );
}

// ─── Bookkeeping health score ──────────────────────────────────────────────

/**
 * Health score calculation (0–100).
 *
 * Components and weights:
 *   - 30 pts: reviewed transaction percentage
 *   - 25 pts: categorized transaction percentage (standard category)
 *   - 25 pts: expense receipt coverage
 *   - 20 pts: reconciled transaction percentage
 *
 * This is an organizational estimate only.
 * It does not represent certified bookkeeping, accounting, tax, or audit status.
 */
export interface HealthScoreInput {
  totalTransactions: number;
  reviewedCount: number;
  categorizedCount: number;    // uses a standard category value
  expenseCount: number;
  expenseWithReceiptCount: number;
  reconciledCount: number;
}

export interface HealthScoreResult {
  score: number;
  label: string;
  reviewedPct: number;
  categorizedPct: number;
  receiptPct: number;
  reconciledPct: number;
}

export function calcHealthScore(input: HealthScoreInput): HealthScoreResult {
  const {
    totalTransactions,
    reviewedCount,
    categorizedCount,
    expenseCount,
    expenseWithReceiptCount,
    reconciledCount,
  } = input;

  const safeDiv = (num: number, den: number) =>
    den === 0 ? 100 : Math.min(100, Math.round((num / den) * 100));

  const reviewedPct   = safeDiv(reviewedCount, totalTransactions);
  const categorizedPct = safeDiv(categorizedCount, totalTransactions);
  const receiptPct    = safeDiv(expenseWithReceiptCount, expenseCount);
  const reconciledPct = safeDiv(reconciledCount, totalTransactions);

  const score = Math.round(
    reviewedPct   * 0.30 +
    categorizedPct * 0.25 +
    receiptPct    * 0.25 +
    reconciledPct * 0.20
  );

  const label =
    score >= 90 ? "Records organized" :
    score >= 70 ? "Nearly ready" :
    score >= 40 ? "Needs attention" :
                  "Significant cleanup needed";

  return { score, label, reviewedPct, categorizedPct, receiptPct, reconciledPct };
}

// ─── Attention reasons (Bookkeeping Inbox) ────────────────────────────────

export type AttentionReason =
  | "needs_review"
  | "uncategorized"
  | "missing_receipt"
  | "unreconciled"
  | "pending"
  | "possible_duplicate";

export interface AttentionItem {
  transactionId: string;
  reasons: AttentionReason[];
}

export interface TransactionForAttention {
  id: string;
  type: string;
  status: string;
  category: string;
  review_status: string;
  reconciled_at: string | null;
  receipt_document_id: string | null;
  amount: number | string;
  title: string;
  transaction_date: string;
}

/** Compute attention reasons for a single transaction. */
export function getAttentionReasons(
  tx: TransactionForAttention
): AttentionReason[] {
  const reasons: AttentionReason[] = [];

  if (tx.review_status === "needs_review") {
    reasons.push("needs_review");
  }

  if (!isValidCategory(tx.category)) {
    reasons.push("uncategorized");
  }

  if (tx.type === "expense" && !tx.receipt_document_id) {
    reasons.push("missing_receipt");
  }

  if (!tx.reconciled_at) {
    reasons.push("unreconciled");
  }

  if (tx.status === "pending") {
    reasons.push("pending");
  }

  return reasons;
}

export const ATTENTION_REASON_LABELS: Record<AttentionReason, string> = {
  needs_review: "Needs review",
  uncategorized: "Uncategorized",
  missing_receipt: "Missing receipt",
  unreconciled: "Unreconciled",
  pending: "Pending / unpaid",
  possible_duplicate: "Possible duplicate",
};

export const ATTENTION_REASON_DESCRIPTIONS: Record<AttentionReason, string> = {
  needs_review: "This transaction has not been reviewed yet.",
  uncategorized: "The category does not match a standard bookkeeping category.",
  missing_receipt: "This expense has no receipt attached.",
  unreconciled: "This transaction has not been reconciled.",
  pending: "This transaction is pending or unpaid.",
  possible_duplicate: "Similar amount and description found on a nearby date.",
};

// ─── Duplicate detection ───────────────────────────────────────────────────

/** Normalize a title for similarity comparison. */
export function normalizeTitleForDuplication(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface TransactionForDuplicateCheck {
  id: string;
  title: string;
  amount: number | string;
  transaction_date: string;
}

/**
 * Detect possible duplicates conservatively.
 * Two transactions are flagged when all conditions are true:
 *   - Same user (caller's responsibility to pass only their transactions)
 *   - Same amount (exact numeric match)
 *   - Normalised title share at least 50% of tokens
 *   - Transaction dates are within 3 days of each other
 *
 * Returns a Set of transaction IDs involved in at least one duplicate pair.
 */
export function detectPossibleDuplicates(
  transactions: TransactionForDuplicateCheck[]
): Set<string> {
  const duplicateIds = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const a = transactions[i];
      const b = transactions[j];

      if (Number(a.amount) !== Number(b.amount)) continue;

      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      const daysDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
      if (daysDiff > 3) continue;

      const tokensA = new Set(normalizeTitleForDuplication(a.title).split(" ").filter(Boolean));
      const tokensB = new Set(normalizeTitleForDuplication(b.title).split(" ").filter(Boolean));
      const combined = new Set([...tokensA, ...tokensB]);
      const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
      if (combined.size === 0) continue;
      const similarity = intersection / combined.size;

      if (similarity >= 0.5) {
        duplicateIds.add(a.id);
        duplicateIds.add(b.id);
      }
    }
  }

  return duplicateIds;
}

// ─── CSV helpers ───────────────────────────────────────────────────────────

/** Escape a CSV field value (wraps in quotes and doubles internal quotes). */
export function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serialise an array of field values into a single CSV row. */
export function csvRow(fields: (string | number | boolean | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(",");
}

export const CSV_HEADERS = [
  "Date",
  "Type",
  "Description",
  "Vendor",
  "Category",
  "Amount",
  "Status",
  "Payment method",
  "Tax deductible",
  "Receipt attached",
  "Reviewed",
  "Reconciled",
  "Notes",
];
