"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const customerName = String(formData.get("customerName") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "");
  const status = String(formData.get("status") ?? "draft");
  const dueDate = String(formData.get("dueDate") ?? "").trim();

  if (!customerName) {
    throw new Error("Customer name is required.");
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Please enter a valid positive amount.");
  }

  if (!["draft", "unpaid", "paid"].includes(status)) {
    throw new Error("Invalid status.");
  }

  const { error } = await supabase.from("invoices").insert({
    user_id: user.id,
    customer_name: customerName,
    amount,
    status,
    due_date: dueDate || null,
  });

  if (error) {
    console.error("createInvoice error:", error.message);
    throw new Error("Failed to create invoice. Please try again.");
  }

  revalidatePath("/invoices");
}

export async function markInvoicePaid(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const invoiceId = String(formData.get("invoice_id") ?? "").trim();
  if (!invoiceId) {
    redirect("/invoices?error=MissingId");
  }

  // Call the atomic PostgreSQL function that both marks the invoice paid
  // and creates a revenue transaction in one transaction.
  // The function verifies ownership and prevents duplicate transactions.
  const { error: fnError } = await supabase.rpc("mark_invoice_paid", {
    p_invoice_id: invoiceId,
  });

  if (fnError) {
    console.error("markInvoicePaid error:", fnError.message);
    const msg =
      fnError.message.includes("invoice_already_paid")
        ? "InvoiceAlreadyPaid"
        : fnError.message.includes("invoice_not_found")
        ? "NotFound"
        : fnError.message.includes("transaction_already_exists")
        ? "DuplicateTransaction"
        : "DatabaseError";
    redirect(`/invoices?error=${msg}`);
  }

  revalidatePath("/invoices");
  revalidatePath("/money");
  redirect("/invoices?success=InvoicePaid");
}
