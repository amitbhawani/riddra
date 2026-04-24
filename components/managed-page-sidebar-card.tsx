import Link from "next/link";

import { ProductCard } from "@/components/product-page-system";
import { getManagedSidebarConfig, type PageFamily } from "@/lib/site-experience";

type ManagedPageSidebarCardProps = {
  family: PageFamily;
  assetName?: string;
};

export function ManagedPageSidebarCard({ family, assetName }: ManagedPageSidebarCardProps) {
  const config = getManagedSidebarConfig(family, assetName);

  if (!config) {
    return null;
  }

  return (
    <ProductCard tone="secondary" className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-semibold text-[#111827]">{config.title}</h2>
          <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">{config.description}</p>
        </div>
        <div className="rounded-full border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#1B3A6B]">
          {config.badgeLabel}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {config.links.map((item) => (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-4 py-3 text-[13px] text-[rgba(75,85,99,0.84)] transition hover:border-[rgba(27,58,107,0.18)] hover:text-[#111827]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </ProductCard>
  );
}
