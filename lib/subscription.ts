export type SubscriptionPlan = "STARTER" | "PRO" | "ENTERPRISE";

type PlanLimits = {
  maxStores: number;
  maxProductsPerStore: number;
  allowCustomDomains: boolean;
  apiRateLimitPerMinute: number;
  platformFeeRate: number;
};

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  STARTER: {
    maxStores: 1,
    maxProductsPerStore: 50,
    allowCustomDomains: false,
    apiRateLimitPerMinute: 60,
    platformFeeRate: 0.02,
  },
  PRO: {
    maxStores: 5,
    maxProductsPerStore: Number.POSITIVE_INFINITY,
    allowCustomDomains: true,
    apiRateLimitPerMinute: 1000,
    platformFeeRate: 0.005,
  },
  ENTERPRISE: {
    maxStores: Number.POSITIVE_INFINITY,
    maxProductsPerStore: Number.POSITIVE_INFINITY,
    allowCustomDomains: true,
    apiRateLimitPerMinute: Number.POSITIVE_INFINITY,
    platformFeeRate: 0,
  },
};

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function getPlanOrDefault(plan: SubscriptionPlan | null | undefined): SubscriptionPlan {
  return plan ?? "STARTER";
}
