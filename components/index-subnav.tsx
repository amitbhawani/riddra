import Link from "next/link";

import { indexNavItems } from "@/lib/index-nav";

export function IndexSubnav({ currentPath }: { currentPath: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/indices"
        className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:bg-white/[0.06]"
      >
        All indices
      </Link>
      {indexNavItems.map((item) => {
        const isActive = currentPath === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "rounded-full bg-aurora px-4 py-2 text-sm font-medium text-ink"
                : "rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:bg-white/[0.06]"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
