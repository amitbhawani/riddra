"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type {
  AdminGlobalCollectionKey,
  AdminGlobalModule,
  AdminGlobalRevision,
} from "@/lib/admin-operator-store";
import { formatAdminDateTime, formatAdminSavedState } from "@/lib/admin-time";
import type { LaunchConfigStore } from "@/lib/launch-config-store";
import { AdminBadge, AdminCard, AdminEmptyState } from "@/components/admin/admin-primitives";

type ExperienceField = {
  key: keyof LaunchConfigStore["experience"];
  label: string;
  type: "text" | "textarea" | "links" | "checkbox_group" | "select" | "image" | "number";
  rows?: number;
  helper?: string;
  options?: Array<{ label: string; value: string; description?: string }>;
};

type ExperienceEditorProps = {
  mode: "experience";
  title: string;
  description: string;
  fields: ExperienceField[];
  experience: LaunchConfigStore["experience"];
  revisions?: AdminGlobalRevision[];
  focusField?: string | null;
};

type CollectionEditorProps = {
  mode: "collection";
  title: string;
  description: string;
  section: AdminGlobalCollectionKey;
  items: AdminGlobalModule[];
  revisions?: AdminGlobalRevision[];
  initialCreate?: boolean;
  defaultModuleType?: string;
};

