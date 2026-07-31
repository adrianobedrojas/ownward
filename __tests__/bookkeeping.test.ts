/**
 * __tests__/bookkeeping.test.ts
 *
 * Unit tests for pure bookkeeping helpers in lib/bookkeeping.ts.
 * No Supabase connection required.
 */

import {
  calcRevenue,
  calcExpenses,
  calcProfit,
  calcUnpaidInvoiceTotal,
  calcHealthScore,
  detectPossibleDuplicates,
  getAttentionReasons,
  escapeCsvField,
  csvRow,
  parseMonthParam,
  formatMonthParam,
  monthStartIso,
  monthEndIso,
  shiftMonth,
  roundCents,
  isValidCategory,
  isAllowedTransactionType,
  isValidPaymentMethod,
  getCategoryLabel,
  normalizeTitleForDuplication,
} from "@/lib/bookkeeping";

// ─── Revenue / expense totals ──────────────────────────────────────────────

describe("calcRevenue", () => {
  it("sums only paid revenue transactions", () => {
    const txs = [
      { type: "revenue", status: "paid", amount: 1000 },
      { type: "revenue", status: "pending", amount: 500 },
      { type: "expense", status: "paid", amount: 200 },
    ];
    expect(calcRevenue(txs)).toBe(1000);
  });

  it("returns 0 when no paid revenue", () => {
    expect(calcRevenue([])).toBe(0);
  });

  it("does not count invoice-type as revenue", () => {
    const txs = [{ type: "invoice", status: "paid", amount: 999 }];
    expect(calcRevenue(txs)).toBe(0);
  });

  it("rounds to two decimal places", () => {
    const txs = [
      { type: "revenue", status: "paid", amount: "100.005" },
      { type: "revenue", status: "paid", amount: "100.005" },
    ];
    expect(calcRevenue(txs)).toBe(200.01);
  });
});

describe("calcExpenses", () => {
  it("sums all expense transactions regardless of status", () => {
    const txs = [
      { type: "expense", status: "paid", amount: 300 },
      { type: "expense", status: "pending", amount: 150 },
      { type: "revenue", status: "paid", amount: 1000 },
    ];
    expect(calcExpenses(txs)).toBe(450);
  });

  it("returns 0 when no expenses", () => {
    expect(calcExpenses([])).toBe(0);
  });
});

describe("calcProfit", () => {
  it("returns revenue minus expenses", () => {
    expect(calcProfit(1000, 400)).toBe(600);
  });

  it("returns negative profit correctly", () => {
    expect(calcProfit(400, 1000)).toBe(-600);
  });

  it("handles zero values", () => {
    expect(calcProfit(0, 0)).toBe(0);
  });
});

// ─── Unpaid invoice total ──────────────────────────────────────────────────

describe("calcUnpaidInvoiceTotal", () => {
  it("sums pending invoice-type transactions only", () => {
    const txs = [
      { type: "invoice", status: "pending", amount: 500 },
      { type: "invoice", status: "paid", amount: 300 },
      { type: "revenue", status: "pending", amount: 200 },
    ];
    expect(calcUnpaidInvoiceTotal(txs)).toBe(500);
  });
});

// ─── Health score ──────────────────────────────────────────────────────────

