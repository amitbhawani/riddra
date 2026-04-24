import Link from "next/link";

import { getPublicLaunchQaItems } from "@/lib/public-launch-qa";

export function PublicLaunchPreflight() {
  const items = getPublicLaunchQaItems();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">{item.title}</h3>
            <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
              {item.status}
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
          <Link
            href={item.href}
            className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
          >
            Open related surface
          </Link>
        </div>
      ))}
    </div>
  );
}
