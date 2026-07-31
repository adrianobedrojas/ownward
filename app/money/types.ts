/**
 * app/money/types.ts
 *
 * TypeScript types for the Ownward Books / money module.
 */

export interface Transaction {
  id: string;
  user_id: string;
  title: string;
  amount: string | number; // numeric from Supabase
  type: string;            // 'revenue' | 'expense' | 'invoice' (legacy)
  status: string;          // 'paid' | 'pending'
  category: string;
  transaction_date: string; // ISO date "YYYY-MM-DD"
  created_at: string;
  // New fields (may be null for legacy rows)
  business_id: string | null;
  vendor: string | null;
  payment_method: string | null;
  tax_category: string | null;
  is_tax_deductible: boolean;
  receipt_document_id: string | null;
  review_status: string;   // 'needs_review' | 'reviewed'
  source: string;          // 'manual' | 'invoice' | 'import'
  notes: string | null;
  reconciled_at: string | null;
  updated_at: string;
  invoice_id: string | null;
}

export interface BookkeepingPeriod {
  id: string;
  user_id: string;
  business_id: string | null;
  month_start: string; // "YYYY-MM-DD"
  status: string;      // 'open' | 'closed'
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentOption {
  id: string;
  filename: string;
  folder: string | null;
}

export interface BusinessOption {
  id: string;
  name: string;
}

export interface MoneyPageParams {
  month?: string;          // YYYY-MM
  type?: string;
  category?: string;
  search?: string;
  review?: string;
  showForm?: string;
  error?: string;
  success?: string;
  business?: string;
}
