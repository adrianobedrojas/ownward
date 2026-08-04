"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { PublicSolution } from "@/lib/commerce/products";

type Props = {
  locale: "en" | "es";
  solutions: PublicSolution[];
};

export default function SolutionsCatalogClient({ locale, solutions }: Props) {
  const isSpanish = locale === "es";
  const [goal, setGoal] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [audience, setAudience] = useState("all");
  const [status, setStatus] = useState("all");
  const [billingModel, setBillingModel] = useState("all");
  const [prices, setPrices] = useState<number[]>([]);
  const [compareKeys, setCompareKeys] = useState<string[]>([]);

  const labels = isSpanish
    ? {
        finderTitle: "Buscador de soluciones",
        goal: "Objetivo",
        search: "Buscar",
        category: "Categoría",
        audience: "Audiencia",
        availability: "Disponibilidad",
        billing: "Modelo de cobro",
        price: "Precio",
        results: "resultados",
        compare: "Comparar",
        clear: "Limpiar",
        viewDetails: "Ver detalle",
        noMatches: "No hay soluciones con esos filtros.",
        compareLimit: "Puedes comparar hasta tres soluciones.",
      }
    : {
        finderTitle: "Solution finder",
        goal: "Goal",
        search: "Search",
        category: "Category",
        audience: "Audience",
        availability: "Availability",
        billing: "Billing model",
        price: "Price",
        results: "results",
        compare: "Compare",
        clear: "Clear",
        viewDetails: "View details",
        noMatches: "No solutions match those filters.",
        compareLimit: "You can compare up to three solutions.",
      };

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(solutions.map((solution) => solution.category)))];
  }, [solutions]);

  const audiences = useMemo(() => {
    return ["all", ...Array.from(new Set(solutions.flatMap((solution) => solution.audience)))];
  }, [solutions]);

  const statuses = useMemo(() => {
    return ["all", ...Array.from(new Set(solutions.map((solution) => solution.status)))];
  }, [solutions]);

  const billingModels = useMemo(() => {
    return ["all", ...Array.from(new Set(solutions.map((solution) => solution.billingModel)))];
  }, [solutions]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return solutions.filter((solution) => {
      if (goal !== "all" && !solution.goals.includes(goal as never)) return false;
      if (category !== "all" && solution.category !== category) return false;
      if (audience !== "all" && !solution.audience.includes(audience as never)) return false;
      if (status !== "all" && solution.status !== status) return false;
      if (billingModel !== "all" && solution.billingModel !== billingModel) return false;
      if (prices.length > 0 && !prices.includes(solution.displayPrice)) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        solution.name,
        solution.description,
        solution.outcome,
        solution.deliverables.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [audience, billingModel, category, goal, prices, query, solutions, status]);

  function togglePrice(price: number) {
    setPrices((current) =>
      current.includes(price)
        ? current.filter((value) => value !== price)
        : [...current, price]
    );
  }

  function toggleCompare(key: string) {
    setCompareKeys((current) => {
      if (current.includes(key)) {
        return current.filter((value) => value !== key);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, key];
    });
  }

  const compareItems = filtered.filter((solution) => compareKeys.includes(solution.key));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold text-white">{labels.finderTitle}</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs text-slate-400">
            {labels.goal}
            <select className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200" value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="all">All</option>
              <option value="increase_visibility">Visibility</option>
              <option value="improve_sale_readiness">Sale readiness</option>
              <option value="improve_valuation">Valuation</option>
              <option value="run_transaction">Transaction</option>
              <option value="evaluate_acquisition">Acquisition</option>
            </select>
          </label>

          <label className="text-xs text-slate-400 md:col-span-2 xl:col-span-2">
            {labels.search}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isSpanish ? "Palabras clave" : "Keywords"}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
            />
          </label>

          <label className="text-xs text-slate-400">
            {labels.category}
            <select className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-400">
            {labels.audience}
            <select className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200" value={audience} onChange={(e) => setAudience(e.target.value)}>
              {audiences.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-400">
            {labels.availability}
            <select className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200" value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-400">
            {labels.billing}
            <select className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200" value={billingModel} onChange={(e) => setBillingModel(e.target.value)}>
              {billingModels.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[0, 5, 10, 20].map((price) => (
            <button
              key={price}
              type="button"
              onClick={() => togglePrice(price)}
              className={`rounded-full border px-3 py-1 text-xs ${prices.includes(price) ? "border-cyan-300 bg-cyan-400/20 text-cyan-200" : "border-slate-700 text-slate-300"}`}
            >
              {price === 0 ? "Free" : `$${price}`}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setGoal("all");
              setQuery("");
              setCategory("all");
              setAudience("all");
              setStatus("all");
              setBillingModel("all");
              setPrices([]);
              setCompareKeys([]);
            }}
            className="ml-auto rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300"
          >
            {labels.clear}
          </button>
        </div>
      </section>

      <p className="text-sm text-slate-400">{filtered.length} {labels.results}</p>

      {compareKeys.length >= 3 ? (
        <p className="text-xs text-amber-300">{labels.compareLimit}</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((solution) => {
          const isCompared = compareKeys.includes(solution.key);
          return (
            <article key={solution.key} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{solution.name}</h3>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                  {solution.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-300">{solution.description}</p>
              <p className="mt-2 text-xs text-slate-400">{solution.outcome}</p>

              <p className="mt-3 text-sm font-semibold text-cyan-300">
                {solution.displayPrice === 0 ? "Free" : `$${solution.displayPrice}`} · {solution.billingContext}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <Link href={`/solutions/${solution.slug}`} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-300">
                  {labels.viewDetails}
                </Link>
                <button
                  type="button"
                  aria-pressed={isCompared}
                  onClick={() => toggleCompare(solution.key)}
                  className={`rounded-md px-3 py-1.5 text-xs ${isCompared ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-200"}`}
                >
                  {labels.compare}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {filtered.length === 0 ? <p className="text-sm text-slate-400">{labels.noMatches}</p> : null}

      {compareItems.length > 0 ? (
        <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
          <h3 className="text-lg font-semibold text-cyan-200">{labels.compare}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {compareItems.map((solution) => (
              <div key={solution.key} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm">
                <p className="font-semibold text-white">{solution.name}</p>
                <p className="mt-1 text-slate-300">{solution.displayPrice === 0 ? "Free" : `$${solution.displayPrice}`} · {solution.billingContext}</p>
                <p className="mt-2 text-xs text-slate-400">{solution.status}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
