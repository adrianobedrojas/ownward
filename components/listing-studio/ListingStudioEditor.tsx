"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ListingCompleteness } from "@/lib/listings";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListingData = {
  id: string;
  status: string;
  is_public: boolean;
  last_step_completed: number;
  business_name: string;
  category: string | null;
  location: string | null;
  year_established: number | null;
  is_confidential: boolean;
  teaser_title: string | null;
  headline_en: string | null;
  headline_es: string | null;
  summary: string | null;
  summary_en: string | null;
  summary_es: string | null;
  highlights_en: string | null;
  highlights_es: string | null;
  growth_opportunities_en: string | null;
  growth_opportunities_es: string | null;
  reason_for_selling_en: string | null;
  reason_for_selling_es: string | null;
  currency: string;
  asking_price: number | null;
  annual_revenue: number | null;
  cash_flow: number | null;
  financial_year: string | null;
  seller_financing: boolean;
  inventory_included: boolean;
  real_estate_included: boolean;
  owner_involvement_hours: number | null;
  number_of_employees: number | null;
  established_online: boolean;
};

export type MediaItem = {
  id: string;
  storagePath: string;
  sortOrder: number;
  isCover: boolean;
  fileSize: number;
  mimeType: string;
  signedUrl: string | null;
  captionEn?: string;
  captionEs?: string;
  altTextEn?: string;
  altTextEs?: string;
};

export type StepId = "identity" | "story" | "photos" | "financial" | "operations" | "review";

interface Props {
  listingId: string;
  initialData: ListingData;
  initialMedia: MediaItem[];
  initialStep: number;
  imageLimit: number;
  locale: string;
  completeness: ListingCompleteness;
  t: Record<string, string | string[] | Record<string, string>>;
}

type SaveStatus = "idle" | "saving" | "saved" | "failed";

const STEPS: Array<{ id: StepId; labelKey: string }> = [
  { id: "identity", labelKey: "identity" },
  { id: "story", labelKey: "story" },
  { id: "photos", labelKey: "photos" },
  { id: "financial", labelKey: "financial" },
  { id: "operations", labelKey: "operations" },
  { id: "review", labelKey: "review" },
];

// ─── Step Components ──────────────────────────────────────────────────────────

