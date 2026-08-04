"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedTransactionType,
  isValidCategory,
  isValidPaymentMethod,
  isValidReviewStatus,
  monthStartIso,
  monthEndIso,
} from "@/lib/bookkeeping";
import { getUserBillingState, checkBookkeepingAccess } from "@/lib/billing";
import { canReadFinance, canWriteFinance } from "@/lib/business-access";

// ─── Helpers ────────────────────────────────────────────────────────────────

function backToMoney(params: Record<string, string> = {}): never {
  const query = new URLSearchParams(params).toString();
  redirect(`/money${query ? `?${query}` : ""}`);
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
}

/** Verify bookkeeping write permission for a business if provided. */
async function verifyBusinessWriteAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  businessId: string | null
): Promise<boolean> {
  if (!businessId) return true;
  return canWriteFinance(userId, businessId);
}

/** Verify a document belongs to the authenticated user. */
async function verifyDocumentOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  documentId: string | null
): Promise<boolean> {
  if (!documentId) return true;
  const { data } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/** Verify a transaction belongs to the authenticated user and is not in a closed period. */
async function verifyTransactionAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  transactionId: string,
  mode: "read" | "write"
): Promise<{ ok: boolean; transaction?: { transaction_date: string; business_id: string | null } }> {
  const { data } = await supabase
    .from("transactions")
    .select("id, user_id, transaction_date, business_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (!data) return { ok: false };

  if (!data.business_id) {
    return {
      ok: data.user_id === userId,
      transaction: data as { transaction_date: string; business_id: string | null },
    };
  }

  const allowed = mode === "read"
    ? await canReadFinance(userId, data.business_id)
    : await canWriteFinance(userId, data.business_id);

  if (!allowed) return { ok: false };
  return { ok: true, transaction: data };
}

/** Resolve the month from a transaction date to check if period is closed. */
async function isPeriodClosed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  transactionDate: string
): Promise<boolean> {
  const monthStart = transactionDate.slice(0, 7) + "-01"; // YYYY-MM-01
  const { data } = await supabase
    .from("bookkeeping_periods")
    .select("status")
    .eq("user_id", userId)
    .eq("month_start", monthStart)
    .maybeSingle();
  return data?.status === "closed";
}

/** Enforce bookkeeping write access (Builder-or-higher). Redirects on failure. */
async function requireBookkeepingWrite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<void> {
  const billing = await getUserBillingState(supabase, userId);
  const result = checkBookkeepingAccess(billing.entitlements);
  if (!result.allowed) backToMoney({ error: "BookkeepingUpgradeRequired" });
}

// ─── Add transaction ─────────────────────────────────────────────────────────

export async function addTransaction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Enforce bookkeeping write access (server-side, never trust client)
  await requireBookkeepingWrite(supabase, user.id);

  const title         = String(formData.get("title") ?? "").trim();
  const amountStr     = String(formData.get("amount") ?? "");
  const type          = String(formData.get("type") ?? "");
  const status        = String(formData.get("status") ?? "paid");
  const category      = String(formData.get("category") ?? "");
  const txDate        = String(formData.get("transaction_date") ?? new Date().toISOString().slice(0, 10));
  const vendor        = String(formData.get("vendor") ?? "").trim();
  const paymentMethod = String(formData.get("payment_method") ?? "").trim();
  const notes         = String(formData.get("notes") ?? "").trim();
  const businessId    = String(formData.get("business_id") ?? "").trim() || null;
  const documentId    = String(formData.get("receipt_document_id") ?? "").trim() || null;
  const isTaxDed      = formData.get("is_tax_deductible") === "on";
  const monthParam    = String(formData.get("month") ?? "").trim() || undefined;

  // Validate inputs
  if (!title || title.length > 250) backToMoney({ error: "InvalidTitle" });

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0 || amount > 999_999_999)
    backToMoney({ error: "InvalidAmount" });

  if (!isAllowedTransactionType(type)) backToMoney({ error: "InvalidType" });
  if (!["paid", "pending"].includes(status)) backToMoney({ error: "InvalidStatus" });
  if (!isValidCategory(category)) backToMoney({ error: "InvalidCategory" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(txDate)) backToMoney({ error: "InvalidDate" });
  if (paymentMethod && !isValidPaymentMethod(paymentMethod))
    backToMoney({ error: "InvalidPaymentMethod" });

  if (businessId && !(await verifyBusinessWriteAccess(supabase, user.id, businessId)))
    backToMoney({ error: "InvalidBusiness" });

  if (documentId && !(await verifyDocumentOwnership(supabase, user.id, documentId)))
    backToMoney({ error: "InvalidDocument" });

  // Check period is not closed
  if (await isPeriodClosed(supabase, user.id, txDate))
    backToMoney({ error: "PeriodClosed" });

  const { error: dbError } = await supabase.from("transactions").insert({
    user_id: user.id,
    title,
    amount: roundAmount(amount),
    type,
    status,
    category,
    transaction_date: txDate,
    vendor: vendor || null,
    payment_method: paymentMethod || null,
    notes: notes || null,
    business_id: businessId,
    receipt_document_id: documentId,
    is_tax_deductible: isTaxDed,
    review_status: "needs_review",
    source: "manual",
  });

  if (dbError) {
    console.error("addTransaction db error:", dbError.message);
    backToMoney({ error: "DatabaseError" });
  }

  revalidatePath("/money");
  const params: Record<string, string> = { success: "Added" };
  if (monthParam) params.month = monthParam;
  backToMoney(params);
}

