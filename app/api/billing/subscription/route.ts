import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import { TRIAL_DAYS } from "@/lib/trial-check";

export interface SubscriptionInvoiceItem {
  id: string;
  number: string;
  created: number;
  periodStart: number | null;
  periodEnd: number | null;
  amount: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  description: string | null;
}

export interface SubscriptionBillingSummary {
  planTier: string;
  planName: string;
  monthlyRate: number;
  currency: string;
  subscriptionStatus: string;
  nextBillingDate: number | null;
  cancelAtPeriodEnd: boolean;
  isTrial: boolean;
  paymentMethod: {
    brand: string;
    last4: string;
    expMonth: number | null;
    expYear: number | null;
  } | null;
  hasStripeCustomer: boolean;
  invoices: SubscriptionInvoiceItem[];
}

function getPlanDefaults(
  plan: string | null | undefined,
  isTrial: boolean,
): { tier: string; name: string; rate: number } {
  const normalized = (plan || "STARTER").toUpperCase();
  if (normalized === "ENTERPRISE") {
    return {
      tier: "enterprise",
      name: isTrial ? "Enterprise Plan (30-Day Free Trial)" : "Enterprise Plan",
      rate: isTrial ? 0 : 199,
    };
  }
  if (normalized === "PRO") {
    return {
      tier: "pro",
      name: isTrial ? "Pro Plan (30-Day Free Trial)" : "Pro Plan",
      rate: isTrial ? 0 : 49,
    };
  }
  return {
    tier: "starter",
    name: "Starter Plan",
    rate: 0,
  };
}

export async function GET(request: Request) {
  try {
    const sessionUser = await getCurrentUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchant = await prisma.merchantUser.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        trialStartsAt: true,
        trialPlan: true,
        stripeCustomerId: true,
        stripeSubId: true,
      },
    });

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const isTrial =
      merchant.subscriptionStatus === "trialing" && Boolean(merchant.trialStartsAt);
    const activePlan = isTrial && merchant.trialPlan ? merchant.trialPlan : merchant.plan;
    const planDefaults = getPlanDefaults(activePlan, isTrial);

    const summary: SubscriptionBillingSummary = {
      planTier: isTrial ? "trial" : planDefaults.tier,
      planName: planDefaults.name,
      monthlyRate: planDefaults.rate,
      currency: "USD",
      subscriptionStatus: merchant.subscriptionStatus || "active",
      nextBillingDate: null,
      cancelAtPeriodEnd: false,
      isTrial,
      paymentMethod: null,
      hasStripeCustomer: false,
      invoices: [],
    };

    if (isTrial && merchant.trialStartsAt) {
      const trialEnd = new Date(
        merchant.trialStartsAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
      );
      summary.nextBillingDate = Math.floor(trialEnd.getTime() / 1000);
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ success: true, data: summary });
    }

    try {
      const stripe = new Stripe(stripeSecretKey);
      let customerId = merchant.stripeCustomerId || null;
      const subscriptionId = merchant.stripeSubId || null;

      if (subscriptionId) {
        try {
          const sub: any = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["default_payment_method"],
          });

          if (sub) {
            if (!customerId && typeof sub.customer === "string") {
              customerId = sub.customer;
            }
            if (typeof sub.current_period_end === "number") {
              summary.nextBillingDate = sub.current_period_end;
            }
            summary.cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
            if (typeof sub.status === "string") {
              summary.subscriptionStatus = sub.status;
              summary.isTrial = sub.status === "trialing";
            }

            const firstItem = sub.items?.data?.[0];
            const unitAmount = firstItem?.price?.unit_amount;
            const interval = firstItem?.price?.recurring?.interval;
            if (typeof unitAmount === "number") {
              summary.monthlyRate =
                interval === "year"
                  ? Math.round((unitAmount / 100 / 12) * 100) / 100
                  : unitAmount / 100;
            }
            if (typeof firstItem?.price?.currency === "string") {
              summary.currency = firstItem.price.currency.toUpperCase();
            }

            const pm = sub.default_payment_method;
            if (pm && typeof pm === "object" && pm.card) {
              summary.paymentMethod = {
                brand: (pm.card.brand || "Card").toUpperCase(),
                last4: pm.card.last4 || "••••",
                expMonth: pm.card.exp_month ?? null,
                expYear: pm.card.exp_year ?? null,
              };
            }
          }
        } catch (subErr) {
          console.warn("[BILLING_SUBSCRIPTION_RETRIEVE_WARN]", subErr);
        }
      }

      if (!customerId && merchant.email) {
        try {
          const customers = await stripe.customers.list({
            email: merchant.email,
            limit: 1,
          });
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        } catch (custErr) {
          console.warn("[BILLING_CUSTOMER_LOOKUP_WARN]", custErr);
        }
      }

      if (customerId) {
        summary.hasStripeCustomer = true;

        if (!summary.paymentMethod) {
          try {
            const pms = await stripe.paymentMethods.list({
              customer: customerId,
              type: "card",
              limit: 1,
            });
            const card = pms.data[0]?.card;
            if (card) {
              summary.paymentMethod = {
                brand: (card.brand || "Card").toUpperCase(),
                last4: card.last4 || "••••",
                expMonth: card.exp_month ?? null,
                expYear: card.exp_year ?? null,
              };
            }
          } catch {
            // Ignore payment method list failure
          }
        }

        try {
          const invoicesRes = await stripe.invoices.list({
            customer: customerId,
            limit: 24,
          });

          summary.invoices = invoicesRes.data.map((inv: any) => {
            const firstLine = inv.lines?.data?.[0];
            const amountCents =
              typeof inv.amount_paid === "number" && inv.amount_paid > 0
                ? inv.amount_paid
                : typeof inv.total === "number"
                  ? inv.total
                  : inv.amount_due || 0;

            return {
              id: inv.id,
              number: inv.number || inv.id.slice(0, 12).toUpperCase(),
              created: inv.created,
              periodStart: firstLine?.period?.start ?? inv.period_start ?? null,
              periodEnd: firstLine?.period?.end ?? inv.period_end ?? null,
              amount: amountCents / 100,
              currency: (inv.currency || "usd").toUpperCase(),
              status: inv.status || "paid",
              hostedInvoiceUrl: inv.hosted_invoice_url || null,
              invoicePdfUrl: inv.invoice_pdf || null,
              description: firstLine?.description || null,
            };
          });
        } catch (invErr) {
          console.warn("[BILLING_INVOICES_LIST_WARN]", invErr);
        }
      }
    } catch (stripeErr) {
      console.warn("[BILLING_STRIPE_SUMMARY_WARN]", stripeErr);
    }

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error("[BILLING_SUBSCRIPTION_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to load subscription billing history" },
      { status: 500 },
    );
  }
}
