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

export interface MerchantWelcomeEmailProps {
  merchantName?: string | null;
  plan?: "STARTER" | "PRO" | "ENTERPRISE";
  dashboardUrl?: string;
}

export const MerchantWelcomeEmail = ({
  merchantName = "Carlos",
  plan = "ENTERPRISE",
  dashboardUrl = "https://pradocommerce.com/dashboard",
}: MerchantWelcomeEmailProps) => {
  const planDisplayNames = {
    STARTER: "Starter",
    PRO: "Pro",
    ENTERPRISE: "Enterprise",
  };

  const planName = planDisplayNames[plan] || "Starter";
  const greeting = merchantName?.trim() ? `Hi ${merchantName.trim()},` : "Hi there,";
  const previewText = `Welcome to Prado Commerce! Your ${planName} account is ready.`;

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
          {/* Header Badge */}
          <Section style={headerSection}>
            <div style={planBadgeWrapper}>
              <Text style={planBadgeText}>
                {planName} Plan • Prado Commerce
              </Text>
            </div>
            <Heading style={heading} className="mobile-heading">
              Welcome to Prado Commerce
            </Heading>
            <Text style={subheading}>
              The unified commerce platform built to streamline your physical and digital store.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Intro */}
          <Section style={section}>
            <Text style={greetingText}>{greeting}</Text>
            <Text style={paragraph}>
              Welcome aboard! Your Prado Commerce merchant account is fully activated on the <strong>{planName}</strong> plan. You are now equipped with enterprise-grade multi-location POS, automated inventory sync, customer management, and high-converting storefronts.
            </Text>
          </Section>

          {/* Setup Checklist (Clean open layout without nested grey box for max phone width) */}
          <Section style={stepsSection}>
            <Text style={stepsHeader}>4 Quick Steps to Get Started</Text>

            <div style={stepRow}>
              <span style={stepNumber}>1</span>
              <div style={stepContent}>
                <strong style={stepTitle}>Brand Your Storefront</strong>
                <p style={stepDesc}>Customize your logo, brand colors, and contact info in <em>Settings &rarr; Store Details</em>.</p>
              </div>
            </div>

            <div style={stepRow}>
              <span style={stepNumber}>2</span>
              <div style={stepContent}>
                <strong style={stepTitle}>Set Up Inventory & Products</strong>
                <p style={stepDesc}>Create products, import via CSV or WooCommerce, and manage multi-location stock levels.</p>
              </div>
            </div>

            <div style={stepRow}>
              <span style={stepNumber}>3</span>
              <div style={stepContent}>
                <strong style={stepTitle}>Configure Payment Gateways</strong>
                <p style={stepDesc}>Accept card payments seamlessly with Stripe, PixelPay, or Authorize.Net in <em>Settings &rarr; Payments</em>.</p>
              </div>
            </div>

            <div style={stepRowLast}>
              <span style={stepNumber}>4</span>
              <div style={stepContent}>
                <strong style={stepTitle}>Launch Your POS Terminal</strong>
                <p style={stepDesc}>Ring up orders, scan barcodes, and handle cash/card payments directly from the integrated POS.</p>
              </div>
            </div>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href={dashboardUrl} style={button} className="mobile-button">
              Open Merchant Dashboard &rarr;
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Support */}
          <Section style={section}>
            <Text style={helpText}>
              Need assistance setting up your store? Reply to this email or reach our support team anytime at{" "}
              <Link href="mailto:support@pradocommerce.com" style={supportLink}>
                support@pradocommerce.com
              </Link>.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Prado Systems • All Rights Reserved
            </Text>
            <Text style={footerSubtext}>
              You received this email because you signed up or updated your account at pradocommerce.com.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MerchantWelcomeEmail;

// Bulletproof inline styles optimized for mobile readability
const main: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "16px 8px", // Minimal outer spacing so phones get maximum width
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  maxWidth: "580px",
  width: "100%",
  margin: "0 auto",
  padding: "28px 18px", // Balanced padding: wide, roomy and not squeezed
  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.03)",
};

const headerSection: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "4px",
};

const planBadgeWrapper: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: "9999px",
  backgroundColor: "#eff6ff",
  border: "1px solid #dbeafe",
  marginBottom: "10px",
};

const planBadgeText: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#2563eb",
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

const stepsSection: React.CSSProperties = {
  margin: "18px 0 20px 0",
};

const stepsHeader: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#475569",
  margin: "0 0 12px 0",
};

const stepRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  paddingBottom: "12px",
  marginBottom: "12px",
  borderBottom: "1px solid #f1f5f9",
};

const stepRowLast: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  paddingBottom: "4px",
};

const stepNumber: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#0f172a",
  flexShrink: 0,
  minWidth: "14px",
  lineHeight: "20px",
};

const stepContent: React.CSSProperties = {
  flex: 1,
};

const stepTitle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#0f172a",
  display: "block",
  marginBottom: "2px",
};

const stepDesc: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748b",
  lineHeight: 1.45,
  margin: 0,
};

const ctaSection: React.CSSProperties = {
  textAlign: "center",
  margin: "24px 0 16px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#0f172a",
  color: "#ffffff",
  borderRadius: "9999px",
  padding: "13px 28px",
  fontSize: "14px",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-block",
  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
};

const helpText: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#64748b",
  margin: 0,
  textAlign: "center",
};

const supportLink: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "underline",
};

const footerSection: React.CSSProperties = {
  textAlign: "center",
  marginTop: "14px",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#64748b",
  margin: "0 0 4px 0",
};

const footerSubtext: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: 0,
  lineHeight: 1.4,
};