export function AdminGlobalSiteEditorClient(props: ExperienceEditorProps | CollectionEditorProps) {
  const router = useRouter();
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"draft" | "publish" | null>(null);
  const [experience, setExperience] = useState(
    props.mode === "experience" ? props.experience : null,
  );
  const [items, setItems] = useState(
    props.mode === "collection"
      ? props.initialCreate
        ? [...props.items, createEmptyModule(props.defaultModuleType, props.items.length + 1)]
        : props.items
      : [],
  );
  const experienceUsesSidebarChecklist =
    props.mode === "experience" &&
    props.fields.some((field) => field.key === "sharedSidebarVisibleBlocks");

  function buildExperiencePayload() {
    if (props.mode !== "experience" || !experience) {
      return null;
    }

    return props.fields.reduce(
      (accumulator, field) => {
        accumulator[field.key] = experience[field.key];
        return accumulator;
      },
      {} as Partial<LaunchConfigStore["experience"]>,
    );
  }

  function save(mode: "draft" | "publish") {
    startTransition(async () => {
      setBanner(null);
      setPendingAction(mode);

      try {
        const response =
          props.mode === "experience"
            ? await fetch("/api/admin/launch-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  section: "experience",
                  data: buildExperiencePayload(),
                  mode,
                }),
              })
            : await fetch("/api/admin/operator-console/global-site", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  section: props.section,
                  items,
                  mode,
                }),
              });
        const data = (await response.json().catch(() => null)) as
          | {
              error?: string;
              savedAt?: string;
              store?: LaunchConfigStore;
              items?: AdminGlobalModule[];
            }
          | null;

        if (!response.ok) {
          setBanner({
            tone: "danger",
            text: data?.error ?? "Could not save this global-site section right now.",
          });
          return;
        }

        if (props.mode === "experience" && data?.store?.experience) {
          setExperience(data.store.experience);
        }

        if (props.mode === "collection" && Array.isArray(data?.items)) {
          setItems(data.items);
        }

        router.refresh();
        setBanner({
          tone: "success",
          text: mode === "publish" ? "Global site changes published." : "Global site draft saved.",
          detail: formatAdminSavedState(
            data?.savedAt ??
              (props.mode === "experience"
                ? data?.store?.updatedAt
                : data?.items?.[0]?.updatedAt),
          ),
        });
      } finally {
        setPendingAction(null);
      }
    });
  }

  function revertChanges() {
    setBanner(null);

    if (props.mode === "experience") {
      setExperience(props.experience);
      return;
    }

    setItems(props.items);
  }

  return (
    <div className="space-y-3">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "primary" : "warning"} className="space-y-1.5">
          <AdminBadge label={banner.tone === "success" ? "Saved" : "Error"} tone={banner.tone === "success" ? "success" : "danger"} />
          <p className="text-sm leading-7 text-[#4b5563]">{banner.text}</p>
          {banner.detail ? <p className="text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p> : null}
        </AdminCard>
      ) : null}

      <AdminCard tone="primary" className="space-y-2.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-[14px] font-semibold text-[#111827]">{props.title}</h2>
            <p className="max-w-3xl text-sm leading-5 text-[#4b5563]">{props.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={isPending}
              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
            >
              {isPending && pendingAction === "draft" ? "Saving draft..." : "Save draft"}
            </button>
            <button
              type="button"
              onClick={() => save("publish")}
              disabled={isPending}
              className="inline-flex h-8 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white"
            >
              {isPending && pendingAction === "publish" ? "Publishing..." : "Publish"}
            </button>
            <button
              type="button"
              onClick={revertChanges}
              disabled={isPending}
              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] font-medium text-[#4b5563]"
            >
              Revert
            </button>
          </div>
        </div>
      </AdminCard>

      {props.mode === "experience" ? (
        <div className="space-y-3">
          <AdminCard tone="compact" className="space-y-2.5">
            <div className="space-y-1 border-b border-[#e5e7eb] pb-2.5">
              <h3 className="text-[14px] font-semibold text-[#111827]">
                {experienceUsesSidebarChecklist ? "Sidebar blocks" : "Core copy"}
              </h3>
              <p className="text-sm leading-5 text-[#4b5563]">
                {experienceUsesSidebarChecklist
                  ? "Choose which shared sidebar blocks appear and edit the shared sidebar rows used across supported public pages."
                  : "Manage shared message copy and top-level public-site framing."}
              </p>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2">
              {props.fields
                .filter((field) => field.type !== "links")
                .map((field) => (
                  <div
                    key={field.key}
                    className={
                      field.type === "textarea" || field.type === "checkbox_group" || field.type === "image"
                        ? "space-y-1 md:col-span-2"
                        : "space-y-1"
                    }
                  >
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                      {field.label}
                    </span>
                    {field.type === "textarea" ? (
                      <textarea
                        rows={field.rows ?? 4}
                        value={experience?.[field.key] ?? ""}
                        onChange={(event) =>
                          setExperience((current) =>
                            current
                              ? {
                                  ...current,
                                  [field.key]: event.target.value,
                                }
                              : current,
                          )
                        }
                        className="min-h-[72px] w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                      />
                    ) : field.type === "checkbox_group" ? (
                      <div className="grid gap-2">
                        {field.options?.map((option) => {
                          const selectedValues = new Set(
                            String(experience?.[field.key] ?? "")
                              .split(/[\n,]+/)
                              .map((value) => value.trim())
                              .filter(Boolean),
                          );

                          return (
                            <label
                              key={option.value}
                              className="flex items-start justify-between gap-3 rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-sm text-[#111827]"
                            >
                              <div className="space-y-1">
                                <p className="font-medium text-[#111827]">{option.label}</p>
                                {option.description ? (
                                  <p className="text-xs leading-5 text-[#4b5563]">
                                    {option.description}
                                  </p>
                                ) : null}
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedValues.has(option.value)}
                                onChange={(event) =>
                                  setExperience((current) => {
                                    if (!current) {
                                      return current;
                                    }

                                    const nextValues = new Set(
                                      String(current[field.key] ?? "")
                                        .split(/[\n,]+/)
                                        .map((value) => value.trim())
                                        .filter(Boolean),
                                    );

                                    if (event.target.checked) {
                                      nextValues.add(option.value);
                                    } else {
                                      nextValues.delete(option.value);
                                    }

                                    return {
                                      ...current,
                                      [field.key]: Array.from(nextValues).join("\n"),
                                    };
                                  })
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                    ) : field.type === "select" ? (
                      <select
                        value={experience?.[field.key] ?? ""}
                        onChange={(event) =>
                          setExperience((current) =>
                            current
                              ? {
                                  ...current,
                                  [field.key]: event.target.value,
                                }
                              : current,
                          )
                        }
                        className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "image" ? (
                      <ExperienceImageField
                        label={field.label}
                        value={String(experience?.[field.key] ?? "")}
                        onChange={(nextValue) =>
                          setExperience((current) =>
                            current
                              ? {
                                  ...current,
                                  [field.key]: nextValue,
                                }
                              : current,
                          )
                        }
                        disabled={isPending}
                      />
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={experience?.[field.key] ?? ""}
                        onChange={(event) =>
                          setExperience((current) =>
                            current
                              ? {
                                  ...current,
                                  [field.key]: event.target.value,
                                }
                              : current,
                          )
                        }
                        className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                      />
                    )}
                    {field.helper ? <p className="text-xs leading-5 text-[#4b5563]">{field.helper}</p> : null}
                  </div>
                ))}
            </div>
          </AdminCard>

          {props.fields
            .filter((field) => field.type === "links")
            .map((field) => (
              <AdminCard key={field.key} tone="compact" className="space-y-2.5">
                <div className="space-y-1 border-b border-[#e5e7eb] pb-2.5">
                  <h3 className="text-[14px] font-semibold text-[#111827]">{field.label}</h3>
                  {field.helper ? <p className="text-sm leading-5 text-[#4b5563]">{field.helper}</p> : null}
                </div>
                <StructuredLinkField
                  value={experience?.[field.key] ?? ""}
                  onChange={(nextValue) =>
                    setExperience((current) =>
                      current
                        ? {
                            ...current,
                            [field.key]: nextValue,
                          }
                        : current,
                    )
                  }
                />
              </AdminCard>
            ))}
        </div>
      ) : items.length ? (
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <AdminCard key={item.id || `global-item-${index}`} tone="compact" className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e7eb] pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AdminBadge label={item.status} tone={item.status === "published" ? "success" : "warning"} />
                    <AdminBadge label={item.enabled ? "Enabled" : "Hidden"} tone={item.enabled ? "info" : "default"} />
                  </div>
                  <p className="text-sm font-medium text-[#111827]">
                    {item.title || `Item ${index + 1}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1 text-[13px] font-medium text-[#4b5563]"
                >
                  Remove
                </button>
              </div>
              <p className="text-[12px] leading-5 text-[#4b5563]">
                Edit the public-facing copy first. Open the advanced drawer only for targeting, placement, or operator-only visibility rules.
              </p>
              <div className="grid gap-2.5 rounded-lg border border-[#d1d5db] bg-white p-3 md:grid-cols-2">
                <ModuleField label="Title" value={item.title} onChange={(value) => updateItem(index, { title: value })} />
                <ModuleField label="Eyebrow" value={item.eyebrow} onChange={(value) => updateItem(index, { eyebrow: value })} />
                <ModuleField label="CTA label" value={item.ctaLabel} onChange={(value) => updateItem(index, { ctaLabel: value })} />
                <ModuleField label="Href" value={item.href} onChange={(value) => updateItem(index, { href: value })} />
                <label className="space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                    Status
                  </span>
                  <select
                    value={item.status}
                    onChange={(event) => updateItem(index, { status: event.target.value as "draft" | "published" })}
                    className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                    Visibility
                  </span>
                  <select
                    value={item.enabled ? "enabled" : "hidden"}
                    onChange={(event) => updateItem(index, { enabled: event.target.value === "enabled" })}
                    className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                    Body
                  </span>
                  <textarea
                    rows={4}
                    value={item.body}
                    onChange={(event) => updateItem(index, { body: event.target.value })}
                    className="min-h-[72px] w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                  />
                </label>
              </div>
              <details className="rounded-lg border border-[#d1d5db] bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium text-[#111827]">Advanced targeting and operator controls</p>
                    <p className="text-[12px] leading-5 text-[#4b5563]">
                      Placement, module type, readiness flags, visibility families, and assignment rules.
                    </p>
                  </div>
                  <span className="text-[12px] font-medium text-[#6b7280]">Show</span>
                </summary>
                <div className="grid gap-2.5 border-t border-[#e5e7eb] p-3 md:grid-cols-2">
                  <ModuleField label="Module type" value={item.moduleType} onChange={(value) => updateItem(index, { moduleType: value })} />
                  <ModuleField label="Placement" value={item.placement} onChange={(value) => updateItem(index, { placement: value })} />
                  <ModuleField label="Sort order" value={String(item.sortOrder ?? index + 1)} onChange={(value) => updateItem(index, { sortOrder: Number(value) || index + 1 })} />
                  <ModuleField label="Priority" value={String(item.priority ?? index + 1)} onChange={(value) => updateItem(index, { priority: Number(value) || index + 1 })} />
                  <ModuleField label="Archive group" value={item.archiveGroup ?? ""} onChange={(value) => updateItem(index, { archiveGroup: value })} />
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                      Featured
                    </span>
                    <select
                      value={item.featured ? "yes" : "no"}
                      onChange={(event) => updateItem(index, { featured: event.target.value === "yes" })}
                      className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                      Coming soon
                    </span>
                    <select
                      value={item.comingSoon ? "yes" : "no"}
                      onChange={(event) => updateItem(index, { comingSoon: event.target.value === "yes" })}
                      className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                      Hide until ready
                    </span>
                    <select
                      value={item.hideUntilReady ? "yes" : "no"}
                      onChange={(event) => updateItem(index, { hideUntilReady: event.target.value === "yes" })}
                      className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                      Visibility families
                    </span>
                    <input
                      value={(item.visibilityFamilies ?? []).join(", ")}
                      onChange={(event) => updateItem(index, { visibilityFamilies: splitCsv(event.target.value) })}
                      className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                    />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                      Assignments
                    </span>
                    <input
                      value={(item.assignments ?? []).join(", ")}
                      onChange={(event) => updateItem(index, { assignments: splitCsv(event.target.value) })}
                      className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
                    />
                  </label>
                </div>
              </details>
            </AdminCard>
          ))}

          <button
            type="button"
            onClick={() =>
              setItems((current) => [
                ...current,
                createEmptyModule(props.defaultModuleType, current.length + 1),
              ])
            }
            className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
          >
            Add item
          </button>
        </div>
      ) : (
        <AdminEmptyState
          title="No items configured yet"
          description="Add the first reusable module for this global-site section, then save it as draft or publish it."
          action={
            <button
              type="button"
              onClick={() =>
                setItems([
                  createEmptyModule(props.defaultModuleType, 1),
                ])
              }
              className="inline-flex h-8 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white"
            >
              Add first item
            </button>
          }
        />
      )}

      {props.revisions?.length ? (
        <AdminCard tone="compact" className="space-y-2.5">
          <div className="space-y-1 border-b border-[#e5e7eb] pb-2.5">
            <h3 className="text-[14px] font-semibold text-[#111827]">Revision history</h3>
            <p className="text-sm leading-5 text-[#4b5563]">
              Recent operator saves for this global-site surface.
            </p>
          </div>
          <div className="space-y-2">
            {props.revisions.map((revision) => (
              <div
                key={revision.id}
                className="rounded-lg border border-[#d1d5db] bg-white px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-[#111827]">{revision.action}</p>
                  <AdminBadge
                    label={revision.status}
                    tone={
                      revision.status === "published"
                        ? "success"
                        : revision.status === "reverted"
                          ? "danger"
                          : "warning"
                    }
                  />
                </div>
                <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">
                  {revision.editor} • {formatAdminDateTime(revision.editedAt)} • {revision.changedCount} changes
                </p>
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}
    </div>
  );

  function updateItem(index: number, patch: Partial<AdminGlobalModule>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }
}

function ExperienceImageField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  disabled: boolean;
}) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [notice, setNotice] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function uploadImage() {
    if (!uploadFile) {
      setNotice({ tone: "danger", text: "Choose a logo image before uploading." });
      return;
    }

    startTransition(async () => {
      setNotice(null);
      const formData = new FormData();
      formData.set("title", uploadTitle || uploadFile.name);
      formData.set("altText", label);
      formData.set("category", "branding");
      formData.set("file", uploadFile);

      const response = await fetch("/api/admin/media-library", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            asset?: { url?: string | null };
          }
        | null;

      if (!response.ok || !data?.asset?.url) {
        setNotice({
          tone: "danger",
          text: data?.error ?? "Could not upload the logo right now.",
        });
        return;
      }

      onChange(data.asset.url);
      setUploadTitle("");
      setUploadFile(null);
      setNotice({
        tone: "success",
        text: "Logo uploaded and selected for the global header.",
      });
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#d1d5db] bg-white p-3">
      <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-3">
        {value ? (
          <div className="space-y-3">
            <div className="flex min-h-[64px] items-center justify-start rounded-md bg-white px-3">
              <img src={value} alt={label} className="max-h-12 w-auto object-contain" />
            </div>
            <p className="truncate text-[12px] text-[#6b7280]">{value}</p>
          </div>
        ) : (
          <p className="text-[12px] leading-5 text-[#6b7280]">
            No logo selected yet. Upload one here or paste a logo image URL.
          </p>
        )}
      </div>

      {notice ? (
        <div
          className={`rounded-lg border px-3 py-2 text-[12px] leading-5 ${
            notice.tone === "success"
              ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#166534]"
              : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <div className="space-y-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/media-library/riddra-logo.png or https://..."
          disabled={disabled || isPending}
          className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
        />
        <p className="text-[12px] leading-5 text-[#4b5563]">
          Paste an existing logo URL, or upload a new one below.
        </p>
      </div>

      <div className="space-y-2 rounded-lg border border-[#d1d5db] bg-[#f9fafb] p-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
          Upload logo
        </p>
        <input
          value={uploadTitle}
          onChange={(event) => setUploadTitle(event.target.value)}
          placeholder="Riddra header logo"
          disabled={disabled || isPending}
          className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb]"
        />
        <input
          type="file"
          accept="image/*"
          disabled={disabled || isPending}
          onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-[#111827]"
        />
        {uploadFile ? (
          <p className="text-[12px] leading-5 text-[#6b7280]">Selected file: {uploadFile.name}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={uploadImage}
            disabled={disabled || isPending}
            className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Uploading..." : "Upload and use logo"}
          </button>
          <Link
            href="/admin/media-library"
            className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
          >
            Open media library
          </Link>
        </div>
      </div>
    </div>
  );
}

function ModuleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
      />
    </label>
  );
}

function createEmptyModule(defaultModuleType?: string, sortOrder = 1): AdminGlobalModule {
  return {
    id: "",
    title: "",
    eyebrow: "",
    body: "",
    href: "",
    ctaLabel: "",
    moduleType: defaultModuleType || "shared_module",
    featured: false,
    priority: sortOrder,
    archiveGroup: null,
    visibilityFamilies: [],
    assignments: [],
    comingSoon: false,
    hideUntilReady: false,
    enabled: true,
    status: "draft",
    placement: "",
    sortOrder,
    updatedAt: "",
  };
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function StructuredLinkField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const rows = parseLinkRows(value);

  return (
    <div className="space-y-2.5">
      {rows.map((row, index) => (
        <div
          key={`link-row-${index}`}
          className="grid gap-2.5 rounded-lg border border-[#d1d5db] bg-white p-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <ModuleField
            label="Label"
            value={row.label}
            onChange={(nextValue) => onChange(updateLinkRow(rows, index, { label: nextValue }))}
          />
          <ModuleField
            label="Href"
            value={row.href}
            onChange={(nextValue) => onChange(updateLinkRow(rows, index, { href: nextValue }))}
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => onChange(serializeLinkRows(rows.filter((_, rowIndex) => rowIndex !== index)))}
              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] font-medium text-[#4b5563]"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange(serializeLinkRows([...rows, { label: "", href: "" }]))}
        className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
      >
        Add link row
      </button>
    </div>
  );
}

function parseLinkRows(value: string) {
  const rows = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = "", href = ""] = line.split("|").map((item) => item.trim());
      return { label, href };
    });

  return rows.length ? rows : [{ label: "", href: "" }];
}

function serializeLinkRows(rows: Array<{ label: string; href: string }>) {
  return rows
    .map((row) => [row.label.trim(), row.href.trim()].filter(Boolean).join("|"))
    .filter(Boolean)
    .join("\n");
}

function updateLinkRow(
  rows: Array<{ label: string; href: string }>,
  index: number,
  patch: Partial<{ label: string; href: string }>,
) {
  return serializeLinkRows(
    rows.map((row, rowIndex) =>
      rowIndex === index
        ? {
            ...row,
            ...patch,
          }
        : row,
    ),
  );
}
