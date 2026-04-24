"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { formatAdminSavedState } from "@/lib/admin-time";
import {
  adminFamilyMeta,
  type AdminFamilyKey,
  type AdminListRow,
} from "@/lib/admin-content-schema";
import {
  getDefaultMembershipFeatureAccess,
  membershipFeatureGroups,
  type MembershipFeatureAccess,
} from "@/lib/membership-product-features";
import type { AdminMembershipTier } from "@/lib/admin-operator-store";
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";

type MembershipFormState = {
  name: string;
  slug: string;
  description: string;
  status: "active" | "archived";
  active: boolean;
  displayOrder: string;
  visibility: "public" | "private";
  ctaLabel: string;
  ctaHref: string;
  includedFamilies: string[];
  includedRecordsText: string;
  excludedRecordsText: string;
  featureAccess: MembershipFeatureAccess;
  internalNotes: string;
};

function parseTokens(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchesRecordToken(tokens: string[], row: AdminListRow) {
  const routeToken = row.publicHref?.toLowerCase();
  const familyToken = `${row.family}:${row.slug}`.toLowerCase();
  return tokens.some((token) => {
    const normalized = token.toLowerCase();
    return normalized === row.slug.toLowerCase() || normalized === familyToken || normalized === routeToken;
  });
}

function recordAccessibleForTier(row: AdminListRow, tier: MembershipFormState) {
  const includedTokens = parseTokens(tier.includedRecordsText);
  const excludedTokens = parseTokens(tier.excludedRecordsText);

  if (matchesRecordToken(excludedTokens, row)) {
    return false;
  }

  if (matchesRecordToken(includedTokens, row)) {
    return true;
  }

  if (tier.includedFamilies.includes(row.family)) {
    return true;
  }

  switch (row.accessMode) {
    case "public_free":
    case "logged_in_free_member":
      return true;
    case "membership_tiers":
      return row.allowedMembershipTiers.includes(normalizeSlug(tier.slug));
    default:
      return false;
  }
}

export function AdminMembershipEditorClient({
  tier,
  allRows,
  isNew,
}: {
  tier: AdminMembershipTier | null;
  allRows: AdminListRow[];
  isNew?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<MembershipFormState>({
    name: tier?.name ?? "",
    slug: tier?.slug ?? "",
    description: tier?.description ?? "",
    status: tier?.status ?? "active",
    active: tier?.active ?? true,
    displayOrder: String(tier?.displayOrder ?? allRows.length + 1),
    visibility: tier?.visibility ?? "public",
    ctaLabel: tier?.ctaLabel ?? "",
    ctaHref: tier?.ctaHref ?? "",
    includedFamilies: tier?.includedFamilies ?? [],
    includedRecordsText: (tier?.includedRecords ?? []).join("\n"),
    excludedRecordsText: (tier?.excludedRecords ?? []).join("\n"),
    featureAccess: tier?.featureAccess ?? getDefaultMembershipFeatureAccess(tier?.slug ?? "free"),
    internalNotes: tier?.internalNotes ?? "",
  });
  const [activeFeatureGroup, setActiveFeatureGroup] = useState(membershipFeatureGroups[0]?.id ?? "stocks");
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewRows = useMemo(() => {
    return allRows.filter((row) => recordAccessibleForTier(row, form));
  }, [allRows, form]);

  const previewByFamily = useMemo(() => {
    return previewRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.family] = (acc[row.family] ?? 0) + 1;
      return acc;
    }, {});
  }, [previewRows]);

  function handleSave() {
    startTransition(async () => {
      setBanner(null);

      const payload = {
        slug: normalizeSlug(form.slug || form.name),
        name: form.name,
        description: form.description,
        status: form.status,
        active: form.active,
        displayOrder: Number(form.displayOrder) || 1,
        visibility: form.visibility,
        ctaLabel: form.ctaLabel,
        ctaHref: form.ctaHref,
        featureAccess: form.featureAccess,
        includedFamilies: form.includedFamilies,
        includedRecords: parseTokens(form.includedRecordsText),
        excludedRecords: parseTokens(form.excludedRecordsText),
        internalNotes: form.internalNotes,
      };

      const response = await fetch("/api/admin/operator-console/memberships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not save this membership tier right now.",
        });
        return;
      }

      const data = (await response.json()) as {
        tier: AdminMembershipTier;
        operation?: "created" | "updated";
        savedAt?: string;
      };
      setForm((current) => ({
        ...current,
        slug: data.tier.slug,
      }));
      router.refresh();
      setBanner({
        tone: "success",
        text:
          data.operation === "created"
            ? "Created new membership tier."
            : "Updated existing membership tier.",
        detail: `Saved through the current operator storage path. ${formatAdminSavedState(data.savedAt ?? data.tier.updatedAt)}`,
      });
    });
  }

  return (
    <div className="space-y-3">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "primary" : "warning"} className="space-y-1.5">
          <AdminBadge
            label={banner.tone === "success" ? "Saved" : "Error"}
            tone={banner.tone === "success" ? "success" : "danger"}
          />
          <p className="text-sm leading-5 text-[#4b5563]">{banner.text}</p>
          {banner.detail ? (
            <p className="text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </AdminCard>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <AdminSectionCard
            title="Identity"
            description="Membership tier identity, description, display order, and high-level visibility posture."
          >
            <div className="grid gap-2.5 md:grid-cols-2">
              <Field label="Tier name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
              <Field label="Slug" value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: normalizeSlug(value) }))} />
              <Field label="Description" value={form.description} textarea rows={4} onChange={(value) => setForm((current) => ({ ...current, description: value }))} className="md:col-span-2" />
              <Field label="Display order" value={form.displayOrder} onChange={(value) => setForm((current) => ({ ...current, displayOrder: value }))} />
              <SelectField
                label="Visibility"
                value={form.visibility}
                onChange={(value) => setForm((current) => ({ ...current, visibility: value as "public" | "private" }))}
                options={[
                  ["public", "Public"],
                  ["private", "Private"],
                ]}
              />
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Availability"
            description="Active state, archive state, and locked-surface CTA defaults for this tier."
          >
            <div className="grid gap-2.5 md:grid-cols-2">
              <SelectField
                label="Status"
                value={form.status}
                onChange={(value) => setForm((current) => ({ ...current, status: value as "active" | "archived" }))}
                options={[
                  ["active", "Active"],
                  ["archived", "Archived"],
                ]}
              />
              <SelectField
                label="Active"
                value={form.active ? "yes" : "no"}
                onChange={(value) => setForm((current) => ({ ...current, active: value === "yes" }))}
                options={[
                  ["yes", "Yes"],
                  ["no", "No"],
                ]}
              />
              <Field label="CTA label" value={form.ctaLabel} onChange={(value) => setForm((current) => ({ ...current, ctaLabel: value }))} />
              <Field label="CTA route" value={form.ctaHref} onChange={(value) => setForm((current) => ({ ...current, ctaHref: value }))} />
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Product feature access"
            description="Turn member-facing product capabilities on or off without editing frontend code."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {membershipFeatureGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveFeatureGroup(group.id)}
                    className={`inline-flex h-9 items-center rounded-lg border px-3 text-[12px] font-medium ${
                      activeFeatureGroup === group.id
                        ? "border-[#1B3A6B] bg-[rgba(27,58,107,0.08)] text-[#1B3A6B]"
                        : "border-[#d1d5db] bg-white text-[#4b5563]"
                    }`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>

              {membershipFeatureGroups
                .filter((group) => group.id === activeFeatureGroup)
                .map((group) => (
                  <div key={group.id} className="space-y-3 rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#111827]">{group.label}</p>
                      <p className="text-sm leading-6 text-[#4b5563]">{group.description}</p>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {group.features.map((feature) => (
                        <label
                          key={feature.key}
                          className="flex items-start gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111827]"
                        >
                          <input
                            type="checkbox"
                            checked={form.featureAccess[feature.key]}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                featureAccess: {
                                  ...current.featureAccess,
                                  [feature.key]: event.target.checked,
                                },
                              }))
                            }
                            className="mt-0.5 h-4 w-4 rounded border border-[#cbd5e1]"
                          />
                          <span className="space-y-0.5">
                            <span className="block font-medium text-[#111827]">{feature.label}</span>
                            <span className="block text-[11px] leading-4 text-[#6b7280]">{feature.note}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Advanced coverage rules"
            description="Optional content-family and record-level rules for exceptions that sit beyond the main product feature toggles."
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[12px] font-medium text-[#6b7280]">Included content families</p>
                <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                  {(Object.keys(adminFamilyMeta) as AdminFamilyKey[]).map((family) => (
                    <label key={family} className="flex items-center gap-2 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827]">
                      <input
                        type="checkbox"
                        checked={form.includedFamilies.includes(family)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            includedFamilies: event.target.checked
                              ? [...current.includedFamilies, family]
                              : current.includedFamilies.filter((item) => item !== family),
                          }))
                        }
                        className="h-4 w-4 rounded border border-[#cbd5e1]"
                      />
                      <span>{adminFamilyMeta[family].label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-2.5 md:grid-cols-2">
                <Field
                  label="Included specific records"
                  value={form.includedRecordsText}
                  textarea
                  rows={5}
                  className="md:col-span-1"
                  onChange={(value) => setForm((current) => ({ ...current, includedRecordsText: value }))}
                  helper="One slug or family:slug per line."
                />
                <Field
                  label="Excluded specific records"
                  value={form.excludedRecordsText}
                  textarea
                  rows={5}
                  className="md:col-span-1"
                  onChange={(value) => setForm((current) => ({ ...current, excludedRecordsText: value }))}
                  helper="One slug or family:slug per line."
                />
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Preview"
            description="Preview which records are accessible for this tier based on current access modes plus tier include/exclude rules."
          >
            {previewRows.length ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <AdminBadge label={`${previewRows.length} accessible records`} tone="success" />
                  {Object.entries(previewByFamily).map(([family, count]) => (
                    <AdminBadge
                      key={`${family}-${count}`}
                      label={`${adminFamilyMeta[family as AdminFamilyKey]?.label ?? family}: ${count}`}
                      tone="info"
                    />
                  ))}
                </div>
                <AdminSimpleTable
                  columns={["Record", "Family", "Access mode", "Route"]}
                  rows={previewRows.slice(0, 24).map((row) => [
                    row.title,
                    row.familyLabel,
                    row.accessLabel,
                    row.publicHref ?? "No route",
                  ])}
                />
              </div>
            ) : (
              <AdminEmptyState
                title="No accessible records yet"
                description="Add included families, assign this tier to gated records, or remove exclusions to preview membership coverage."
              />
            )}
          </AdminSectionCard>

          <AdminSectionCard
            title="Internal notes"
            description="Operator-only notes about positioning, migration, or future billing behavior."
          >
            <Field
              label="Notes"
              value={form.internalNotes}
              textarea
              rows={5}
              onChange={(value) => setForm((current) => ({ ...current, internalNotes: value }))}
            />
          </AdminSectionCard>
        </div>

        <div className="space-y-3 xl:sticky xl:top-[var(--admin-sticky-offset)] xl:self-start">
          <AdminSectionCard title="Status" description="Current tier posture and operator summary.">
            <div className="space-y-2.5">
              <MetaRow label="Slug" value={form.slug || "Awaiting slug"} />
              <MetaRow label="Status" value={form.status} />
              <MetaRow label="Active" value={form.active ? "Yes" : "No"} />
              <MetaRow label="Visibility" value={form.visibility} />
              <MetaRow label="Accessible records" value={String(previewRows.length)} />
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Actions" description="Save this tier and keep access control ready for future growth.">
            <div className="grid gap-1.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !form.name.trim()}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white"
              >
                {isPending ? "Saving..." : isNew ? "Create tier" : "Save tier"}
              </button>
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  rows,
  helper,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  rows?: number;
  helper?: string;
  className?: string;
}) {
  return (
    <label className={`space-y-1 ${className ?? ""}`}>
      <span className="text-[12px] font-medium text-[#6b7280]">{label}</span>
      {textarea ? (
        <textarea
          rows={rows ?? 4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[84px] w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
        />
      )}
      {helper ? <p className="text-xs leading-5 text-[#4b5563]">{helper}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[12px] font-medium text-[#6b7280]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#eef0f4] pb-1.5 last:border-b-0 last:pb-0">
      <span className="text-[12px] text-[#6b7280]">{label}</span>
      <span className="text-right text-[13px] font-medium text-[#111827]">{value}</span>
    </div>
  );
}