// ─── Update transaction ──────────────────────────────────────────────────────

export async function updateTransaction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Enforce bookkeeping write access
  await requireBookkeepingWrite(supabase, user.id);

  const transactionId = String(formData.get("transaction_id") ?? "").trim();
  const title         = String(formData.get("title") ?? "").trim();
  const amountStr     = String(formData.get("amount") ?? "");
  const type          = String(formData.get("type") ?? "");
  const status        = String(formData.get("status") ?? "paid");
  const category      = String(formData.get("category") ?? "");
  const txDate        = String(formData.get("transaction_date") ?? "");
  const vendor        = String(formData.get("vendor") ?? "").trim();
  const paymentMethod = String(formData.get("payment_method") ?? "").trim();
  const notes         = String(formData.get("notes") ?? "").trim();
  const businessId    = String(formData.get("business_id") ?? "").trim() || null;
  const documentId    = String(formData.get("receipt_document_id") ?? "").trim() || null;
  const isTaxDed      = formData.get("is_tax_deductible") === "on";
  const monthParam    = String(formData.get("month") ?? "").trim() || undefined;

  if (!transactionId) redirect("/money?error=MissingId");

  // Verify ownership
  const txAccess = await verifyTransactionAccess(supabase, user.id, transactionId, "write");
  if (!txAccess.ok) redirect("/money?error=NotFound");

  // Validate inputs
  if (!title || title.length > 250) redirect(`/money/${transactionId}/edit?error=InvalidTitle`);

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0 || amount > 999_999_999)
    redirect(`/money/${transactionId}/edit?error=InvalidAmount`);

  if (!isAllowedTransactionType(type))
    redirect(`/money/${transactionId}/edit?error=InvalidType`);
  if (!["paid", "pending"].includes(status))
    redirect(`/money/${transactionId}/edit?error=InvalidStatus`);
  if (!isValidCategory(category))
    redirect(`/money/${transactionId}/edit?error=InvalidCategory`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(txDate))
    redirect(`/money/${transactionId}/edit?error=InvalidDate`);
  if (paymentMethod && !isValidPaymentMethod(paymentMethod))
    redirect(`/money/${transactionId}/edit?error=InvalidPaymentMethod`);

  if (businessId && !(await verifyBusinessWriteAccess(supabase, user.id, businessId)))
    redirect(`/money/${transactionId}/edit?error=InvalidBusiness`);

  if (documentId && !(await verifyDocumentOwnership(supabase, user.id, documentId)))
    redirect(`/money/${transactionId}/edit?error=InvalidDocument`);

  // Check original period is not closed
  if (txAccess.transaction && await isPeriodClosed(supabase, user.id, txAccess.transaction.transaction_date))
    redirect(`/money/${transactionId}/edit?error=PeriodClosed`);

  // If changing date, also check new period is not closed
  if (txDate !== txAccess.transaction?.transaction_date && await isPeriodClosed(supabase, user.id, txDate))
    redirect(`/money/${transactionId}/edit?error=PeriodClosed`);

  const { error: dbError } = await supabase
    .from("transactions")
    .update({
      title,
      amount: roundAmount(amount),
      type,
      status,
      category,
      transaction_date: txDate,
      vendor: vendor || null,
      payment_method: paymentMethod || null,
      notes: notes || null,
      business_id: businessId,
      receipt_document_id: documentId,
      is_tax_deductible: isTaxDed,
    })
    .eq("id", transactionId);

  if (dbError) {
    console.error("updateTransaction db error:", dbError.message);
    redirect(`/money/${transactionId}/edit?error=DatabaseError`);
  }

  revalidatePath("/money");
  const params: Record<string, string> = { success: "Updated" };
  if (monthParam) params.month = monthParam;
  backToMoney(params);
}

// ─── Delete transaction ──────────────────────────────────────────────────────

