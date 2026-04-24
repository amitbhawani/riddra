"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

import { getVisibleAdminNavigation } from "@/lib/admin-navigation";
import type { ProductUserCapability, ProductUserRole } from "@/lib/product-permissions";

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getItemGlyph(label: string) {
  const first = label.trim().charAt(0).toUpperCase();
  return first || "A";
}

export function AdminSidebar({
  userRole,
  userCapabilities = [],
}: {
  userRole?: string | null;
  userCapabilities?: ProductUserCapability[];
}) {
  const pathname = usePathname();
  const navigation = getVisibleAdminNavigation(
    (userRole ?? "user") as ProductUserRole,
    userCapabilities,
  );

  return (
    <aside className="fixed left-0 top-[var(--admin-header-height)] z-[50] hidden h-[calc(100vh-var(--admin-header-height))] w-[var(--admin-sidebar-width)] overflow-y-auto border-r border-[#1e293b] bg-[#0f172a] lg:block">
      <div className="space-y-3 px-3 py-3 pb-5">
        {navigation.map((group) => (
          <section key={group.title} className="space-y-1">
            {group.collapsible ? (
              <details
                className="rounded-lg border border-[#1e293b] bg-[#111b2d]"
                open={group.items.some((item) => isItemActive(pathname, item.href)) || group.defaultOpen}
              >
                <summary className="cursor-pointer list-none px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#94a3b8]">
                  {group.title}
                </summary>
                <nav className="space-y-0.5 px-2 pb-2">
                  {group.items.map((item) => {
                    const active = isItemActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          "flex items-start gap-3 rounded-lg px-3 py-1.5 transition",
                          active
                            ? "bg-[#1e293b] text-white"
                            : "text-[#cbd5e1] hover:bg-[#162133] hover:text-white",
                        )}
                      >
                        <span
                          className={clsx(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                            active ? "bg-[#334155] text-white" : "bg-[#162133] text-[#94a3b8]",
                          )}
                        >
                          {getItemGlyph(item.label)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium leading-5">{item.label}</span>
                          {item.note && active ? (
                            <span
                              className={clsx(
                                "mt-0.5 line-clamp-2 block text-[11px] leading-4",
                                active ? "text-[#cbd5e1]" : "text-[#64748b]",
                              )}
                            >
                              {item.note}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </details>
            ) : (
              <>
                <p className="px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[#64748b]">
                  {group.title}
                </p>
                <nav className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isItemActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          "flex items-start gap-3 rounded-lg px-3 py-1.5 transition",
                          active
                            ? "bg-[#1e293b] text-white"
                            : "text-[#cbd5e1] hover:bg-[#162133] hover:text-white",
                        )}
                      >
                        <span
                          className={clsx(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                            active ? "bg-[#334155] text-white" : "bg-[#162133] text-[#94a3b8]",
                          )}
                        >
                          {getItemGlyph(item.label)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium leading-5">{item.label}</span>
                          {item.note && active ? (
                            <span
                              className={clsx(
                                "mt-0.5 line-clamp-2 block text-[11px] leading-4",
                                active ? "text-[#cbd5e1]" : "text-[#64748b]",
                              )}
                            >
                              {item.note}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </>
            )}
          </section>
        ))}
      </div>
    </aside>
  );
}
