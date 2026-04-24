import Link from "next/link";

import { GlowCard } from "@/components/ui";
import type { ComparableAsset } from "@/lib/asset-insights";

export function ComparableListCard({
  title,
  basePath,
  items,
  emptyMessage,
}: {
  title: string;
  basePath: string;
  items: ComparableAsset[];
  emptyMessage: string;
}) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5 grid gap-4">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}`}
              className="rounded-[24px] border border-white/8 bg-black/15 p-4 transition hover:border-aurora/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">{item.name}</p>
                  <p className="mt-2 text-sm text-mist/68">{item.subLabel}</p>
                </div>
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs text-aurora">
                  {item.highlight}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm leading-7 text-mist/72">{emptyMessage}</p>
        )}
      </div>
    </GlowCard>
  );
}
