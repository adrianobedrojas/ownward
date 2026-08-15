export type ValueActionSprintAccessMode =
  | "trial"
  | "paid"
  | "expired";

export type ValueActionSprintAccess = {
  allowed: boolean;
  mode: ValueActionSprintAccessMode;
  trialEndsAt: string | null;
  daysRemaining: number | null;
};

export function getValueActionSprintAccess(
  accessMode: ValueActionSprintAccess,
  trialEndsAt: string | null
): ValueActionSprintAccess {
  if (accessMode === "paid") {
    return {
      allowed: true,
      mode: "paid",
      trialEndsAt: null,
      daysRemaining: null,
    };
  }

  if (!trialEndsAt) {
    return {
      allowed: false,
      mode: "expired",
      trialEndsAt: null,
      daysRemaining: 0,
    };
  }

  const now = new Date();
  const end = new Date(trialEndsAt);

  if (end <= now) {
    return {
      allowed: false,
      mode: "expired",
      trialEndsAt,
      daysRemaining: 0,
    };
  }

  const millisecondsRemaining = end.getTime() - now.getTime();

  const daysRemaining = Math.ceil(
    millisecondsRemaining / (1000 * 60 * 60 * 24)
  );

  return {
    allowed: true,
    mode: "trial",
    trialEndsAt,
    daysRemaining,
  };
}
