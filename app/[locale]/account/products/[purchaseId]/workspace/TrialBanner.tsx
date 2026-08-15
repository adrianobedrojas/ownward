"use client";

import { useEffect, useState } from "react";

type Props = {
  trialEndsAt: string;
};

export default function TrialBanner({
  trialEndsAt,
}: Props) {
  const [daysRemaining, setDaysRemaining] = useState(
    calculateDaysRemaining(trialEndsAt)
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDaysRemaining(
        calculateDaysRemaining(trialEndsAt)
      );
    }, 60 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [trialEndsAt]);

  return (
    <div className="rounded-xl border p-4">
      <p className="font-semibold">
        {daysRemaining > 0
          ? `${daysRemaining} days left in your free trial`
          : "Your free trial has ended"}
      </p>

      {daysRemaining > 0 ? (
        <p className="mt-1 text-sm">
          Complete your Sprint before your trial ends.
        </p>
      ) : (
        <p className="mt-1 text-sm">
          Upgrade for $20 to continue.
        </p>
      )}
    </div>
  );
}

function calculateDaysRemaining(
  trialEndsAt: string
) {
  const end = new Date(trialEndsAt).getTime();
  const now = Date.now();

  if (end <= now) return 0;

  return Math.ceil(
    (end - now) /
      (1000 * 60 * 60 * 24)
  );
}
