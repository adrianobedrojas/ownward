"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addTransaction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "0");
  const type = String(formData.get("type") ?? "revenue");
  const status = String(formData.get("status") ?? "paid");
  const category = String(formData.get("category") ?? "General");
  const transaction_date = String(formData.get("transaction_date") ?? new Date().toISOString().split("T")[0]);

  const amount = parseFloat(amountStr);

  if (!title || isNaN(amount) || amount <= 0) {
    redirect("/money?error=InvalidInput");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { error: dbError } = await supabase.from("transactions").insert({
    user_id: user.id,
    title,
    amount,
    type,
    status,
    category,
    transaction_date,
  });

  if (dbError) {
    console.error("Database insert error:", dbError.message);
    redirect("/money?error=DatabaseError");
  }

  redirect("/money?success=Added");
}
