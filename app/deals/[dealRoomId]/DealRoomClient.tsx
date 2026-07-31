"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateDealRoomStage,
  closeDealRoom,
  inviteDealRoomMember,
  removeDealRoomMember,
  uploadDealRoomDocument,
  deleteDealRoomDocument,
  createDocumentRequest,
  completeDocumentRequest,
} from "@/app/deals/actions";
import type {
  DealRoomMember,
  DealRoomDocument,
  DealRoomRequest,
  DealRoomActivity,
} from "./page";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  dealRoomId: string;
  conversationId: string;
  stage: string;
  status: string;
  isSeller: boolean;
  currentUserId: string;
  members: DealRoomMember[];
  documents: DealRoomDocument[];
  requests: DealRoomRequest[];
  activity: DealRoomActivity[];
  profileMap: Record<string, { full_name: string | null }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  information_review: "Information review",
  due_diligence: "Due diligence",
  offer_review: "Offer review",
  closing: "Closing",
  completed: "Completed",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  closed: "Closed",
  withdrawn: "Withdrawn",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  paused: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  closed: "text-slate-400 bg-slate-800 border-slate-700",
  withdrawn: "text-rose-400 bg-rose-400/10 border-rose-400/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-400",
  normal: "text-slate-300",
  high: "text-amber-400",
  urgent: "text-rose-400",
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ACTIVITY_LABELS: Record<string, string> = {
  deal_room_created: "Deal Room created",
  stage_changed: "Stage updated",
  status_changed: "Status updated",
  member_invited: "Member invited",
  member_removed: "Member removed",
  document_uploaded: "Document uploaded",
  document_deleted: "Document deleted",
  request_created: "Request created",
  request_updated: "Request updated",
  request_completed: "Request completed",
};

const ROLE_LABELS: Record<string, string> = {
  seller: "Seller",
  buyer: "Buyer",
  advisor: "Advisor",
  accountant: "Accountant",
  attorney: "Attorney",
};

