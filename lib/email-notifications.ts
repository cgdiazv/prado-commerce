import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { buildEmailBrandingStyles } from "@/lib/branding";

type StoreEmailConfig = {
  id: string;
  name: string;
  slug: string;
  mainColor: string;
  welcomeEmailEnabled: boolean;
  orderConfirmationEmailEnabled: boolean;
  invoiceEmailEnabled: boolean;
  senderName: string | null;
  senderEmail: string | null;
  replyToEmail: string | null;
};

type WelcomeEmailInput = {
  store: StoreEmailConfig;
  to: string;
  firstName?: string | null;
};

type OrderConfirmationEmailInput = {
  store: StoreEmailConfig;
  to: string;
  firstName?: string | null;
  orderNumber: number;
  total: number;
  currency: string;
};

type InvoiceEmailInput = {
  store: StoreEmailConfig;
  to: string;
  firstName?: string | null;
  orderNumber: number;
  total: number;
  currency: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_FROM_EMAIL = "notifications@pradocommerce.com";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function resolveAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (configuredUrl) {
    const withProtocol = /^https?:\/\//i.test(configuredUrl)
      ? configuredUrl
      : `https://${configuredUrl}`;

    return withProtocol.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "https://pradocommerce.com";
  }

  return "http://localhost:3000";
}

function formatMoney(currency: string, amount: number) {
  return `${currency.toUpperCase()} ${Number(amount).toFixed(2)}`;
}

function displayName(firstName?: string | null) {
  return firstName?.trim() || "there";
}

function getFromHeader(store: StoreEmailConfig) {
  const fromName = store.senderName?.trim() || store.name;
  return `${fromName} <${SENDER_FROM_EMAIL}>`;
}

function getReplyTo(store: StoreEmailConfig) {
  const explicitReplyTo = store.replyToEmail?.trim().toLowerCase();
  if (explicitReplyTo) return explicitReplyTo;

  const senderEmail = store.senderEmail?.trim().toLowerCase();
  return senderEmail || undefined;
}

function baseHtmlShell(store: StoreEmailConfig, heading: string, bodyHtml: string, ctaLabel: string) {
  const theme = buildEmailBrandingStyles(store.mainColor);
  const appBaseUrl = resolveAppBaseUrl();
  const storefrontUrl = `${appBaseUrl}/storefront/${store.slug}`;

  return `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" style="max-width:620px;width:100%;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;${theme.sectionBorder}">
        <tr>
          <td style="padding:24px 24px 8px 24px;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${store.name}</p>
            <h1 style="margin:0;font-size:24px;line-height:1.3;color:#0f172a;">${heading}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 24px 24px;font-size:15px;line-height:1.6;color:#334155;">
            ${bodyHtml}
            <p style="margin:24px 0 0 0;">
              <a href="${storefrontUrl}" style="${theme.button}">${ctaLabel}</a>
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function sendEmail(store: StoreEmailConfig, to: string, subject: string, html: string) {
  if (!resend) {
    console.warn("[EMAIL_NOTIFICATIONS_DISABLED] RESEND_API_KEY is not configured.");
    return;
  }

  const payload: any = {
    from: getFromHeader(store),
    to,
    subject,
    html,
  };

  const replyTo = getReplyTo(store);
  if (replyTo) {
    payload.replyTo = replyTo;
    payload.reply_to = replyTo;
  }

  await resend.emails.send(payload);
}

export async function getStoreEmailConfig(storeId: string): Promise<StoreEmailConfig | null> {
  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        mainColor: true,
        welcomeEmailEnabled: true,
        orderConfirmationEmailEnabled: true,
        invoiceEmailEnabled: true,
        senderName: true,
        senderEmail: true,
        replyToEmail: true,
      },
    });

    return store;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2022"
    ) {
      const legacyStore = await prisma.store.findUnique({
        where: { id: storeId },
        select: {
          id: true,
          name: true,
          slug: true,
          mainColor: true,
        },
      });

      if (!legacyStore) return null;

      return {
        ...legacyStore,
        welcomeEmailEnabled: false,
        orderConfirmationEmailEnabled: false,
        invoiceEmailEnabled: false,
        senderName: null,
        senderEmail: null,
        replyToEmail: null,
      };
    }

    throw error;
  }
}

export async function sendWelcomeEmail(input: WelcomeEmailInput) {
  const html = baseHtmlShell(
    input.store,
    `Welcome to ${input.store.name}`,
    `<p style="margin:0 0 12px 0;">Hi ${displayName(input.firstName)},</p>
     <p style="margin:0 0 12px 0;">Your shopper account is ready. You can now sign in anytime and keep track of orders and account details.</p>
     <p style="margin:0;"><span style="${buildEmailBrandingStyles(input.store.mainColor).accentText}">Thanks for joining us.</span></p>`,
    "Open storefront",
  );

  await sendEmail(input.store, input.to, `Welcome to ${input.store.name}`, html);
}

export async function sendOrderConfirmationEmail(input: OrderConfirmationEmailInput) {
  const html = baseHtmlShell(
    input.store,
    `Order #${input.orderNumber} confirmed`,
    `<p style="margin:0 0 12px 0;">Hi ${displayName(input.firstName)},</p>
     <p style="margin:0 0 12px 0;">We received your order and it is now being prepared.</p>
     <p style="margin:0 0 12px 0;"><strong>Total:</strong> ${formatMoney(input.currency, input.total)}</p>
     <p style="margin:0;">You will receive updates as your order moves through fulfillment.</p>`,
    "Continue shopping",
  );

  await sendEmail(input.store, input.to, `Order #${input.orderNumber} confirmed`, html);
}

