"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import type { AdminCreateOption } from "@/lib/admin-content-schema";
import { AdminCard, AdminEmptyState } from "@/components/admin/admin-primitives";

export function AdminCreateHubClient({
  options,
}: {
  options: AdminCreateOption[];
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const lowered = deferredQuery.trim().toLowerCase();

    if (!lowered) {
      return options;
    }

    return options.filter((option) =>
      [
        option.label,
        option.familyGroup,
        option.description,
        ...(option.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(lowered),
    );
  }, [deferredQuery, options]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, AdminCreateOption[]>>((acc, option) => {
      acc[option.familyGroup] = [...(acc[option.familyGroup] ?? []), option];
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div className="space-y-4">
      <AdminCard tone="primary" className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-[14px] font-semibold text-[#111827]">Create menu</h2>
          <p className="max-w-3xl text-sm leading-5 text-[#4b5563]">
            Search across every supported family and jump directly into the correct structured editor.
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search stock, webinar, newsletter issue, banner, footer item..."
          className="h-10 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
        />
      </AdminCard>

      {Object.keys(grouped).length ? (
        Object.entries(grouped).map(([group, groupOptions]) => (
          <section key={group} className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                {group}
              </p>
              <h3 className="text-[18px] font-semibold text-[#111827]">{group}</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {groupOptions.map((option) => (
                <Link
                  key={option.id}
                  href={option.href}
                  className="rounded-lg border border-[#d1d5db] bg-white p-[14px] shadow-sm transition hover:border-[#94a3b8] hover:bg-[#f8fafc]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-[#111827]">{option.label}</p>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-[#6b7280]">
                        {option.href.includes("/import") ? "Import" : "New"}
                      </span>
                    </div>
                    <p className="text-sm leading-5 text-[#4b5563]">{option.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      ) : (
        <AdminEmptyState
          title="No creation targets matched"
          description="Try a family name like stock or webinar, or search for a global-site object like banner or footer."
        />
      )}
    </div>
  );
}
