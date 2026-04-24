import Link from "next/link";

import { ProductCard } from "@/components/product-page-system";

type ShowcaseRouteItem = {
  title: string;
  summary: string;
  href: string;
  label: string;
  tag?: string;
};

export function ShowcaseRouteStrip({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  items: ShowcaseRouteItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ProductCard tone="primary" className="space-y-4 p-4">
      <div className="space-y-3">
        {eyebrow ? (
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">{eyebrow}</p>
        ) : null}
        <div>
          <h2 className="text-[16px] font-semibold text-[#111827]">{title}</h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {items.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white/92 p-4 transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.03)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(221,215,207,0.96)] bg-[rgba(248,246,243,0.9)] text-[13px] font-semibold text-[#111827]">
                  {index + 1}
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#111827]">{item.title}</p>
                  {item.tag ? <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#1B3A6B]">{item.tag}</p> : null}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">{item.summary}</p>
            <div className="mt-4 inline-flex rounded-full border border-[rgba(221,215,207,0.96)] bg-[rgba(248,246,243,0.92)] px-4 py-2 text-[12px] font-medium text-[#1B3A6B] transition group-hover:border-[rgba(27,58,107,0.18)] group-hover:bg-[rgba(27,58,107,0.05)]">
              {item.label}
            </div>
          </Link>
        ))}
      </div>
    </ProductCard>
  );
}