type Tab = "overview" | "documents" | "requests" | "participants" | "activity";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function DealRoomClient({
  dealRoomId,
  conversationId,
  stage,
  status,
  isSeller,
  currentUserId,
  members,
  documents,
  requests,
  activity,
  profileMap,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [currentStage, setCurrentStage] = useState(stage);
  const [currentStatus, setCurrentStatus] = useState(status);

  const isClosed = currentStatus === "closed" || currentStatus === "withdrawn";
  const openRequests = requests.filter((r) => r.status === "open");

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }
  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }

  function getName(userId: string | null): string {
    if (!userId) return "External member";
    return profileMap[userId]?.full_name ?? "Ownward member";
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleStageChange(newStage: string) {
    const fd = new FormData();
    fd.append("dealRoomId", dealRoomId);
    fd.append("stage", newStage);
    startTransition(async () => {
      const result = await updateDealRoomStage(fd);
      if (result.error) { showError(result.error); return; }
      setCurrentStage(newStage);
      showFeedback("Stage updated.");
    });
  }

  function handleStatusChange(newStatus: string) {
    const fd = new FormData();
    fd.append("dealRoomId", dealRoomId);
    fd.append("status", newStatus);
    startTransition(async () => {
      const result = await closeDealRoom(fd);
      if (result.error) { showError(result.error); return; }
      setCurrentStatus(newStatus);
      showFeedback("Status updated.");
    });
  }

  function handleRemoveMember(memberId: string) {
    const fd = new FormData();
    fd.append("dealRoomId", dealRoomId);
    fd.append("memberId", memberId);
    startTransition(async () => {
      const result = await removeDealRoomMember(fd);
      if (result.error) showError(result.error);
      else showFeedback("Member removed.");
    });
  }

  function handleDeleteDocument(documentId: string) {
    const fd = new FormData();
    fd.append("documentId", documentId);
    startTransition(async () => {
      const result = await deleteDealRoomDocument(fd);
      if (result.error) showError(result.error);
      else showFeedback("Document deleted.");
    });
  }

  function handleCompleteRequest(requestId: string) {
    const fd = new FormData();
    fd.append("requestId", requestId);
    startTransition(async () => {
      const result = await completeDocumentRequest(fd);
      if (result.error) showError(result.error);
      else showFeedback("Request marked complete.");
    });
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "documents", label: "Documents", badge: documents.length },
    {
      key: "requests",
      label: "Requests",
      badge: openRequests.length > 0 ? openRequests.length : undefined,
    },
    { key: "participants", label: "Participants", badge: members.filter((m) => m.membership_status === "active").length },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Status/Stage bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[currentStatus] ?? "text-slate-400 bg-slate-800 border-slate-700"}`}
        >
          {STATUS_LABELS[currentStatus] ?? currentStatus}
        </span>
        <span className="text-slate-600">·</span>
        <span className="text-sm text-slate-300">
          {STAGE_LABELS[currentStage] ?? currentStage}
        </span>

        {isSeller && !isClosed && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={currentStage}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={isPending}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              aria-label="Update stage"
            >
              {Object.entries(STAGE_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isPending}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              aria-label="Update status"
            >
              {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Feedback banners */}
      {feedback && (
        <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === t.key
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
            {t.badge !== undefined && (
              <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-xs text-cyan-300">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "overview" && (
        <OverviewTab
          openRequests={openRequests.length}
          totalDocs={documents.length}
          memberCount={members.filter((m) => m.membership_status === "active").length}
          stage={currentStage}
          status={currentStatus}
          conversationId={conversationId}
        />
      )}

      {activeTab === "documents" && (
        <DocumentsTab
          dealRoomId={dealRoomId}
          documents={documents}
          currentUserId={currentUserId}
          isSeller={isSeller}
          isClosed={isClosed}
          isPending={isPending}
          onDelete={handleDeleteDocument}
        />
      )}

      {activeTab === "requests" && (
        <RequestsTab
          dealRoomId={dealRoomId}
          requests={requests}
          currentUserId={currentUserId}
          isClosed={isClosed}
          isPending={isPending}
          profileMap={profileMap}
          onComplete={handleCompleteRequest}
        />
      )}

      {activeTab === "participants" && (
        <ParticipantsTab
          dealRoomId={dealRoomId}
          members={members}
          isSeller={isSeller}
          isClosed={isClosed}
          isPending={isPending}
          getName={getName}
          onRemove={handleRemoveMember}
        />
      )}

      {activeTab === "activity" && (
        <ActivityTab
          activity={activity}
          getName={getName}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({
  openRequests,
  totalDocs,
  memberCount,
  stage,
  status,
  conversationId,
}: {
  openRequests: number;
  totalDocs: number;
  memberCount: number;
  stage: string;
  status: string;
  conversationId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Open requests</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{openRequests}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Documents</p>
          <p className="mt-2 text-3xl font-bold text-cyan-300">{totalDocs}</p>
        </article>
        <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Active members</p>
          <p className="mt-2 text-3xl font-bold text-white">{memberCount}</p>
        </article>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm font-semibold text-slate-300 mb-3">Deal details</p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Stage</dt>
            <dd className="text-slate-200">{STAGE_LABELS[stage] ?? stage}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Status</dt>
            <dd className="text-slate-200">{STATUS_LABELS[status] ?? status}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm font-semibold text-slate-300 mb-2">Conversation</p>
        <p className="text-sm text-slate-400 mb-3">
          All messages are in the original conversation thread.
        </p>
        <Link
          href={`/messages/${conversationId}`}
          className="inline-block rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
        >
          Open conversation
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents tab
// ─────────────────────────────────────────────────────────────────────────────
function DocumentsTab({
  dealRoomId,
  documents,
  currentUserId,
  isSeller,
  isClosed,
  isPending,
  onDelete,
}: {
  dealRoomId: string;
  documents: DealRoomDocument[];
  currentUserId: string;
  isSeller: boolean;
  isClosed: boolean;
  isPending: boolean;
  onDelete: (id: string) => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("dealRoomId", dealRoomId);
    startUpload(async () => {
      const result = await uploadDealRoomDocument(fd);
      if (result.error) setUploadError(result.error);
      else form.reset();
    });
  }

  return (
    <div className="space-y-6">
      {/* Upload form */}
      {!isClosed && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm font-semibold text-slate-300 mb-4">Upload document</p>
          <form onSubmit={handleUpload} className="space-y-3">
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.csv,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
              className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-200 hover:file:bg-slate-700"
            />
            <div className="flex gap-3">
              <input
                name="category"
                placeholder="Category (optional)"
                maxLength={100}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <input
                name="description"
                placeholder="Description (optional)"
                maxLength={500}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            {uploadError && (
              <p className="text-sm text-rose-300">{uploadError}</p>
            )}
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Allowed: PDF, CSV, XLSX, DOCX, PNG, JPG. Max 50 MB.
          </p>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-12 text-center">
          <p className="text-slate-400">No documents have been shared yet.</p>
          {!isClosed && (
            <p className="mt-1 text-sm text-slate-500">
              Upload a document above to share it with Deal Room members.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => {
            const canDelete = isSeller || doc.uploaded_by === currentUserId;
            return (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white text-sm">{doc.filename}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doc.category && <span>{doc.category} · </span>}
                    {formatBytes(doc.filesize)} · {formatDate(doc.created_at)}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{doc.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/deals/documents/${doc.id}/download`}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                  >
                    Download
                  </a>
                  {canDelete && !isClosed && (
                    <button
                      type="button"
                      onClick={() => onDelete(doc.id)}
                      disabled={isPending}
                      className="text-xs text-slate-500 hover:text-rose-400 transition disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests tab
// ─────────────────────────────────────────────────────────────────────────────
function RequestsTab({
  dealRoomId,
  requests,
  isClosed,
  isPending,
  profileMap,
  onComplete,
}: {
  dealRoomId: string;
  requests: DealRoomRequest[];
  currentUserId: string;
  isClosed: boolean;
  isPending: boolean;
  profileMap: Record<string, { full_name: string | null }>;
  onComplete: (id: string) => void;
}) {
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();

  function getName(id: string | null): string {
    if (!id) return "Unassigned";
    return profileMap[id]?.full_name ?? "Ownward member";
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("dealRoomId", dealRoomId);
    startCreate(async () => {
      const result = await createDocumentRequest(fd);
      if (result.error) setCreateError(result.error);
      else form.reset();
    });
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      {!isClosed && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm font-semibold text-slate-300 mb-4">New request</p>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              name="title"
              required
              placeholder="Request title"
              maxLength={500}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <textarea
              name="description"
              placeholder="Description (optional)"
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
            <div className="flex gap-3">
              <select
                name="priority"
                defaultValue="normal"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="low">Low priority</option>
                <option value="normal">Normal</option>
                <option value="high">High priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <input
                name="category"
                placeholder="Category"
                maxLength={100}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            {createError && (
              <p className="text-sm text-rose-300">{createError}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create request"}
            </button>
          </form>
        </div>
      )}

      {/* Request list */}
      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-12 text-center">
          <p className="text-slate-400">No requests yet.</p>
          {!isClosed && (
            <p className="mt-1 text-sm text-slate-500">
              Create a request above to ask for specific documents or information.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <li
              key={req.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white text-sm">{req.title}</p>
                  {req.description && (
                    <p className="text-xs text-slate-400 mt-1">{req.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className={PRIORITY_COLORS[req.priority] ?? "text-slate-400"}>
                      {req.priority}
                    </span>
                    {req.category && <span>· {req.category}</span>}
                    {req.assigned_to && <span>· Assigned to {getName(req.assigned_to)}</span>}
                    {req.due_date && <span>· Due {formatDate(req.due_date)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      req.status === "completed"
                        ? "border-emerald-500/30 text-emerald-400"
                        : req.status === "open"
                        ? "border-amber-500/30 text-amber-300"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    {REQUEST_STATUS_LABELS[req.status] ?? req.status}
                  </span>
                  {req.status !== "completed" && req.status !== "cancelled" && !isClosed && (
                    <button
                      type="button"
                      onClick={() => onComplete(req.id)}
                      disabled={isPending}
                      className="rounded-lg border border-emerald-500/30 px-2 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Participants tab
// ─────────────────────────────────────────────────────────────────────────────
function ParticipantsTab({
  dealRoomId,
  members,
  isSeller,
  isClosed,
  isPending,
  getName,
  onRemove,
}: {
  dealRoomId: string;
  members: DealRoomMember[];
  isSeller: boolean;
  isClosed: boolean;
  isPending: boolean;
  getName: (id: string | null) => string;
  onRemove: (id: string) => void;
}) {
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, startInvite] = useTransition();

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("dealRoomId", dealRoomId);
    startInvite(async () => {
      const result = await inviteDealRoomMember(fd);
      if (result.error) setInviteError(result.error);
      else form.reset();
    });
  }

  return (
    <div className="space-y-6">
      {/* Invite form (seller only) */}
      {isSeller && !isClosed && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm font-semibold text-slate-300 mb-4">Invite member</p>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-3">
              <input
                name="userId"
                placeholder="User ID (UUID)"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
              />
              <select
                name="role"
                defaultValue="advisor"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="advisor">Advisor</option>
                <option value="accountant">Accountant</option>
                <option value="attorney">Attorney</option>
              </select>
            </div>
            {inviteError && (
              <p className="text-sm text-rose-300">{inviteError}</p>
            )}
            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {inviting ? "Inviting…" : "Send invite"}
            </button>
          </form>
        </div>
      )}

      {/* Member list */}
      <ul className="space-y-3">
        {members
          .filter((m) => m.membership_status !== "removed")
          .map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div>
                <p className="font-medium text-white text-sm">
                  {getName(m.user_id)} {m.user_id ? "" : `(${m.invited_email ?? "External"})`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {ROLE_LABELS[m.role] ?? m.role} ·{" "}
                  {m.membership_status === "active"
                    ? "Active"
                    : m.membership_status === "pending"
                    ? "Pending invite"
                    : m.membership_status === "opened"
                    ? "Invite opened"
                    : m.membership_status === "accepted"
                    ? "Accepted"
                    : m.membership_status}
                </p>
              </div>
              {isSeller &&
                !isClosed &&
                m.role !== "seller" &&
                m.membership_status === "active" && (
                  <button
                    type="button"
                    onClick={() => onRemove(m.id)}
                    disabled={isPending}
                    className="text-xs text-slate-500 hover:text-rose-400 transition disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
            </li>
          ))}
      </ul>

      {members.filter((m) => m.membership_status !== "removed").length === 0 && (
        <p className="text-sm text-slate-500 text-center">No members.</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity tab
// ─────────────────────────────────────────────────────────────────────────────
function ActivityTab({
  activity,
  getName,
}: {
  activity: DealRoomActivity[];
  getName: (id: string | null) => string;
}) {
  if (activity.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-12 text-center">
        <p className="text-slate-400">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {activity.map((a) => (
        <li
          key={a.id}
          className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3"
        >
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400/60" />
          <div className="min-w-0 text-sm">
            <span className="font-medium text-slate-200">
              {getName(a.actor_id)}
            </span>{" "}
            <span className="text-slate-400">
              {ACTIVITY_LABELS[a.event_type] ?? a.event_type}
            </span>
            <span className="ml-2 text-xs text-slate-600">
              {formatDate(a.created_at)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
