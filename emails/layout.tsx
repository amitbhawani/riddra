import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type TransactionalEmailLayoutProps = {
  preview: string;
  title: string;
  eyebrow: string;
  intro: string;
  children?: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  footer?: string;
};

export function TransactionalEmailLayout({
  preview,
  title,
  eyebrow,
  intro,
  children,
  ctaHref,
  ctaLabel,
  footer = "Riddra private beta",
}: TransactionalEmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={eyebrowStyle}>{eyebrow}</Text>
          <Heading style={headingStyle}>{title}</Heading>
          <Text style={introStyle}>{intro}</Text>
          {children ? <Section style={sectionStyle}>{children}</Section> : null}
          {ctaHref && ctaLabel ? (
            <Section style={buttonWrapStyle}>
              <Button href={ctaHref} style={buttonStyle}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}
          <Hr style={dividerStyle} />
          <Text style={footerStyle}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const paragraphStyle = {
  color: "#d0d7e5",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 12px",
} satisfies React.CSSProperties;

export const listStyle = {
  color: "#d0d7e5",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 12px",
  paddingLeft: "18px",
} satisfies React.CSSProperties;

const bodyStyle = {
  backgroundColor: "#07111f",
  fontFamily: "Inter, Arial, sans-serif",
  margin: 0,
  padding: "28px 0",
} satisfies React.CSSProperties;

const containerStyle = {
  backgroundColor: "#0f1726",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "600px",
  padding: "32px",
} satisfies React.CSSProperties;

const eyebrowStyle = {
  color: "#7dd3fc",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  margin: "0 0 12px",
  textTransform: "uppercase",
} satisfies React.CSSProperties;

const headingStyle = {
  color: "#ffffff",
  fontSize: "28px",
  lineHeight: "36px",
  margin: "0 0 14px",
} satisfies React.CSSProperties;

const introStyle = {
  color: "#e2e8f0",
  fontSize: "15px",
  lineHeight: "26px",
  margin: "0 0 18px",
} satisfies React.CSSProperties;

const sectionStyle = {
  margin: "0 0 18px",
} satisfies React.CSSProperties;

const buttonWrapStyle = {
  margin: "20px 0 18px",
} satisfies React.CSSProperties;

const buttonStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "999px",
  color: "#07111f",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  padding: "12px 20px",
  textDecoration: "none",
} satisfies React.CSSProperties;

const dividerStyle = {
  borderColor: "rgba(255,255,255,0.08)",
  margin: "24px 0 18px",
} satisfies React.CSSProperties;

const footerStyle = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "20px",
  margin: 0,
} satisfies React.CSSProperties;
