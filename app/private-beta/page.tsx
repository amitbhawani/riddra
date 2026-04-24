import type { Metadata } from "next";

import { ButtonLink, Container, Eyebrow, GlowCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Private beta access",
  description: "Riddra is currently available through an invite-only private beta.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrivateBetaPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="max-w-3xl">
        <GlowCard className="space-y-6">
          <Eyebrow>Private beta</Eyebrow>
          <div className="space-y-4">
            <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              This Riddra build is currently invite only.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-mist/76">
              Product routes are only available to approved beta users and operators right now. If you already have an invite,
              log in with the approved email address to continue.
            </p>
            <p className="text-sm text-mist/64">If you need access, use the request-access path or contact the team directly.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/login">Log in</ButtonLink>
            <ButtonLink href="/contact" tone="secondary">
              Request access
            </ButtonLink>
            <ButtonLink href="/" tone="secondary">
              Back to home
            </ButtonLink>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