export async function sendInvoiceEmail(input: InvoiceEmailInput) {
  const html = baseHtmlShell(
    input.store,
    `Invoice for order #${input.orderNumber}`,
    `<p style="margin:0 0 12px 0;">Hi ${displayName(input.firstName)},</p>
     <p style="margin:0 0 12px 0;">Your invoice is ready for order #${input.orderNumber}.</p>
     <p style="margin:0 0 12px 0;"><strong>Amount:</strong> ${formatMoney(input.currency, input.total)}</p>
     <p style="margin:0;">Thank you for shopping with ${input.store.name}.</p>`,
    "View storefront",
  );

  await sendEmail(input.store, input.to, `Invoice for order #${input.orderNumber}`, html);
}

type SupportTicketInput = {
  userEmail: string;
  userName?: string | null;
  userId?: string | null;
  subject: string;
  category?: string;
  priority?: string;
  message: string;
};

export async function sendSupportTicketEmail(input: SupportTicketInput) {
  const from = "Prado Support <notifications@pradojob.com>";
  const to = "support@pradocommerce.com";
  const replyTo = input.userEmail.trim();

  if (!resend) {
    console.warn("[SUPPORT_TICKET_DISABLED] RESEND_API_KEY is not configured.");
    return { ok: true, simulated: true };
  }

  const categoryLabel = input.category || "General Support";
  const priorityLabel = input.priority || "NORMAL";
  const userDisplayName = input.userName?.trim() || input.userEmail;

  const html = `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" style="max-width:640px;width:100%;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.05);">
        <tr>
          <td style="padding:24px 28px;background:#0f172a;color:#ffffff;">
            <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;font-weight:700;">Prado Commerce Support Ticket</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;line-height:1.3;color:#ffffff;">${input.subject}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;font-size:14px;line-height:1.6;color:#334155;">
            <table role="presentation" style="width:100%;margin-bottom:24px;border-collapse:collapse;font-size:13px;">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;width:130px;"><strong>Submitted By:</strong></td>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600;">${userDisplayName} &lt;${input.userEmail}&gt;</td>
              </tr>
              ${input.userId ? `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;"><strong>User ID:</strong></td>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;font-family:monospace;">${input.userId}</td>
              </tr>` : ""}
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;"><strong>Category:</strong></td>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;">${categoryLabel}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#64748b;"><strong>Priority:</strong></td>
                <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#0f172a;"><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:#e2e8f0;color:#1e293b;">${priorityLabel}</span></td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;"><strong>Submitted At:</strong></td>
                <td style="padding:8px 0;color:#0f172a;">${new Date().toUTCString()}</td>
              </tr>
            </table>

            <div style="background:#f8fafc;padding:20px;border-radius:12px;border:1px solid #e2e8f0;">
              <p style="margin:0 0 10px 0;font-weight:700;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;">Ticket Message:</p>
              <div style="white-space:pre-wrap;color:#334155;font-size:14px;line-height:1.6;">${input.message}</div>
            </div>

            <p style="margin:24px 0 0 0;font-size:12px;color:#94a3b8;border-t:1px solid #f1f5f9;padding-top:16px;">
              Replying to this email directly will respond to <strong>${input.userEmail}</strong>.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return await resend.emails.send({
    from,
    to,
    replyTo,
    subject: `[Helpdesk Ticket] ${input.subject}`,
    html,
  });
}

type MerchantSubscriptionEmailInput = {
  email: string;
  name?: string | null;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
};

export async function sendMerchantSubscriptionWelcomeEmail(input: MerchantSubscriptionEmailInput) {
  const from = "Prado Commerce <notifications@pradocommerce.com>";
  const to = input.email;

  if (!resend) {
    console.warn("[MERCHANT_WELCOME_EMAIL_DISABLED] RESEND_API_KEY is not configured.");
    return { ok: true, simulated: true };
  }

  const userDisplayName = input.name?.trim() || "there";
  
  const planDisplayNames = {
    STARTER: "Starter",
    PRO: "Pro",
    ENTERPRISE: "Enterprise",
  };
  
  const planName = planDisplayNames[input.plan] || "Starter";
  const isStarter = input.plan === "STARTER";

  const html = `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" style="max-width:620px;width:100%;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr>
          <td style="padding:24px 24px 8px 24px;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Prado Commerce</p>
            <h1 style="margin:0;font-size:24px;line-height:1.3;color:#0f172a;">Welcome to the ${planName} Plan</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 24px 24px;font-size:15px;line-height:1.6;color:#334155;">
            <p style="margin:0 0 12px 0;">Hi ${userDisplayName},</p>
            <p style="margin:0 0 12px 0;">
              ${
                isStarter
                  ? "Welcome to Prado Commerce! Your new account is ready and you are now on the Starter plan. You can start setting up your store right away."
                  : `Thank you for upgrading to the ${planName} plan! Your subscription is now active, and you have access to all the premium features.`
              }
            </p>
            <p style="margin:0 0 12px 0;">If you have any questions, feel free to reach out to our support team.</p>
            <p style="margin:0;"><strong>The Prado Commerce Team</strong></p>
          </td>
        </tr>
      </table>
    </div>
  `;

  return await resend.emails.send({
    from,
    to,
    subject: `Welcome to the Prado Commerce ${planName} Plan`,
    html,
  });
}
