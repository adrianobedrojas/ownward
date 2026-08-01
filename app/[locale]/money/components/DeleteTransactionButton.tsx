"use client";

import { useState } from "react";
import { deleteTransaction } from "@/app/[locale]/money/actions";

interface Props {
  transactionId: string;
  transactionTitle: string;
  month?: string;
}

export default function DeleteTransactionButton({
  transactionId,
  transactionTitle,
  month,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-rose-400 hover:text-rose-300 text-xs font-medium"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 hidden sm:inline">Delete &ldquo;{transactionTitle.slice(0, 24)}&hellip;&rdquo;?</span>
      <form action={deleteTransaction}>
        <input type="hidden" name="transaction_id" value={transactionId} />
        {month && <input type="hidden" name="month" value={month} />}
        <button
          type="submit"
          className="text-xs font-semibold text-rose-400 hover:text-rose-300"
        >
          Confirm
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs text-slate-400 hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}
