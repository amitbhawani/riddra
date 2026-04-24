"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Container } from "@/components/ui";

type ManagedNavLink = {
  label: string;
  href: string;
};

const adminOnlyFooterHrefPatterns = [/^\/launch-readiness$/i, /^\/methodology$/i];
const adminOnlyFooterLabelPatterns = [/launch/i, /readiness/i, /methodology/i, /beta/i];

function isAdminOnlyFooterLink(link: ManagedNavLink) {
  const normalizedHref = link.href.trim();
  const normalizedLabel = link.label.trim();

  return (
    adminOnlyFooterHrefPatterns.some((pattern) => pattern.test(normalizedHref)) ||
    adminOnlyFooterLabelPatterns.some((pattern) => pattern.test(normalizedLabel))
  );
}

function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 480);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-5 right-5 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(226,222,217,0.28)] bg-[rgba(7,11,19,0.88)] text-sm text-white shadow-[0_14px_28px_rgba(0,0,0,0.24)] backdrop-blur transition hover:bg-[rgba(12,18,29,0.95)]"
    >
      ↑
    </button>
  );
}

export function SiteFooterClient({
  launchLabel,
  footerSummary,
  footerLinks,
}: {
  launchLabel: string;
  footerSummary: string;
  footerLinks: ManagedNavLink[];
}) {
  const pathname = usePathname();
  const isAdminSurface = pathname?.startsWith("/admin") ?? false;
  const visibleFooterLinks = isAdminSurface
    ? footerLinks
    : footerLinks.filter((item) => !isAdminOnlyFooterLink(item));

  return (
    <>
      <footer className="relative z-10 border-t border-white/8 bg-[#141414] py-8">
        <Container className="flex flex-col gap-4 text-sm text-[rgba(255,255,255,0.68)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-white">Riddra</p>
            {isAdminSurface ? (
              <>
                <p>Riddra build-complete platform. Current release posture: {launchLabel}.</p>
                <p>{footerSummary}</p>
              </>
            ) : (
              <p>Research, discovery, and market context.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {visibleFooterLinks.map((item) => (
              <Link key={`${item.label}-${item.href}`} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </Container>
      </footer>
      <BackToTopButton />
    </>
  );
}
