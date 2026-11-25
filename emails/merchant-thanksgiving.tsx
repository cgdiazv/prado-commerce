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

export interface MerchantThanksgivingEmailProps {
  merchantName?: string;
  storeName?: string;
  dashboardUrl?: string;
  settingsUrl?: string;
}

export const MerchantThanksgivingEmail = ({
  merchantName = "there",
  storeName,
  dashboardUrl = "https://www.pradocommerce.com/dashboard",
  settingsUrl = "https://www.pradocommerce.com/dashboard/settings",
}: MerchantThanksgivingEmailProps) => {
  const trimmedName = merchantName?.trim();
  const greeting =
    trimmedName && trimmedName.toLowerCase() !== "there"
      ? `Dear ${trimmedName},`
      : "Dear Partner,";
  const storeLine = storeName?.trim()
    ? `Working alongside you and supporting ${storeName.trim()} has been a genuine privilege.`
    : "Working alongside you and supporting your business has been a genuine privilege.";
  const previewText =
    "Wishing you, your team, and your loved ones a warm and joyful Thanksgiving from Prado Commerce.";

  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          @media only screen and (max-width: 600px) {
            .mobile-outer { padding: 12px 6px !important; }
            .mobile-card { padding: 28px 18px !important; border-radius: 14px !important; }
            .mobile-heading { font-size: 24px !important; }
            .mobile-button { width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main} className="mobile-outer">
        <Container style={container} className="mobile-card">
          {/* Warm Top Accent Bar */}
          <div style={topAccentBar} />

          {/* Header */}
          <Section style={headerSection}>
            <div style={badgeWrapper}>
              <Text style={badgeText}>Prado Commerce &bull; Thanksgiving 2026</Text>
            </div>
            <Text style={emblem}>🍂</Text>
            <Heading style={heading} className="mobile-heading">
              Happy Thanksgiving!
            </Heading>
            <Text style={subheading}>
              With sincere gratitude from all of us at Prado Commerce
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Main Message */}
          <Section style={contentSection}>
            <Text style={greetingText}>{greeting}</Text>
            <Text style={paragraph}>
              As we pause to celebrate Thanksgiving, we wanted to take a moment
              to say a heartfelt <strong>thank you</strong> for trusting Prado
              Commerce with your business. {storeLine}
            </Text>
            <Text style={paragraph}>
              Running a business takes dedication, creativity, and countless
              hours behind the scenes. We&apos;re truly grateful to be a small
              part of your story and inspired every day by the entrepreneurs and
              teams building on our platform.
            </Text>
          </Section>

          {/* Warm Gratitude Callout */}
          <Section style={calloutCard}>
            <Text style={calloutHeading}>Wishing You Rest &amp; Success</Text>
            <Text style={calloutText}>
              Whether you&apos;re stepping away to enjoy a well-earned holiday
              with family and friends or gearing up for Black Friday and the
              busy season ahead, we wish you warmth, peace, and a wonderfully
              successful close to the year.
            </Text>
          </Section>

          <Section style={contentSection}>
            <Text style={paragraph}>
              As always, our platform is running around the clock for you—and if
              you ever need a hand with your store, quotes, orders, or POS,
              we&apos;re just an email away.
            </Text>
            <Text style={signoff}>
              Warmest wishes,
              <br />
              <strong style={signoffBrand}>The Prado Commerce Team</strong>
            </Text>
          </Section>

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href={dashboardUrl} style={button} className="mobile-button">
              Open Your Dashboard &rarr;
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Prado Commerce &bull; Unified E-Commerce
            </Text>
            <Text style={footerSubtext}>
              Need help anytime? Reach us at{" "}
              <Link href="mailto:support@pradocommerce.com" style={footerLink}>
                support@pradocommerce.com
              </Link>{" "}
              or manage preferences in{" "}
              <Link href={settingsUrl} style={footerLink}>
                Settings
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default MerchantThanksgivingEmail;

// -----------------------------------------------------------------------------
// Inline email styles (compatible with Gmail, Apple Mail, Outlook, etc.)
// -----------------------------------------------------------------------------

const main: React.CSSProperties = {
  backgroundColor: "#faf7f2",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: "28px 12px",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "18px",
  border: "1px solid #ede4d6",
  maxWidth: "580px",
  width: "100%",
  margin: "0 auto",
  padding: "36px 32px 30px 32px",
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
};

const topAccentBar: React.CSSProperties = {
  height: "4px",
  width: "100%",
  borderRadius: "9999px",
  backgroundColor: "#d97706",
  marginBottom: "24px",
};

const headerSection: React.CSSProperties = {
  textAlign: "center",
  paddingBottom: "4px",
};

const badgeWrapper: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 14px",
  borderRadius: "9999px",
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  marginBottom: "14px",
};

const badgeText: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#b45309",
  margin: 0,
};

const emblem: React.CSSProperties = {
  fontSize: "34px",
  lineHeight: 1,
  margin: "4px 0 10px 0",
};

const heading: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 800,
  lineHeight: 1.2,
  color: "#0f172a",
  margin: "0 0 8px 0",
  letterSpacing: "-0.02em",
};

const subheading: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
  margin: 0,
  lineHeight: 1.5,
};

const divider: React.CSSProperties = {
  borderColor: "#f1ebe1",
  margin: "24px 0",
};

const contentSection: React.CSSProperties = {
  marginBottom: "8px",
};

const greetingText: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 700,
  color: "#0f172a",
  margin: "0 0 12px 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.68,
  color: "#334155",
  margin: "0 0 14px 0",
};

const calloutCard: React.CSSProperties = {
  backgroundColor: "#fffbeb",
  borderLeft: "4px solid #d97706",
  borderRadius: "10px",
  padding: "18px 20px",
  margin: "20px 0 22px 0",
};

const calloutHeading: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "#b45309",
  margin: "0 0 8px 0",
};

const calloutText: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: 1.6,
  color: "#78350f",
  margin: 0,
};

const signoff: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: 1.65,
  color: "#334155",
  margin: "18px 0 0 0",
};

const signoffBrand: React.CSSProperties = {
  color: "#0f172a",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center",
  margin: "26px 0 8px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#0f172a",
  color: "#ffffff",
  borderRadius: "9999px",
  padding: "13px 28px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  display: "inline-block",
};

const footerSection: React.CSSProperties = {
  textAlign: "center",
  marginTop: "8px",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#64748b",
  margin: "0 0 6px 0",
};

const footerSubtext: React.CSSProperties = {
  fontSize: "11px",
  color: "#94a3b8",
  margin: 0,
  lineHeight: 1.5,
};

const footerLink: React.CSSProperties = {
  color: "#64748b",
  textDecoration: "underline",
};
