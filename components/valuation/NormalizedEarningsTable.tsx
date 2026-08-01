import type { NormalizedEarningsRow } from "@/lib/valuation/types";

interface Props {
  rows: NormalizedEarningsRow[];
  currency?: string;
}

function fmt(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function NormalizedEarningsTable({ rows, currency = "USD" }: Props) {
  return (
    <section
      aria-label="Normalized earnings reconciliation"
      className="rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
        Normalized earnings reconciliation
      </p>
      <p className="mt-1 text-xs text-slate-500">
        SDE (Seller&apos;s Discretionary Earnings) — the financial benefit available to a full-time owner-operator
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm" aria-label="Normalized earnings by year">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="pb-3 text-left font-semibold text-slate-400">Line item</th>
              {rows.map((r) => (
                <th
                  key={r.fiscalYear}
                  className="pb-3 text-right font-semibold text-slate-400"
                >
                  FY {r.fiscalYear}
                  <span className="ml-1 text-xs text-slate-600">
                    ({(r.weight * 100).toFixed(0)}%)
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr>
              <td className="py-2 text-slate-300">Revenue</td>
              {rows.map((r) => (
                <td key={r.fiscalYear} className="py-2 text-right text-slate-300 tabular-nums">
                  {fmt(r.revenue, currency)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 text-slate-400">Gross profit</td>
              {rows.map((r) => (
                <td key={r.fiscalYear} className="py-2 text-right text-slate-400 tabular-nums">
                  {fmt(r.grossProfit, currency)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 text-slate-400">Operating expenses</td>
              {rows.map((r) => (
                <td key={r.fiscalYear} className="py-2 text-right text-slate-400 tabular-nums">
                  ({fmt(r.operatingExpenses, currency)})
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 text-slate-300">Reported earnings</td>
              {rows.map((r) => (
                <td
                  key={r.fiscalYear}
                  className={`py-2 text-right tabular-nums font-medium ${
                    r.reportedEarnings >= 0 ? "text-slate-300" : "text-rose-400"
                  }`}
                >
                  {fmt(r.reportedEarnings, currency)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 text-emerald-400">+ Add-backs</td>
              {rows.map((r) => (
                <td key={r.fiscalYear} className="py-2 text-right text-emerald-400 tabular-nums">
                  +{fmt(r.totalAddBacks, currency)}
                </td>
              ))}
            </tr>
            {rows.some((r) => r.totalDeductions > 0) && (
              <tr>
                <td className="py-2 text-rose-400">− Deductions</td>
                {rows.map((r) => (
                  <td key={r.fiscalYear} className="py-2 text-right text-rose-400 tabular-nums">
                    -{fmt(r.totalDeductions, currency)}
                  </td>
                ))}
              </tr>
            )}
            <tr className="border-t border-slate-700">
              <td className="py-3 font-semibold text-white">Normalized SDE</td>
              {rows.map((r) => (
                <td
                  key={r.fiscalYear}
                  className="py-3 text-right font-bold tabular-nums text-cyan-300"
                >
                  {fmt(r.normalizedSDE, currency)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {rows.length > 1 && (
        <div className="mt-4 rounded-lg bg-slate-950/60 p-3 text-sm">
          <p className="text-slate-400">
            Weighted average:{" "}
            <span className="font-bold text-cyan-300">
              {fmt(
                rows.reduce((acc, r) => acc + r.normalizedSDE * r.weight, 0),
                currency
              )}
            </span>
            <span className="ml-2 text-xs text-slate-600">
              (most recent years weighted more heavily)
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
