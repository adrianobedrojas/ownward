"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  loadTaskPriorityRanking,
  recordTaskPairwiseChoice,
} from "@/app/[locale]/tasks/priority-actions";
import type { Task, TaskPriorityActionCode } from "@/app/[locale]/tasks/types";
import { selectNextTaskPair } from "@/lib/task-pairwise-ranking";
import TaskPriorityRanking from "./TaskPriorityRanking";

const SESSION_COMPARISON_LIMIT = 7;

interface TaskPriorityCompareProps {
  tasks: Task[];
  onOpenCreateTask: () => void;
  onTasksUpdated: (tasks: Task[]) => void;
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

function getFeedbackMessage(
  t: (key: string, values?: Record<string, string | number>) => string,
  code: TaskPriorityActionCode
) {
  switch (code) {
    case "choiceSaved":
      return t("feedback.choiceSaved");
    case "invalidTaskIds":
      return t("feedback.invalidTaskIds");
    case "notAuthenticated":
      return t("feedback.notAuthenticated");
    case "rankingLoaded":
      return t("feedback.rankingLoaded");
    case "genericError":
    default:
      return t("feedback.genericError");
  }
}

export default function TaskPriorityCompare({
  tasks,
  onOpenCreateTask,
  onTasksUpdated,
}: TaskPriorityCompareProps) {
  const t = useTranslations("Tasks.priorityCompare");
  const locale = useLocale();
  const [shownPairKeys, setShownPairKeys] = useState<string[]>([]);
  const [completedComparisons, setCompletedComparisons] = useState(0);
  const [isSavingChoice, setIsSavingChoice] = useState(false);
  const [isRoundFinished, setIsRoundFinished] = useState(false);
  const [liveMessage, setLiveMessage] = useState<string>("");

  const eligibleTasks = useMemo(() => tasks.filter((task) => task.status === "todo"), [tasks]);
  const shownPairKeySet = useMemo(() => new Set(shownPairKeys), [shownPairKeys]);
  const currentPair = useMemo(
    () =>
      completedComparisons >= SESSION_COMPARISON_LIMIT || isRoundFinished
        ? null
        : selectNextTaskPair(eligibleTasks, shownPairKeySet),
    [completedComparisons, eligibleTasks, isRoundFinished, shownPairKeySet]
  );

  const hasEnoughTasks = eligibleTasks.length >= 2;
  const hasReachedSessionLimit = completedComparisons >= SESSION_COMPARISON_LIMIT;
  const roundHasNoNewPairs = hasEnoughTasks && !currentPair && shownPairKeys.length > 0;
  const showRoundCompleteState = isRoundFinished || hasReachedSessionLimit || roundHasNoNewPairs;

  function markCurrentPairAsSeen() {
    if (!currentPair) {
      return;
    }

    setShownPairKeys((currentKeys) =>
      currentKeys.includes(currentPair.pairKey) ? currentKeys : [...currentKeys, currentPair.pairKey]
    );
  }

  function startAnotherRound() {
    setShownPairKeys([]);
    setCompletedComparisons(0);
    setIsRoundFinished(false);
    setLiveMessage(t("feedback.roundReset"));
  }

  async function handleChooseTask(winnerTaskId: string, loserTaskId: string) {
    if (!currentPair || isSavingChoice) {
      return;
    }

    setIsSavingChoice(true);
    const result = await recordTaskPairwiseChoice({ winnerTaskId, loserTaskId });

    if (!result.success) {
      setLiveMessage(getFeedbackMessage(t, result.code));
      setIsSavingChoice(false);
      return;
    }

    if (result.tasks && result.tasks.length > 0) {
      onTasksUpdated(result.tasks);
    }

    markCurrentPairAsSeen();
    setCompletedComparisons((currentValue) => currentValue + 1);

    const rankingResult = await loadTaskPriorityRanking();

    if (rankingResult.success && rankingResult.tasks) {
      onTasksUpdated(rankingResult.tasks);
    }

    const nextComparisonCount = completedComparisons + 1;
    const nextMessage =
      nextComparisonCount >= SESSION_COMPARISON_LIMIT
        ? t("feedback.sessionComplete")
        : t("feedback.choiceSaved");

    setLiveMessage(nextMessage);
    setIsSavingChoice(false);
  }

  function handleSkipPair() {
    if (!currentPair || isSavingChoice) {
      return;
    }

    markCurrentPairAsSeen();
    setLiveMessage(t("feedback.pairSkipped"));
  }

  function handleFinishRound() {
    setIsRoundFinished(true);
    setLiveMessage(t("feedback.sessionFinished"));
  }

  return (
    <section
      aria-labelledby="task-priority-compare-heading"
      className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            {t("eyebrow")}
          </p>
          <h2 id="task-priority-compare-heading" className="mt-2 text-2xl font-semibold text-white">
            {t("heading")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{t("description")}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
          {t("progress", {
            current: Math.min(completedComparisons, SESSION_COMPARISON_LIMIT),
            total: SESSION_COMPARISON_LIMIT,
          })}
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      {!hasEnoughTasks ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-8">
          <h3 className="text-lg font-semibold text-white">{t("emptyState.heading")}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {t("emptyState.description")}
          </p>
          <button
            type="button"
            onClick={onOpenCreateTask}
            className="mt-5 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 motion-safe:transition motion-safe:duration-200 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {t("emptyState.cta")}
          </button>
        </div>
      ) : showRoundCompleteState ? (
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/40 px-6 py-8">
          <h3 className="text-lg font-semibold text-white">{t("roundComplete.heading")}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            {hasReachedSessionLimit
              ? t("roundComplete.limitReached")
              : roundHasNoNewPairs
                ? t("roundComplete.noPairs")
                : t("roundComplete.finished")}
          </p>
          <button
            type="button"
            onClick={startAnotherRound}
            className="mt-5 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 motion-safe:transition motion-safe:duration-200 hover:border-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {t("actions.startAnotherRound")}
          </button>
        </div>
      ) : currentPair ? (
        <>
          <div className="mt-6">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
              {t("questionLabel")}
            </p>
            <p className="mt-2 text-xl font-semibold text-white">{t("question")}</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {[currentPair.firstTask, currentPair.secondTask].map((task) => {
              const dueDate = formatDueDate(task.due_date, locale);
              const otherTaskId =
                task.id === currentPair.firstTask.id
                  ? currentPair.secondTask.id
                  : currentPair.firstTask.id;

              return (
                <article
                  key={task.id}
                  className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {task.description || t("taskCard.noDescription")}
                    </p>

                    <dl className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {t("taskCard.manualPriorityLabel")}
                        </dt>
                        <dd className="mt-1 capitalize text-white">
                          {t(`priorities.${task.priority}`)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {t("taskCard.comparisonsLabel")}
                        </dt>
                        <dd className="mt-1 text-white">{task.pairwise_comparison_count}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {t("taskCard.dueDateLabel")}
                        </dt>
                        <dd className="mt-1 text-white">
                          {dueDate ? dueDate : t("taskCard.noDueDate")}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleChooseTask(task.id, otherTaskId)}
                    disabled={isSavingChoice}
                    aria-label={t("taskCard.chooseTaskAriaLabel", { title: task.title })}
                    className="mt-5 rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 motion-safe:transition motion-safe:duration-200 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingChoice ? t("loading.savingChoice") : t("taskCard.chooseTask")}
                  </button>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSkipPair}
              disabled={isSavingChoice}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 motion-safe:transition motion-safe:duration-200 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60"
            >
              {t("actions.skipPair")}
            </button>
            <button
              type="button"
              onClick={handleFinishRound}
              disabled={isSavingChoice}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 motion-safe:transition motion-safe:duration-200 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60"
            >
              {t("actions.finishComparing")}
            </button>
          </div>
        </>
      ) : null}

      <TaskPriorityRanking tasks={tasks} />
    </section>
  );
}
