import type { AdminFamilyKey } from "@/lib/admin-content-schema";

export type ProductUserRole = "admin" | "editor" | "user";

export type ProductUserCapability =
  | "can_manage_settings"
  | "can_publish_content"
  | "can_manage_media"
  | "can_manage_memberships"
  | "can_manage_refresh_jobs"
  | "can_manage_imports"
  | "can_edit_finance_content"
  | "can_edit_editorial_content";

export const productUserCapabilityOptions: Array<{
  value: ProductUserCapability;
  label: string;
  note: string;
}> = [
  {
    value: "can_manage_settings",
    label: "Manage settings",
    note: "System settings, defaults, support config, and feature toggles.",
  },
  {
    value: "can_publish_content",
    label: "Publish content",
    note: "Publish, archive, and schedule live content changes.",
  },
  {
    value: "can_manage_media",
    label: "Manage media",
    note: "Upload, save, and reuse media assets across the CMS.",
  },
  {
    value: "can_manage_memberships",
    label: "Manage memberships",
    note: "Edit membership tiers and access-plan coverage.",
  },
  {
    value: "can_manage_refresh_jobs",
    label: "Manage refresh jobs",
    note: "Run, edit, and review refresh-job automation.",
  },
  {
    value: "can_manage_imports",
    label: "Manage imports",
    note: "Apply, reject, and review import batches and conflicts.",
  },
  {
    value: "can_edit_finance_content",
    label: "Edit finance content",
    note: "Stocks, funds, indices, ETFs, IPOs, PMS, AIF, and SIF families.",
  },
  {
    value: "can_edit_editorial_content",
    label: "Edit editorial content",
    note: "Courses, webinars, learn, newsletter, and research families.",
  },
];

export const allProductUserCapabilities = productUserCapabilityOptions.map((option) => option.value);
export const editorAssignableProductCapabilities: ProductUserCapability[] = [
  "can_manage_media",
  "can_edit_finance_content",
  "can_edit_editorial_content",
];

const financeFamilies = new Set<AdminFamilyKey>([
  "stocks",
  "mutual-funds",
  "indices",
  "etfs",
  "ipos",
  "pms",
  "aif",
  "sif",
]);

const editorialFamilies = new Set<AdminFamilyKey>([
  "courses",
  "webinars",
  "learn",
  "newsletter",
  "research-articles",
]);

export function normalizeProductUserCapabilities(value: unknown) {
  const allowed = new Set<ProductUserCapability>(allProductUserCapabilities);
  if (!Array.isArray(value)) {
    return [] as ProductUserCapability[];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item): item is ProductUserCapability => allowed.has(item as ProductUserCapability)),
    ),
  );
}

export function getDefaultCapabilitiesForRole(role: ProductUserRole) {
  if (role === "admin") {
    return [...allProductUserCapabilities];
  }

  if (role === "editor") {
    return [...editorAssignableProductCapabilities];
  }

  return [] as ProductUserCapability[];
}

export function getAllowedCapabilitiesForRole(role: ProductUserRole) {
  if (role === "admin") {
    return [...allProductUserCapabilities];
  }

  if (role === "editor") {
    return [...editorAssignableProductCapabilities];
  }

  return [] as ProductUserCapability[];
}

export function constrainCapabilitiesForRole(
  role: ProductUserRole,
  capabilities: ProductUserCapability[] | null | undefined,
) {
  const allowed = new Set(getAllowedCapabilitiesForRole(role));
  return normalizeProductUserCapabilities(capabilities ?? []).filter((capability) =>
    allowed.has(capability),
  );
}

export function getEffectiveCapabilities(
  role: ProductUserRole,
  explicitCapabilities?: ProductUserCapability[] | null,
) {
  if (role === "admin") {
    return [...allProductUserCapabilities];
  }

  if (role === "user") {
    return [] as ProductUserCapability[];
  }

  const normalized = constrainCapabilitiesForRole(role, explicitCapabilities ?? []);
  return normalized.length ? normalized : getDefaultCapabilitiesForRole(role);
}

export function hasProductUserCapability(
  role: ProductUserRole,
  capabilities: ProductUserCapability[] | null | undefined,
  capability: ProductUserCapability,
) {
  return getEffectiveCapabilities(role, capabilities).includes(capability);
}

export function canAccessAnyContentWorkspace(
  role: ProductUserRole,
  capabilities: ProductUserCapability[] | null | undefined,
) {
  return (
    hasProductUserCapability(role, capabilities, "can_edit_finance_content") ||
    hasProductUserCapability(role, capabilities, "can_edit_editorial_content")
  );
}

