"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createTask,
  deleteTask,
  toggleTaskCompletion,
  updateTask,
} from "@/app/tasks/actions";
import {
  TASK_PRIORITIES,
  type Task,
  type TaskPriority,
} from "@/app/tasks/types";

type TaskFilter = "today" | "upcoming" | "completed" | "all";

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

interface TaskManagerProps {
  initialTasks: Task[];
  initialError?: string;
}

interface TaskFormState {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
}

const DEFAULT_FORM_STATE: TaskFormState = {
  title: "",
  description: "",
  dueDate: "",
  priority: "medium",
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const aCompleted = a.status === "completed" ? 1 : 0;
    const bCompleted = b.status === "completed" ? 1 : 0;

    if (aCompleted !== bCompleted) {
      return aCompleted - bCompleted;
    }

    if (!a.due_date && b.due_date) {
      return 1;
    }

    if (a.due_date && !b.due_date) {
      return -1;
    }

    if (a.due_date && b.due_date && a.due_date !== b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }

    return b.created_at.localeCompare(a.created_at);
  });
}

function formatDueDate(dateValue: string | null) {
  if (!dateValue) {
    return "No due date";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const FILTER_LABELS: Record<TaskFilter, string> = {
  today: "Today",
  upcoming: "Upcoming",
  completed: "Completed",
  all: "All",
};

function getEmptyStateText(filter: TaskFilter) {
  if (filter === "today") {
    return "No tasks due today. Add one to keep momentum.";
  }

  if (filter === "upcoming") {
    return "No upcoming tasks. Add a future deadline to stay ahead.";
  }

  if (filter === "completed") {
    return "No completed tasks yet. Mark tasks done to see progress here.";
  }

  return "No tasks yet. Create your first task to get started.";
}

function priorityBadge(priority: TaskPriority) {
  if (priority === "high") {
    return "border-rose-500/40 bg-rose-500/10 text-rose-200";
  }

  if (priority === "low") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }

  return "border-amber-500/40 bg-amber-500/10 text-amber-200";
}

export default function TaskManager({ initialTasks, initialError }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>(() => sortTasks(initialTasks));
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingTaskAction, setPendingTaskAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(
    initialError ? { type: "error", message: initialError } : null
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [formState, setFormState] = useState<TaskFormState>(DEFAULT_FORM_STATE);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    dueDate?: string;
    priority?: string;
  }>({});

  const titleInputRef = useRef<HTMLInputElement>(null);

  const todayIsoDate = useMemo(() => getTodayIsoDate(), []);

  const counts = useMemo(() => {
    const dueToday = tasks.filter(
      (task) => task.status !== "completed" && task.due_date === todayIsoDate
    ).length;
    const upcoming = tasks.filter(
      (task) =>
        task.status !== "completed" &&
        task.due_date !== null &&
        task.due_date > todayIsoDate
    ).length;
    const completed = tasks.filter((task) => task.status === "completed").length;

    return { dueToday, upcoming, completed };
  }, [tasks, todayIsoDate]);

  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (activeFilter === "today") {
        return task.status !== "completed" && task.due_date === todayIsoDate;
      }

      if (activeFilter === "upcoming") {
        return (
          task.status !== "completed" &&
          task.due_date !== null &&
          task.due_date > todayIsoDate
        );
      }

      if (activeFilter === "completed") {
        return task.status === "completed";
      }

      return true;
    });

    return sortTasks(filtered);
  }, [activeFilter, tasks, todayIsoDate]);

  useEffect(() => {
    if (!isModalOpen || isSubmitting) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsModalOpen(false);
        setEditingTask(null);
        setFormState(DEFAULT_FORM_STATE);
        setFormErrors({});
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, isSubmitting]);

  useEffect(() => {
    if (isModalOpen) {
      titleInputRef.current?.focus();
    }
  }, [isModalOpen]);

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingTask(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormErrors({});
  }

  function openCreateModal() {
    setEditingTask(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);
    setFormState({
      title: task.title,
      description: task.description ?? "",
      dueDate: task.due_date ?? "",
      priority: task.priority,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function upsertTask(nextTask: Task) {
    setTasks((currentTasks) => {
      const existingTaskIndex = currentTasks.findIndex((task) => task.id === nextTask.id);

      if (existingTaskIndex === -1) {
        return sortTasks([nextTask, ...currentTasks]);
      }

      const updatedTasks = [...currentTasks];
      updatedTasks[existingTaskIndex] = nextTask;

      return sortTasks(updatedTasks);
    });
  }

  function validateFormInput() {
    const nextErrors: typeof formErrors = {};

    if (formState.title.trim().length === 0) {
      nextErrors.title = "Title is required.";
    }

    if (
      formState.dueDate.length > 0 &&
      !/^\d{4}-\d{2}-\d{2}$/.test(formState.dueDate)
    ) {
      nextErrors.dueDate = "Use the YYYY-MM-DD date format.";
    }

    if (!TASK_PRIORITIES.includes(formState.priority)) {
      nextErrors.priority = "Select a valid priority.";
    }

    setFormErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || !validateFormInput()) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const payload = {
      title: formState.title,
      description: formState.description,
      dueDate: formState.dueDate,
      priority: formState.priority,
    };

    const result = editingTask
      ? await updateTask({
          id: editingTask.id,
          status: editingTask.status,
          ...payload,
        })
      : await createTask(payload);

    if (!result.success) {
      setFeedback({
        type: "error",
        message: result.message,
      });
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        title: result.errors?.title ?? currentErrors.title,
        dueDate: result.errors?.dueDate ?? currentErrors.dueDate,
        priority: result.errors?.priority ?? currentErrors.priority,
      }));
      setIsSubmitting(false);
      return;
    }

    if (result.task) {
      upsertTask(result.task);
    }

    setFeedback({
      type: "success",
      message: result.message,
    });
    setIsSubmitting(false);
    closeModal();
  }

  async function handleToggleTask(task: Task) {
    if (pendingTaskAction) {
      return;
    }

    setPendingTaskAction(`toggle:${task.id}`);
    const result = await toggleTaskCompletion({
      id: task.id,
      completed: task.status !== "completed",
    });

    if (!result.success || !result.task) {
      setFeedback({
        type: "error",
        message: result.message,
      });
      setPendingTaskAction(null);
      return;
    }

    upsertTask(result.task);
    setFeedback({
      type: "success",
      message: result.message,
    });
    setPendingTaskAction(null);
  }

  async function handleDeleteTask(taskId: string) {
    if (pendingTaskAction) {
      return;
    }

    setPendingTaskAction(`delete:${taskId}`);
    const result = await deleteTask({ id: taskId });

    if (!result.success) {
      setFeedback({
        type: "error",
        message: result.message,
      });
      setPendingTaskAction(null);
      return;
    }

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    setTaskToDelete(null);
    setFeedback({
      type: "success",
      message: result.message,
    });
    setPendingTaskAction(null);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Ownward Run
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">Tasks</h1>
          <p className="mt-2 text-slate-400">
            Track customer work, follow-ups, appointments, and deadlines.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 motion-safe:transition motion-safe:duration-200 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          + Add task
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-6 rounded-xl border p-4 ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Due today</p>
          <p className="mt-2 text-3xl font-bold text-white">{counts.dueToday}</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Upcoming</p>
          <p className="mt-2 text-3xl font-bold text-white">{counts.upcoming}</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Completed</p>
          <p className="mt-2 text-3xl font-bold text-white">{counts.completed}</p>
        </article>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Task filters">
        {(Object.keys(FILTER_LABELS) as TaskFilter[]).map((filter) => {
          const isSelected = activeFilter === filter;

          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold motion-safe:transition motion-safe:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isSelected
                  ? "bg-cyan-400 text-slate-950"
                  : "border border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white"
              }`}
            >
              {FILTER_LABELS[filter]}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3" role="tabpanel" aria-label={`${FILTER_LABELS[activeFilter]} tasks`}>
        {visibleTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-white">No matching tasks</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-400">
              {getEmptyStateText(activeFilter)}
            </p>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isOverdue =
              task.status !== "completed" &&
              task.due_date !== null &&
              task.due_date < todayIsoDate;
            const isTogglePending = pendingTaskAction === `toggle:${task.id}`;
            const isDeletePending = pendingTaskAction === `delete:${task.id}`;

            return (
              <article
                key={task.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 motion-safe:transition motion-safe:duration-200 hover:border-slate-700"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        disabled={isTogglePending || isDeletePending}
                        aria-label={
                          task.status === "completed"
                            ? `Mark ${task.title} as not completed`
                            : `Mark ${task.title} as completed`
                        }
                        className="mt-0.5 h-5 w-5 shrink-0 rounded border border-slate-600 bg-slate-950 text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                      >
                        {task.status === "completed" ? "✓" : ""}
                      </button>

                      <div className="min-w-0">
                        <h2
                          className={`text-lg font-semibold text-white motion-safe:transition motion-safe:duration-200 ${
                            task.status === "completed" ? "text-slate-400 line-through" : ""
                          }`}
                        >
                          {task.title}
                        </h2>

                        {task.description && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full border px-2.5 py-1 font-semibold uppercase tracking-wider ${priorityBadge(
                          task.priority
                        )}`}
                      >
                        Priority: {task.priority}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 font-semibold uppercase tracking-wider text-slate-300">
                        Status: {task.status === "completed" ? "Completed" : "To do"}
                      </span>

                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 font-medium text-slate-300">
                        Due: {formatDueDate(task.due_date)}
                      </span>

                      {isOverdue && (
                        <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-semibold text-rose-200">
                          Overdue • Action needed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(task)}
                      disabled={isDeletePending || isTogglePending}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 motion-safe:transition motion-safe:duration-200 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                    >
                      Edit
                    </button>

                    {taskToDelete === task.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(null)}
                          disabled={isDeletePending}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 motion-safe:transition motion-safe:duration-200 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={isDeletePending}
                          className="rounded-lg border border-rose-500/50 px-3 py-2 text-xs font-semibold text-rose-200 motion-safe:transition motion-safe:duration-200 hover:bg-rose-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                          aria-label={`Confirm delete ${task.title}`}
                        >
                          {isDeletePending ? "Deleting..." : "Confirm delete"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTaskToDelete(task.id)}
                        disabled={isDeletePending || isTogglePending}
                        className="rounded-lg border border-rose-500/50 px-3 py-2 text-sm font-semibold text-rose-200 motion-safe:transition motion-safe:duration-200 hover:bg-rose-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/80 p-4 sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-slate-950 motion-safe:transition motion-safe:duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
                  {editingTask ? "Edit task" : "New task"}
                </p>
                <h2 id="task-modal-title" className="mt-2 text-2xl font-bold text-white">
                  {editingTask ? "Update task details" : "Create a new task"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 motion-safe:transition motion-safe:duration-200 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                aria-label="Close task form"
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="task-title" className="text-sm font-medium text-slate-200">
                  Title
                </label>
                <input
                  id="task-title"
                  name="title"
                  ref={titleInputRef}
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      title: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  maxLength={160}
                  required
                />
                {formErrors.title && (
                  <p className="mt-1 text-sm text-rose-300">{formErrors.title}</p>
                )}
              </div>

              <div>
                <label htmlFor="task-description" className="text-sm font-medium text-slate-200">
                  Description (optional)
                </label>
                <textarea
                  id="task-description"
                  name="description"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="task-due-date" className="text-sm font-medium text-slate-200">
                    Due date (optional)
                  </label>
                  <input
                    id="task-due-date"
                    name="dueDate"
                    type="date"
                    value={formState.dueDate}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        dueDate: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  />
                  {formErrors.dueDate && (
                    <p className="mt-1 text-sm text-rose-300">{formErrors.dueDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="task-priority" className="text-sm font-medium text-slate-200">
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    name="priority"
                    value={formState.priority}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        priority: event.target.value as TaskPriority,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    {TASK_PRIORITIES.map((priorityOption) => (
                      <option key={priorityOption} value={priorityOption}>
                        {priorityOption[0].toUpperCase() + priorityOption.slice(1)}
                      </option>
                    ))}
                  </select>
                  {formErrors.priority && (
                    <p className="mt-1 text-sm text-rose-300">{formErrors.priority}</p>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 motion-safe:transition motion-safe:duration-200 hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 motion-safe:transition motion-safe:duration-200 hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Saving..." : editingTask ? "Save changes" : "Save task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
