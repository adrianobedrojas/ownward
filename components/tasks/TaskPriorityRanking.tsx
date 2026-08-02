"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Task } from "@/app/[locale]/tasks/types";

interface TaskPriorityRankingProps {
  tasks: Task[];
}

function formatDueDate(dateValue: string | null, locale: string) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function sortTasksByPairwiseRanking(tasks: Task[]) {
  return [...tasks]
    .filter((task) => task.status === "todo")
    .sort((left, right) => {
      if (left.pairwise_rating !== right.pairwise_rating) {
        return right.pairwise_rating - left.pairwise_rating;
      }

      if (left.pairwise_comparison_count !== right.pairwise_comparison_count) {
        return left.pairwise_comparison_count - right.pairwise_comparison_count;
      }

      if (left.due_date && right.due_date && left.due_date !== right.due_date) {
        return left.due_date.localeCompare(right.due_date);
      }

      if (left.due_date && !right.due_date) {
        return -1;
      }

      if (!left.due_date && right.due_date) {
        return 1;
      }

      return left.created_at.localeCompare(right.created_at);
    });
}

export default function TaskPriorityRanking({ tasks }: TaskPriorityRankingProps) {
  const t = useTranslations("Tasks.priorityCompare");
  const locale = useLocale();
  const rankedTasks = sortTasksByPairwiseRanking(tasks);

  return (
    <section
      aria-labelledby="task-priority-ranking-heading"
      className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h3 id="task-priority-ranking-heading" className="text-2xl font-semibold text-white">
          {t("ranking.heading")}
        </h3>
        <p className="text-sm leading-6 text-slate-300">{t("ranking.description")}</p>
        <p className="text-sm leading-6 text-slate-400">{t("ranking.disclaimer")}</p>
      </div>

      {rankedTasks.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-5 py-8 text-sm text-slate-300">
          {t("ranking.empty")}
        </div>
      ) : (
        <ol
          className="mt-6 space-y-3"
          aria-live="polite"
          aria-atomic="true"
          aria-label={t("ranking.liveRegionLabel")}
        >
          {rankedTasks.map((task, index) => {
            const dueDate = formatDueDate(task.due_date, locale);

            return (
              <li
                key={task.id}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-semibold text-cyan-200">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="truncate text-base font-semibold text-white">{task.title}</h4>
                        <p className="mt-1 text-sm text-slate-300">{t("ranking.guidanceLabel")}</p>
                      </div>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 gap-3 text-sm text-slate-300 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {t("ranking.ratingLabel")}
                      </dt>
                      <dd className="mt-1 text-base font-semibold text-white">
                        {task.pairwise_rating}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {t("ranking.comparisonsLabel")}
                      </dt>
                      <dd className="mt-1 text-base font-semibold text-white">
                        {task.pairwise_comparison_count}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {t("ranking.manualPriorityLabel")}
                      </dt>
                      <dd className="mt-1 text-base font-semibold capitalize text-white">
                        {t(`priorities.${task.priority}`)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1">
                    {dueDate
                      ? t("ranking.dueDateValue", { date: dueDate })
                      : t("ranking.noDueDate")}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1">
                    {t("ranking.winsValue", { count: task.pairwise_win_count })}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
