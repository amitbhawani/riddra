"use client";

import { AdminActionLink, AdminPageFrame, AdminSectionCard } from "@/components/admin/admin-primitives";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AdminPageFrame>
      <AdminSectionCard
        title="This admin screen could not load"
        description="The admin has hidden the raw server error so operators only see a safe message."
      >
        <div className="space-y-3">
          <p className="text-sm leading-6 text-[#4b5563]">
            Retry the page first. If the problem continues, ask an advanced operator to review the server logs or recent admin changes.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-8 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white"
            >
              Retry
            </button>
            <AdminActionLink href="/admin" label="Back to dashboard" />
          </div>
        </div>
      </AdminSectionCard>
    </AdminPageFrame>
  );
}
