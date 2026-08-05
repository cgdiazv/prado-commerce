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