function IdentityStep({
  data,
  onChange,
  t,
}: {
  data: ListingData;
  onChange: (partial: Partial<ListingData>) => void;
  t: Props["t"];
}) {
  const id = t as Record<string, string>;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{id["identity.title"]}</h2>
        <p className="mt-1 text-sm text-slate-400">{id["identity.description"]}</p>
      </div>

      <div>
        <label htmlFor="business_name" className="block text-sm font-semibold text-slate-300">
          {id["identity.businessNameLabel"]}
          <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-normal text-slate-400">
            {id["identity.visibilityPrivate"]}
          </span>
        </label>
        <input
          id="business_name"
          type="text"
          value={data.business_name}
          onChange={(e) => onChange({ business_name: e.target.value })}
          placeholder={id["identity.businessNamePlaceholder"]}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">{id["identity.businessNameHint"]}</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            id="is_confidential"
            checked={data.is_confidential}
            onChange={(e) => onChange({ is_confidential: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
          />
          <div>
            <span className="block text-sm font-semibold text-slate-300">
              {id["identity.isConfidentialLabel"]}
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              {id["identity.isConfidentialHint"]}
            </span>
          </div>
        </label>

        {data.is_confidential && (
          <div className="mt-4">
            <label htmlFor="teaser_title" className="block text-sm font-semibold text-slate-300">
              {id["identity.teaserTitleLabel"]}
              <span className="ml-2 rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-normal text-cyan-300">
                {id["identity.visibilityPublic"]}
              </span>
            </label>
            <input
              id="teaser_title"
              type="text"
              value={data.teaser_title ?? ""}
              onChange={(e) => onChange({ teaser_title: e.target.value })}
              placeholder={id["identity.teaserTitlePlaceholder"]}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">{id["identity.teaserTitleHint"]}</p>
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-slate-300">
            {id["identity.categoryLabel"]}
            <span className="ml-2 rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-normal text-cyan-300">
              {id["identity.visibilityPublic"]}
            </span>
          </label>
          <select
            id="category"
            value={data.category ?? ""}
            onChange={(e) => onChange({ category: e.target.value })}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-cyan-400 focus:outline-none"
          >
            <option value="">{id["identity.selectCategory"]}</option>
            {["services","food","retail","construction","marketing","technology","healthcare","education","other"].map((cat) => (
              <option key={cat} value={cat}>{(t as Record<string, Record<string, string>>)["categories"]?.[cat] ?? cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-semibold text-slate-300">
            {id["identity.locationLabel"]}
            <span className="ml-2 rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-normal text-cyan-300">
              {id["identity.visibilityPublic"]}
            </span>
          </label>
          <input
            id="location"
            type="text"
            value={data.location ?? ""}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder={id["identity.locationPlaceholder"]}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">{id["identity.locationHint"]}</p>
        </div>
      </div>

      <div>
        <label htmlFor="year_established" className="block text-sm font-semibold text-slate-300">
          {id["identity.yearEstablishedLabel"]}
          <span className="ml-2 rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-normal text-cyan-300">
            {id["identity.visibilityPublic"]}
          </span>
        </label>
        <input
          id="year_established"
          type="number"
          min={1800}
          max={new Date().getFullYear()}
          value={data.year_established ?? ""}
          onChange={(e) => onChange({ year_established: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="2020"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none sm:w-40"
        />
      </div>
    </div>
  );
}

function StoryStep({
  data,
  onChange,
  t,
}: {
  data: ListingData;
  onChange: (partial: Partial<ListingData>) => void;
  t: Props["t"];
}) {
  const s = t as Record<string, string | string[]>;
  const prompts = Array.isArray(s["story.coachPrompts"]) ? s["story.coachPrompts"] as string[] : [];
  const checklist = Array.isArray(s["story.checklist"]) ? s["story.checklist"] as string[] : [];
  const [showCoach, setShowCoach] = useState(false);

  function charCount(val: string | null | undefined, max = 2000) {
    const len = (val ?? "").length;
    return `${len} / ${max}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{s["story.title"] as string}</h2>
        <p className="mt-1 text-sm text-slate-400">{s["story.description"] as string}</p>
      </div>

      {/* Writing coach toggle */}
      <button
        type="button"
        onClick={() => setShowCoach((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition"
      >
        <span>{s["story.coachTitle"] as string}</span>
        <span>{showCoach ? "▲" : "▼"}</span>
      </button>

      {showCoach && (
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Prompts</p>
          <ul className="space-y-1">
            {prompts.map((p, i) => (
              <li key={i} className="text-sm text-slate-300 before:content-['→'] before:mr-2 before:text-cyan-400">{p}</li>
            ))}
          </ul>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 pt-2">Checklist</p>
          <ul className="space-y-1">
            {checklist.map((c, i) => (
              <li key={i} className="text-sm text-slate-300 before:content-['☐'] before:mr-2">{c}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-300 pt-2">{s["story.disclaimer"] as string}</p>
        </div>
      )}

      {/* Bilingual note */}
      <p className="text-xs text-slate-500 italic">{s["story.bilingualNote"] as string}</p>

      {/* Headline */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="headline_en" className="block text-sm font-semibold text-slate-300">
            {s["story.headlineEnLabel"] as string}
          </label>
          <input
            id="headline_en"
            type="text"
            maxLength={160}
            value={data.headline_en ?? ""}
            onChange={(e) => onChange({ headline_en: e.target.value || null })}
            placeholder={s["story.headlineEnPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-600">{charCount(data.headline_en, 160)}</p>
        </div>
        <div>
          <label htmlFor="headline_es" className="block text-sm font-semibold text-slate-300">
            {s["story.headlineEsLabel"] as string}
          </label>
          <input
            id="headline_es"
            type="text"
            maxLength={160}
            value={data.headline_es ?? ""}
            onChange={(e) => onChange({ headline_es: e.target.value || null })}
            placeholder={s["story.headlineEsPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-600">{charCount(data.headline_es, 160)}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="summary_en" className="block text-sm font-semibold text-slate-300">
            {s["story.summaryEnLabel"] as string}
          </label>
          <textarea
            id="summary_en"
            rows={5}
            maxLength={2000}
            value={data.summary_en ?? ""}
            onChange={(e) => onChange({ summary_en: e.target.value || null })}
            placeholder={s["story.summaryEnPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none resize-y"
          />
          <p className="mt-1 text-xs text-slate-600">{charCount(data.summary_en)}</p>
        </div>
        <div>
          <label htmlFor="summary_es" className="block text-sm font-semibold text-slate-300">
            {s["story.summaryEsLabel"] as string}
          </label>
          <textarea
            id="summary_es"
            rows={5}
            maxLength={2000}
            value={data.summary_es ?? ""}
            onChange={(e) => onChange({ summary_es: e.target.value || null })}
            placeholder={s["story.summaryEsPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none resize-y"
          />
          <p className="mt-1 text-xs text-slate-600">{charCount(data.summary_es)}</p>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="highlights_en" className="block text-sm font-semibold text-slate-300">
            {s["story.highlightsEnLabel"] as string}
          </label>
          <textarea
            id="highlights_en"
            rows={4}
            maxLength={1000}
            value={data.highlights_en ?? ""}
            onChange={(e) => onChange({ highlights_en: e.target.value || null })}
            placeholder={s["story.highlightsEnPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none resize-y"
          />
          <p className="mt-1 text-xs text-slate-600">{charCount(data.highlights_en, 1000)}</p>
        </div>
        <div>
          <label htmlFor="highlights_es" className="block text-sm font-semibold text-slate-300">
            {s["story.highlightsEsLabel"] as string}
          </label>
          <textarea
            id="highlights_es"
            rows={4}
            maxLength={1000}
            value={data.highlights_es ?? ""}
            onChange={(e) => onChange({ highlights_es: e.target.value || null })}
            placeholder={s["story.highlightsEsPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none resize-y"
          />
          <p className="mt-1 text-xs text-slate-600">{charCount(data.highlights_es, 1000)}</p>
        </div>
      </div>

      {/* Growth */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="growth_en" className="block text-sm font-semibold text-slate-300">
            {s["story.growthEnLabel"] as string}
          </label>
          <textarea
            id="growth_en"
            rows={3}
            maxLength={800}
            value={data.growth_opportunities_en ?? ""}
            onChange={(e) => onChange({ growth_opportunities_en: e.target.value || null })}
            placeholder={s["story.growthEnPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none resize-y"
          />
        </div>
        <div>
          <label htmlFor="growth_es" className="block text-sm font-semibold text-slate-300">
            {s["story.growthEsLabel"] as string}
          </label>
          <textarea
            id="growth_es"
            rows={3}
            maxLength={800}
            value={data.growth_opportunities_es ?? ""}
            onChange={(e) => onChange({ growth_opportunities_es: e.target.value || null })}
            placeholder={s["story.growthEsPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none resize-y"
          />
        </div>
      </div>

      {/* Reason for selling */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reason_en" className="block text-sm font-semibold text-slate-300">
            {s["story.reasonEnLabel"] as string}
          </label>
          <textarea
            id="reason_en"
            rows={3}
            maxLength={500}
            value={data.reason_for_selling_en ?? ""}
            onChange={(e) => onChange({ reason_for_selling_en: e.target.value || null })}
            placeholder={s["story.reasonEnPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none resize-y"
          />
        </div>
        <div>
          <label htmlFor="reason_es" className="block text-sm font-semibold text-slate-300">
            {s["story.reasonEsLabel"] as string}
          </label>
          <textarea
            id="reason_es"
            rows={3}
            maxLength={500}
            value={data.reason_for_selling_es ?? ""}
            onChange={(e) => onChange({ reason_for_selling_es: e.target.value || null })}
            placeholder={s["story.reasonEsPlaceholder"] as string}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none resize-y"
          />
        </div>
      </div>
    </div>
  );
}

function PhotosStep({
  listingId,
  media,
  onMediaChange,
  imageLimit,
  t,
}: {
  listingId: string;
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  imageLimit: number;
  t: Props["t"];
}) {
  const p = t as Record<string, string>;
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    for (const file of Array.from(files)) {
      if (media.length >= imageLimit) {
        setUploadError(p["photos.limitReached"]);
        break;
      }

      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        setUploadError(p["photos.typeError"]);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(p["photos.sizeError"]);
        continue;
      }

      setUploading(true);
      try {
        // Client-side EXIF stripping via Canvas
        const processedBlob = await stripExifAndNormalize(file);

        const form = new FormData();
        form.append("file", processedBlob, `photo.webp`);
        form.append("sortOrder", String(media.length));

        const res = await fetch(`/api/listings/${listingId}/media`, {
          method: "POST",
          body: form,
        });
        const json = await res.json();

        if (!res.ok) {
          setUploadError(json.error ?? p["photos.uploadError"]);
        } else {
          onMediaChange([...media, json.media]);
        }
      } catch (err) {
        setUploadError(p["photos.uploadError"]);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(p["photos.deleteConfirm"])) return;
    const res = await fetch(`/api/listings/${listingId}/media`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaId: item.id }),
    });
    if (res.ok) {
      onMediaChange(media.filter((m) => m.id !== item.id));
    }
  };

  const handleSetCover = async (item: MediaItem) => {
    const res = await fetch(`/api/listings/${listingId}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverId: item.id }),
    });
    if (res.ok) {
      onMediaChange(media.map((m) => ({ ...m, isCover: m.id === item.id })));
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...media];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    const updated = reordered.map((m, i) => ({ ...m, sortOrder: i }));
    onMediaChange(updated);
    await fetch(`/api/listings/${listingId}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: updated.map((m) => ({ id: m.id, sortOrder: m.sortOrder })) }),
    });
  };

  const handleMoveDown = async (index: number) => {
    if (index === media.length - 1) return;
    const reordered = [...media];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    const updated = reordered.map((m, i) => ({ ...m, sortOrder: i }));
    onMediaChange(updated);
    await fetch(`/api/listings/${listingId}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: updated.map((m) => ({ id: m.id, sortOrder: m.sortOrder })) }),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{p["photos.title"]}</h2>
        <p className="mt-1 text-sm text-slate-400">{p["photos.description"]}</p>
      </div>

      <p className="text-xs text-slate-500">{p["photos.exifNote"]}</p>

      {/* Upload area */}
      {media.length < imageLimit && (
        <div
          role="button"
          tabIndex={0}
          aria-label={p["photos.uploadCta"]}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900 p-8 text-center cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
        >
          <svg className="mb-3 h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-semibold text-slate-300">{p["photos.uploadDrop"]}</p>
          <p className="mt-1 text-xs text-slate-500">{p["photos.uploadHint"]}</p>
          {uploading && <p className="mt-2 text-xs text-cyan-400">{p["photos.uploading"]}</p>}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        aria-label={p["photos.uploadCta"]}
        onChange={(e) => handleFileChange(e.target.files)}
      />

      {uploadError && (
        <p role="alert" className="text-sm text-red-400">{uploadError}</p>
      )}

      <p className="text-xs text-slate-500">
        {media.length} / {imageLimit} {p["photos.title"].toLowerCase()}
      </p>

      {/* Photo grid */}
      {media.length > 0 ? (
        <ul
          aria-label={p["accessibility.photoGridLabel"] as unknown as string ?? "Listing photos"}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {media.map((item, index) => (
            <li key={item.id} className="relative rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              {item.signedUrl ? (
                <img
                  src={item.signedUrl}
                  alt={item.altTextEn ?? "Listing photo"}
                  className="aspect-video w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-video w-full bg-slate-800 flex items-center justify-center">
                  <span className="text-slate-600 text-sm">No preview</span>
                </div>
              )}
              {item.isCover && (
                <span className="absolute top-2 left-2 rounded-full bg-cyan-400 px-2 py-0.5 text-xs font-semibold text-slate-950">
                  {p["photos.coverLabel"]}
                </span>
              )}
              <div className="p-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {!item.isCover && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(item)}
                      aria-label={p["accessibility.setCoverLabel"] as unknown as string ?? "Set as cover"}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
                    >
                      {p["photos.setCover"]}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move photo up"
                    className="text-xs text-slate-400 hover:text-white disabled:opacity-30 transition"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === media.length - 1}
                    aria-label="Move photo down"
                    className="text-xs text-slate-400 hover:text-white disabled:opacity-30 transition"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    aria-label={p["accessibility.deletePhotoLabel"] as unknown as string ?? "Delete photo"}
                    className="ml-auto text-xs font-semibold text-red-400 hover:text-red-300 transition"
                  >
                    {p["photos.deletePhoto"]}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-slate-500">{p["photos.noPhotos"]}</p>
          <p className="mt-1 text-xs text-slate-600">{p["photos.noPhotosHint"]}</p>
        </div>
      )}
    </div>
  );
}

function FinancialStep({
  data,
  onChange,
  t,
}: {
  data: ListingData;
  onChange: (partial: Partial<ListingData>) => void;
  t: Props["t"];
}) {
  const f = t as Record<string, string>;

  const revenueMultiple =
    data.asking_price && data.annual_revenue && data.annual_revenue > 0
      ? (data.asking_price / data.annual_revenue).toFixed(2)
      : null;
  const cashFlowMultiple =
    data.asking_price && data.cash_flow && data.cash_flow > 0
      ? (data.asking_price / data.cash_flow).toFixed(2)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{f["financial.title"]}</h2>
        <p className="mt-1 text-sm text-slate-400">{f["financial.description"]}</p>
      </div>

      <div>
        <label htmlFor="currency" className="block text-sm font-semibold text-slate-300">
          {f["financial.currencyLabel"]}
        </label>
        <select
          id="currency"
          value={data.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
          className="mt-2 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300 focus:border-cyan-400 focus:outline-none"
        >
          <option value="USD">USD — US Dollar</option>
          <option value="PAB">PAB — Panamanian Balboa</option>
          <option value="EUR">EUR — Euro</option>
          <option value="GBP">GBP — British Pound</option>
          <option value="CAD">CAD — Canadian Dollar</option>
          <option value="MXN">MXN — Mexican Peso</option>
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="asking_price" className="block text-sm font-semibold text-slate-300">
            {f["financial.askingPriceLabel"]}
            <span className="ml-2 rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs font-normal text-cyan-300">
              {(t as Record<string, string>)["identity.visibilityPublic"]}
            </span>
          </label>
          <input
            id="asking_price"
            type="number"
            min={0}
            value={data.asking_price ?? ""}
            onChange={(e) => onChange({ asking_price: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">{f["financial.askingPriceHint"]}</p>
        </div>
        <div>
          <label htmlFor="annual_revenue" className="block text-sm font-semibold text-slate-300">
            {f["financial.annualRevenueLabel"]}
          </label>
          <input
            id="annual_revenue"
            type="number"
            min={0}
            value={data.annual_revenue ?? ""}
            onChange={(e) => onChange({ annual_revenue: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="cash_flow" className="block text-sm font-semibold text-slate-300">
            {f["financial.cashFlowLabel"]}
          </label>
          <input
            id="cash_flow"
            type="number"
            min={0}
            value={data.cash_flow ?? ""}
            onChange={(e) => onChange({ cash_flow: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="0"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">{f["financial.cashFlowHint"]}</p>
        </div>
      </div>

      <div>
        <label htmlFor="financial_year" className="block text-sm font-semibold text-slate-300">
          {f["financial.financialYearLabel"]}
        </label>
        <input
          id="financial_year"
          type="text"
          maxLength={50}
          value={data.financial_year ?? ""}
          onChange={(e) => onChange({ financial_year: e.target.value || null })}
          placeholder={f["financial.financialYearPlaceholder"]}
          className="mt-2 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
        />
      </div>

      <div className="grid gap-3">
        {[
          { key: "seller_financing", label: f["financial.sellerFinancingLabel"] },
          { key: "inventory_included", label: f["financial.inventoryLabel"] },
          { key: "real_estate_included", label: f["financial.realEstateLabel"] },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!(data as unknown as Record<string, unknown>)[key]}
              onChange={(e) => onChange({ [key]: e.target.checked } as Partial<ListingData>)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
            />
            <span className="text-sm text-slate-300">{label}</span>
          </label>
        ))}
      </div>

      {/* Informational multiples */}
      {(revenueMultiple || cashFlowMultiple) && (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <p className="text-sm font-semibold text-slate-300">{f["financial.multiplesTitle"]}</p>
          <p className="mt-1 text-xs text-slate-500">{f["financial.multiplesDisclaimer"]}</p>
          <div className="mt-3 space-y-1">
            {revenueMultiple && (
              <p className="text-sm text-slate-200">
                {f["financial.priceRevenueMultiple"].replace("{multiple}", revenueMultiple)}
              </p>
            )}
            {cashFlowMultiple && (
              <p className="text-sm text-slate-200">
                {f["financial.priceCashFlowMultiple"].replace("{multiple}", cashFlowMultiple)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OperationsStep({
  data,
  onChange,
  t,
}: {
  data: ListingData;
  onChange: (partial: Partial<ListingData>) => void;
  t: Props["t"];
}) {
  const o = t as Record<string, string>;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{o["operations.title"]}</h2>
        <p className="mt-1 text-sm text-slate-400">{o["operations.description"]}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="owner_hours" className="block text-sm font-semibold text-slate-300">
            {o["operations.ownerHoursLabel"]}
          </label>
          <input
            id="owner_hours"
            type="number"
            min={0}
            max={168}
            value={data.owner_involvement_hours ?? ""}
            onChange={(e) => onChange({ owner_involvement_hours: e.target.value ? parseInt(e.target.value) : null })}
            placeholder={o["operations.ownerHoursPlaceholder"]}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="num_employees" className="block text-sm font-semibold text-slate-300">
            {o["operations.employeesLabel"]}
          </label>
          <input
            id="num_employees"
            type="number"
            min={0}
            value={data.number_of_employees ?? ""}
            onChange={(e) => onChange({ number_of_employees: e.target.value ? parseInt(e.target.value) : null })}
            placeholder={o["operations.employeesPlaceholder"]}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={data.established_online}
          onChange={(e) => onChange({ established_online: e.target.checked })}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
        />
        <span className="text-sm text-slate-300">{o["operations.onlineLabel"]}</span>
      </label>
    </div>
  );
}

function ReviewStep({
  data,
  media,
  completeness,
  t,
  locale,
  onPublish,
  onUnpublish,
  isPublishing,
}: {
  data: ListingData;
  media: MediaItem[];
  completeness: ListingCompleteness;
  t: Props["t"];
  locale: string;
  onPublish: () => void;
  onUnpublish: () => void;
  isPublishing: boolean;
}) {
  const r = t as Record<string, string | string[]>;
  const [authorized, setAuthorized] = useState(false);
  const [noCustomerData, setNoCustomerData] = useState(false);

  const visibilityItems = Array.isArray(r["review.visibilityItems"]) ? r["review.visibilityItems"] as string[] : [];
  const notSharedItems = Array.isArray(r["review.notSharedItems"]) ? r["review.notSharedItems"] as string[] : [];

  const publicTitle = data.is_confidential ? (data.teaser_title ?? "") : data.business_name;
  const isPublished = data.status === "published";
  const canPublish = completeness.missingRequiredToPublish.length === 0 && authorized && noCustomerData;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{r["review.title"] as string}</h2>
        <p className="mt-1 text-sm text-slate-400">{r["review.description"] as string}</p>
      </div>

      {/* Completeness */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <p className="text-sm font-semibold text-white">{r["review.completenessTitle"] as string}</p>
        <p className="mt-1 text-xs text-slate-500">{r["review.completenessNote"] as string}</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex-1 rounded-full bg-slate-800 h-2">
            <div
              className="rounded-full bg-cyan-400 h-2 transition-all"
              style={{ width: `${completeness.overallPercent}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-white">{completeness.overallPercent}%</span>
        </div>
        {completeness.missingRequiredToPublish.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-red-400">{r["review.missingRequired"] as string}</p>
            <ul className="mt-1 space-y-1">
              {completeness.missingRequiredToPublish.map((item) => (
                <li key={item} className="text-xs text-red-300">• {item}</li>
              ))}
            </ul>
          </div>
        )}
        {completeness.recommendations.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-amber-400">{r["review.recommended"] as string}</p>
            <ul className="mt-1 space-y-1">
              {completeness.recommendations.map((rec) => (
                <li key={rec} className="text-xs text-amber-300">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Visibility summary */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <p className="text-sm font-semibold text-white">{r["review.visibilityTitle"] as string}</p>
        <p className="mt-2 text-sm font-medium text-cyan-300">
          Public title: <span className="text-white">{publicTitle || "—"}</span>
        </p>
        <ul className="mt-3 space-y-1">
          {visibilityItems.map((item) => (
            <li key={item} className="text-xs text-slate-300 before:content-['✓'] before:mr-2 before:text-emerald-400">{item}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs font-semibold text-slate-400">{r["review.notShared"] as string}</p>
        <ul className="mt-1 space-y-1">
          {notSharedItems.map((item) => (
            <li key={item} className="text-xs text-slate-500 before:content-['✗'] before:mr-2 before:text-red-400">{item}</li>
          ))}
        </ul>
      </div>

      {/* Authorization checkboxes */}
      {!isPublished && (
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
            />
            <span className="text-sm text-slate-300">{r["review.authorizationLabel"] as string}</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={noCustomerData}
              onChange={(e) => setNoCustomerData(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-400"
            />
            <span className="text-sm text-slate-300">{r["review.noCustomerData"] as string}</span>
          </label>
        </div>
      )}

      {/* Publish / unpublish */}
      {!isPublished ? (
        <button
          type="button"
          disabled={!canPublish || isPublishing}
          onClick={onPublish}
          className="w-full rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          {isPublishing ? r["nav.saving"] as string : r["review.publishCta"] as string}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 text-center">
            {r["review.publishSuccess"] as string}
          </div>
          <button
            type="button"
            onClick={onUnpublish}
            className="w-full rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-300 transition hover:border-red-400 hover:text-red-300 focus:outline-none"
          >
            {r["review.unpublishCta"] as string}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Canvas-based EXIF stripping ──────────────────────────────────────────────
async function stripExifAndNormalize(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 2048;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = MAX_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error("Canvas export failed"));
          },
          "image/webp",
          0.88
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

// ─── Completeness panel ───────────────────────────────────────────────────────
function CompletenessPanel({
  completeness,
  t,
}: {
  completeness: ListingCompleteness;
  t: Props["t"];
}) {
  const c = t as Record<string, string>;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm font-semibold text-slate-300">{c["completeness.title"]}</p>
      <p className="mt-1 text-xs text-slate-500">{c["review.completenessNote"]}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 rounded-full bg-slate-800 h-1.5">
          <div
            className="rounded-full bg-cyan-400 h-1.5 transition-all"
            style={{ width: `${completeness.overallPercent}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          {completeness.overallPercent}%
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        {completeness.sections.map((sec) => (
          <div key={sec.id} className="flex items-center justify-between gap-2 text-xs">
            <span className={sec.completed ? "text-emerald-400" : "text-slate-500"}>{sec.label}</span>
            <span className={sec.completed ? "text-emerald-400" : "text-slate-600"}>
              {sec.completed ? c["completeness.sectionComplete"] : c["completeness.sectionIncomplete"]}
            </span>
          </div>
        ))}
      </div>
      {completeness.missingEnglish && (
        <p className="mt-2 text-xs text-amber-400">{c["completeness.missingEnglish"]}</p>
      )}
      {completeness.missingSpanish && (
        <p className="mt-2 text-xs text-slate-500">{c["completeness.missingSpanish"]}</p>
      )}
    </div>
  );
}

// ─── Main Editor Component ────────────────────────────────────────────────────

export default function ListingStudioEditor({
  listingId,
  initialData,
  initialMedia,
  initialStep,
  imageLimit,
  locale,
  completeness: initialCompleteness,
  t,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<ListingData>(initialData);
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [currentStep, setCurrentStep] = useState(Math.max(1, Math.min(initialStep, STEPS.length)));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [completeness, setCompleteness] = useState(initialCompleteness);
  const [isPublishing, setIsPublishing] = useState(false);

  const stepKeys = STEPS.map((s) => s.id);
  const currentStepId = stepKeys[currentStep - 1];

  const r = t as Record<string, string>;

  const handleChange = useCallback((partial: Partial<ListingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const buildStepPayload = (step: number): Record<string, unknown> => {
    switch (step) {
      case 1:
        return {
          business_name: data.business_name,
          is_confidential: data.is_confidential,
          teaser_title: data.teaser_title,
          category: data.category,
          location: data.location,
          year_established: data.year_established,
        };
      case 2:
        return {
          headline_en: data.headline_en,
          headline_es: data.headline_es,
          summary: data.summary_en,
          summary_en: data.summary_en,
          summary_es: data.summary_es,
          highlights_en: data.highlights_en,
          highlights_es: data.highlights_es,
          growth_opportunities_en: data.growth_opportunities_en,
          growth_opportunities_es: data.growth_opportunities_es,
          reason_for_selling_en: data.reason_for_selling_en,
          reason_for_selling_es: data.reason_for_selling_es,
        };
      case 3:
        return {}; // photos managed via API
      case 4:
        return {
          currency: data.currency,
          asking_price: data.asking_price,
          annual_revenue: data.annual_revenue,
          cash_flow: data.cash_flow,
          financial_year: data.financial_year,
          seller_financing: data.seller_financing,
          inventory_included: data.inventory_included,
          real_estate_included: data.real_estate_included,
        };
      case 5:
        return {
          owner_involvement_hours: data.owner_involvement_hours,
          number_of_employees: data.number_of_employees,
          established_online: data.established_online,
        };
      default:
        return {};
    }
  };

  const saveStep = async (step: number) => {
    const payload = buildStepPayload(step);
    if (Object.keys(payload).length === 0) return;

    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/listings/${listingId}/step`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, ...payload }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("failed");
      }
    } catch {
      setSaveStatus("failed");
    }
  };

  const handleSaveExit = async () => {
    await saveStep(currentStep);
    router.push(`/${locale}/dashboard`);
  };

  const handleBack = async () => {
    await saveStep(currentStep);
    setCurrentStep((s) => Math.max(1, s - 1));
    router.replace(`/${locale}/sell/${listingId}/edit?step=${currentStep - 1}`, { scroll: false });
  };

  const handleSaveContinue = async () => {
    await saveStep(currentStep);
    if (currentStep < STEPS.length) {
      const next = currentStep + 1;
      setCurrentStep(next);
      router.replace(`/${locale}/sell/${listingId}/edit?step=${next}`, { scroll: false });
    }
  };

  const handlePublish = async () => {
    if (!confirm(r["review.publishConfirm"])) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/publish`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setData((prev) => ({ ...prev, status: "published", is_public: true }));
      } else {
        alert(json.error ?? r["review.publishError"]);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!confirm(r["review.unpublishConfirm"])) return;
    const res = await fetch(`/api/listings/${listingId}/publish`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => ({ ...prev, status: "draft", is_public: false }));
    }
  };

  const statusBadge = {
    idle: null,
    saving: <span className="text-xs text-slate-400">{r["nav.saving"]}</span>,
    saved: <span className="text-xs text-emerald-400">{r["nav.saved"]}</span>,
    failed: <span className="text-xs text-red-400">{r["nav.saveFailed"]}</span>,
  }[saveStatus];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile: compact progress bar */}
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">
            {r[`steps.${currentStepId}`] ?? currentStepId}
            <span className="ml-2 text-xs text-slate-500">{currentStep}/{STEPS.length}</span>
          </p>
          {statusBadge}
        </div>
        <div className="mt-2 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i < currentStep ? "bg-cyan-400" : "bg-slate-800"}`}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[220px_1fr_280px] lg:gap-8">
        {/* Left: step navigation (desktop) */}
        <nav
          aria-label={r["accessibility.stepNavLabel"] ?? "Listing editor steps"}
          className="hidden lg:block"
        >
          <div className="sticky top-6 space-y-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Steps</p>
              {statusBadge}
            </div>
            {STEPS.map((step, i) => {
              const stepNum = i + 1;
              const isActive = currentStep === stepNum;
              const isDone = stepNum <= (initialData.last_step_completed ?? 0) || stepNum < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={async () => {
                    await saveStep(currentStep);
                    setCurrentStep(stepNum);
                    router.replace(`/${locale}/sell/${listingId}/edit?step=${stepNum}`, { scroll: false });
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition ${
                    isActive
                      ? "bg-cyan-400/10 text-cyan-300"
                      : isDone
                      ? "text-emerald-400 hover:bg-slate-900"
                      : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
                  } focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-cyan-400 text-slate-950"
                        : isDone
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isDone && !isActive ? "✓" : stepNum}
                  </span>
                  {r[`steps.${step.id}`] ?? step.id}
                </button>
              );
            })}

            <div className="mt-6 space-y-2 border-t border-slate-800 pt-4">
              <a
                href={`/${locale}/sell/${listingId}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                {r["nav.preview"]}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <button
                type="button"
                onClick={handleSaveExit}
                className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                {r["nav.saveExit"]}
              </button>
            </div>
          </div>
        </nav>

        {/* Center: editor */}
        <main className="min-w-0">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 lg:p-8">
            {currentStepId === "identity" && (
              <IdentityStep data={data} onChange={handleChange} t={t} />
            )}
            {currentStepId === "story" && (
              <StoryStep data={data} onChange={handleChange} t={t} />
            )}
            {currentStepId === "photos" && (
              <PhotosStep
                listingId={listingId}
                media={media}
                onMediaChange={setMedia}
                imageLimit={imageLimit}
                t={t}
              />
            )}
            {currentStepId === "financial" && (
              <FinancialStep data={data} onChange={handleChange} t={t} />
            )}
            {currentStepId === "operations" && (
              <OperationsStep data={data} onChange={handleChange} t={t} />
            )}
            {currentStepId === "review" && (
              <ReviewStep
                data={data}
                media={media}
                completeness={completeness}
                t={t}
                locale={locale}
                onPublish={handlePublish}
                onUnpublish={handleUnpublish}
                isPublishing={isPublishing}
              />
            )}
          </div>

          {/* Bottom nav */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-30 focus:outline-none"
            >
              {r["nav.back"]}
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveExit}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white focus:outline-none lg:hidden"
              >
                {r["nav.saveExit"]}
              </button>
              {currentStep < STEPS.length && (
                <button
                  type="button"
                  onClick={handleSaveContinue}
                  className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  {r["nav.saveContinue"]}
                </button>
              )}
            </div>
          </div>
        </main>

        {/* Right: live preview + completeness (desktop) */}
        <aside className="hidden space-y-6 lg:block">
          <div className="sticky top-6 space-y-4">
            {/* Listing status */}
            <div className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
              data.status === "published"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-slate-800 bg-slate-900 text-slate-500"
            }`}>
              {data.status === "published" ? r["status.published"] : r["status.draft"]}
            </div>

            {/* Completeness */}
            <CompletenessPanel completeness={completeness} t={t} />

            {/* Quick preview */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {r["accessibility.previewLabel"] ?? "Buyer preview"}
              </p>
              <p className="text-xs font-semibold text-cyan-300">
                {data.is_confidential ? data.teaser_title : data.business_name}
              </p>
              {data.category && (
                <span className="mt-1 inline-block rounded-full bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
                  {(t as Record<string, Record<string, string>>)["categories"]?.[data.category] ?? data.category}
                </span>
              )}
              {data.location && (
                <p className="mt-1 text-xs text-slate-500">{data.location}</p>
              )}
              {(data.summary_en || data.summary) && (
                <p className="mt-2 line-clamp-3 text-xs text-slate-400">
                  {data.summary_en || data.summary}
                </p>
              )}
              {data.asking_price && (
                <p className="mt-2 text-xs font-semibold text-white">
                  {data.currency} {Number(data.asking_price).toLocaleString()}
                </p>
              )}
              <a
                href={`/${locale}/sell/${listingId}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs text-cyan-400 hover:underline"
              >
                {r["nav.preview"]} →
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
