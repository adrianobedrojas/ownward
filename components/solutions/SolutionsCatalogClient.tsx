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
  const [showUpcoming, setShowUpcoming] = useState(false);

  const labels = isSpanish
    ? {
        finderTitle: "Buscador de soluciones",
        goal: "Objetivo",
        search: "Buscar",
        category: "Categoría",
        audience: "Audiencia",
        availability: "Disponibilidad",
        billing: "Modelo de cobro",
        availableNow: "Disponibles ahora",
        freeCore: "Inteligencia y herramientas esenciales gratis",
        freeCoreDescription:
          "Empieza con las herramientas principales de Ownward sin pagar por el acceso a la inteligencia básica.",
        premiumTools: "Herramientas premium opcionales",
        premiumToolsDescription:
          "Paga solo cuando necesites promoción, ejecución o infraestructura transaccional adicional.",
        comingSoon: "Próximamente",
        comingSoonDescription:
          "Estas soluciones permanecen en desarrollo y no están disponibles para compra ni uso todavía.",
        availableCount: "disponibles ahora",
        upcomingCount: "próximas",
        compare: "Comparar",
        clear: "Limpiar",
        viewDetails: "Ver detalle",
        openFree: "Abrir gratis",
        showUpcoming: "Ver soluciones próximas",
        hideUpcoming: "Ocultar soluciones próximas",
        noAvailableMatches:
          "No hay soluciones disponibles ahora con esos filtros.",
        noUpcomingMatches:
          "No hay soluciones próximas con esos filtros.",
        compareLimit: "Puedes comparar hasta tres soluciones.",
        availableStatus: "Disponible",
        comingSoonStatus: "Próximamente",
      }
    : {
        finderTitle: "Solution finder",
        goal: "Goal",
        search: "Search",
        category: "Category",
        audience: "Audience",
        availability: "Availability",
        billing: "Billing model",
        availableNow: "Available now",
        freeCore: "Free intelligence & core tools",
        freeCoreDescription:
          "Start with Ownward's core tools without paying for access to basic business intelligence.",
        premiumTools: "Optional premium tools",
        premiumToolsDescription:
          "Pay only when you need added promotion, execution, or transaction infrastructure.",
        comingSoon: "Coming soon",
        comingSoonDescription:
          "These solutions remain in development and are not yet available to purchase or use.",
        availableCount: "available now",
        upcomingCount: "upcoming",
        compare: "Compare",
        clear: "Clear",
        viewDetails: "View details",
        openFree: "Open free",
        showUpcoming: "View upcoming solutions",
        hideUpcoming: "Hide upcoming solutions",
        noAvailableMatches:
          "No currently available solutions match those filters.",
        noUpcomingMatches:
          "No upcoming solutions match those filters.",
        compareLimit: "You can compare up to three solutions.",
        availableStatus: "Available",
        comingSoonStatus: "Coming soon",
      };

  const categories = useMemo(() => {
    return [
      "all",
      ...Array.from(new Set(solutions.map((solution) => solution.category))),
    ];
  }, [solutions]);

  const audiences = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(solutions.flatMap((solution) => solution.audience))
      ),
    ];
  }, [solutions]);

  const statuses = useMemo(() => {
    return [
      "all",
      ...Array.from(new Set(solutions.map((solution) => solution.status))),
    ];
  }, [solutions]);

  const billingModels = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(solutions.map((solution) => solution.billingModel))
      ),
    ];
  }, [solutions]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return solutions.filter((solution) => {
      if (goal !== "all" && !solution.goals.includes(goal as never)) {
        return false;
      }

      if (category !== "all" && solution.category !== category) {
        return false;
      }

      if (
        audience !== "all" &&
        !solution.audience.includes(audience as never)
      ) {
        return false;
      }

      if (status !== "all" && solution.status !== status) {
        return false;
      }

      if (
        billingModel !== "all" &&
        solution.billingModel !== billingModel
      ) {
        return false;
      }

      if (
        prices.length > 0 &&
        !prices.includes(solution.displayPrice)
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

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
  }, [
    audience,
    billingModel,
    category,
    goal,
    prices,
    query,
    solutions,
    status,
  ]);

  const availableSolutions = useMemo(
    () =>
      filtered.filter(
        (solution) => solution.status === "active"
      ),
    [filtered]
  );

  const freeAvailableSolutions = useMemo(
    () =>
      availableSolutions.filter(
        (solution) =>
          solution.billingModel === "free" ||
          solution.displayPrice === 0
      ),
    [availableSolutions]
  );

  const premiumAvailableSolutions = useMemo(
    () =>
      availableSolutions.filter(
        (solution) =>
          solution.billingModel !== "free" &&
          solution.displayPrice > 0
      ),
    [availableSolutions]
  );

  const upcomingSolutions = useMemo(
    () =>
      filtered.filter(
        (solution) => solution.status !== "active"
      ),
    [filtered]
  );

  const shouldShowUpcoming =
    showUpcoming ||
    (status !== "all" && status !== "active") ||
    (availableSolutions.length === 0 &&
      upcomingSolutions.length > 0);

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

  function renderSolutionCard(solution: PublicSolution) {
    const isCompared = compareKeys.includes(solution.key);

    const isAvailable =
      solution.status === "active";

    const isFreeOpen =
      isAvailable &&
      solution.displayPrice === 0 &&
      solution.ctaBehavior === "open" &&
      Boolean(solution.accessRoute);

    return (
      <article
        key={solution.key}
        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">
            {solution.name}
          </h3>

          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
            {isAvailable
              ? labels.availableStatus
              : labels.comingSoonStatus}
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-300">
          {solution.description}
        </p>

        <p className="mt-2 text-xs text-slate-400">
          {solution.outcome}
        </p>

        <p className="mt-3 text-sm font-semibold text-cyan-300">
          {solution.displayPrice === 0
            ? isSpanish
              ? "Gratis"
              : "Free"
            : `$${solution.displayPrice}`}{" "}
          · {solution.billingContext}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isFreeOpen && solution.accessRoute ? (
            <Link
              href={solution.accessRoute}
              className="rounded-md bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-200"
            >
              {labels.openFree}
            </Link>
          ) : null}

          <Link
            href={`/solutions/${solution.slug}`}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-300"
          >
            {labels.viewDetails}
          </Link>

          <button
            type="button"
            aria-pressed={isCompared}
            onClick={() => toggleCompare(solution.key)}
            className={`rounded-md px-3 py-1.5 text-xs ${
              isCompared
                ? "bg-cyan-400 text-slate-950"
                : "border border-slate-700 text-slate-200"
            }`}
          >
            {labels.compare}
          </button>
        </div>
      </article>
    );
  }

  const compareItems = filtered.filter((solution) =>
    compareKeys.includes(solution.key)
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold text-white">
          {labels.finderTitle}
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs text-slate-400">
            {labels.goal}

            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
              value={goal}
              onChange={(event) =>
                setGoal(event.target.value)
              }
            >
              <option value="all">
                {isSpanish ? "Todos" : "All"}
              </option>

              <option value="increase_visibility">
                {isSpanish
                  ? "Visibilidad"
                  : "Visibility"}
              </option>

              <option value="improve_sale_readiness">
                {isSpanish
                  ? "Preparación para venta"
                  : "Sale readiness"}
              </option>

              <option value="improve_valuation">
                {isSpanish ? "Valoración" : "Valuation"}
              </option>

              <option value="run_transaction">
                {isSpanish
                  ? "Transacción"
                  : "Transaction"}
              </option>

              <option value="evaluate_acquisition">
                {isSpanish
                  ? "Adquisición"
                  : "Acquisition"}
              </option>
            </select>
          </label>

          <label className="text-xs text-slate-400 md:col-span-2 xl:col-span-2">
            {labels.search}

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder={
                isSpanish
                  ? "Palabras clave"
                  : "Keywords"
              }
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
            />
          </label>

          <label className="text-xs text-slate-400">
            {labels.category}

            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-400">
            {labels.audience}

            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
              value={audience}
              onChange={(event) =>
                setAudience(event.target.value)
              }
            >
              {audiences.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-400">
            {labels.availability}

            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
              value={status}
              onChange={(event) => {
                const nextStatus =
                  event.target.value;

                setStatus(nextStatus);

                if (
                  nextStatus !== "all" &&
                  nextStatus !== "active"
                ) {
                  setShowUpcoming(true);
                }
              }}
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-400">
            {labels.billing}

            <select
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-200"
              value={billingModel}
              onChange={(event) =>
                setBillingModel(event.target.value)
              }
            >
              {billingModels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
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
              className={`rounded-full border px-3 py-1 text-xs ${
                prices.includes(price)
                  ? "border-cyan-300 bg-cyan-400/20 text-cyan-200"
                  : "border-slate-700 text-slate-300"
              }`}
            >
              {price === 0
                ? isSpanish
                  ? "Gratis"
                  : "Free"
                : `$${price}`}
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
              setShowUpcoming(false);
            }}
            className="ml-auto rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300"
          >
            {labels.clear}
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
        <span>
          <strong className="font-semibold text-white">
            {availableSolutions.length}
          </strong>{" "}
          {labels.availableCount}
        </span>

        <span>
          <strong className="font-semibold text-slate-300">
            {upcomingSolutions.length}
          </strong>{" "}
          {labels.upcomingCount}
        </span>
      </div>

      {compareKeys.length >= 3 ? (
        <p className="text-xs text-amber-300">
          {labels.compareLimit}
        </p>
      ) : null}

      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            {labels.availableNow}
          </h2>
        </div>

        {freeAvailableSolutions.length > 0 ? (
          <div>
            <h3 className="text-xl font-semibold text-cyan-200">
              {labels.freeCore}
            </h3>

            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              {labels.freeCoreDescription}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {freeAvailableSolutions.map(
                renderSolutionCard
              )}
            </div>
          </div>
        ) : null}

        {premiumAvailableSolutions.length > 0 ? (
          <div>
            <h3 className="text-xl font-semibold text-white">
              {labels.premiumTools}
            </h3>

            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              {labels.premiumToolsDescription}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {premiumAvailableSolutions.map(
                renderSolutionCard
              )}
            </div>
          </div>
        ) : null}

        {availableSolutions.length === 0 ? (
          <p className="text-sm text-slate-400">
            {labels.noAvailableMatches}
          </p>
        ) : null}
      </section>

      {upcomingSolutions.length > 0 ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {labels.comingSoon}
              </h2>

              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                {labels.comingSoonDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowUpcoming(
                  (current) => !current
                )
              }
              className="w-fit rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-300"
            >
              {shouldShowUpcoming
                ? labels.hideUpcoming
                : labels.showUpcoming}
            </button>
          </div>

          {shouldShowUpcoming ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {upcomingSolutions.map(
                renderSolutionCard
              )}
            </div>
          ) : null}
        </section>
      ) : status !== "active" ? (
        <p className="text-sm text-slate-400">
          {labels.noUpcomingMatches}
        </p>
      ) : null}

      {compareItems.length > 0 ? (
        <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
          <h3 className="text-lg font-semibold text-cyan-200">
            {labels.compare}
          </h3>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {compareItems.map((solution) => (
              <div
                key={solution.key}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm"
              >
                <p className="font-semibold text-white">
                  {solution.name}
                </p>

                <p className="mt-1 text-slate-300">
                  {solution.displayPrice === 0
                    ? isSpanish
                      ? "Gratis"
                      : "Free"
                    : `$${solution.displayPrice}`}{" "}
                  · {solution.billingContext}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  {solution.status === "active"
                    ? labels.availableStatus
                    : labels.comingSoonStatus}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
    }
