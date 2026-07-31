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
  const shareText = useMemo(() => title.trim() || conciseDescription, [title, conciseDescription]);
  const encodedUrl = encodeURIComponent(canonicalUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedShareText = encodeURIComponent(shareText);

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${canonicalUrl}`)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedShareText}`;
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
      setShowFallbackInput(false);
      return true;
    } catch {
      setShowFallbackInput(true);
      return false;
    }
  };

  const openDestinationAfterCopy = async (
    destinationUrl: string,
    successMessage: string,
    failureMessage: string,
  ) => {
    const destinationWindow = window.open("about:blank", "_blank", "noopener,noreferrer");
    const copied = await copyUrl();

    if (copied) {
      if (destinationWindow && !destinationWindow.closed) {
        destinationWindow.location.href = destinationUrl;
      } else {
        openInNewTab(destinationUrl);
      }
      setStatusMessage(successMessage);
      return;
    }

    if (destinationWindow && !destinationWindow.closed) {
      destinationWindow.close();
    }
    setStatusMessage(failureMessage);
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share !== "function") {
      const copied = await copyUrl();
      if (copied) {
        setStatusMessage("Link copied.");
        return;
      }
      setStatusMessage("Copy failed. Use the link below.");
      return;
    }

    setStatusMessage("Choose an app from your device's share menu.");
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

    await openDestinationAfterCopy(
      "https://www.instagram.com/",
      "Link copied. Paste it into an Instagram message, Story, or post.",
      "Copy failed. Use the link below.",
    );
  };

  const handleMicrosoftTeamsShare = async () => {
    if (typeof navigator.share === "function") {
      setStatusMessage("Choose Microsoft Teams from your device's share menu.");
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

    await openDestinationAfterCopy(
      "https://teams.microsoft.com/",
      "Link copied. Paste it into a Microsoft Teams chat or channel.",
      "Copy failed. Use the link below.",
    );
  };

  const handleDiscordShare = async () => {
    if (typeof navigator.share === "function") {
      setStatusMessage("Choose Discord from your device's share menu.");
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

    await openDestinationAfterCopy(
      "https://discord.com/channels/@me",
      "Link copied. Paste it into a Discord message.",
      "Copy failed. Use the link below.",
    );
  };

  const handleSubstackShare = async () => {
    await openDestinationAfterCopy(
      "https://substack.com/home",
      "Link copied. Paste it into a Substack Note or post.",
      "Copy failed. Use the link below.",
    );
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
        <button
          type="button"
          onClick={handleNativeShare}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Share
        </button>
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
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          WhatsApp
        </a>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Telegram
        </a>
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Copy link
        </button>
      </div>

      <details className="rounded-lg border border-slate-800 p-2">
        <summary className="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
          More ways to share
        </summary>
        <div className="mt-2 flex flex-wrap gap-2 px-2 pb-2">
          <button
            type="button"
            onClick={handleInstagramShare}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Instagram
          </button>
          <button
            type="button"
            onClick={handleMicrosoftTeamsShare}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Microsoft Teams
          </button>
          <button
            type="button"
            onClick={handleDiscordShare}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Discord
          </button>
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
        </div>
      </details>

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
