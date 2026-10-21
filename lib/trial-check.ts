export interface TrialStatus {
  isExpired: boolean;
  daysRemaining: number;
}

export const TRIAL_DAYS = 30;
export const TRIAL_DURATION_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

const ACTIVE_PAID_STATUSES = new Set([
  "active",
  "pro",
  "enterprise",
  "paid",
]);

/**
 * Checks whether a 30-day evaluation trial is currently active or has concluded.
 * Copied and adapted from prado-erp/lib/trialCheck.ts
 */
export function checkTrialExpiry(
  trialStartsAt: string | Date | null | undefined,
  status: string | null | undefined,
): TrialStatus {
  const normalized = String(status || "").trim().toLowerCase();

  // If subscription status is already active or paid tier, they are fully authorized
  if (ACTIVE_PAID_STATUSES.has(normalized)) {
    return { isExpired: false, daysRemaining: 30 };
  }

  // If status is explicitly cancelled, past_due, or expired
  if (normalized === "cancelled" || normalized === "past_due" || normalized === "expired") {
    return { isExpired: true, daysRemaining: 0 };
  }

  // If user is not currently in a trial status (e.g. Free/Starter default)
  if (normalized !== "trial") {
    return { isExpired: false, daysRemaining: 0 };
  }

  // Default start date to now if missing so newly started trial is immediately active
  const startDate = trialStartsAt ? new Date(trialStartsAt) : new Date();
  const expiryDate = new Date(startDate.getTime() + TRIAL_DURATION_MS);
  const now = new Date();

  const timeDiff = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

  return {
    isExpired: now > expiryDate,
    daysRemaining,
  };
}

/**
 * Returns integer days left in the trial (0 if expired).
 */
export function getTrialDaysLeft(trialStartsAt: string | Date): number {
  const start = new Date(trialStartsAt);
  const expiryDate = new Date(start.getTime() + TRIAL_DURATION_MS);
  const now = new Date();

  const diffMs = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return daysLeft > 0 ? daysLeft : 0;
}

/**
 * Computes the effective plan taking active 30-day trials into account.
 * When a user is in a valid trial for PRO or ENTERPRISE, they receive all corresponding limits.
 * When a trial expires without a paid subscription, it safely defaults back to STARTER.
 */
export function getEffectivePlan(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined,
  trialStartsAt: string | Date | null | undefined,
  trialPlan?: string | null | undefined,
): "STARTER" | "PRO" | "ENTERPRISE" {
  const normalizedStatus = String(subscriptionStatus || "").trim().toLowerCase();

  if (normalizedStatus === "trial") {
    const trial = checkTrialExpiry(trialStartsAt, normalizedStatus);
    if (!trial.isExpired) {
      const candidate = (trialPlan || plan || "PRO").toUpperCase();
      if (candidate === "ENTERPRISE") return "ENTERPRISE";
      return "PRO";
    }
    // Trial has expired and no paid subscription active: fallback to free Starter
    return "STARTER";
  }

  const raw = String(plan || "STARTER").toUpperCase();
  if (raw === "ENTERPRISE") return "ENTERPRISE";
  if (raw === "PRO") return "PRO";
  return "STARTER";
}
