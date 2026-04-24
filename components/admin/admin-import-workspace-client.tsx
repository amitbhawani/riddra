"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { formatAdminDateTime, formatAdminSavedState } from "@/lib/admin-time";
import {
  AdminBadge,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";

type ImportWorkspaceItem = {
  id: string;
  family: string;
  slug: string;
  title: string;
  batchLabel: string;
  status: string;
  sourceLabel: string;
  ranAt: string;
  note: string;
  duplicateCandidate: string;
};

type SourceJobItem = {
  adapter: string;
  status: string;
  nextStep: string;
};

function getTone(status: string) {
  if (["applied", "Ready", "healthy"].includes(status)) return "success" as const;
  if (["failed", "Blocked", "failed"].includes(status)) return "danger" as const;
  if (["pending_review", "In progress", "warning"].includes(status)) return "warning" as const;
  return "info" as const;
}

export function AdminImportWorkspaceClient({
  initialImportItems,
  sourceJobs,
}: {
  initialImportItems: ImportWorkspaceItem[];
  sourceJobs: SourceJobItem[];
}) {
  const router = useRouter();
  const [importItems, setImportItems] = useState(initialImportItems);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);

  const pendingReview = useMemo(
    () => importItems.filter((item) => item.status === "pending_review"),
    [importItems],
  );
  const duplicates = useMemo(
    () =>
      importItems.filter((item) =>
        ["duplicate", "unmatched", "conflict", "blocked_by_lock"].includes(item.status),
      ),
    [importItems],
  );

  function updateImport(item: ImportWorkspaceItem, status: "applied" | "rejected") {
    startTransition(async () => {
      setBanner(null);
      setActiveActionKey(`${item.id}:${status}`);

      try {
        const response = await fetch("/api/admin/operator-console/imports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            family: item.family,
            slug: item.slug,
            importId: item.id,
            status,
            note:
              status === "applied"
                ? "Operator applied this import row from the imports workspace."
                : "Operator rejected this import row from the imports workspace.",
          }),
        });
        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
              savedAt?: string;
              item?: {
                status?: string;
                note?: string;
                ranAt?: string;
              };
            }
          | null;

        if (!response.ok) {
          setBanner({
            tone: "danger",
            text: data?.error ?? "Could not update the import row right now.",
          });
          return;
        }

        setImportItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: data?.item?.status ?? status,
                  note:
                    data?.item?.note ??
                    (status === "applied"
                      ? "Operator applied this import row from the imports workspace."
                      : "Operator rejected this import row from the imports workspace."),
                  ranAt: data?.item?.ranAt ?? new Date().toISOString(),
                }
              : entry,
          ),
        );
        router.refresh();
        setBanner({
          tone: "success",
          text:
            status === "applied"
              ? "Import row marked applied."
              : "Import row marked rejected.",
          detail: formatAdminSavedState(data?.savedAt ?? data?.item?.ranAt),
        });
      } finally {
        setActiveActionKey(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <div className="rounded-lg border border-[#d1d5db] bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Saved" : "Error"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm leading-6 text-[#4b5563]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <AdminSectionCard
          title="Recent import batches"
          description="Recent import history tied to records in the new operator console."
        >
          {importItems.length ? (
            <AdminSimpleTable
              columns={["Record", "Batch", "Status", "Source", "Ran at", "Note"]}
              rows={importItems.slice(0, 12).map((item) => [
                <div key={`${item.id}-record`} className="space-y-1">
                  <p className="font-semibold text-[#111827]">{item.title}</p>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {item.family} • {item.slug}
                  </p>
                </div>,
                item.batchLabel,
                <AdminBadge
                  key={`${item.id}-status`}
                  label={item.status.replaceAll("_", " ")}
                  tone={getTone(item.status)}
                />,
                item.sourceLabel,
                formatAdminDateTime(item.ranAt),
                item.note || "No note",
              ])}
            />
          ) : (
            <AdminEmptyState
              title="No import batches recorded yet"
              description="This workspace will fill as soon as a family editor or import process writes review rows into the operator store."
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Recent refresh-job posture"
          description="Blocked, running, warning, and healthy refresh jobs relevant to import review."
          collapsible
          defaultOpen={false}
        >
          <div className="space-y-3">
            {sourceJobs.slice(0, 6).map((job) => (
              <div key={job.adapter} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#111827]">{job.adapter}</p>
                  <AdminBadge label={job.status} tone={getTone(job.status)} />
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">{job.nextStep}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSectionCard
          title="Manual review queue"
          description="Pending review rows can be applied or rejected directly from this operator desk."
        >
          {pendingReview.length ? (
            <div className="space-y-3">
              {pendingReview.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#111827]">{item.title}</p>
                    <AdminBadge label="Pending review" tone="warning" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4b5563]">{item.note || "Awaiting operator decision."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateImport(item, "applied")}
                      disabled={isPending}
                      className="rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 py-2 text-sm font-medium text-white"
                    >
                      {isPending && activeActionKey === `${item.id}:applied` ? "Applying..." : "Apply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateImport(item, "rejected")}
                      disabled={isPending}
                      className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#4b5563]"
                    >
                      {isPending && activeActionKey === `${item.id}:rejected` ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No review rows"
              description="Pending import review items will appear here once a family writes a review-state import row."
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Duplicate / unmatched queue"
          description="Rows that need entity matching or operator reconciliation before they can go live."
          collapsible
          defaultOpen={false}
        >
          {duplicates.length ? (
            <div className="space-y-3">
              {duplicates.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#111827]">{item.title}</p>
                    <AdminBadge label={item.status.replaceAll("_", " ")} tone="danger" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                    {item.duplicateCandidate || item.note || "Needs manual operator review."}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No duplicate or unmatched rows"
              description="Duplicate and unmatched queues stay visible here once the import workspace records them."
            />
          )}
        </AdminSectionCard>
      </div>
    </div>
  );
}
