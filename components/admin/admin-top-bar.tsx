"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  adminGlobalSiteSections,
  adminPrimaryNavigation,
} from "@/lib/admin-navigation";
import { adminFamilyMeta, type AdminFamilyKey } from "@/lib/admin-content-schema";
import {
  canAccessAnyContentWorkspace,
  type ProductUserCapability,
  type ProductUserRole,
} from "@/lib/product-permissions";

function titleCaseSegment(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getToolLabel(pathname: string) {
  for (const group of adminPrimaryNavigation) {
    for (const item of group.items) {
      if (item.href !== "/admin" && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
        return item.label;
      }
    }
  }

  return "Admin";
}

function getTopBarContext(pathname: string) {
  if (pathname === "/admin") {
    return {
      eyebrow: "Dashboard",
      title: "Operator workspace",
    };
  }

  if (pathname === "/admin/content") {
    return {
      eyebrow: "Content",
      title: "Content workspace",
    };
  }

  if (pathname === "/admin/new") {
    return {
      eyebrow: "Create",
      title: "Create a new record",
    };
  }

  if (pathname.startsWith("/admin/content/")) {
    const [, , , family, slug] = pathname.split("/");
    const typedFamily = family as AdminFamilyKey;
    const meta = adminFamilyMeta[typedFamily];

    if (!meta) {
      return {
        eyebrow: "Content",
        title: "Record editor",
      };
    }

    if (!slug) {
      return {
        eyebrow: "Content",
        title: meta.label,
      };
    }

    if (slug === "new") {
      return {
        eyebrow: meta.label,
        title: `New ${meta.singular}`,
      };
    }

    return {
      eyebrow: meta.label,
      title: titleCaseSegment(slug),
    };
  }

  if (pathname === "/admin/global-site") {
    return {
      eyebrow: "Global Site",
      title: "Global site management",
    };
  }

  if (pathname.startsWith("/admin/global-site/")) {
    const section = adminGlobalSiteSections.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );

    return {
      eyebrow: "Global Site",
      title: section?.label ?? "Global site editor",
    };
  }

  if (pathname === "/admin/imports") {
    return {
      eyebrow: "Imports",
      title: "Import workspace",
    };
  }

  if (pathname === "/admin/memberships") {
    return {
      eyebrow: "Memberships",
      title: "Membership and access plans",
    };
  }

  if (pathname === "/admin/users") {
    return {
      eyebrow: "Users",
      title: "User profiles and roles",
    };
  }

  if (pathname === "/admin/activity-log") {
    return {
      eyebrow: "Audit",
      title: "Activity log",
    };
  }

  if (pathname === "/admin/approvals") {
    return {
      eyebrow: "Approvals",
      title: "Pending content approvals",
    };
  }

  if (pathname === "/admin/change-log") {
    return {
      eyebrow: "Changes",
      title: "Change log",
    };
  }

  if (pathname === "/admin/system-health") {
    return {
      eyebrow: "System health",
      title: "Data health and production readiness",
    };
  }

  if (pathname === "/admin/readiness") {
    return {
      eyebrow: "Readiness",
      title: "Backend readiness and closure",
    };
  }

  if (pathname === "/admin/media-library") {
    return {
      eyebrow: "Media",
      title: "Media library",
    };
  }

  if (pathname === "/admin/settings") {
    return {
      eyebrow: "Settings",
      title: "System settings",
    };
  }

  if (pathname.startsWith("/admin/memberships/")) {
    const [, , , slug] = pathname.split("/");
    return {
      eyebrow: "Memberships",
      title: slug === "new" ? "New membership tier" : titleCaseSegment(slug),
    };
  }

  if (pathname === "/admin/refresh-jobs") {
    return {
      eyebrow: "Refresh jobs",
      title: "Refresh jobs and automation",
    };
  }

  if (pathname === "/admin/help") {
    return {
      eyebrow: "Help",
      title: "Admin help and editing guide",
    };
  }

  if (pathname === "/admin/search") {
    return {
      eyebrow: "Search",
      title: "Admin global search",
    };
  }

  if (pathname === "/admin/overrides") {
    return {
      eyebrow: "Overrides",
      title: "Override review",
    };
  }

  if (pathname === "/admin/documents") {
    return {
      eyebrow: "Documents",
      title: "Documents and sources",
    };
  }

  return {
    eyebrow: "Admin",
    title: getToolLabel(pathname),
  };
}

export function AdminTopBar({
  userEmail,
  userRole,
  userCapabilities = [],
}: {
  userEmail?: string | null;
  userRole?: string | null;
  userCapabilities?: ProductUserCapability[];
}) {
  const pathname = usePathname();
  const context = getTopBarContext(pathname);
  const role = (userRole ?? "user") as ProductUserRole;
  const canSearchContent = canAccessAnyContentWorkspace(role, userCapabilities);
  const canCreateContent = canSearchContent;
  const canSearchMedia = userCapabilities.includes("can_manage_media") || role === "admin";
  const canSearchAdminRegistry = role === "admin";
  const searchPlaceholder = canSearchAdminRegistry
    ? "Search pages, people, tiers, or media"
    : canSearchMedia
      ? "Search pages or media"
      : "Search pages";

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
          {context.eyebrow}
        </p>
        <h1 className="truncate text-[15px] font-semibold leading-5 text-[#111827]">
          {context.title}
        </h1>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        {canSearchContent ? (
          <form action="/admin/search" className="hidden min-w-0 xl:block">
            <input
              type="search"
              name="query"
              placeholder={searchPlaceholder}
              className="h-8 w-[340px] rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
            />
          </form>
        ) : null}
        {canCreateContent ? (
          <Link
            href="/admin/new"
            className="inline-flex h-8 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white transition hover:bg-[#111c33]"
          >
            New
          </Link>
        ) : null}
        <Link
          href="/"
          className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] transition hover:bg-[#f9fafb]"
        >
          View site
        </Link>
        <Link
          href="/account"
          className="inline-flex h-8 max-w-[220px] items-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#4b5563] transition hover:bg-white"
        >
          <span className="truncate">
            Account
            {userEmail ? ` · ${userEmail}` : ""}
            {userRole ? ` · ${userRole}` : ""}
          </span>
        </Link>
      </div>
    </div>
  );
}
