import Link from "next/link";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import type { AdminHealthWarning } from "@/lib/admin-system-health";
import type { ProductUserCapability } from "@/lib/product-permissions";

export function AdminShell({
  userEmail,
  userRole,
  userCapabilities,
  systemWarnings = [],
  children,
}: {
  userEmail?: string | null;
  userRole?: string | null;
  userCapabilities?: ProductUserCapability[];
  systemWarnings?: AdminHealthWarning[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#111827] [--admin-header-height:56px] [--admin-sidebar-width:248px] [--admin-sticky-offset:calc(var(--admin-header-height)+12px)]">
      <header className="fixed inset-x-0 top-0 z-[80] h-[var(--admin-header-height)] border-b border-[#d1d5db] bg-white">
        <div className="flex h-full items-center">
          <div className="hidden h-full w-[var(--admin-sidebar-width)] items-center border-r border-[#d1d5db] px-3.5 lg:flex">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a] text-sm font-semibold text-white">
                R
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111827]">Riddra CMS</p>
                <p className="truncate text-[11px] text-[#6b7280]">Editorial workspace</p>
              </div>
            </Link>
          </div>
          <div className="flex min-w-0 flex-1 items-center px-3 lg:px-5">
            <AdminTopBar
              userEmail={userEmail}
              userRole={userRole}
              userCapabilities={userCapabilities}
            />
          </div>
        </div>
      </header>

      <AdminSidebar userRole={userRole} userCapabilities={userCapabilities} />
      <main className="relative min-h-screen px-3.5 pb-6 pt-[calc(var(--admin-header-height)+14px)] lg:ml-[var(--admin-sidebar-width)] lg:px-5">
        {systemWarnings.length ? (
          <div className="mx-auto mb-3 max-w-[1400px] rounded-lg border border-[#fcd34d] bg-[#fffbeb] px-3.5 py-2.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#92400e]">
                System warnings
              </p>
              {systemWarnings.map((warning) => (
                <Link
                  key={warning.id}
                  href={warning.href}
                  className="inline-flex items-center rounded-full border border-[#fde68a] bg-white px-2.5 py-1 text-[12px] font-medium text-[#92400e] transition hover:bg-[#fff7ed]"
                >
                  {warning.message}
                </Link>
              ))}
              <Link
                href="/admin/system-health"
                className="inline-flex items-center rounded-full border border-[#d1d5db] bg-white px-2.5 py-1 text-[12px] font-medium text-[#111827] transition hover:bg-[#f9fafb]"
              >
                Open system health
              </Link>
            </div>
          </div>
        ) : null}
        <div className="admin-readable-surface">{children}</div>
      </main>
    </div>
  );
}
