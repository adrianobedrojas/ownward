"use client";

import { useId, useMemo, useState } from "react";

interface GuideShareControlsProps {
  title: string;
  description: string;
  canonicalUrl: string;
}

function getConciseDescription(description: string) {
  const trimmed = description.trim();
  if (trimmed.length <= 120) {
    return trimmed;
  }

  return `${trimmed.slice(0, 117).trimEnd()}...`;
}

export default function GuideShareControls({
  title,
  description,
  canonicalUrl,
}: GuideShareControlsProps) {
  const [statusMessage, setStatusMessage] = useState("");
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const fallbackInputId = useId();
  const conciseDescription = useMemo(() => getConciseDescription(description), [description]);
  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedTitle = encodeURIComponent(title);

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${canonicalUrl}`)}`;
  const emailUrl = `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${conciseDescription}\n\n${canonicalUrl}`)}`;

  const openInNewTab = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyUrl = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        setShowFallbackInput(true);
        return false;
      }
      await navigator.clipboard.writeText(canonicalUrl);
      return true;
    } catch {
      setShowFallbackInput(true);
      return false;
    }
  };

  const handleInstagramShare = async () => {
    if (typeof navigator.share === "function") {
      setStatusMessage("Choose Instagram from your device's share menu.");
      try {
        await navigator.share({
          title,
          text: conciseDescription,
          url: canonicalUrl,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setShowFallbackInput(true);
        setStatusMessage("Sharing was not completed. Use the link below or Copy link.");
      }
      return;
    }

    const copied = await copyUrl();
    openInNewTab("https://www.instagram.com/");
    if (copied) {
      setStatusMessage("Link copied. Paste it into an Instagram message, Story, or post.");
      return;
    }
    setStatusMessage("Instagram opened. Copy the link below and paste it into an Instagram message, Story, or post.");
  };

  const handleSubstackShare = async () => {
    const copied = await copyUrl();
    openInNewTab("https://substack.com/home");
    if (copied) {
      setStatusMessage("Link copied. Paste it into a Substack Note or post.");
      return;
    }
    setStatusMessage("Substack opened. Copy the link below and paste it into a Substack Note or post.");
  };

  const handleCopyLink = async () => {
    const copied = await copyUrl();
    if (copied) {
      setStatusMessage("Link copied.");
      return;
    }
    setStatusMessage("Copy failed. Use the link below.");
  };

  return (
    <section className="space-y-3" aria-label="Share this article">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Share</h2>
      <div className="flex flex-wrap gap-2">
        <a
          href={linkedInUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          LinkedIn
        </a>
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Facebook
        </a>
        <button
          type="button"
          onClick={handleInstagramShare}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Instagram
        </button>
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={handleSubstackShare}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Substack
        </button>
        <a
          href={emailUrl}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Email
        </a>
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Copy link
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-slate-300">
        {statusMessage}
      </p>
      {showFallbackInput && (
        <div className="space-y-1">
          <label htmlFor={fallbackInputId} className="block text-xs font-medium text-slate-400">
            Article URL
          </label>
          <input
            id={fallbackInputId}
            readOnly
            value={canonicalUrl}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
          />
        </div>
      )}
    </section>
  );
}
