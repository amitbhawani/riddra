import Link from "next/link";
import { ReactNode } from "react";
import clsx from "clsx";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("mx-auto w-full max-w-[1320px] px-3 sm:px-4 lg:px-4 xl:px-5", className)}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="riddra-product-body inline-flex rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#1B3A6B]">
      {children}
    </span>
  );
}

export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl space-y-2">
      <h2 className="riddra-product-body text-[22px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[28px]">
        {title}
      </h2>
      <p className="riddra-product-body text-[14px] leading-7 text-[rgba(75,85,99,0.84)] sm:text-[15px]">
        {description}
      </p>
    </div>
  );
}

export function GlowCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "riddra-product-card riddra-product-body relative overflow-hidden rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(247,244,240,0.94)_100%)] p-4 shadow-[0_10px_28px_rgba(27,58,107,0.045)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(27,58,107,0.18),transparent)] [&_.text-white]:!text-[#1B3A6B] [&_[class*='text-mist']]:!text-[rgba(75,85,99,0.84)] [&_[class*='text-amber-']]:!text-[#8E5723] [&_h1]:!text-[#1B3A6B] [&_h2]:!text-[#1B3A6B] [&_h3]:!text-[#1B3A6B]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  tone = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center rounded-[10px] px-4 py-2.5 text-sm font-medium transition",
        tone === "primary" ? "riddra-button-link-primary" : "riddra-button-link-secondary",
        tone === "primary"
          ? "bg-[#1B3A6B] !text-white hover:bg-[#264a83] hover:!text-white"
          : "border border-[rgba(27,58,107,0.14)] bg-white !text-[#1B3A6B] hover:border-[#D4853B] hover:!text-[#D4853B]",
        className,
      )}
    >
      {children}
    </Link>
  );
}
