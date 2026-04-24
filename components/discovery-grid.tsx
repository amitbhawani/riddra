import Link from "next/link";

import { GlowCard } from "@/components/ui";
import type { DiscoveryCard } from "@/lib/market-overview";

export function DiscoveryGrid({ items }: { items: DiscoveryCard[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <GlowCard className="h-full transition hover:border-aurora/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.description}</p>
              </div>
              <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                {item.badge}
              </div>
            </div>
          </GlowCard>
        </Link>
      ))}
    </div>
  );
}
