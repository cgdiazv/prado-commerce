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

export interface StoreWelcomeEmailProps {
  storeName: string;
  storeSlug: string;
  customerName?: string | null;
  mainColor?: string;
  storefrontUrl: string;
  accountUrl?: string;
  supportEmail?: string | null;
  logoUrl?: string | null;
}

export const StoreWelcomeEmail = ({
  storeName = "Indeva Websites",
  storeSlug = "indeva-websites",
  customerName = "Carlos",
  mainColor = "#fa9200",
  storefrontUrl = "https://pradocommerce.com/storefront/indeva-websites",
  accountUrl = "https://pradocommerce.com/storefront/indeva-websites/account",
  supportEmail = "web@indevasa.com",
  logoUrl,
}: StoreWelcomeEmailProps) => {
  const brandColor = mainColor && /^#[0-9a-fA-F]{6}$/.test(mainColor) ? mainColor : "#0f172a";
  const greeting = customerName?.trim() ? `Hi ${customerName.trim()},` : "Hi there,";
  const previewText = `Welcome to ${storeName}! Your new shopper account is ready.`;

  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          @media only screen and (max-width: 600px) {
            .mobile-outer { padding: 8px 4px !important; }
            .mobile-card { padding: 22px 14px !important; border-radius: 12px !important; }
            .mobile-heading { font-size: 21px !important; }
            .mobile-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main} className="mobile-outer">
        <Container style={container} className="mobile-card">
          {/* Header Branding */}
          <Section style={headerSection}>
            <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: "9999px", backgroundColor: `${brandColor}15`, marginBottom: "10px" }}>
              <Text style={{ ...brandBadge, color: brandColor }}>
                {storeName}
              </Text>
            </div>
            <Heading style={heading} className="mobile-heading">Welcome to {storeName}!</Heading>
            <Text style={subheading}>
              Your customer account has been created successfully.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Intro Section */}
          <Section style={section}>
            <Text style={greetingText}>{greeting}</Text>
            <Text style={paragraph}>
              Thank you for creating an account with <strong>{storeName}</strong>. You now have full access to your personalized shopping portal, faster checkouts, and seamless order management.
            </Text>
          </Section>

          {/* Perks (Clean open layout without nested box) */}
          <Section style={perksSection}>
            <Text style={perksHeader}>Here is what you can do with your account:</Text>

            <div style={perkItem}>
              <span style={perkIcon}>⚡</span>
              <div style={{ flex: 1 }}>
                <strong style={perkTitle}>Faster One-Click Checkout</strong>
                <p style={perkDesc}>Save your preferred shipping and billing details for seamless future purchases.</p>
              </div>
            </div>

            <div style={perkItem}>
              <span style={perkIcon}>📦</span>
              <div style={{ flex: 1 }}>
                <strong style={perkTitle}>Live Order Tracking</strong>
                <p style={perkDesc}>Monitor orders from processing to delivery with instant status notifications.</p>
              </div>
            </div>

            <div style={perkItemLast}>
              <span style={perkIcon}>🧾</span>
              <div style={{ flex: 1 }}>
                <strong style={perkTitle}>Invoices & Order History</strong>
                <p style={perkDesc}>Access detailed receipts, invoices, and reorder past favorites anytime.</p>
              </div>
            </div>
          </Section>

          {/* CTA Section */}
          <Section style={ctaSection}>
            <Button
              href={storefrontUrl}
              style={{ ...primaryButton, backgroundColor: brandColor }}
              className="mobile-button"
            >
              Start Shopping at {storeName} &rarr;
            </Button>
            <div style={{ marginTop: "12px" }}>
              <Link href={accountUrl} style={secondaryLink}>
                Go to my account profile
              </Link>
            </div>
          </Section>

          <Hr style={divider} />

          {/* Support & Security Note */}
          <Section style={section}>
            <Text style={helpText}>
              Need help or have questions about an order? Simply reply directly to this email
              {supportEmail ? (
                <> or contact us at <Link href={`mailto:${supportEmail}`} style={{ color: brandColor, textDecoration: "underline" }}>{supportEmail}</Link></>
              ) : null}.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerBrand}>
              {storeName} • Powered by Prado Commerce
            </Text>
            <Text style={footerNotice}>
              You received this email because an account was registered with your email on {storeName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default StoreWelcomeEmail;

// Bulletproof inline styles
const main: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "16px 8px", // Minimal outer spacing for maximum phone width
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  maxWidth: "580px",
  width: "100%",
  margin: "0 auto",
  padding: "28px 18px", // Balanced padding
  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03)",
};

const headerSection: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "4px",
};

const brandBadge: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  margin: 0,
};

const heading: React.CSSProperties = {
  fontSize: "23px",
  fontWeight: 800,
  lineHeight: 1.28,
  color: "#0f172a",
  margin: "6px 0 6px 0",
};

const subheading: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748b",
  margin: 0,
  lineHeight: 1.45,
};

const divider: React.CSSProperties = {
  borderColor: "#f1f5f9",
  margin: "20px 0",
};

const section: React.CSSProperties = {
  margin: "0 0 14px 0",
};

const greetingText: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#0f172a",
  margin: "0 0 8px 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#334155",
  margin: "0 0 12px 0",
};

const perksSection: React.CSSProperties = {
  margin: "18px 0 20px 0",
};

const perksHeader: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#475569",
  margin: "0 0 12px 0",
};

const perkItem: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  paddingBottom: "12px",
  marginBottom: "12px",
  borderBottom: "1px solid #f1f5f9",
};

const perkItemLast: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  paddingBottom: "4px",
};

const perkIcon: React.CSSProperties = {
  fontSize: "17px",
  lineHeight: 1,
  paddingTop: "2px",
};

const perkTitle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#0f172a",
  display: "block",
  marginBottom: "2px",
};

const perkDesc: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.45,
  margin: 0,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center",
  margin: "24px 0 16px 0",
};

const primaryButton: React.CSSProperties = {
  color: "#ffffff",
  borderRadius: "9999px",
  padding: "13px 28px",
  fontSize: "14px",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-block",
  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
};

const secondaryLink: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  textDecoration: "underline",
};

const helpText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#64748b",
  margin: 0,
  textAlign: "center",
};

const footerSection: React.CSSProperties = {
  textAlign: "center",
  marginTop: "14px",
};

const footerBrand: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#64748b",
  margin: "0 0 4px 0",
};

const footerNotice: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: 0,
  lineHeight: 1.4,
};
