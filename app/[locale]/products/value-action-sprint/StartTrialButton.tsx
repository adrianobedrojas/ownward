"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartTrialButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function startTrial() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "/api/value-action-sprint/trial",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to start trial."
        );
      }

      router.push(
        `/account/products/${data.workspaceId}/workspace`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startTrial}
        disabled={loading}
        className="rounded-xl px-5 py-3 font-semibold"
      >
        {loading
          ? "Starting your Sprint..."
          : "Start Free 15-Day Sprint"}
      </button>

      {error ? (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