export async function deleteTransaction(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  const transactionId = String(formData.get("transaction_id") ?? "").trim();
  const monthParam    = String(formData.get("month") ?? "").trim() || undefined;

  if (!transactionId) backToMoney({ error: "MissingId" });

  const txAccess = await verifyTransactionAccess(supabase, user.id, transactionId, "write");
  if (!txAccess.ok) backToMoney({ error: "NotFound" });

  if (txAccess.transaction && await isPeriodClosed(supabase, user.id, txAccess.transaction.transaction_date))
    backToMoney({ error: "PeriodClosed" });

  const { error: dbError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (dbError) {
    console.error("deleteTransaction db error:", dbError.message);
    backToMoney({ error: "DatabaseError" });
  }

  revalidatePath("/money");
  const params: Record<string, string> = { success: "Deleted" };
  if (monthParam) params.month = monthParam;
  backToMoney(params);
}

// ─── Mark reviewed ────────────────────────────────────────────────────────────

export async function markTransactionReviewed(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Enforce bookkeeping write access
  await requireBookkeepingWrite(supabase, user.id);

  const transactionId = String(formData.get("transaction_id") ?? "").trim();
  const reviewStatus  = String(formData.get("review_status") ?? "reviewed");
  const monthParam    = String(formData.get("month") ?? "").trim() || undefined;

  if (!transactionId || !isValidReviewStatus(reviewStatus))
    backToMoney({ error: "InvalidInput" });

  const txAccess = await verifyTransactionAccess(supabase, user.id, transactionId, "write");
  if (!txAccess.ok) backToMoney({ error: "NotFound" });

  if (txAccess.transaction && await isPeriodClosed(supabase, user.id, txAccess.transaction.transaction_date))
    backToMoney({ error: "PeriodClosed" });

  await supabase
    .from("transactions")
    .update({ review_status: reviewStatus })
    .eq("id", transactionId);

  revalidatePath("/money");
  const params: Record<string, string> = {};
  if (monthParam) params.month = monthParam;
  backToMoney(params);
}

// ─── Mark reconciled ─────────────────────────────────────────────────────────

export async function toggleTransactionReconciled(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Enforce bookkeeping write access
  await requireBookkeepingWrite(supabase, user.id);

  const transactionId = String(formData.get("transaction_id") ?? "").trim();
  const reconcile     = formData.get("reconcile") === "true";
  const monthParam    = String(formData.get("month") ?? "").trim() || undefined;

  if (!transactionId) backToMoney({ error: "MissingId" });

  const txAccess = await verifyTransactionAccess(supabase, user.id, transactionId, "write");
  if (!txAccess.ok) backToMoney({ error: "NotFound" });

  if (txAccess.transaction && await isPeriodClosed(supabase, user.id, txAccess.transaction.transaction_date))
    backToMoney({ error: "PeriodClosed" });

  await supabase
    .from("transactions")
    .update({ reconciled_at: reconcile ? new Date().toISOString() : null })
    .eq("id", transactionId);

  revalidatePath("/money");
  const params: Record<string, string> = {};
  if (monthParam) params.month = monthParam;
  backToMoney(params);
}

// ─── Close / reopen month ─────────────────────────────────────────────────────

export async function closeMonth(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Enforce bookkeeping write access
  await requireBookkeepingWrite(supabase, user.id);

  const monthParam  = String(formData.get("month") ?? "").trim();
  const businessId  = String(formData.get("business_id") ?? "").trim() || null;

  if (!monthParam || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam))
    backToMoney({ error: "InvalidMonth" });

  if (businessId && !(await verifyBusinessWriteAccess(supabase, user.id, businessId)))
    backToMoney({ error: "InvalidBusiness" });

  const monthStart = monthStartIso(monthParam);

  // Check all transactions in this month are reviewed and categorized
  const { data: txs } = await supabase
    .from("transactions")
    .select("id, review_status, category")
    .eq("user_id", user.id)
    .gte("transaction_date", monthStart)
    .lte("transaction_date", monthEndIso(monthParam));

  const list = txs ?? [];
  const unchecked = list.filter(
    (t) => t.review_status !== "reviewed" || !isValidCategory(t.category)
  );

  if (unchecked.length > 0) {
    backToMoney({ error: "PeriodNotReady", month: monthParam });
  }

  const { error: dbError } = await supabase
    .from("bookkeeping_periods")
    .upsert(
      {
        user_id: user.id,
        business_id: businessId,
        month_start: monthStart,
        status: "closed",
        closed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month_start", ignoreDuplicates: false }
    );

  if (dbError) {
    console.error("closeMonth db error:", dbError.message);
    backToMoney({ error: "DatabaseError", month: monthParam });
  }

  revalidatePath("/money");
  backToMoney({ success: "MonthClosed", month: monthParam });
}

export async function reopenMonth(formData: FormData) {
  const { supabase, user } = await getAuthenticatedUser();

  // Enforce bookkeeping write access
  await requireBookkeepingWrite(supabase, user.id);

  const monthParam  = String(formData.get("month") ?? "").trim();
  const businessId  = String(formData.get("business_id") ?? "").trim() || null;

  if (!monthParam || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam))
    backToMoney({ error: "InvalidMonth" });

  if (businessId && !(await verifyBusinessWriteAccess(supabase, user.id, businessId)))
    backToMoney({ error: "InvalidBusiness" });

  const monthStart = monthStartIso(monthParam);

  await supabase
    .from("bookkeeping_periods")
    .update({ status: "open", closed_at: null })
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .eq("status", "closed");

  revalidatePath("/money");
  backToMoney({ success: "MonthReopened", month: monthParam });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}
