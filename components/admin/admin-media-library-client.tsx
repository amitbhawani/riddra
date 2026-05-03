"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { formatAdminDateTime, formatAdminStorageDetail } from "@/lib/admin-time";
import type { MediaAsset } from "@/lib/user-product-store";
import {
  AdminBadge,
  AdminEmptyState,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import { getExternalLinkProps } from "@/lib/link-utils";

const imageCategoryOptions = [
  { label: "Content image", value: "content" },
  { label: "SEO / OG", value: "seo" },
  { label: "Campaign", value: "campaign" },
  { label: "Course / webinar", value: "education" },
];

const documentCategoryOptions = [
  { label: "Document", value: "document" },
  { label: "Factsheet", value: "factsheet" },
  { label: "Disclosure / policy", value: "policy" },
  { label: "Downloadable resource", value: "resource" },
];

function getTypeTone(type: MediaAsset["assetType"]) {
  return type === "document" ? ("warning" as const) : ("info" as const);
}

function getSourceTone(sourceKind: MediaAsset["sourceKind"]) {
  return sourceKind === "upload" ? ("success" as const) : ("info" as const);
}

function getStatusTone(status: MediaAsset["status"]) {
  return status === "published" ? ("success" as const) : ("default" as const);
}

function getPreviewLabel(asset: MediaAsset) {
  if (asset.assetType === "document") {
    const extension = asset.fileName.split(".").pop()?.toUpperCase() || "DOC";
    return extension;
  }

  return "IMG";
}

function getCategoryOptions(assetType: MediaAsset["assetType"]) {
  return assetType === "document" ? documentCategoryOptions : imageCategoryOptions;
}

export function AdminMediaLibraryClient({
  initialAssets,
}: {
  initialAssets: MediaAsset[];
}) {
  const router = useRouter();
  const [assets, setAssets] = useState(initialAssets);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | MediaAsset["assetType"]>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | MediaAsset["sourceKind"]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | MediaAsset["status"]>("all");
  const [externalForm, setExternalForm] = useState({
    title: "",
    altText: "",
    url: "",
    assetType: "image" as MediaAsset["assetType"],
    category: "content",
  });
  const [uploadForm, setUploadForm] = useState({
    title: "",
    altText: "",
    category: "content",
    file: null as File | null,
  });
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    id: "",
    title: "",
    altText: "",
    category: "content",
    status: "published" as MediaAsset["status"],
  });
  const [isPending, startTransition] = useTransition();

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (typeFilter !== "all" && asset.assetType !== typeFilter) {
        return false;
      }
      if (sourceFilter !== "all" && asset.sourceKind !== sourceFilter) {
        return false;
      }
      if (statusFilter !== "all" && asset.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        asset.title,
        asset.altText,
        asset.fileName,
        asset.url,
        asset.category,
        asset.uploadedBy,
        asset.assetType,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [assets, query, typeFilter, sourceFilter, statusFilter]);

  function saveExternalAsset() {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/media-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(externalForm),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            asset?: MediaAsset;
            assets?: MediaAsset[];
            operation?: "created" | "updated";
            storageMode?: "durable" | "fallback";
            savedAt?: string;
          }
        | null;

      if (!response.ok || !data?.asset || !data.assets) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not save the external asset right now.",
        });
        return;
      }

      setAssets(data.assets);
      setExternalForm({
        title: "",
        altText: "",
        url: "",
        assetType: "image",
        category: "content",
      });
      router.refresh();
      setBanner({
        tone: "success",
        text:
          data.operation === "updated"
            ? `${data.asset.title} updated in the media library.`
            : data.asset.assetType === "document"
              ? "External document saved to the media library."
              : "External image saved to the media library.",
        detail: formatAdminStorageDetail(data.storageMode, data.savedAt),
      });
    });
  }

  function uploadAsset() {
    if (!uploadForm.file) {
      setBanner({ tone: "danger", text: "Choose an image file first." });
      return;
    }

    const file = uploadForm.file;

    startTransition(async () => {
      setBanner(null);
      const formData = new FormData();
      formData.set("title", uploadForm.title);
      formData.set("altText", uploadForm.altText);
      formData.set("category", uploadForm.category);
      formData.set("file", file);

      const response = await fetch("/api/admin/media-library", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            asset?: MediaAsset;
            assets?: MediaAsset[];
            operation?: "created" | "updated";
            storageMode?: "durable" | "fallback";
            savedAt?: string;
          }
        | null;

      if (!response.ok || !data?.asset || !data.assets) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not upload the image right now.",
        });
        return;
      }

      setAssets(data.assets);
      setUploadForm({ title: "", altText: "", category: "content", file: null });
      router.refresh();
      setBanner({
        tone: "success",
        text: "Image uploaded to the media library.",
        detail: formatAdminStorageDetail(data.storageMode, data.savedAt),
      });
    });
  }

  async function copyAssetUrl(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      setBanner({
        tone: "success",
        text: `${asset.title} copied. You can now use this asset in an editor field right away.`,
      });
    } catch {
      setBanner({
        tone: "danger",
        text: "Could not copy that URL automatically. Open the asset and copy it manually.",
      });
    }
  }

  function startEditing(asset: MediaAsset) {
    setEditingAssetId(asset.id);
    setEditForm({
      id: asset.id,
      title: asset.title,
      altText: asset.altText,
      category: asset.category,
      status: asset.status,
    });
  }

  function cancelEditing() {
    setEditingAssetId(null);
    setEditForm({
      id: "",
      title: "",
      altText: "",
      category: "content",
      status: "published",
    });
  }

  function saveAssetDetails() {
    if (!editForm.id) {
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/media-library", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            asset?: MediaAsset;
            assets?: MediaAsset[];
            storageMode?: "durable" | "fallback";
            savedAt?: string;
          }
        | null;

      if (!response.ok || !data?.asset || !data.assets) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not save those media details right now.",
        });
        return;
      }

      setAssets(data.assets);
      cancelEditing();
      router.refresh();
      setBanner({
        tone: "success",
        text: `${data.asset.title} details updated.`,
        detail: formatAdminStorageDetail(data.storageMode, data.savedAt),
      });
    });
  }

  return (
    <div className="space-y-3">
      {banner ? (
        <div className="rounded-lg border border-[#d1d5db] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Updated" : "Error"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        <AdminSectionCard
          title="Upload an image"
          description="Upload a local image into the shared library so editors can reuse it for covers, SEO, and campaigns."
        >
          <div className="space-y-3">
            <input
              value={uploadForm.title}
              onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Asset title"
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            />
            <input
              value={uploadForm.altText}
              onChange={(event) => setUploadForm((current) => ({ ...current, altText: event.target.value }))}
              placeholder="Alt text for image accessibility"
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            />
            <select
              value={uploadForm.category}
              onChange={(event) => setUploadForm((current) => ({ ...current, category: event.target.value }))}
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            >
              {imageCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setUploadForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))
              }
              className="block w-full text-sm text-[#111827]"
            />
            <button
              type="button"
              onClick={uploadAsset}
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white"
            >
              {isPending ? "Uploading..." : "Upload image"}
            </button>
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Add external asset"
          description="Save a hosted image or document URL into the shared library so operators can attach it in editors later."
        >
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={externalForm.assetType}
                onChange={(event) =>
                  setExternalForm((current) => ({
                    ...current,
                    assetType: event.target.value as MediaAsset["assetType"],
                    category: event.target.value === "document" ? "document" : "content",
                    altText: event.target.value === "document" ? "" : current.altText,
                  }))
                }
                className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
              >
                <option value="image">Image</option>
                <option value="document">Document</option>
              </select>
              <select
                value={externalForm.category}
                onChange={(event) =>
                  setExternalForm((current) => ({ ...current, category: event.target.value }))
                }
                className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
              >
                {getCategoryOptions(externalForm.assetType).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={externalForm.title}
              onChange={(event) =>
                setExternalForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder={externalForm.assetType === "document" ? "Document label" : "Asset title"}
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            />
            {externalForm.assetType === "image" ? (
              <input
                value={externalForm.altText}
                onChange={(event) =>
                  setExternalForm((current) => ({ ...current, altText: event.target.value }))
                }
                placeholder="Alt text"
                className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
              />
            ) : null}
            <input
              value={externalForm.url}
              onChange={(event) =>
                setExternalForm((current) => ({ ...current, url: event.target.value }))
              }
              placeholder={
                externalForm.assetType === "document"
                  ? "https://example.com/factsheet.pdf"
                  : "https://example.com/og-image.jpg"
              }
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            />
            <button
              type="button"
              onClick={saveExternalAsset}
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white"
            >
              {isPending ? "Saving..." : "Save external asset"}
            </button>
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Available assets"
        description="Search, filter, preview, quick-edit, and reuse shared assets for editors. Document assets work for attachments, while images work for covers, featured visuals, and SEO."
      >
        <div className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, filename, URL, category, or uploader"
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            >
              <option value="all">All types</option>
              <option value="image">Images</option>
              <option value="document">Documents</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            >
              <option value="all">All sources</option>
              <option value="upload">Uploads</option>
              <option value="external_url">External URLs</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827]"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge label={`${assets.length} total`} tone="default" />
            <AdminBadge label={`${filteredAssets.length} visible`} tone="info" />
            <AdminBadge
              label={`${assets.filter((asset) => asset.assetType === "image").length} images`}
              tone="info"
            />
            <AdminBadge
              label={`${assets.filter((asset) => asset.assetType === "document").length} documents`}
              tone="warning"
            />
          </div>

          {filteredAssets.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="overflow-hidden rounded-lg border border-[#d1d5db] bg-white shadow-sm"
                >
                  <div className="border-b border-[#e5e7eb] bg-[#f8fafc] p-3">
                    {asset.assetType === "image" ? (
                      <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg border border-[#d1d5db] bg-white">
                        <img
                          src={asset.url}
                          alt={asset.altText || asset.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-[#d1d5db] bg-white text-[28px] font-semibold text-[#1B3A6B]">
                        {getPreviewLabel(asset)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-3">
                    <div className="space-y-1">
                      <p className="text-[14px] font-semibold text-[#111827]">{asset.title}</p>
                      <p className="line-clamp-2 text-[12px] leading-5 text-[#6b7280]">
                        {asset.assetType === "image"
                          ? asset.altText || "No alt text yet"
                          : `Reusable document asset for ${asset.category.replace(/-/g, " ")} attachments.`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <AdminBadge
                        label={asset.assetType === "document" ? "Document" : "Image"}
                        tone={getTypeTone(asset.assetType)}
                      />
                      <AdminBadge label={asset.category.replace(/-/g, " ")} tone="default" />
                      <AdminBadge
                        label={asset.sourceKind === "upload" ? "Upload" : "External"}
                        tone={getSourceTone(asset.sourceKind)}
                      />
                      <AdminBadge label={asset.status} tone={getStatusTone(asset.status)} />
                    </div>

                    <div className="space-y-1 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                        Reuse this asset
                      </p>
                      <p className="truncate text-[12px] text-[#111827]">{asset.url}</p>
                      <p className="text-[12px] leading-5 text-[#6b7280]">
                        Created {formatAdminDateTime(asset.uploadedAt)} • Updated {formatAdminDateTime(asset.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyAssetUrl(asset)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white"
                      >
                        Use this asset
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditing(asset)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                      >
                        {editingAssetId === asset.id ? "Editing" : "Edit details"}
                      </button>
                      <a
                        href={asset.url}
                        {...getExternalLinkProps()}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                      >
                        Open asset
                      </a>
                    </div>

                    <p className="text-[12px] leading-5 text-[#6b7280]">
                      Uploaded by {asset.uploadedBy} • {asset.fileName || "No filename saved"}
                    </p>

                    {editingAssetId === asset.id ? (
                      <div className="space-y-3 rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-3">
                        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                          Quick details
                        </p>
                        <input
                          value={editForm.title}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="Asset title"
                          className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
                        />
                        {asset.assetType === "image" ? (
                          <input
                            value={editForm.altText}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, altText: event.target.value }))
                            }
                            placeholder="Alt text"
                            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
                          />
                        ) : null}
                        <div className="grid gap-3 md:grid-cols-2">
                          <select
                            value={editForm.category}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, category: event.target.value }))
                            }
                            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
                          >
                            {getCategoryOptions(asset.assetType).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editForm.status}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                status: event.target.value as MediaAsset["status"],
                              }))
                            }
                            className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
                          >
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                          </select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={saveAssetDetails}
                            disabled={isPending}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isPending ? "Saving..." : "Save details"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            disabled={isPending}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No matching assets"
              description={
                assets.length
                  ? "Try a different search or filter to find the asset you want to reuse."
                  : "Upload an image or save an external image/document URL to start building a reusable library."
              }
            />
          )}
        </div>
      </AdminSectionCard>
    </div>
  );
}