export function canEditAdminFamily(
  role: ProductUserRole,
  capabilities: ProductUserCapability[] | null | undefined,
  family: AdminFamilyKey,
) {
  if (financeFamilies.has(family)) {
    return hasProductUserCapability(role, capabilities, "can_edit_finance_content");
  }

  if (editorialFamilies.has(family)) {
    return hasProductUserCapability(role, capabilities, "can_edit_editorial_content");
  }

  return role === "admin";
}

export function isFinanceAdminFamily(family: AdminFamilyKey) {
  return financeFamilies.has(family);
}

export function isEditorialAdminFamily(family: AdminFamilyKey) {
  return editorialFamilies.has(family);
}

function extractAdminFamilyFromPath(pathname: string) {
  if (!pathname.startsWith("/admin/content/")) {
    return null;
  }

  const segment = pathname.split("/")[3] ?? "";
  return segment || null;
}

export function canAccessAdminPagePath(
  pathname: string,
  role: ProductUserRole,
  capabilities: ProductUserCapability[] | null | undefined,
) {
  if (role === "admin") {
    return true;
  }

  if (role !== "editor") {
    return false;
  }

  if (pathname === "/admin" || pathname === "/admin/activity-log" || pathname === "/admin/change-log") {
    return true;
  }

  if (pathname === "/admin/help") {
    return true;
  }

  if (pathname === "/admin/media-library") {
    return hasProductUserCapability(role, capabilities, "can_manage_media");
  }

  if (pathname === "/admin/content" || pathname === "/admin/new") {
    return canAccessAnyContentWorkspace(role, capabilities);
  }

  if (pathname === "/admin/search") {
    return canAccessAnyContentWorkspace(role, capabilities) || hasProductUserCapability(role, capabilities, "can_manage_media");
  }

  const family = extractAdminFamilyFromPath(pathname);
  if (family) {
    return canEditAdminFamily(role, capabilities, family as AdminFamilyKey);
  }

  if (pathname === "/admin/settings") {
    return hasProductUserCapability(role, capabilities, "can_manage_settings");
  }

  if (pathname === "/admin/imports") {
    return hasProductUserCapability(role, capabilities, "can_manage_imports");
  }

  if (pathname === "/admin/refresh-jobs") {
    return hasProductUserCapability(role, capabilities, "can_manage_refresh_jobs");
  }

  if (pathname === "/admin/memberships" || pathname.startsWith("/admin/memberships/")) {
    return hasProductUserCapability(role, capabilities, "can_manage_memberships");
  }

  return false;
}

export function canAccessAdminApiPath(
  pathname: string,
  role: ProductUserRole,
  capabilities: ProductUserCapability[] | null | undefined,
) {
  if (role === "admin") {
    return true;
  }

  if (role !== "editor") {
    return false;
  }

  if (pathname === "/api/admin/media-library") {
    return hasProductUserCapability(role, capabilities, "can_manage_media");
  }

  if (
    pathname === "/api/admin/operator-console/records" ||
    pathname === "/api/admin/operator-console/previews" ||
    pathname === "/api/admin/operator-console/editor-locks" ||
    pathname === "/api/admin/operator-console/import-batches" ||
    pathname === "/api/admin/operator-console/import-batches/preview" ||
    pathname.startsWith("/api/admin/operator-console/import-templates/")
  ) {
    return canAccessAnyContentWorkspace(role, capabilities);
  }

  if (pathname === "/api/admin/operator-console/imports") {
    return hasProductUserCapability(role, capabilities, "can_manage_imports");
  }

  if (pathname === "/api/admin/operator-console/refresh-jobs") {
    return hasProductUserCapability(role, capabilities, "can_manage_refresh_jobs");
  }

  if (pathname === "/api/admin/operator-console/memberships") {
    return hasProductUserCapability(role, capabilities, "can_manage_memberships");
  }

  if (pathname === "/api/admin/settings") {
    return hasProductUserCapability(role, capabilities, "can_manage_settings");
  }

  return false;
}

export function getAdminLandingPath(
  role: ProductUserRole,
  capabilities: ProductUserCapability[] | null | undefined,
) {
  if (role === "admin" || role === "editor") {
    return "/admin";
  }

  if (hasProductUserCapability(role, capabilities, "can_manage_media")) {
    return "/admin/media-library";
  }

  return "/account";
}
