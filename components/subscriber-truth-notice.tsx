import Link from "next/link";

import { getPublicSafeHref } from "@/lib/public-surface-links";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

type SubscriberTruthNoticeProps = {
  eyebrow: string;
  title: string;
  description: string;
  items?: string[];
  currentState?: string;
  expectedState?: string;
  href?: string;
  hrefLabel?: string;
  secondaryHref?: string;
  secondaryHrefLabel?: string;
};

function normalizeDeferredBillingCopy(item: string) {
  const config = getRuntimeLaunchConfig();
  const normalizedMode = config.launchMode.toLowerCase();
  const commercialBillingDeferred = !["public_live", "public-launch", "public_launch", "live"].includes(
    normalizedMode,
  );

  if (!commercialBillingDeferred) {
    return item;
  }

  const normalizedItem = item.toLowerCase();

  if (normalizedItem.includes("private beta") || normalizedItem.includes("intentionally")) {
    return item;
  }

  if (
    normalizedItem.includes("billing core credentials exist") ||
    normalizedItem.includes("billing credentials exist") ||
    normalizedItem.includes("razorpay credentials exist")
  ) {
    return "Commercial billing remains intentionally unavailable during private beta, so this route should explain future paid workflows without implying live checkout.";
  }

  if (
    normalizedItem.includes("billing credentials are still incomplete") ||
    normalizedItem.includes("billing core credentials are still missing") ||
    normalizedItem.includes("razorpay credentials are still missing") ||
    normalizedItem.includes("payment support remains mostly a preparation lane") ||
    normalizedItem.includes("no real recovery state can be trusted yet")
  ) {
    return "Commercial billing is intentionally deferred during private beta, so missing Razorpay inputs should not be treated as a blocker here.";
  }

  if (normalizedItem.includes("checkout") && normalizedItem.includes("webhook")) {
    return "Commercial checkout and webhook lifecycle proof remain intentionally deferred during private beta, so paid-feature language should stay expectation-setting here.";
  }

  return item;
}

function sanitizePublicCopy(item: string) {
  return normalizeDeferredBillingCopy(item)
    .replace(/local preview/gi, "signed-in test")
    .replace(/launch activation/gi, "public release")
    .replace(/support registry/gi, "support records")
    .replace(/awaiting verified/gi, "not available yet")
    .replace(/\bblocked\b/gi, "needs attention")
    .replace(/\bdeferred\b/gi, "scheduled later")
    .replace(/\binternal\b/gi, "private");
}

export function SubscriberTruthNotice({
  eyebrow,
  title,
  description,
  items = [],
  currentState,
  expectedState,
  href,
  hrefLabel,
  secondaryHref,
  secondaryHrefLabel,
}: SubscriberTruthNoticeProps) {
  const normalizedItems = items.map(sanitizePublicCopy);
  const safeHref = getPublicSafeHref(href);
  const safeSecondaryHref = getPublicSafeHref(secondaryHref);
  const safeTitle = sanitizePublicCopy(title);
  const safeDescription = sanitizePublicCopy(description);
  const safeCurrentState = currentState ? sanitizePublicCopy(currentState) : null;
  const safeExpectedState = expectedState ? sanitizePublicCopy(expectedState) : null;

  return (
    <div className="subscriber-truth-notice riddra-auth-truth-notice riddra-product-card relative overflow-hidden rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(247,244,240,0.94)_100%)] p-4 shadow-[0_10px_28px_rgba(27,58,107,0.04)]">
      <p className="riddra-auth-notice-eyebrow riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[#8E5723]">{eyebrow}</p>
      <h2 className="riddra-auth-notice-title riddra-product-body mt-2 text-[16px] font-semibold text-[#1B3A6B]">{safeTitle}</h2>
      <p className="riddra-auth-notice-copy riddra-product-body mt-1.5 max-w-3xl text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">{safeDescription}</p>
      {safeCurrentState || safeExpectedState ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {safeCurrentState ? (
            <div className="subscriber-truth-notice-panel riddra-auth-truth-panel rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-4">
              <p className="riddra-auth-truth-label riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.76)]">
                Current state
              </p>
              <p className="riddra-auth-truth-copy riddra-product-body mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{safeCurrentState}</p>
            </div>
          ) : null}
          {safeExpectedState ? (
            <div className="subscriber-truth-notice-panel riddra-auth-truth-panel rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-4">
              <p className="riddra-auth-truth-label riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.76)]">
                Expected state
              </p>
              <p className="riddra-auth-truth-copy riddra-product-body mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{safeExpectedState}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {normalizedItems.length > 0 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {normalizedItems.map((item) => (
            <div
              key={item}
              className="subscriber-truth-notice-panel riddra-auth-truth-panel riddra-auth-truth-copy riddra-product-body rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-white px-4 py-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]"
            >
              {item}
            </div>
          ))}
        </div>
      ) : null}
      {safeHref && hrefLabel ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={safeHref}
            className="subscriber-truth-notice-action riddra-auth-truth-action inline-flex rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
          >
            {hrefLabel}
          </Link>
          {safeSecondaryHref && secondaryHrefLabel ? (
            <Link
              href={safeSecondaryHref}
              className="subscriber-truth-notice-action riddra-auth-truth-action inline-flex rounded-[10px] border border-[rgba(221,215,207,0.86)] bg-[rgba(27,58,107,0.03)] px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.05)]"
            >
              {secondaryHrefLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
