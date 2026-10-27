import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { buildEmailBrandingStyles } from "@/lib/branding";
import { StoreWelcomeEmail } from "@/emails/store-welcome";
import { MerchantWelcomeEmail } from "@/emails/merchant-welcome";

export type StoreEmailConfig = {
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

export type WelcomeEmailInput = {
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

function getFromHeader(store: { name: string; senderName?: string | null }) {
  const fromName = store.senderName?.trim() || store.name;
  return `${fromName} <${SENDER_FROM_EMAIL}>`;
}

function getReplyTo(store: { senderEmail?: string | null; replyToEmail?: string | null }) {
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
    return { ok: true, simulated: true };
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

  return await resend.emails.send(payload);
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
  const appBaseUrl = resolveAppBaseUrl();
  const storefrontUrl = `${appBaseUrl}/storefront/${input.store.slug}`;
  const accountUrl = `${storefrontUrl}/account`;

  const html = "<!DOCTYPE html>" + renderToStaticMarkup(
    React.createElement(StoreWelcomeEmail, {
      storeName: input.store.name,
      storeSlug: input.store.slug,
      customerName: input.firstName,
      mainColor: input.store.mainColor,
      storefrontUrl,
      accountUrl,
      supportEmail: input.store.replyToEmail || input.store.senderEmail || undefined,
    })
  );

  return await sendEmail(input.store, input.to, `Welcome to ${input.store.name}!`, html);
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

export type MerchantSubscriptionEmailInput = {
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

  const appBaseUrl = resolveAppBaseUrl();
  const dashboardUrl = `${appBaseUrl}/dashboard`;
  const planDisplayNames = {
    STARTER: "Starter",
    PRO: "Pro",
    ENTERPRISE: "Enterprise",
  };
  const planName = planDisplayNames[input.plan] || "Starter";

  const html = "<!DOCTYPE html>" + renderToStaticMarkup(
    React.createElement(MerchantWelcomeEmail, {
      merchantName: input.name,
      plan: input.plan,
      dashboardUrl,
    })
  );

  return await resend.emails.send({
    from,
    to,
    subject: `Welcome to Prado Commerce - ${planName} Plan Activated`,
    html,
  });
}

export type PurchaseOrderItemEmail = {
  title: string;
  sku?: string | null;
  qtyOrdered: number;
  unitCost: number;
  totalCost: number;
};

export type PurchaseOrderVendorEmailInput = {
  store: {
    id: string;
    name: string;
    slug?: string | null;
    mainColor?: string | null;
    currency?: string;
    senderName?: string | null;
    senderEmail?: string | null;
    replyToEmail?: string | null;
    logoUrl?: string | null;
    shippingOrigin?: {
      address?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    } | null;
  };
  to: string;
  vendorName: string;
  vendorContactName?: string | null;
  vendorAddress?: string | null;
  vendorPhone?: string | null;
  poNumber: string;
  issueDate?: string | Date | null;
  expectedDate?: string | Date | null;
  notes?: string | null;
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  items: PurchaseOrderItemEmail[];
};

export async function sendPurchaseOrderVendorEmail(input: PurchaseOrderVendorEmailInput) {
  if (!resend) {
    console.warn("[PO_VENDOR_EMAIL_DISABLED] RESEND_API_KEY is not configured.");
    return { ok: true, simulated: true };
  }

  const from = getFromHeader(input.store);
  const replyTo = getReplyTo(input.store);
  const greetingName = input.vendorContactName?.trim() || input.vendorName;

  const issueDateFormatted = input.issueDate
    ? new Date(input.issueDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const expectedDateFormatted = input.expectedDate
    ? new Date(input.expectedDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  const destinationParts = [
    input.store.shippingOrigin?.address,
    input.store.shippingOrigin?.city,
    input.store.shippingOrigin?.state,
    input.store.shippingOrigin?.postalCode,
    input.store.shippingOrigin?.country,
  ].filter(Boolean);

  const destinationAddress = destinationParts.length > 0 ? destinationParts.join(", ") : null;

  const itemsRows = input.items
    .map(
      (item) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:12px 10px;font-size:14px;color:#0f172a;vertical-align:top;">
            <strong>${item.title}</strong>
            ${item.sku ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">SKU: ${item.sku}</div>` : ""}
          </td>
          <td style="padding:12px 10px;font-size:14px;text-align:center;color:#334155;vertical-align:top;">${item.qtyOrdered}</td>
          <td style="padding:12px 10px;font-size:14px;text-align:right;color:#334155;vertical-align:top;">${formatMoney(input.currency, item.unitCost)}</td>
          <td style="padding:12px 10px;font-size:14px;text-align:right;font-weight:600;color:#0f172a;vertical-align:top;">${formatMoney(input.currency, item.totalCost)}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" style="max-width:680px;width:100%;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <!-- Header -->
        <tr>
          <td style="padding:28px 28px 20px 28px;border-bottom:1px solid #f1f5f9;">
            <table role="presentation" style="width:100%;">
              <tr>
                <td style="vertical-align:top;">
                  ${
                    input.store.logoUrl
                      ? `<img src="${input.store.logoUrl}" alt="${input.store.name}" style="height:38px;max-width:180px;object-fit:contain;margin-bottom:8px;" />`
                      : `<h2 style="margin:0 0 4px 0;font-size:20px;font-weight:bold;color:#0f172a;">${input.store.name}</h2>`
                  }
                  <p style="margin:0;font-size:12px;color:#64748b;">${input.store.senderEmail || ""}</p>
                </td>
                <td style="vertical-align:top;text-align:right;">
                  <span style="display:inline-block;padding:4px 10px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border-radius:9999px;">Purchase Order</span>
                  <h1 style="margin:6px 0 2px 0;font-size:22px;color:#0f172a;font-family:monospace;">#${input.poNumber}</h1>
                  <p style="margin:0;font-size:12px;color:#64748b;">Date: ${issueDateFormatted}</p>
                  ${expectedDateFormatted ? `<p style="margin:2px 0 0 0;font-size:12px;color:#2563eb;font-weight:600;">Expected: ${expectedDateFormatted}</p>` : ""}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting & Info Blocks -->
        <tr>
          <td style="padding:20px 28px 12px 28px;font-size:14px;color:#334155;">
            <p style="margin:0 0 16px 0;">Dear <strong>${greetingName}</strong>,</p>
            <p style="margin:0 0 16px 0;">Please find below the official purchase order / invoice details from <strong>${input.store.name}</strong>. Please confirm receipt and estimated dispatch date at your earliest convenience.</p>

            <table role="presentation" style="width:100%;margin:16px 0;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:14px;">
              <tr>
                <td style="width:50%;vertical-align:top;padding:4px 12px;">
                  <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Vendor</p>
                  <p style="margin:0;font-weight:700;color:#0f172a;font-size:13px;">${input.vendorName}</p>
                  ${input.vendorContactName ? `<p style="margin:2px 0 0 0;font-size:12px;color:#475569;">${input.vendorContactName}</p>` : ""}
                  ${input.vendorAddress ? `<p style="margin:2px 0 0 0;font-size:12px;color:#475569;">${input.vendorAddress}</p>` : ""}
                  ${input.vendorPhone ? `<p style="margin:2px 0 0 0;font-size:12px;color:#475569;">${input.vendorPhone}</p>` : ""}
                </td>
                <td style="width:50%;vertical-align:top;padding:4px 12px;border-left:1px solid #e2e8f0;">
                  <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Ship / Deliver To</p>
                  <p style="margin:0;font-weight:700;color:#0f172a;font-size:13px;">${input.store.name}</p>
                  ${destinationAddress ? `<p style="margin:2px 0 0 0;font-size:12px;color:#475569;">${destinationAddress}</p>` : `<p style="margin:2px 0 0 0;font-size:12px;color:#94a3b8;font-style:italic;">Main Delivery Dock</p>`}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Line Items Table -->
        <tr>
          <td style="padding:12px 28px;">
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
                  <th style="padding:10px;text-align:left;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#475569;">Item / Description</th>
                  <th style="padding:10px;text-align:center;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#475569;width:60px;">Qty</th>
                  <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#475569;width:110px;">Unit Cost</th>
                  <th style="padding:10px;text-align:right;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#475569;width:120px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Totals & Notes -->
        <tr>
          <td style="padding:16px 28px 24px 28px;">
            <table role="presentation" style="width:100%;">
              <tr>
                <td style="vertical-align:top;width:55%;padding-right:20px;">
                  ${
                    input.notes
                      ? `
                        <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;">Special Instructions / Notes</p>
                          <p style="margin:0;font-size:12px;color:#334155;line-height:1.5;">${input.notes}</p>
                        </div>
                      `
                      : ""
                  }
                </td>
                <td style="vertical-align:top;width:45%;">
                  <table role="presentation" style="width:100%;font-size:13px;">
                    <tr>
                      <td style="padding:4px 0;color:#64748b;">Subtotal:</td>
                      <td style="padding:4px 0;text-align:right;font-weight:600;color:#0f172a;">${formatMoney(input.currency, input.subtotal)}</td>
                    </tr>
                    ${
                      input.tax > 0
                        ? `
                          <tr>
                            <td style="padding:4px 0;color:#64748b;">Tax:</td>
                            <td style="padding:4px 0;text-align:right;font-weight:600;color:#0f172a;">${formatMoney(input.currency, input.tax)}</td>
                          </tr>
                        `
                        : ""
                    }
                    ${
                      input.shipping > 0
                        ? `
                          <tr>
                            <td style="padding:4px 0;color:#64748b;">Shipping / Freight:</td>
                            <td style="padding:4px 0;text-align:right;font-weight:600;color:#0f172a;">${formatMoney(input.currency, input.shipping)}</td>
                          </tr>
                        `
                        : ""
                    }
                    <tr style="border-top:2px solid #0f172a;">
                      <td style="padding:10px 0 0 0;font-size:15px;font-weight:800;color:#0f172a;">Total:</td>
                      <td style="padding:10px 0 0 0;font-size:16px;font-weight:800;text-align:right;color:#0f172a;">${formatMoney(input.currency, input.total)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;">
            <p style="margin:0 0 4px 0;">This purchase order was generated by <strong>${input.store.name}</strong>.</p>
            ${
              replyTo
                ? `<p style="margin:0;">For any questions, reply to this email or write to <a href="mailto:${replyTo}" style="color:#2563eb;text-decoration:none;">${replyTo}</a>.</p>`
                : ""
            }
          </td>
        </tr>
      </table>
    </div>
  `;

  const payload: any = {
    from,
    to: input.to,
    subject: `Purchase Order #${input.poNumber} from ${input.store.name}`,
    html,
  };

  if (replyTo) {
    payload.replyTo = replyTo;
    payload.reply_to = replyTo;
  }

  return await resend.emails.send(payload);
}

export type BroadcastEmailRecipient = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type BroadcastEmailInput = {
  store: StoreEmailConfig;
  recipients: BroadcastEmailRecipient[];
  subject: string;
  preheader?: string;
  messageHtml: string;
  ctaText?: string;
  ctaUrl?: string;
};

export async function sendCustomerBroadcastEmail(input: BroadcastEmailInput) {
  const { store, recipients, subject, preheader, messageHtml, ctaText, ctaUrl } = input;
  const theme = buildEmailBrandingStyles(store.mainColor);
  const appBaseUrl = resolveAppBaseUrl();
  const targetCtaUrl = ctaUrl?.trim() || `${appBaseUrl}/storefront/${store.slug}`;
  const targetCtaLabel = ctaText?.trim() || "";

  let sentCount = 0;
  let failedCount = 0;
  const failedEmails: string[] = [];

  for (const recipient of recipients) {
    const greeting = recipient.firstName ? `Hola ${recipient.firstName},` : "";
    const html = `
      <div style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <table role="presentation" style="max-width:620px;width:100%;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(15,23,42,0.04);">
          ${preheader ? `<tr><td style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</td></tr>` : ""}
          <!-- Header Branding -->
          <tr>
            <td style="padding:28px 28px 12px 28px;border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">${store.name}</p>
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#0f172a;">${subject}</h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:24px 28px;font-size:15px;line-height:1.65;color:#334155;">
              ${greeting ? `<p style="margin:0 0 16px 0;font-weight:600;color:#0f172a;">${greeting}</p>` : ""}
              <div style="margin:0 0 24px 0;white-space:pre-wrap;">${messageHtml}</div>
              ${targetCtaLabel ? `
                <p style="margin:28px 0 12px 0;">
                  <a href="${targetCtaUrl}" style="${theme.button};display:inline-block;padding:12px 28px;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">${targetCtaLabel}</a>
                </p>
              ` : ""}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 24px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;line-height:1.5;">
              <p style="margin:0 0 4px 0;">Has recibido esta comunicación porque eres cliente registrado de <strong>${store.name}</strong>.</p>
              <p style="margin:0;">Para dudas o consultas puedes responder directamente a este correo.</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    try {
      if (!resend) {
        console.log(`[SIMULATED_BROADCAST_EMAIL] To: ${recipient.email} | Subject: ${subject}`);
        sentCount++;
      } else {
        const payload: any = {
          from: getFromHeader(store),
          to: recipient.email,
          subject,
          html,
        };
        const replyTo = getReplyTo(store);
        if (replyTo) {
          payload.replyTo = replyTo;
          payload.reply_to = replyTo;
        }
        await resend.emails.send(payload);
        sentCount++;
      }
    } catch (err) {
      console.error(`Failed to send broadcast email to ${recipient.email}:`, err);
      failedCount++;
      failedEmails.push(recipient.email);
    }
  }

  return {
    total: recipients.length,
    sentCount,
    failedCount,
    failedEmails,
  };
}


