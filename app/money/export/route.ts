import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  csvRow,
  CSV_HEADERS,
  monthStartIso,
  monthEndIso,
  currentMonthParam,
  getCategoryLabel,
  isValidCategory,
} from "@/lib/bookkeeping";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  // Never accept user ID from query string — always use the authenticated user
  const monthParam = url.searchParams.get("month") ?? currentMonthParam();
  const businessParam = url.searchParams.get("business") ?? null;

  // Validate month
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : currentMonthParam();

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .gte("transaction_date", monthStartIso(validMonth))
    .lte("transaction_date", monthEndIso(validMonth))
    .order("transaction_date", { ascending: false });

  // Validate business ownership before filtering
  if (businessParam) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessParam)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (biz) {
      // @ts-expect-error dynamic query builder
      query = query.eq("business_id", businessParam);
    }
  }

  const { data: transactions, error: txError } = await query;
  if (txError) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }

  const rows = [
    csvRow(CSV_HEADERS),
    ...(transactions ?? []).map((tx: {
      transaction_date: string;
      type: string;
      title: string;
      vendor?: string | null;
      category: string;
      amount: string | number;
      status: string;
      payment_method?: string | null;
      is_tax_deductible?: boolean;
      receipt_document_id?: string | null;
      review_status?: string;
      reconciled_at?: string | null;
      notes?: string | null;
    }) =>
      csvRow([
        tx.transaction_date,
        tx.type,
        tx.title,
        tx.vendor ?? "",
        isValidCategory(tx.category) ? getCategoryLabel(tx.category) : tx.category,
        Number(tx.amount).toFixed(2),
        tx.status,
        tx.payment_method ?? "",
        tx.is_tax_deductible ? "Yes" : "No",
        tx.receipt_document_id ? "Yes" : "No",
        tx.review_status === "reviewed" ? "Yes" : "No",
        tx.reconciled_at ? "Yes" : "No",
        tx.notes ?? "",
      ])
    ),
  ].join("\r\n");

  const filename = `ownward-books-${validMonth}.csv`;

  return new NextResponse(rows, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
