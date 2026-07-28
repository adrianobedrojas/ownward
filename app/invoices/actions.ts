"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized: You must be logged in to create an invoice.");
  }

  const customerName = formData.get("customerName") as string;
  const amount = parseFloat(formData.get("amount") as string) || 0;
  const status = (formData.get("status") as string) || "draft";
  const dueDate = formData.get("dueDate") as string;

  if (!customerName || customerName.trim() === "") {
    throw new Error("Customer name is required.");
  }

  const { error } = await supabase.from("invoices").insert({
    user_id: user.id,
    customer_name: customerName.trim(),
    amount,
    status,
    due_date: dueDate || null,
  });

  if (error) {
    throw new Error(`Failed to create invoice: ${error.message}`);
  }

  revalidatePath("/invoices");
}
