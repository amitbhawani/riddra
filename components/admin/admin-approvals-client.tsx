"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { formatAdminDateTime } from "@/lib/admin-time";
import type { AdminPendingApproval } from "@/lib/admin-approvals";
import { AdminBadge, AdminCard, AdminEmptyState, AdminSectionCard } from "@/components/admin/admin-primitives";

function getActionLabel(approval: AdminPendingApproval) {
  if (approval.actionType === "content_import") {
    return "Imported draft waiting for approval";
  }

  if (approval.targetStatus === "published") {
    return "Requested publish";
  }

  if (approval.targetStatus === "archived") {
    return "Requested archive";
  }

  if (approval.targetStatus === "ready_for_review") {
    return "Sent for review";
  }

  if (approval.targetStatus === "needs_fix") {
    return "Marked needs fix";
  }

  return "Draft waiting for approval";
}

function getImportSourceLabel(approval: AdminPendingApproval) {
  const latestImportItem =
    approval.snapshot.imports?.find((item) => item.status === "pending_review") ??
    approval.snapshot.imports?.[0] ??
    null;

  return latestImportItem?.batchLabel || null;
}

export function AdminApprovalsClient({
  initialApprovals,
}: {
  initialApprovals: AdminPendingApproval[];
}) {
  const router = useRouter();
  const [approvals, setApprovals] = useState(initialApprovals);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const groupedApprovals = useMemo(() => {
    const groups = new Map<string, { family: string; slug: string; title: string; items: AdminPendingApproval[] }>();
    for (const approval of approvals) {
      const key = `${approval.family}:${approval.slug}`;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(approval);
      } else {
        groups.set(key, {
          family: approval.family,
          slug: approval.slug,
          title: approval.title,
          items: [approval],
        });
      }
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: group.items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    }));
  }, [approvals]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function submitDecision(
    action: "approve" | "reject" | "approve_selected" | "approve_all",
    approvalId?: string,
  ) {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/operator-console/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          approvalId,
          approvalIds: selectedIds,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            approvals?: AdminPendingApproval[];
            processedCount?: number;
            operation?: "approved" | "rejected";
          }
        | null;

      if (!response.ok || !Array.isArray(data?.approvals)) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not complete this approval action right now.",
        });
        return;
      }

      setApprovals(data.approvals);
      setSelectedIds([]);
      router.refresh();
      setBanner({
        tone: "success",
        text:
          data.operation === "rejected"
            ? `Rejected ${data.processedCount ?? 0} queued change${data?.processedCount === 1 ? "" : "s"}.`
            : `Approved ${data.processedCount ?? 0} queued change${data?.processedCount === 1 ? "" : "s"}.`,
      });
    });
  }

  return (
    <div className="space-y-3">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "primary" : "warning"}>
          <div className="flex items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Saved" : "Action blocked"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
        </AdminCard>
      ) : null}

      <AdminSectionCard
        title="Changes waiting for approval"
        description="Editors can prepare updates here, but nothing goes live until an admin approves or rejects the request."
      >
        <div className="flex flex-wrap items-center gap-2">
          <AdminBadge
            label={`${approvals.length} pending`}
            tone={approvals.length ? "warning" : "default"}
          />
          <button
            type="button"
            onClick={() => submitDecision("approve_selected")}
            disabled={isPending || !selectedIds.length}
            className="inline-flex h-8 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Approving..." : "Approve selected"}
          </button>
          <button
            type="button"
            onClick={() => submitDecision("approve_all")}
            disabled={isPending || !approvals.length}
            className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Approving..." : "Approve all"}
          </button>
        </div>
      </AdminSectionCard>

      {groupedApprovals.length ? (
        groupedApprovals.map((group) => (
          <AdminSectionCard
            key={`${group.family}-${group.slug}`}
            title={group.title}
            description={`${group.family} · ${group.slug}`}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/content/${group.family}/${group.slug}`}
                  className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                >
                  Open editor
                </Link>
              </div>

              <div className="space-y-3">
                {group.items.map((approval) => (
                  <div
                    key={approval.id}
                    className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(approval.id)}
                              onChange={() => toggleSelected(approval.id)}
                              className="h-4 w-4 rounded border border-[#cbd5e1]"
                            />
                            <span className="text-[12px] font-medium text-[#111827]">
                              Select
                            </span>
                          </label>
                          <AdminBadge label={getActionLabel(approval)} tone="warning" />
                          <AdminBadge label={approval.family.replaceAll("-", " ")} tone="info" />
                          <AdminBadge label={approval.targetStatus.replaceAll("_", " ")} tone="info" />
                          {approval.actionType === "content_import" ? (
                            <AdminBadge label="Imported from CSV" tone="default" />
                          ) : null}
                        </div>
                        <p className="text-sm text-[#111827]">{approval.summary}</p>
                        <p className="text-[12px] leading-5 text-[#6b7280]">
                          Changed by {approval.submittedByEmail} on {formatAdminDateTime(approval.updatedAt)}
                        </p>
                        {approval.actionType === "content_import" && getImportSourceLabel(approval) ? (
                          <p className="text-[12px] leading-5 text-[#6b7280]">
                            File / batch source: {getImportSourceLabel(approval)}
                          </p>
                        ) : null}
                        <details className="rounded-lg border border-[#e5e7eb] bg-white">
                          <summary className="cursor-pointer list-none px-3 py-2 text-[12px] font-medium text-[#111827]">
                            What changed
                          </summary>
                          <div className="border-t border-[#e5e7eb] px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {approval.changedFields.length ? (
                                approval.changedFields.map((field) => (
                                  <AdminBadge
                                    key={`${approval.id}-${field}`}
                                    label={field.replaceAll("_", " ")}
                                    tone="default"
                                  />
                                ))
                              ) : (
                                <span className="text-[12px] text-[#6b7280]">No changed fields were recorded.</span>
                              )}
                            </div>
                          </div>
                        </details>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => submitDecision("approve", approval.id)}
                          disabled={isPending}
                          className="inline-flex h-8 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPending ? "Approving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => submitDecision("reject", approval.id)}
                          disabled={isPending}
                          className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPending ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AdminSectionCard>
        ))
      ) : (
        <AdminEmptyState
          title="No pending approvals"
          description="Editor-submitted content changes will appear here once someone saves a record into the approval queue."
        />
      )}
    </div>
  );
}