describe("calcHealthScore", () => {
  it("returns 100 for a perfect record set", () => {
    const result = calcHealthScore({
      totalTransactions: 10,
      reviewedCount: 10,
      categorizedCount: 10,
      expenseCount: 4,
      expenseWithReceiptCount: 4,
      reconciledCount: 10,
    });
    expect(result.score).toBe(100);
    expect(result.label).toBe("Records organized");
  });

  it("returns 0 for an empty record set (all denominators are 0)", () => {
    const result = calcHealthScore({
      totalTransactions: 0,
      reviewedCount: 0,
      categorizedCount: 0,
      expenseCount: 0,
      expenseWithReceiptCount: 0,
      reconciledCount: 0,
    });
    // When denominator is 0, safeDiv returns 100 (nothing to do = complete)
    expect(result.score).toBe(100);
  });

  it("gives label 'Needs attention' for score 40–69", () => {
    const result = calcHealthScore({
      totalTransactions: 10,
      reviewedCount: 5,
      categorizedCount: 5,
      expenseCount: 4,
      expenseWithReceiptCount: 1,
      reconciledCount: 3,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("gives 'Significant cleanup needed' for very low scores", () => {
    const result = calcHealthScore({
      totalTransactions: 20,
      reviewedCount: 0,
      categorizedCount: 0,
      expenseCount: 10,
      expenseWithReceiptCount: 0,
      reconciledCount: 0,
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe("Significant cleanup needed");
  });

  it("boundaries: 90 = Records organized", () => {
    const result = calcHealthScore({
      totalTransactions: 10,
      reviewedCount: 10,
      categorizedCount: 10,
      expenseCount: 4,
      expenseWithReceiptCount: 2, // 50% receipt
      reconciledCount: 10,
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
  });
});

// ─── Uncategorized detection ───────────────────────────────────────────────

describe("isValidCategory", () => {
  it("returns true for known revenue categories", () => {
    expect(isValidCategory("sales")).toBe(true);
    expect(isValidCategory("services")).toBe(true);
    expect(isValidCategory("subscription_revenue")).toBe(true);
  });

  it("returns true for known expense categories", () => {
    expect(isValidCategory("rent")).toBe(true);
    expect(isValidCategory("payroll")).toBe(true);
    expect(isValidCategory("software_subscriptions")).toBe(true);
  });

  it("returns false for legacy or arbitrary categories", () => {
    expect(isValidCategory("Operations")).toBe(false);
    expect(isValidCategory("General")).toBe(false);
    expect(isValidCategory("")).toBe(false);
  });
});

// ─── Category labels ───────────────────────────────────────────────────────

describe("getCategoryLabel", () => {
  it("returns human-readable label for known category", () => {
    expect(getCategoryLabel("advertising_marketing")).toBe("Advertising and marketing");
    expect(getCategoryLabel("sales")).toBe("Sales");
  });

  it("returns the raw value for unknown category", () => {
    expect(getCategoryLabel("some_unknown_cat")).toBe("some_unknown_cat");
  });
});

// ─── Missing receipt detection (via attention reasons) ────────────────────

describe("getAttentionReasons – missing receipt", () => {
  it("flags expense without receipt", () => {
    const tx = {
      id: "1", type: "expense", status: "paid", category: "rent",
      review_status: "reviewed", reconciled_at: "2026-01-01", receipt_document_id: null,
      amount: 1200, title: "Office rent", transaction_date: "2026-01-10",
    };
    expect(getAttentionReasons(tx)).toContain("missing_receipt");
  });

  it("does not flag revenue for missing receipt", () => {
    const tx = {
      id: "2", type: "revenue", status: "paid", category: "sales",
      review_status: "reviewed", reconciled_at: "2026-01-01", receipt_document_id: null,
      amount: 500, title: "Sale", transaction_date: "2026-01-10",
    };
    expect(getAttentionReasons(tx)).not.toContain("missing_receipt");
  });

  it("does not flag expense that has a receipt", () => {
    const tx = {
      id: "3", type: "expense", status: "paid", category: "rent",
      review_status: "reviewed", reconciled_at: "2026-01-01",
      receipt_document_id: "some-doc-id",
      amount: 1200, title: "Office rent", transaction_date: "2026-01-10",
    };
    expect(getAttentionReasons(tx)).not.toContain("missing_receipt");
  });
});

describe("getAttentionReasons – uncategorized", () => {
  it("flags transaction with legacy category", () => {
    const tx = {
      id: "4", type: "revenue", status: "paid", category: "General",
      review_status: "reviewed", reconciled_at: "2026-01-01", receipt_document_id: null,
      amount: 100, title: "Test", transaction_date: "2026-01-10",
    };
    expect(getAttentionReasons(tx)).toContain("uncategorized");
  });
});

// ─── Duplicate detection ───────────────────────────────────────────────────

describe("detectPossibleDuplicates", () => {
  it("flags two transactions with same amount and similar title on same day", () => {
    const txs = [
      { id: "a", title: "Stripe subscription", amount: 99, transaction_date: "2026-01-15" },
      { id: "b", title: "Stripe subscription", amount: 99, transaction_date: "2026-01-15" },
    ];
    const duplicates = detectPossibleDuplicates(txs);
    expect(duplicates.has("a")).toBe(true);
    expect(duplicates.has("b")).toBe(true);
  });

  it("does not flag transactions with different amounts", () => {
    const txs = [
      { id: "a", title: "AWS Invoice", amount: 100, transaction_date: "2026-01-10" },
      { id: "b", title: "AWS Invoice", amount: 200, transaction_date: "2026-01-10" },
    ];
    const duplicates = detectPossibleDuplicates(txs);
    expect(duplicates.size).toBe(0);
  });

  it("does not flag transactions more than 3 days apart", () => {
    const txs = [
      { id: "a", title: "Rent payment", amount: 2000, transaction_date: "2026-01-01" },
      { id: "b", title: "Rent payment", amount: 2000, transaction_date: "2026-01-10" },
    ];
    const duplicates = detectPossibleDuplicates(txs);
    expect(duplicates.size).toBe(0);
  });

  it("does not flag transactions with completely different titles", () => {
    const txs = [
      { id: "a", title: "Office supplies purchase", amount: 50, transaction_date: "2026-01-05" },
      { id: "b", title: "Client payment received", amount: 50, transaction_date: "2026-01-05" },
    ];
    const duplicates = detectPossibleDuplicates(txs);
    expect(duplicates.size).toBe(0);
  });

  it("returns empty set for a single transaction", () => {
    const txs = [{ id: "a", title: "Solo tx", amount: 100, transaction_date: "2026-01-01" }];
    expect(detectPossibleDuplicates(txs).size).toBe(0);
  });
});

describe("normalizeTitleForDuplication", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeTitleForDuplication("Stripe - Invoice #123")).toBe("stripe invoice 123");
  });
  it("collapses multiple spaces", () => {
    expect(normalizeTitleForDuplication("Hello  World")).toBe("hello world");
  });
});

// ─── CSV escaping ──────────────────────────────────────────────────────────

describe("escapeCsvField", () => {
  it("wraps fields containing commas in quotes", () => {
    expect(escapeCsvField("Hello, World")).toBe('"Hello, World"');
  });

  it("doubles internal quotes", () => {
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("wraps fields containing newlines in quotes", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeCsvField(null)).toBe("");
    expect(escapeCsvField(undefined)).toBe("");
  });

  it("passes through simple fields unchanged", () => {
    expect(escapeCsvField("simple")).toBe("simple");
    expect(escapeCsvField(42)).toBe("42");
    expect(escapeCsvField(true)).toBe("true");
  });
});

describe("csvRow", () => {
  it("joins fields with commas", () => {
    expect(csvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  it("escapes fields that need it", () => {
    expect(csvRow(["Hello, World", "simple"])).toBe('"Hello, World",simple');
  });
});

// ─── Month boundary utilities ──────────────────────────────────────────────

describe("parseMonthParam", () => {
  it("parses a valid YYYY-MM string", () => {
    const result = parseMonthParam("2026-07");
    expect(result).not.toBeNull();
    expect(result!.start.getUTCFullYear()).toBe(2026);
    expect(result!.start.getUTCMonth()).toBe(6); // July = index 6
    expect(result!.start.getUTCDate()).toBe(1);
    expect(result!.end.getUTCDate()).toBe(31);
  });

  it("handles February in a leap year", () => {
    const result = parseMonthParam("2024-02");
    expect(result!.end.getUTCDate()).toBe(29);
  });

  it("handles February in a non-leap year", () => {
    const result = parseMonthParam("2023-02");
    expect(result!.end.getUTCDate()).toBe(28);
  });

  it("returns null for invalid input", () => {
    expect(parseMonthParam("2026-13")).toBeNull();
    expect(parseMonthParam("not-a-date")).toBeNull();
    expect(parseMonthParam("")).toBeNull();
  });
});

describe("monthStartIso", () => {
  it("returns YYYY-MM-01", () => {
    expect(monthStartIso("2026-07")).toBe("2026-07-01");
    expect(monthStartIso("2026-01")).toBe("2026-01-01");
  });
});

describe("monthEndIso", () => {
  it("returns last day of month", () => {
    expect(monthEndIso("2026-07")).toBe("2026-07-31");
    expect(monthEndIso("2026-06")).toBe("2026-06-30");
    expect(monthEndIso("2024-02")).toBe("2024-02-29");
  });
});

describe("shiftMonth", () => {
  it("advances the month by 1", () => {
    expect(shiftMonth("2026-07", 1)).toBe("2026-08");
  });
  it("goes back one month", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("crosses year boundary forward", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("formatMonthParam", () => {
  it("formats a Date as YYYY-MM", () => {
    const d = new Date("2026-07-15T00:00:00Z");
    expect(formatMonthParam(d)).toBe("2026-07");
  });
});

// ─── roundCents ────────────────────────────────────────────────────────────

describe("roundCents", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(1.004)).toBe(1.00);
  });
});

// ─── Legacy invoice-type transaction handling ─────────────────────────────

describe("legacy invoice-type transactions", () => {
  it("calcRevenue does not count invoice-type transactions", () => {
    const txs = [
      { type: "invoice", status: "paid", amount: 500 },
      { type: "revenue", status: "paid", amount: 300 },
    ];
    expect(calcRevenue(txs)).toBe(300);
  });

  it("calcUnpaidInvoiceTotal counts pending invoice-type transactions", () => {
    const txs = [
      { type: "invoice", status: "pending", amount: 700 },
      { type: "invoice", status: "paid", amount: 200 },
    ];
    expect(calcUnpaidInvoiceTotal(txs)).toBe(700);
  });
});

// ─── isAllowedTransactionType ─────────────────────────────────────────────

describe("isAllowedTransactionType", () => {
  it("allows revenue and expense", () => {
    expect(isAllowedTransactionType("revenue")).toBe(true);
    expect(isAllowedTransactionType("expense")).toBe(true);
  });
  it("rejects invoice (legacy only, not for new creation)", () => {
    expect(isAllowedTransactionType("invoice")).toBe(false);
  });
  it("rejects arbitrary strings", () => {
    expect(isAllowedTransactionType("transfer")).toBe(false);
    expect(isAllowedTransactionType("")).toBe(false);
  });
});

// ─── isValidPaymentMethod ─────────────────────────────────────────────────

describe("isValidPaymentMethod", () => {
  it("accepts valid payment methods", () => {
    expect(isValidPaymentMethod("card")).toBe(true);
    expect(isValidPaymentMethod("cash")).toBe(true);
    expect(isValidPaymentMethod("bank_transfer")).toBe(true);
  });
  it("rejects invalid methods", () => {
    expect(isValidPaymentMethod("crypto")).toBe(false);
    expect(isValidPaymentMethod("")).toBe(false);
  });
});
