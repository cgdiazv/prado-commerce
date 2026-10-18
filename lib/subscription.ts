export type SubscriptionPlan = "STARTER" | "PRO" | "ENTERPRISE";

type PlanLimits = {
  maxStores: number;
  maxProductsPerStore: number;
  allowCustomDomains: boolean;
  allowShipStation: boolean;
  allowPos: boolean;
  allowCsvExport: boolean;
  allowCustomCss: boolean;
  apiRateLimitPerMinute: number;
  platformFeeRate: number;
};

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  STARTER: {
    maxStores: 1,
    maxProductsPerStore: 50,
    allowCustomDomains: false,
    allowShipStation: false,
    allowPos: false,
    allowCsvExport: false,
    allowCustomCss: false,
    apiRateLimitPerMinute: 60,
    platformFeeRate: 0.02, // 2% platform transaction fee on Free/Starter tier
  },
  PRO: {
    maxStores: 5,
    maxProductsPerStore: Number.POSITIVE_INFINITY,
    allowCustomDomains: true,
    allowShipStation: false,
    allowPos: true,
    allowCsvExport: true,
    allowCustomCss: true,
    apiRateLimitPerMinute: 1000,
    platformFeeRate: 0,
  },
  ENTERPRISE: {
    maxStores: Number.POSITIVE_INFINITY,
    maxProductsPerStore: Number.POSITIVE_INFINITY,
    allowCustomDomains: true,
    allowShipStation: true,
    allowPos: true,
    allowCsvExport: true,
    allowCustomCss: true,
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
