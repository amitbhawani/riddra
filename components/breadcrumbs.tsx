import Link from "next/link";

import type { BreadcrumbItem } from "@/lib/seo";

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="riddra-product-body flex flex-wrap items-center gap-2 border-b border-[rgba(226,222,217,0.72)] pb-2.5 text-sm text-[rgba(107,114,128,0.88)]"
    >
      {items.map((item, index) => (
        <span key={`${item.href}-${item.name}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-[rgba(226,222,217,1)]">/</span> : null}
          <Link href={item.href} className="transition hover:text-[#1B3A6B]">
            {item.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
