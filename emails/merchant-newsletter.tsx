import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface MerchantNewsletterProps {
  merchantName?: string;
  storeName?: string;
  issueNumber?: number;
  dashboardUrl?: string;
  unsubscribeUrl?: string;
}

export const MerchantNewsletter = ({
  merchantName = "Merchant",
  storeName = "Your Store",
  issueNumber = 1,
  dashboardUrl = "https://www.pradocommerce.com",
  unsubscribeUrl = "https://www.pradocommerce.com/dashboard/settings",
}: MerchantNewsletterProps) => {
  return (
    <Html>
      <Head />
      <Preview>Why overselling hurts customer trust (and how to fix it in 3 minutes)</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Badge */}
          <Section style={headerSection}>
            <Text style={badge}>Prado Commerce Academy • Issue #{issueNumber}</Text>
            <Heading style={title}>The Inventory Sync Secret</Heading>
            <Text style={subtitle}>
              Bridging your physical shelves and online storefront
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Intro */}
          <Section style={contentSection}>
            <Text style={paragraph}>Hey {merchantName},</Text>
            <Text style={paragraph}>
              Ever had a customer buy an item online, only to realize your in-store staff sold the last unit 20 minutes earlier?
            </Text>
            <Text style={paragraph}>
              Overselling is one of the quickest ways to erode buyer trust. When customers receive a cancellation email, 68% never return to that store. The good news? You don&apos;t need a clunky ERP to fix it.
            </Text>
          </Section>

          {/* Actionable Blueprint Card */}
          <Section style={blueprintCard}>
            <Text style={blueprintHeading}>3-Step Omnichannel Blueprint</Text>
            <Text style={blueprintItem}>
              <strong style={strongCyan}>1. Log arrivals with PO Receiving:</strong> Instead of manual stock edits, scan or receive shipments directly under <em>Inventory &rarr; Purchase Orders</em>. Stock increments in real-time across both POS and storefront.
            </Text>
            <Text style={blueprintItem}>
              <strong style={strongCyan}>2. Set Low Stock Safety Buffers:</strong> Keep a 1-unit reserve threshold for high-velocity items so walk-in sales never collide with online checkouts.
            </Text>
            <Text style={blueprintItem}>
              <strong style={strongCyan}>3. Enable Cashier Quick-Audits:</strong> Use your phone or floor tablet to spot-check top sellers weekly right from the dashboard.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href={dashboardUrl} style={button}>
              Open Receiving & Inventory in {storeName} &rarr;
            </Button>
          </Section>

          {/* Quick Win Teaser */}
          <Section style={teaserSection}>
            <Text style={teaserText}>
              <strong>Next Week&apos;s Preview:</strong> How to turn in-person store visitors into repeat online buyers using your POS checkout QR codes.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Sent with ❤️ from Prado Commerce • Unified E-Commerce & Omnichannel Tools
            </Text>
            <Text style={footerSubtext}>
              You are receiving this because you run a store on Prado Commerce.{" "}
              <Link href={unsubscribeUrl} style={footerLink}>
                Notification settings
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MerchantNewsletter;

// -----------------------------------------------------------------------------
// Bulletproof inline styles (compatible with Gmail, Apple Mail, Outlook, etc.)
// -----------------------------------------------------------------------------

const main: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "32px 16px",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  maxWidth: "580px",
  margin: "0 auto",
  padding: "36px 32px",
};

const headerSection: React.CSSProperties = {
  marginBottom: "8px",
};

const badge: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#0891b2", // cyan-600
  margin: "0 0 8px 0",
};

const title: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  lineHeight: 1.25,
  color: "#0f172a", // slate-900
  margin: "0 0 6px 0",
};

const subtitle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b", // slate-500
  margin: 0,
};

const divider: React.CSSProperties = {
  borderColor: "#f1f5f9",
  margin: "24px 0",
};

const contentSection: React.CSSProperties = {
  marginBottom: "16px",
};

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#334155", // slate-700
  margin: "0 0 14px 0",
};

const blueprintCard: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  padding: "20px 22px",
  margin: "24px 0",
};

const blueprintHeading: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#475569",
  margin: "0 0 12px 0",
};

const blueprintItem: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: 1.55,
  color: "#1e293b",
  margin: "0 0 10px 0",
};

const strongCyan: React.CSSProperties = {
  color: "#0e7490", // cyan-700
};

const ctaSection: React.CSSProperties = {
  textAlign: "center",
  margin: "28px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#0f172a",
  color: "#ffffff",
  borderRadius: "10px",
  padding: "13px 26px",
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

const teaserSection: React.CSSProperties = {
  backgroundColor: "#ecfeff", // cyan-50
  borderLeft: "4px solid #06b6d4", // cyan-500
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "20px 0",
};

const teaserText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#083344", // cyan-950
  margin: 0,
};

const footerSection: React.CSSProperties = {
  textAlign: "center",
  marginTop: "16px",
};

const footerText: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: "0 0 4px 0",
};

const footerSubtext: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: 0,
};

const footerLink: React.CSSProperties = {
  color: "#64748b",
  textDecoration: "underline",
};
