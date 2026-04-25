import { randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { buildAccountFallbackEmail, buildAccountUserKey, normalizeAccountEmail } from "@/lib/account-identity";
import {
  getAdminMembershipTiers,
  normalizeAdminPublishState,
  type AdminMembershipTier,
  type AdminPublishState,
  type SaveAdminRecordInput,
} from "@/lib/admin-operator-store";
import {
  appendDurableCmsRecordVersion,
  appendDurableRefreshJobRun,
  createDurableCmsPreviewSession,
  deleteDurablePortfolioHolding,
  deleteDurableUserProfile,
  deleteDurableWatchlistItem,
  expireDurableCmsPreviewSessionsForRecord,
  getDurableCmsPreviewSession,
  getLatestDurableCmsPreviewSessionForRecord,
  getDurableSystemSettings,
  getDurableUserProfileByEmail,
  getDurableUserProfileByUserKey,
  hasDurableCmsStateStore,
  listDurableCmsRecordVersions,
  listDurableMediaAssets,
  listDurablePortfolioHoldings,
  listDurableRefreshJobRuns,
  listDurableUserProfiles,
  listDurableWatchlistItems,
  saveDurableMediaAsset,
  saveDurablePortfolioHolding,
  saveDurableSystemSettings,
  saveDurableUserProfile,
  saveDurableWatchlistItem,
} from "@/lib/cms-durable-state";
import { getFunds } from "@/lib/content";
import {
  buildMembershipFeatureSummary,
  isMembershipFeatureEnabled,
  normalizeMembershipFeatureAccess,
  type MembershipFeatureKey,
} from "@/lib/membership-product-features";
import { getConfiguredAdminEmails } from "@/lib/runtime-launch-config";
import { getDurableStockQuoteSnapshot } from "@/lib/market-data-durable-store";
import { saveMediaBinary } from "@/lib/media-storage";
import { sampleStocks } from "@/lib/mock-data";
import {
  getDefaultCapabilitiesForRole,
  getEffectiveCapabilities,
  type ProductUserCapability,
  type ProductUserRole,
} from "@/lib/product-permissions";
import { sanitizeSystemHeadCodeInput } from "@/lib/system-head-code";

export type { ProductUserCapability, ProductUserRole } from "@/lib/product-permissions";

export type ProductUserProfile = {
  id: string;
  userKey: string;
  authUserId: string;
  name: string;
  email: string;
  username: string;
  websiteUrl: string | null;
  xHandle: string | null;
  linkedinUrl: string | null;
  instagramHandle: string | null;
  youtubeUrl: string | null;
  profileVisible: boolean;
  membershipTier: string | null;
  role: ProductUserRole;
  capabilities: ProductUserCapability[];
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
};

export type ProductPageType = "stock" | "mutual_fund" | "index" | "learn" | "research";

export type UserWatchlistItem = {
  id: string;
  pageType: "stock" | "mutual_fund";
  slug: string;
  symbol: string;
  title: string;
  href: string;
  stockSlug: string;
  stockSymbol: string;
  stockName: string;
  addedAt: string;
};

export type UserBookmarkItem = {
  id: string;
  pageType: ProductPageType;
  slug: string;
  title: string;
  href: string;
  addedAt: string;
};

export type UserRecentViewItem = {
  id: string;
  pageType: ProductPageType;
  slug: string;
  title: string;
  href: string;
  viewedAt: string;
};

export type UserPortfolioHolding = {
  id: string;
  stockSlug: string;
  stockSymbol: string;
  stockName: string;
  quantity: number;
  buyPrice: number;
  addedAt: string;
  updatedAt: string;
};

export type UserPortfolioHoldingView = UserPortfolioHolding & {
  currentPrice: number | null;
  currentValue: number | null;
  investedValue: number;
  pnlValue: number | null;
};

export type UserPortfolioState = {
  holdings: UserPortfolioHoldingView[];
  storageMode: "durable" | "fallback";
};

export type CmsPreviewSession = {
  token: string;
  family: string;
  slug: string;
  title: string;
  routeTarget: string | null;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  payload: SaveAdminRecordInput;
};

export type CmsRecordVersion = {
  id: string;
  family: string;
  slug: string;
  title: string;
  savedAt: string;
  savedBy: string;
  status: AdminPublishState;
  routeTarget: string | null;
  changedFields: string[];
  snapshot: SaveAdminRecordInput;
};

export type MediaAsset = {
  id: string;
  title: string;
  altText: string;
  url: string;
  assetType: "image" | "document";
  category: string;
  sourceKind: "upload" | "external_url";
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  status: "draft" | "published";
};

export type SystemSettings = {
  siteName: string;
  defaultMetaTitleSuffix: string;
  defaultMetaDescription: string;
  defaultOgImage: string;
  defaultCanonicalBase: string;
  publicHeadCode: string;
  defaultNoIndex: boolean;
  defaultMembershipTier: string;
  defaultLockedCtaLabel: string;
  supportEmail: string;
  supportRoute: string;
  previewEnabled: boolean;
  mediaUploadsEnabled: boolean;
  watchlistEnabled: boolean;
  portfolioEnabled: boolean;
  updatedAt: string;
};

export type SaveSystemSettingsResult = {
  settings: SystemSettings;
  storageMode: "durable" | "fallback";
  savedAt: string;
};

export type SaveMediaAssetResult = {
  asset: MediaAsset;
  storageMode: "durable" | "fallback";
  savedAt: string;
  operation: "created" | "updated";
};

export type RefreshJobRun = {
  id: string;
  jobKey: string;
  status: "running" | "healthy" | "failed" | "warning";
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  note: string | null;
  requestedBy: string | null;
  retriedFromRunId: string | null;
};

type ProductUserRecord = {
  profile: ProductUserProfile;
  watchlist: UserWatchlistItem[];
  portfolio: UserPortfolioHolding[];
  bookmarks: UserBookmarkItem[];
  recentlyViewed: UserRecentViewItem[];
};

type UserProductStore = {
  version: number;
  users: ProductUserRecord[];
  mediaAssets: MediaAsset[];
  settings: SystemSettings;
  previews: CmsPreviewSession[];
  versions: CmsRecordVersion[];
  refreshJobRuns: RefreshJobRun[];
  updatedAt: string | null;
};

export type SaveUserProfileInput = {
  email: string;
  name?: string | null;
  username?: string | null;
  websiteUrl?: string | null;
  xHandle?: string | null;
  linkedinUrl?: string | null;
  instagramHandle?: string | null;
  youtubeUrl?: string | null;
  profileVisible?: boolean;
  membershipTier?: string | null;
  role?: ProductUserRole;
  capabilities?: ProductUserCapability[];
};

export type SaveUserProfileResult = {
  profile: ProductUserProfile;
  operation: "created" | "updated";
  storageMode: "durable" | "fallback";
  savedAt: string;
};

export type RemoveUserProfileResult = {
  profile: ProductUserProfile;
  storageMode: "durable" | "fallback";
  savedAt: string;
};

export type SaveSystemSettingsInput = Partial<SystemSettings>;

export type SaveUserPortfolioHoldingInput = {
  stockSlug: string;
  quantity: number;
  buyPrice: number;
};

export type SaveUserPortfolioHoldingResult = {
  holdings: UserPortfolioHolding[];
  storageMode: "durable" | "fallback";
  savedHolding: UserPortfolioHolding;
};

export type RemoveUserPortfolioHoldingResult = {
  holdings: UserPortfolioHolding[];
  storageMode: "durable" | "fallback";
  removedSlug: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "user-product-store.json");
const STORE_VERSION = 1;
const PREVIEW_TTL_MS = 1000 * 60 * 60 * 24;
const PREVIEW_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const USERNAME_BLOCKLIST = new Set([
  "admin",
  "support",
  "owner",
  "staff",
  "moderator",
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "nigger",
  "bastard",
]);
let storeCache:
  | {
      mtimeMs: number;
      store: UserProductStore;
    }
  | null = null;

function cleanString(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function cleanUrlLikeValue(value: string | null | undefined) {
  const normalized = cleanString(value);

  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(
      normalized.startsWith("http://") || normalized.startsWith("https://")
        ? normalized
        : `https://${normalized}`,
    );

    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeSocialHandle(value: string | null | undefined) {
  const normalized = cleanString(value)
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com|instagram\.com)\//i, "")
    .replace(/\/+$/, "")
    .trim();

  return normalized || null;
}

function normalizeSlug(value: string) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeUsernameCandidate(value: string) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_ ]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function buildDefaultUsername(value: {
  username?: string | null;
  name?: string | null;
  email?: string | null;
  userKey?: string | null;
}) {
  const preferred =
    normalizeUsernameCandidate(cleanString(value.username)) ||
    normalizeUsernameCandidate(cleanString(value.name)) ||
    normalizeUsernameCandidate(cleanString(value.email).split("@")[0]) ||
    normalizeUsernameCandidate(cleanString(value.userKey)) ||
    `riddra_user_${Math.floor(Math.random() * 10_000)}`;

  return preferred.length >= 3 ? preferred : `${preferred}_user`.slice(0, 24);
}

function containsBlockedUsernameTerm(username: string) {
  const normalized = normalizeUsernameCandidate(username);
  return Array.from(USERNAME_BLOCKLIST).some((term) => normalized.includes(term));
}

function normalizeProductPageType(value: unknown): ProductPageType {
  if (value === "mutual_fund" || value === "index" || value === "learn" || value === "research") {
    return value;
  }

  return "stock";
}

export function isValidCmsPreviewToken(token: string) {
  return PREVIEW_TOKEN_PATTERN.test(cleanString(token));
}

function isExpiredPreviewSession(preview: Pick<CmsPreviewSession, "expiresAt">) {
  const expiresAt = new Date(preview.expiresAt).getTime();
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}

function pruneExpiredPreviewSessions(previews: CmsPreviewSession[]) {
  return previews.filter((item) => !isExpiredPreviewSession(item));
}

function pruneExpiredPreviewSessionsInStore(store: UserProductStore) {
  store.previews = pruneExpiredPreviewSessions(store.previews);
  return store;
}

function defaultRoleForEmail(email: string | null | undefined): ProductUserRole {
  const normalized = normalizeAccountEmail(email);
  if (!normalized) {
    return "user";
  }

  return getConfiguredAdminEmails().includes(normalized) ? "admin" : "user";
}

function defaultSettings(): SystemSettings {
  return {
    siteName: "Riddra",
    defaultMetaTitleSuffix: "Riddra",
    defaultMetaDescription: "Riddra is a market intelligence and research platform for Indian investors.",
    defaultOgImage: "",
    defaultCanonicalBase: "",
    publicHeadCode: "",
    defaultNoIndex: false,
    defaultMembershipTier: "free",
    defaultLockedCtaLabel: "Unlock with membership",
    supportEmail: "",
    supportRoute: "/contact",
    previewEnabled: true,
    mediaUploadsEnabled: true,
    watchlistEnabled: true,
    portfolioEnabled: true,
    updatedAt: new Date().toISOString(),
  };
}

function defaultStore(): UserProductStore {
  return {
    version: STORE_VERSION,
    users: [],
    mediaAssets: [],
    settings: defaultSettings(),
    previews: [],
    versions: [],
    refreshJobRuns: [],
    updatedAt: null,
  };
}

function normalizeProfile(value: Partial<ProductUserProfile>): ProductUserProfile {
  const email = normalizeAccountEmail(value.email) ?? "";
  const userKey = cleanString(value.userKey) || normalizeSlug(email) || cleanString(value.authUserId) || randomUUID();
  const now = new Date().toISOString();
  const role = value.role ?? defaultRoleForEmail(email);
  const username = buildDefaultUsername({
    username: value.username,
    name: value.name,
    email,
    userKey,
  });

  return {
    id: cleanString(value.id) || `profile_${userKey}`,
    userKey,
    authUserId: cleanString(value.authUserId) || userKey,
    name: cleanString(value.name) || email.split("@")[0] || "Riddra user",
    email: email || `${userKey}@local-preview.riddra`,
    username,
    websiteUrl: cleanUrlLikeValue(value.websiteUrl),
    xHandle: normalizeSocialHandle(value.xHandle),
    linkedinUrl: cleanUrlLikeValue(value.linkedinUrl),
    instagramHandle: normalizeSocialHandle(value.instagramHandle),
    youtubeUrl: cleanUrlLikeValue(value.youtubeUrl),
    profileVisible: value.profileVisible !== false,
    membershipTier: cleanString(value.membershipTier) || null,
    role,
    capabilities: getEffectiveCapabilities(role, value.capabilities),
    createdAt: cleanString(value.createdAt) || now,
    updatedAt: cleanString(value.updatedAt) || now,
    lastActiveAt: cleanString(value.lastActiveAt) || now,
  };
}

function normalizeWatchlistItem(value: Partial<UserWatchlistItem>): UserWatchlistItem {
  const pageType = value.pageType === "mutual_fund" ? "mutual_fund" : "stock";
  const slug = normalizeSlug(value.slug ?? value.stockSlug ?? "");
  const title = cleanString(value.title) || cleanString(value.stockName) || slug;
  const symbol = cleanString(value.symbol ?? value.stockSymbol).toUpperCase();
  return {
    id: cleanString(value.id) || `watchlist_${randomUUID()}`,
    pageType,
    slug,
    symbol,
    title,
    href:
      cleanString(value.href) ||
      (pageType === "mutual_fund" ? `/mutual-funds/${slug}` : `/stocks/${slug}`),
    stockSlug: slug,
    stockSymbol: symbol,
    stockName: title,
    addedAt: cleanString(value.addedAt) || new Date().toISOString(),
  };
}

function normalizeBookmarkItem(value: Partial<UserBookmarkItem>): UserBookmarkItem {
  const pageType = normalizeProductPageType(value.pageType);
  const slug = normalizeSlug(value.slug ?? "");
  return {
    id: cleanString(value.id) || `bookmark_${randomUUID()}`,
    pageType,
    slug,
    title: cleanString(value.title) || slug,
    href:
      cleanString(value.href) ||
      (pageType === "stock"
        ? `/stocks/${slug}`
        : pageType === "mutual_fund"
          ? `/mutual-funds/${slug}`
          : pageType === "index"
            ? `/${slug}`
            : `/learn/${slug}`),
    addedAt: cleanString(value.addedAt) || new Date().toISOString(),
  };
}

function normalizeRecentViewItem(value: Partial<UserRecentViewItem>): UserRecentViewItem {
  const pageType = normalizeProductPageType(value.pageType);
  const slug = normalizeSlug(value.slug ?? "");
  return {
    id: cleanString(value.id) || `recent_${randomUUID()}`,
    pageType,
    slug,
    title: cleanString(value.title) || slug,
    href:
      cleanString(value.href) ||
      (pageType === "stock"
        ? `/stocks/${slug}`
        : pageType === "mutual_fund"
          ? `/mutual-funds/${slug}`
          : pageType === "index"
            ? `/${slug}`
            : `/learn/${slug}`),
    viewedAt: cleanString(value.viewedAt) || new Date().toISOString(),
  };
}

function normalizePortfolioHolding(value: Partial<UserPortfolioHolding>): UserPortfolioHolding {
  const now = new Date().toISOString();
  return {
    id: cleanString(value.id) || `holding_${randomUUID()}`,
    stockSlug: normalizeSlug(value.stockSlug ?? ""),
    stockSymbol: cleanString(value.stockSymbol).toUpperCase(),
    stockName: cleanString(value.stockName),
    quantity: Number.isFinite(Number(value.quantity)) ? Number(value.quantity) : 0,
    buyPrice: Number.isFinite(Number(value.buyPrice)) ? Number(value.buyPrice) : 0,
    addedAt: cleanString(value.addedAt) || now,
    updatedAt: cleanString(value.updatedAt) || now,
  };
}

function inferMediaAssetType(value: Partial<MediaAsset>) {
  if (value.assetType === "document") {
    return "document" as const;
  }

  const mimeType = cleanString(value.mimeType).toLowerCase();
  const fileName = cleanString(value.fileName).toLowerCase();
  const url = cleanString(value.url).toLowerCase();
  const candidate = `${fileName} ${url}`;

  if (
    mimeType.startsWith("application/pdf") ||
    mimeType.includes("msword") ||
    mimeType.includes("officedocument") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation") ||
    /\.(pdf|doc|docx|xls|xlsx|csv|ppt|pptx|txt)$/i.test(candidate)
  ) {
    return "document" as const;
  }

  return "image" as const;
}

function normalizeMediaAsset(value: Partial<MediaAsset>): MediaAsset {
  const now = new Date().toISOString();
  const assetType = inferMediaAssetType(value);
  return {
    id: cleanString(value.id) || `asset_${randomUUID()}`,
    title: cleanString(value.title) || cleanString(value.fileName) || "Untitled asset",
    altText: cleanString(value.altText),
    url: cleanString(value.url),
    assetType,
    category: cleanString(value.category) || (assetType === "document" ? "document" : "content"),
    sourceKind: value.sourceKind === "upload" ? "upload" : "external_url",
    fileName: cleanString(value.fileName),
    mimeType:
      cleanString(value.mimeType) ||
      (assetType === "document" ? "application/pdf" : "image/jpeg"),
    sizeBytes: Number.isFinite(Number(value.sizeBytes)) ? Number(value.sizeBytes) : null,
    tags: Array.isArray(value.tags)
      ? value.tags.map((item) => cleanString(item)).filter(Boolean)
      : [],
    uploadedBy: cleanString(value.uploadedBy) || "Operator",
    uploadedAt: cleanString(value.uploadedAt) || now,
    updatedAt: cleanString(value.updatedAt) || cleanString(value.uploadedAt) || now,
    status: value.status === "published" ? "published" : "draft",
  };
}

function normalizePreview(value: Partial<CmsPreviewSession>): CmsPreviewSession {
  const createdAt = cleanString(value.createdAt) || new Date().toISOString();
  const providedToken = cleanString(value.token);
  const payload = (value.payload ?? {
    family: "",
    slug: "",
    title: "",
    status: "draft",
    sections: {},
  }) as SaveAdminRecordInput;

  payload.status = normalizeAdminPublishState(payload.status as string);

  return {
    token: isValidCmsPreviewToken(providedToken) ? providedToken : randomUUID(),
    family: cleanString(value.family),
    slug: normalizeSlug(value.slug ?? ""),
    title: cleanString(value.title),
    routeTarget: cleanString(value.routeTarget) || null,
    createdBy: cleanString(value.createdBy) || "Operator",
    createdAt,
    expiresAt:
      cleanString(value.expiresAt) ||
      new Date(new Date(createdAt).getTime() + PREVIEW_TTL_MS).toISOString(),
    payload,
  };
}

function normalizeVersion(value: Partial<CmsRecordVersion>): CmsRecordVersion {
  const snapshot = {
    ...(value.snapshot ?? {
      family: "",
      slug: "",
      title: "",
      status: "draft",
      sections: {},
    }),
  } as SaveAdminRecordInput;

  snapshot.status = normalizeAdminPublishState(snapshot.status as string);

  return {
    id: cleanString(value.id) || `version_${randomUUID()}`,
    family: cleanString(value.family),
    slug: normalizeSlug(value.slug ?? ""),
    title: cleanString(value.title),
    savedAt: cleanString(value.savedAt) || new Date().toISOString(),
    savedBy: cleanString(value.savedBy) || "Operator",
    status: normalizeAdminPublishState(value.status as string),
    routeTarget: cleanString(value.routeTarget) || null,
    changedFields: Array.isArray(value.changedFields)
      ? value.changedFields.map((item) => cleanString(item)).filter(Boolean)
      : [],
    snapshot,
  };
}

function normalizeRefreshJobRun(value: Partial<RefreshJobRun>): RefreshJobRun {
  return {
    id: cleanString(value.id) || `refresh_run_${randomUUID()}`,
    jobKey: cleanString(value.jobKey),
    status: value.status ?? "running",
    startedAt: cleanString(value.startedAt) || new Date().toISOString(),
    finishedAt: cleanString(value.finishedAt) || null,
    error: cleanString(value.error) || null,
    note: cleanString(value.note) || null,
    requestedBy: cleanString(value.requestedBy) || null,
    retriedFromRunId: cleanString(value.retriedFromRunId) || null,
  };
}

function normalizeStore(parsed: Partial<UserProductStore>): UserProductStore {
  return {
    version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
    users: Array.isArray(parsed.users)
      ? parsed.users.map((record) => ({
          profile: normalizeProfile(record.profile),
          watchlist: Array.isArray(record.watchlist)
            ? record.watchlist.map((item) => normalizeWatchlistItem(item))
            : [],
          portfolio: Array.isArray(record.portfolio)
            ? record.portfolio.map((item) => normalizePortfolioHolding(item))
            : [],
          bookmarks: Array.isArray(record.bookmarks)
            ? record.bookmarks.map((item) => normalizeBookmarkItem(item))
            : [],
          recentlyViewed: Array.isArray(record.recentlyViewed)
            ? record.recentlyViewed.map((item) => normalizeRecentViewItem(item))
            : [],
        }))
      : [],
    mediaAssets: Array.isArray(parsed.mediaAssets)
      ? parsed.mediaAssets.map((item) => normalizeMediaAsset(item))
      : [],
    settings: {
      ...defaultSettings(),
      ...(parsed.settings ?? {}),
      siteName: cleanString(parsed.settings?.siteName) || defaultSettings().siteName,
      defaultMetaTitleSuffix:
        cleanString(parsed.settings?.defaultMetaTitleSuffix) ||
        defaultSettings().defaultMetaTitleSuffix,
      defaultMetaDescription:
        cleanString(parsed.settings?.defaultMetaDescription) ||
        defaultSettings().defaultMetaDescription,
      defaultOgImage: cleanString(parsed.settings?.defaultOgImage),
      defaultCanonicalBase: cleanString(parsed.settings?.defaultCanonicalBase),
      defaultMembershipTier:
        cleanString(parsed.settings?.defaultMembershipTier) ||
        defaultSettings().defaultMembershipTier,
      defaultLockedCtaLabel:
        cleanString(parsed.settings?.defaultLockedCtaLabel) ||
        defaultSettings().defaultLockedCtaLabel,
      supportEmail: cleanString(parsed.settings?.supportEmail),
      supportRoute: cleanString(parsed.settings?.supportRoute) || defaultSettings().supportRoute,
    },
    previews: Array.isArray(parsed.previews)
      ? parsed.previews
          .map((item) => normalizePreview(item))
          .filter((item) => new Date(item.expiresAt).getTime() > Date.now())
      : [],
    versions: Array.isArray(parsed.versions)
      ? parsed.versions.map((item) => normalizeVersion(item))
      : [],
    refreshJobRuns: Array.isArray(parsed.refreshJobRuns)
      ? parsed.refreshJobRuns.map((item) => normalizeRefreshJobRun(item))
      : [],
    updatedAt: cleanString(parsed.updatedAt) || null,
  };
}

async function ensureStoreDir() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
}

async function readStore() {
  try {
    const fileStat = await stat(STORE_PATH);
    if (storeCache && storeCache.mtimeMs === fileStat.mtimeMs) {
      return pruneExpiredPreviewSessionsInStore(storeCache.store);
    }

    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = pruneExpiredPreviewSessionsInStore(
      normalizeStore(JSON.parse(raw) as Partial<UserProductStore>),
    );
    storeCache = { mtimeMs: fileStat.mtimeMs, store: parsed };
    return parsed;
  } catch {
    const fallback = pruneExpiredPreviewSessionsInStore(normalizeStore(defaultStore()));
    storeCache = { mtimeMs: 0, store: fallback };
    return fallback;
  }
}

async function writeStore(store: UserProductStore) {
  pruneExpiredPreviewSessionsInStore(store);
  await ensureStoreDir();
  const nextStore = {
    ...store,
    version: STORE_VERSION,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(STORE_PATH, JSON.stringify(nextStore, null, 2));
  try {
    const fileStat = await stat(STORE_PATH);
    storeCache = { mtimeMs: fileStat.mtimeMs, store: nextStore };
  } catch {
    storeCache = { mtimeMs: Date.now(), store: nextStore };
  }
}

function getUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function deriveUserName(user: Pick<User, "email" | "user_metadata">) {
  const fullName =
    cleanString((user as { user_metadata?: Record<string, unknown> }).user_metadata?.full_name as string | undefined) ||
    cleanString((user as { user_metadata?: Record<string, unknown> }).user_metadata?.name as string | undefined);
  if (fullName) {
    return fullName;
  }

  const email = normalizeAccountEmail(user.email);
  return email?.split("@")[0] || "Riddra user";
}

function buildNormalizedProfile(input: Partial<ProductUserProfile>): ProductUserProfile {
  return normalizeProfile(input);
}

async function mutateStore<T>(mutator: (store: UserProductStore) => Promise<T> | T) {
  const store = pruneExpiredPreviewSessionsInStore(await readStore());
  const result = await mutator(store);
  await writeStore(store);
  return result;
}

function getOrCreateRecord(store: UserProductStore, user: Pick<User, "id" | "email" | "user_metadata">) {
  const userKey = getUserKey(user);
  const email = normalizeAccountEmail(user.email) ?? buildAccountFallbackEmail(user);
  let record = store.users.find((item) => item.profile.userKey === userKey);

  if (!record) {
    record = {
      profile: normalizeProfile({
        userKey,
        authUserId: user.id,
        email,
        name: deriveUserName(user),
        membershipTier: store.settings.defaultMembershipTier,
        role: defaultRoleForEmail(email),
        capabilities: getDefaultCapabilitiesForRole(defaultRoleForEmail(email)),
      }),
      watchlist: [],
      portfolio: [],
      bookmarks: [],
      recentlyViewed: [],
    };
    store.users.push(record);
  }

  const uniqueUsername =
    ensureUniqueUsername(record.profile.username, store.users.map((item) => item.profile), record.profile.userKey) ??
    record.profile.username;
  record.profile = normalizeProfile({
    ...record.profile,
    username: uniqueUsername,
  });

  return record;
}

function findRecord(
  store: UserProductStore,
  user: Pick<User, "id" | "email" | "user_metadata">,
) {
  const userKey = getUserKey(user);
  return store.users.find((item) => item.profile.userKey === userKey) ?? null;
}

function findRecordByProfile(store: UserProductStore, profile: ProductUserProfile) {
  return (
    store.users.find((item) => item.profile.userKey === profile.userKey) ??
    store.users.find((item) => item.profile.email === profile.email) ??
    null
  );
}

function mergeProfileWithFallbackRecord(
  profile: ProductUserProfile,
  fallbackRecord: ProductUserRecord | null,
) {
  if (!fallbackRecord) {
    return normalizeProfile(profile);
  }

  return normalizeProfile({
    ...profile,
    username: fallbackRecord.profile.username || profile.username,
    websiteUrl: fallbackRecord.profile.websiteUrl || profile.websiteUrl,
    xHandle: fallbackRecord.profile.xHandle || profile.xHandle,
    linkedinUrl: fallbackRecord.profile.linkedinUrl || profile.linkedinUrl,
    instagramHandle: fallbackRecord.profile.instagramHandle || profile.instagramHandle,
    youtubeUrl: fallbackRecord.profile.youtubeUrl || profile.youtubeUrl,
    profileVisible:
      typeof fallbackRecord.profile.profileVisible === "boolean"
        ? fallbackRecord.profile.profileVisible
        : profile.profileVisible,
  });
}

function ensureUniqueUsername(username: string, profiles: ProductUserProfile[], excludeUserKey?: string | null) {
  const normalized = normalizeUsernameCandidate(username);
  if (!normalized || normalized.length < 3) {
    return null;
  }

  const used = new Set(
    profiles
      .filter((profile) => profile.userKey !== excludeUserKey)
      .map((profile) => profile.username.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!used.has(normalized)) {
    return normalized;
  }

  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${normalized}_${index}`.slice(0, 24);
    if (!used.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function validateUsernameAvailability(
  username: string,
  options?: { excludeUserKey?: string | null; allowAutoSuffix?: boolean },
) {
  const normalized = normalizeUsernameCandidate(username);

  if (!normalized || normalized.length < 3) {
    throw new Error("Username must be at least 3 characters and use only letters, numbers, or underscores.");
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error("Username can only use lowercase letters, numbers, and underscores.");
  }

  if (containsBlockedUsernameTerm(normalized)) {
    throw new Error("Choose a different username.");
  }

  const profiles = await listUserProductProfiles();
  const exactTaken = profiles.some(
    (profile) =>
      profile.userKey !== options?.excludeUserKey &&
      profile.username.trim().toLowerCase() === normalized,
  );

  if (!exactTaken) {
    return normalized;
  }

  if (!options?.allowAutoSuffix) {
    throw new Error("That username is already taken.");
  }

  const next = ensureUniqueUsername(normalized, profiles, options.excludeUserKey);
  if (!next) {
    throw new Error("Could not generate a unique username right now.");
  }

  return next;
}

function resolveStockIdentity(value: string) {
  const normalized = normalizeSlug(value);
  const compact = cleanString(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
  const match =
    sampleStocks.find((item) => item.slug === normalized) ??
    sampleStocks.find((item) => item.symbol.toUpperCase() === compact) ??
    sampleStocks.find((item) => item.slug.replace(/-/g, "").toUpperCase() === compact) ??
    null;

  if (!match) {
    return null;
  }

  return {
    slug: match.slug,
    symbol: match.symbol,
    name: match.name,
  };
}

export function resolveUserPortfolioImportStock(value: string) {
  return resolveStockIdentity(value);
}

async function resolveFundIdentity(value: string) {
  const normalized = normalizeSlug(value);
  const lowered = cleanString(value).toLowerCase();
  const compact = lowered.replace(/[^a-z0-9]+/g, "");
  const funds = await getFunds();
  const match =
    funds.find((item) => item.slug === normalized) ??
    funds.find((item) => item.name.trim().toLowerCase() === lowered) ??
    funds.find((item) => item.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") === compact) ??
    null;

  if (!match) {
    return null;
  }

  return {
    slug: match.slug,
    title: match.name,
    symbol: "",
    href: `/mutual-funds/${match.slug}`,
  };
}

async function resolveWatchlistTarget(input: { query: string; pageType?: UserWatchlistItem["pageType"] | null }) {
  const requestedType = input.pageType ?? null;

  if (!requestedType || requestedType === "stock") {
    const stock = resolveStockIdentity(input.query);
    if (stock) {
      return {
        pageType: "stock" as const,
        slug: stock.slug,
        symbol: stock.symbol,
        title: stock.name,
        href: `/stocks/${stock.slug}`,
      };
    }
  }

  if (!requestedType || requestedType === "mutual_fund") {
    const fund = await resolveFundIdentity(input.query);
    if (fund) {
      return {
        pageType: "mutual_fund" as const,
        slug: fund.slug,
        symbol: fund.symbol,
        title: fund.title,
        href: fund.href,
      };
    }
  }

  return null;
}

export async function getUserProductStore() {
  return readStore();
}

export async function ensureUserProductProfile(user: Pick<User, "id" | "email" | "user_metadata">) {
  if (hasDurableCmsStateStore()) {
    const userKey = getUserKey(user);
    const email = normalizeAccountEmail(user.email) ?? buildAccountFallbackEmail(user);
    const settings = await getSystemSettings();
    const existing =
      (await getDurableUserProfileByUserKey(userKey)) ??
      (await getDurableUserProfileByEmail(email));
    const now = Date.now();
    const lastActive = new Date(existing?.lastActiveAt ?? "").getTime();
    const nextProfile = buildNormalizedProfile({
      id: existing?.id,
      userKey: existing?.userKey ?? userKey,
      authUserId: user.id,
      email,
      name: deriveUserName(user) || existing?.name,
      membershipTier: existing?.membershipTier ?? settings.defaultMembershipTier,
      role: existing?.role ?? defaultRoleForEmail(email),
      capabilities: existing?.capabilities ?? getDefaultCapabilitiesForRole(existing?.role ?? defaultRoleForEmail(email)),
      createdAt: existing?.createdAt,
      updatedAt: existing?.updatedAt,
      lastActiveAt:
        !Number.isFinite(lastActive) || now - lastActive > 1000 * 60 * 15
          ? new Date().toISOString()
          : existing?.lastActiveAt,
    });
    const saved = await saveDurableUserProfile(nextProfile);
    if (saved) {
      const fallbackStore = await readStore();
      return mergeProfileWithFallbackRecord(saved, findRecordByProfile(fallbackStore, saved));
    }
  }

  return mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    const now = Date.now();
    const lastActive = new Date(record.profile.lastActiveAt).getTime();

    record.profile.authUserId = user.id;
    record.profile.email = normalizeAccountEmail(user.email) ?? buildAccountFallbackEmail(user);
    record.profile.name = deriveUserName(user) || record.profile.name;
    if (!Number.isFinite(lastActive) || now - lastActive > 1000 * 60 * 15) {
      record.profile.lastActiveAt = new Date().toISOString();
    }

    return normalizeProfile(record.profile);
  });
}

export async function getUserProductProfile(user: Pick<User, "id" | "email" | "user_metadata">) {
  if (hasDurableCmsStateStore()) {
    return ensureUserProductProfile(user);
  }

  const store = await readStore();
  return normalizeProfile(getOrCreateRecord(store, user).profile);
}

export async function listUserProductProfiles() {
  if (hasDurableCmsStateStore()) {
    const profiles = await listDurableUserProfiles();
    if (profiles) {
      const fallbackStore = await readStore();
      const mergedProfiles = profiles.map((profile) =>
        mergeProfileWithFallbackRecord(profile, findRecordByProfile(fallbackStore, profile)),
      );
      const fallbackOnlyProfiles = fallbackStore.users
        .map((item) => item.profile)
        .filter(
          (profile) =>
            !mergedProfiles.some(
              (item) => item.userKey === profile.userKey || item.email === profile.email,
            ),
        );

      return [...mergedProfiles, ...fallbackOnlyProfiles].sort((left, right) =>
        right.lastActiveAt.localeCompare(left.lastActiveAt),
      );
    }
  }

  const store = await readStore();
  return store.users
    .map((item) => item.profile)
    .sort((left, right) => right.lastActiveAt.localeCompare(left.lastActiveAt));
}

export async function saveUserProductProfile(input: SaveUserProfileInput): Promise<SaveUserProfileResult> {
  if (hasDurableCmsStateStore()) {
    const email = normalizeAccountEmail(input.email);
    if (!email) {
      throw new Error("A valid email is required.");
    }

    const existing = await getDurableUserProfileByEmail(email);
    const settings = await getSystemSettings();
    const savedAt = new Date().toISOString();
    const username = await validateUsernameAvailability(
      cleanString(input.username) ||
        existing?.email?.split("@")[0] ||
        cleanString(input.name) ||
        email.split("@")[0],
      {
        excludeUserKey: existing?.userKey ?? normalizeSlug(email),
        allowAutoSuffix: !cleanString(input.username),
      },
    );
    const nextProfile = buildNormalizedProfile({
      id: existing?.id,
      userKey: existing?.userKey ?? normalizeSlug(email),
      authUserId: existing?.authUserId ?? normalizeSlug(email),
      email,
      name: cleanString(input.name) || existing?.name || email.split("@")[0],
      username,
      websiteUrl:
        cleanUrlLikeValue(input.websiteUrl) ?? existing?.websiteUrl ?? null,
      xHandle:
        normalizeSocialHandle(input.xHandle) ?? existing?.xHandle ?? null,
      linkedinUrl:
        cleanUrlLikeValue(input.linkedinUrl) ?? existing?.linkedinUrl ?? null,
      instagramHandle:
        normalizeSocialHandle(input.instagramHandle) ?? existing?.instagramHandle ?? null,
      youtubeUrl:
        cleanUrlLikeValue(input.youtubeUrl) ?? existing?.youtubeUrl ?? null,
      profileVisible:
        typeof input.profileVisible === "boolean" ? input.profileVisible : true,
      membershipTier:
        cleanString(input.membershipTier) || existing?.membershipTier || settings.defaultMembershipTier,
      role: input.role ?? existing?.role ?? defaultRoleForEmail(email),
      capabilities:
        input.capabilities ??
        existing?.capabilities ??
        getDefaultCapabilitiesForRole(input.role ?? existing?.role ?? defaultRoleForEmail(email)),
      createdAt: existing?.createdAt,
      updatedAt: savedAt,
      lastActiveAt: existing?.lastActiveAt ?? savedAt,
    });
    const saved = await saveDurableUserProfile(nextProfile);
    if (saved) {
      await mutateStore(async (store) => {
        const existingFallbackRecord =
          store.users.find((item) => item.profile.userKey === saved.userKey) ??
          store.users.find((item) => item.profile.email === saved.email) ??
          null;

        if (existingFallbackRecord) {
          existingFallbackRecord.profile = normalizeProfile({
            ...existingFallbackRecord.profile,
            ...saved,
            username,
            websiteUrl: saved.websiteUrl,
            xHandle: saved.xHandle,
            linkedinUrl: saved.linkedinUrl,
            instagramHandle: saved.instagramHandle,
            youtubeUrl: saved.youtubeUrl,
            profileVisible:
              typeof input.profileVisible === "boolean"
                ? input.profileVisible
                : existingFallbackRecord.profile.profileVisible,
          });
        } else {
          store.users.push({
            profile: normalizeProfile({
              ...saved,
              username,
              websiteUrl: saved.websiteUrl,
              xHandle: saved.xHandle,
              linkedinUrl: saved.linkedinUrl,
              instagramHandle: saved.instagramHandle,
              youtubeUrl: saved.youtubeUrl,
              profileVisible:
                typeof input.profileVisible === "boolean" ? input.profileVisible : true,
            }),
            watchlist: [],
            portfolio: [],
            bookmarks: [],
            recentlyViewed: [],
          });
        }
      });
      return {
        profile: normalizeProfile({
          ...saved,
          username,
          profileVisible: typeof input.profileVisible === "boolean" ? input.profileVisible : true,
        }),
        operation: existing ? "updated" : "created",
        storageMode: "durable",
        savedAt,
      };
    }
  }

  return mutateStore(async (store) => {
    const email = normalizeAccountEmail(input.email);
    if (!email) {
      throw new Error("A valid email is required.");
    }

    const existingRecord = store.users.find((item) => item.profile.email === email) ?? null;
    let record = existingRecord;
    const savedAt = new Date().toISOString();
    const username = await validateUsernameAvailability(
      cleanString(input.username) ||
        existingRecord?.profile.username ||
        cleanString(input.name) ||
        email.split("@")[0],
      {
        excludeUserKey: existingRecord?.profile.userKey ?? null,
        allowAutoSuffix: !cleanString(input.username),
      },
    );
    if (!record) {
      record = {
        profile: normalizeProfile({
          email,
          authUserId: normalizeSlug(email),
          name: cleanString(input.name) || email.split("@")[0],
          username,
          websiteUrl: cleanUrlLikeValue(input.websiteUrl),
          xHandle: normalizeSocialHandle(input.xHandle),
          linkedinUrl: cleanUrlLikeValue(input.linkedinUrl),
          instagramHandle: normalizeSocialHandle(input.instagramHandle),
          youtubeUrl: cleanUrlLikeValue(input.youtubeUrl),
          profileVisible: typeof input.profileVisible === "boolean" ? input.profileVisible : true,
          membershipTier: cleanString(input.membershipTier) || store.settings.defaultMembershipTier,
          role: input.role ?? defaultRoleForEmail(email),
          capabilities:
            input.capabilities ??
            getDefaultCapabilitiesForRole(input.role ?? defaultRoleForEmail(email)),
          updatedAt: savedAt,
          lastActiveAt: savedAt,
        }),
        watchlist: [],
        portfolio: [],
        bookmarks: [],
        recentlyViewed: [],
      };
      store.users.push(record);
    } else {
      record.profile.name = cleanString(input.name) || record.profile.name;
      record.profile.username = username;
      if (input.websiteUrl !== undefined) {
        record.profile.websiteUrl = cleanUrlLikeValue(input.websiteUrl);
      }
      if (input.xHandle !== undefined) {
        record.profile.xHandle = normalizeSocialHandle(input.xHandle);
      }
      if (input.linkedinUrl !== undefined) {
        record.profile.linkedinUrl = cleanUrlLikeValue(input.linkedinUrl);
      }
      if (input.instagramHandle !== undefined) {
        record.profile.instagramHandle = normalizeSocialHandle(input.instagramHandle);
      }
      if (input.youtubeUrl !== undefined) {
        record.profile.youtubeUrl = cleanUrlLikeValue(input.youtubeUrl);
      }
      if (typeof input.profileVisible === "boolean") {
        record.profile.profileVisible = input.profileVisible;
      }
      record.profile.membershipTier = cleanString(input.membershipTier) || record.profile.membershipTier;
      record.profile.role = input.role ?? record.profile.role;
      record.profile.capabilities = getEffectiveCapabilities(
        input.role ?? record.profile.role,
        input.capabilities ?? record.profile.capabilities,
      );
      record.profile.updatedAt = savedAt;
    }

    return {
      profile: normalizeProfile(record.profile),
      operation: existingRecord ? "updated" : "created",
      storageMode: "fallback",
      savedAt,
    };
  });
}

export async function removeUserProductProfile(input: { email: string }): Promise<RemoveUserProfileResult> {
  const email = normalizeAccountEmail(input.email);
  if (!email) {
    throw new Error("A valid email is required.");
  }

  const savedAt = new Date().toISOString();

  if (hasDurableCmsStateStore()) {
    const existing = await getDurableUserProfileByEmail(email);
    if (existing) {
      const removed = await deleteDurableUserProfile(existing);
      if (!removed) {
        throw new Error("Could not remove this user from the durable store right now.");
      }

      await mutateStore(async (store) => {
        store.users = store.users.filter(
          (item) =>
            item.profile.userKey !== existing.userKey &&
            item.profile.email.toLowerCase() !== email,
        );
      });

      return {
        profile: normalizeProfile(existing),
        storageMode: "durable",
        savedAt,
      };
    }
  }

  let removedProfile: ProductUserProfile | null = null;
  await mutateStore(async (store) => {
    const existingRecord = store.users.find((item) => item.profile.email.toLowerCase() === email) ?? null;
    if (!existingRecord) {
      throw new Error("Could not find that user to remove.");
    }

    removedProfile = normalizeProfile(existingRecord.profile);
    store.users = store.users.filter((item) => item.profile.email.toLowerCase() !== email);
  });

  if (!removedProfile) {
    throw new Error("Could not find that user to remove.");
  }

  return {
    profile: removedProfile,
    storageMode: "fallback",
    savedAt,
  };
}

export async function getUserRole(user: Pick<User, "id" | "email" | "user_metadata">) {
  const profile = await ensureUserProductProfile(user);
  return profile.role;
}

export async function getUserCapabilities(user: Pick<User, "id" | "email" | "user_metadata">) {
  const profile = await ensureUserProductProfile(user);
  return profile.capabilities;
}

function resolveMembershipTierForProfile(
  profile: ProductUserProfile,
  tiers: AdminMembershipTier[],
) {
  return (
    tiers.find((tier) => tier.slug === (profile.membershipTier ?? "free")) ??
    tiers.find((tier) => tier.slug === "free") ??
    null
  );
}

export async function getMembershipFeatureAccessForProfile(profile: ProductUserProfile) {
  const tiers = await getAdminMembershipTiers();
  const tier = resolveMembershipTierForProfile(profile, tiers);
  return normalizeMembershipFeatureAccess(tier?.featureAccess ?? null, profile.membershipTier);
}

export async function getMembershipFeatureStatus(
  profile: ProductUserProfile,
  feature: MembershipFeatureKey,
) {
  const access = await getMembershipFeatureAccessForProfile(profile);
  return isMembershipFeatureEnabled(access, feature, profile.membershipTier);
}

export async function getMembershipFeatureSummaryForProfile(profile: ProductUserProfile) {
  const access = await getMembershipFeatureAccessForProfile(profile);
  return buildMembershipFeatureSummary(access, profile.membershipTier);
}

function mergeWatchlistCollections(
  durableItems: UserWatchlistItem[],
  fallbackItems: UserWatchlistItem[],
) {
  const merged = new Map<string, UserWatchlistItem>();

  for (const item of durableItems) {
    const normalized = normalizeWatchlistItem({
      ...item,
      pageType: "stock",
      slug: item.slug || item.stockSlug,
      symbol: item.symbol || item.stockSymbol,
      title: item.title || item.stockName,
      href: item.href || `/stocks/${item.slug || item.stockSlug}`,
    });
    merged.set(`${normalized.pageType}:${normalized.slug}`, normalized);
  }

  for (const item of fallbackItems) {
    const normalized = normalizeWatchlistItem(item);
    merged.set(`${normalized.pageType}:${normalized.slug}`, normalized);
  }

  return Array.from(merged.values()).sort((left, right) => right.addedAt.localeCompare(left.addedAt));
}

async function syncWatchlistToFallbackStore(
  user: Pick<User, "id" | "email" | "user_metadata">,
  items: UserWatchlistItem[],
  lastActiveAt?: string,
) {
  await mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    record.watchlist = items.map((item) => normalizeWatchlistItem(item));
    record.profile.lastActiveAt = cleanString(lastActiveAt) || new Date().toISOString();
    return record.watchlist;
  });
}

export async function getUserWatchlist(user: Pick<User, "id" | "email" | "user_metadata">) {
  const fallbackStore = await readStore();
  const fallbackItems = findRecord(fallbackStore, user)?.watchlist ?? [];

  if (hasDurableCmsStateStore()) {
    const profile = await ensureUserProductProfile(user);
    const durableItems = await listDurableWatchlistItems(profile.id);
    if (durableItems) {
      return mergeWatchlistCollections(
        durableItems.map((item) => normalizeWatchlistItem(item)),
        fallbackItems,
      );
    }
  }

  return fallbackItems.map((item) => normalizeWatchlistItem(item));
}

export async function addWatchlistItem(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: { query: string; pageType?: UserWatchlistItem["pageType"] | null },
) {
  const target = await resolveWatchlistTarget({
    query: input.query,
    pageType: input.pageType ?? null,
  });

  if (!target) {
    throw new Error("Could not match that input to a stock or mutual fund.");
  }

  if (hasDurableCmsStateStore() && target.pageType === "stock") {
    const profile = await ensureUserProductProfile(user);
    const currentItems = (await listDurableWatchlistItems(profile.id)) ?? [];
    const exists = currentItems.find((item) => item.stockSlug === target.slug);
    if (!exists) {
      await saveDurableWatchlistItem(
        profile.id,
        normalizeWatchlistItem({
          pageType: "stock",
          slug: target.slug,
          symbol: target.symbol,
          title: target.title,
          href: target.href,
          stockSlug: target.slug,
          stockSymbol: target.symbol,
          stockName: target.title,
        }),
      );
    }
    const lastActiveAt = new Date().toISOString();
    await saveDurableUserProfile({
      ...profile,
      lastActiveAt,
    });
    const durableItems = await listDurableWatchlistItems(profile.id);
    if (durableItems) {
      const fallbackStore = await readStore();
      const fallbackItems = findRecord(fallbackStore, user)?.watchlist ?? [];
      const merged = mergeWatchlistCollections(
        durableItems.map((item) => normalizeWatchlistItem(item)),
        fallbackItems,
      );
      await syncWatchlistToFallbackStore(user, merged, lastActiveAt);
      return merged;
    }
  }

  return mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    const nextItem = normalizeWatchlistItem({
      pageType: target.pageType,
      slug: target.slug,
      symbol: target.symbol,
      title: target.title,
      href: target.href,
    });
    const exists = record.watchlist.find(
      (item) => item.pageType === nextItem.pageType && item.slug === nextItem.slug,
    );
    if (!exists) {
      record.watchlist.unshift(nextItem);
    }

    record.profile.lastActiveAt = new Date().toISOString();
    return record.watchlist.map((item) => normalizeWatchlistItem(item));
  });
}

export async function addWatchlistStock(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: { stockSlug: string },
) {
  return addWatchlistItem(user, { query: input.stockSlug, pageType: "stock" });
}

export async function removeWatchlistItem(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: { slug: string; pageType?: UserWatchlistItem["pageType"] | null },
) {
  const normalizedSlug = normalizeSlug(input.slug);
  const pageType = input.pageType ?? null;

  if (hasDurableCmsStateStore() && (!pageType || pageType === "stock")) {
    const profile = await ensureUserProductProfile(user);
    await deleteDurableWatchlistItem(profile.id, normalizedSlug);
    const lastActiveAt = new Date().toISOString();
    await saveDurableUserProfile({
      ...profile,
      lastActiveAt,
    });
    const durableItems = (await listDurableWatchlistItems(profile.id)) ?? [];
    const fallbackStore = await readStore();
    const fallbackItems =
      findRecord(fallbackStore, user)?.watchlist.filter(
        (item) => !(item.slug === normalizedSlug && (!pageType || item.pageType === pageType)),
      ) ?? [];
    const merged = mergeWatchlistCollections(
      durableItems.map((item) => normalizeWatchlistItem(item)),
      fallbackItems,
    );
    await syncWatchlistToFallbackStore(user, merged, lastActiveAt);
    return merged;
  }

  return mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    record.watchlist = record.watchlist.filter(
      (item) => !(item.slug === normalizedSlug && (!pageType || item.pageType === pageType)),
    );
    record.profile.lastActiveAt = new Date().toISOString();
    return record.watchlist.map((item) => normalizeWatchlistItem(item));
  });
}

export async function removeWatchlistStock(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: { stockSlug: string },
) {
  return removeWatchlistItem(user, { slug: input.stockSlug, pageType: "stock" });
}

export async function getUserBookmarks(user: Pick<User, "id" | "email" | "user_metadata">) {
  const store = await readStore();
  return getOrCreateRecord(store, user).bookmarks
    .map((item) => normalizeBookmarkItem(item))
    .sort((left, right) => right.addedAt.localeCompare(left.addedAt));
}

export async function saveUserBookmark(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: Omit<UserBookmarkItem, "id" | "addedAt">,
) {
  return mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    const normalized = normalizeBookmarkItem(input);
    const existing = record.bookmarks.find(
      (item) => item.pageType === normalized.pageType && item.slug === normalized.slug,
    );
    if (!existing) {
      record.bookmarks.unshift(normalized);
    }
    record.profile.lastActiveAt = new Date().toISOString();
    return record.bookmarks.map((item) => normalizeBookmarkItem(item));
  });
}

export async function removeUserBookmark(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: { slug: string; pageType: ProductPageType },
) {
  return mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    const normalizedSlug = normalizeSlug(input.slug);
    record.bookmarks = record.bookmarks.filter(
      (item) => !(item.pageType === input.pageType && item.slug === normalizedSlug),
    );
    record.profile.lastActiveAt = new Date().toISOString();
    return record.bookmarks.map((item) => normalizeBookmarkItem(item));
  });
}

export async function getUserRecentlyViewed(user: Pick<User, "id" | "email" | "user_metadata">) {
  const store = await readStore();
  return getOrCreateRecord(store, user).recentlyViewed
    .map((item) => normalizeRecentViewItem(item))
    .sort((left, right) => right.viewedAt.localeCompare(left.viewedAt))
    .slice(0, 8);
}

export async function recordUserRecentlyViewed(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: Omit<UserRecentViewItem, "id" | "viewedAt">,
) {
  return mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    const normalized = normalizeRecentViewItem(input);
    record.recentlyViewed = [
      normalized,
      ...record.recentlyViewed.filter(
        (item) => !(item.pageType === normalized.pageType && item.slug === normalized.slug),
      ),
    ]
      .map((item) => normalizeRecentViewItem(item))
      .slice(0, 12);
    record.profile.lastActiveAt = new Date().toISOString();
    return record.recentlyViewed;
  });
}

export async function getPublicUserProfileByUsername(username: string) {
  const normalized = normalizeUsernameCandidate(username);
  if (!normalized) {
    return null;
  }

  const profile =
    (await listUserProductProfiles()).find((item) => item.username === normalized && item.profileVisible) ??
    null;

  if (!profile) {
    return null;
  }

  const pseudoUser = {
    id: profile.authUserId,
    email: profile.email,
    user_metadata: { name: profile.name },
  };

  const [watchlist, portfolio, bookmarks, recentlyViewed, tiers] = await Promise.all([
    getUserWatchlist(pseudoUser).catch(() => []),
    getUserPortfolioHoldings(pseudoUser).catch(() => []),
    getUserBookmarks(pseudoUser).catch(() => []),
    getUserRecentlyViewed(pseudoUser).catch(() => []),
    getAdminMembershipTiers().catch(() => []),
  ]);

  const tier = resolveMembershipTierForProfile(profile, tiers);

  return {
    profile,
    membershipTier: tier,
    watchlist,
    portfolio,
    bookmarks,
    recentlyViewed,
  };
}

function getPortfolioHoldingTimestamp(holding: UserPortfolioHolding) {
  const parsed = Date.parse(holding.updatedAt || holding.addedAt || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPortfolioCollectionTimestamp(holdings: UserPortfolioHolding[]) {
  return holdings.reduce(
    (latest, holding) => Math.max(latest, getPortfolioHoldingTimestamp(holding)),
    0,
  );
}

function havePortfolioCollectionsDiverged(
  left: UserPortfolioHolding[],
  right: UserPortfolioHolding[],
) {
  if (left.length !== right.length) {
    return true;
  }

  const rightBySlug = new Map(right.map((holding) => [holding.stockSlug, holding]));
  return left.some((holding) => {
    const candidate = rightBySlug.get(holding.stockSlug);
    if (!candidate) {
      return true;
    }

    return (
      candidate.quantity !== holding.quantity ||
      candidate.buyPrice !== holding.buyPrice ||
      candidate.stockSymbol !== holding.stockSymbol ||
      candidate.stockName !== holding.stockName
    );
  });
}

async function syncPortfolioHoldingsToFallbackStore(
  user: Pick<User, "id" | "email" | "user_metadata">,
  holdings: UserPortfolioHolding[],
  lastActiveAt?: string,
) {
  await mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    record.portfolio = holdings.map((holding) => normalizePortfolioHolding(holding));
    record.profile.lastActiveAt = cleanString(lastActiveAt) || new Date().toISOString();
    return record.portfolio;
  });
}

async function getResolvedUserPortfolioCollection(
  user: Pick<User, "id" | "email" | "user_metadata">,
) {
  const fallbackStore = await readStore();
  const fallbackPortfolio =
    findRecord(fallbackStore, user)?.portfolio.map((holding) => normalizePortfolioHolding(holding)) ??
    [];
  if (hasDurableCmsStateStore()) {
    const profile = await ensureUserProductProfile(user);
    const durablePortfolio = await listDurablePortfolioHoldings(profile.id);
    if (durablePortfolio) {
      if (!fallbackPortfolio.length) {
        return {
          holdings: durablePortfolio,
          storageMode: "durable" as const,
        };
      }

      const durableTimestamp = getPortfolioCollectionTimestamp(durablePortfolio);
      const fallbackTimestamp = getPortfolioCollectionTimestamp(fallbackPortfolio);
      const preferFallback =
        durablePortfolio.length === 0 ||
        fallbackTimestamp > durableTimestamp ||
        (fallbackTimestamp === durableTimestamp &&
          havePortfolioCollectionsDiverged(fallbackPortfolio, durablePortfolio));

      return {
        holdings: preferFallback ? fallbackPortfolio : durablePortfolio,
        storageMode: preferFallback ? ("fallback" as const) : ("durable" as const),
      };
    }
  }

  return {
    holdings: fallbackPortfolio,
    storageMode: "fallback" as const,
  };
}

async function buildUserPortfolioHoldingViews(portfolio: UserPortfolioHolding[]) {
  const holdings = await Promise.all(
    portfolio.map(async (holding): Promise<UserPortfolioHoldingView> => {
      let currentPrice: number | null = null;
      try {
        const quote = await getDurableStockQuoteSnapshot(holding.stockSlug);
        currentPrice = quote?.price ?? null;
      } catch {
        currentPrice = null;
      }

      const investedValue = Number((holding.quantity * holding.buyPrice).toFixed(2));
      const currentValue =
        currentPrice !== null ? Number((holding.quantity * currentPrice).toFixed(2)) : null;
      const pnlValue =
        currentValue !== null ? Number((currentValue - investedValue).toFixed(2)) : null;

      return {
        ...holding,
        currentPrice,
        currentValue,
        investedValue,
        pnlValue,
      };
    }),
  );

  return holdings;
}

export async function getUserPortfolioState(
  user: Pick<User, "id" | "email" | "user_metadata">,
): Promise<UserPortfolioState> {
  const resolved = await getResolvedUserPortfolioCollection(user);
  return {
    holdings: await buildUserPortfolioHoldingViews(resolved.holdings),
    storageMode: resolved.storageMode,
  };
}

export async function getUserPortfolioHoldings(
  user: Pick<User, "id" | "email" | "user_metadata">,
) {
  return (await getUserPortfolioState(user)).holdings;
}

export async function saveUserPortfolioHolding(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: SaveUserPortfolioHoldingInput,
): Promise<SaveUserPortfolioHoldingResult> {
  if (hasDurableCmsStateStore()) {
    const profile = await ensureUserProductProfile(user);
    const stock = resolveStockIdentity(input.stockSlug);
    if (!stock) {
      throw new Error("Could not resolve that stock slug or symbol.");
    }

    const quantity = Number(input.quantity);
    const buyPrice = Number(input.buyPrice);

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(buyPrice) || buyPrice <= 0) {
      throw new Error("Quantity and buy price must be valid positive numbers.");
    }

    const currentHoldings = (await listDurablePortfolioHoldings(profile.id)) ?? [];
    const existing = currentHoldings.find((item) => item.stockSlug === stock.slug);
    const saved = await saveDurablePortfolioHolding(
      profile.id,
      normalizePortfolioHolding({
        id: existing?.id,
        stockSlug: stock.slug,
        stockSymbol: stock.symbol,
        stockName: stock.name,
        quantity,
        buyPrice,
        addedAt: existing?.addedAt,
        updatedAt: new Date().toISOString(),
      }),
    );

    if (saved) {
      const lastActiveAt = new Date().toISOString();
      await saveDurableUserProfile({
        ...profile,
        lastActiveAt,
      });
      const holdings = await listDurablePortfolioHoldings(profile.id);
      if (holdings) {
        await syncPortfolioHoldingsToFallbackStore(user, holdings, lastActiveAt);
        return {
          holdings,
          storageMode: "durable",
          savedHolding: saved,
        };
      }
    }
  }

  const fallbackResult = await mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    const stock = resolveStockIdentity(input.stockSlug);
    if (!stock) {
      throw new Error("Could not resolve that stock slug or symbol.");
    }

    const quantity = Number(input.quantity);
    const buyPrice = Number(input.buyPrice);

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(buyPrice) || buyPrice <= 0) {
      throw new Error("Quantity and buy price must be valid positive numbers.");
    }

    const existing = record.portfolio.find((item) => item.stockSlug === stock.slug);
    if (existing) {
      existing.quantity = quantity;
      existing.buyPrice = buyPrice;
      existing.updatedAt = new Date().toISOString();
    } else {
      record.portfolio.unshift(
        normalizePortfolioHolding({
          stockSlug: stock.slug,
          stockSymbol: stock.symbol,
          stockName: stock.name,
          quantity,
          buyPrice,
        }),
      );
    }

    record.profile.lastActiveAt = new Date().toISOString();
    const savedHolding = record.portfolio.find((item) => item.stockSlug === stock.slug);
    if (!savedHolding) {
      throw new Error("Could not reload the saved holding from the fallback store.");
    }

    return {
      holdings: record.portfolio.map((holding) => normalizePortfolioHolding(holding)),
      savedHolding: normalizePortfolioHolding(savedHolding),
    };
  });

  return {
    holdings: fallbackResult.holdings,
    storageMode: "fallback",
    savedHolding: fallbackResult.savedHolding,
  };
}

export async function removeUserPortfolioHolding(
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: { stockSlug: string },
): Promise<RemoveUserPortfolioHoldingResult> {
  const normalizedSlug = normalizeSlug(input.stockSlug);
  if (hasDurableCmsStateStore()) {
    const profile = await ensureUserProductProfile(user);
    const deleted = await deleteDurablePortfolioHolding(profile.id, normalizedSlug);
    if (deleted) {
      const lastActiveAt = new Date().toISOString();
      await saveDurableUserProfile({
        ...profile,
        lastActiveAt,
      });
      const holdings = await listDurablePortfolioHoldings(profile.id);
      if (holdings) {
        await syncPortfolioHoldingsToFallbackStore(user, holdings, lastActiveAt);
        return {
          holdings,
          storageMode: "durable",
          removedSlug: normalizedSlug,
        };
      }
    }
  }

  const holdings = await mutateStore(async (store) => {
    const record = getOrCreateRecord(store, user);
    record.portfolio = record.portfolio.filter((item) => item.stockSlug !== normalizedSlug);
    record.profile.lastActiveAt = new Date().toISOString();
    return record.portfolio.map((holding) => normalizePortfolioHolding(holding));
  });

  return {
    holdings,
    storageMode: "fallback",
    removedSlug: normalizedSlug,
  };
}

export async function listMediaAssets() {
  if (hasDurableCmsStateStore()) {
    const assets = await listDurableMediaAssets();
    if (assets) {
      return assets;
    }
  }

  const store = await readStore();
  return [...store.mediaAssets].sort((left, right) =>
    (right.updatedAt || right.uploadedAt).localeCompare(left.updatedAt || left.uploadedAt),
  );
}

export async function saveMediaAsset(input: Partial<MediaAsset>): Promise<SaveMediaAssetResult> {
  const savedAt = new Date().toISOString();
  const normalized = normalizeMediaAsset({
    ...input,
    updatedAt: cleanString(input.updatedAt) || savedAt,
  });
  if (hasDurableCmsStateStore()) {
    const existing = normalized.id ? (await listMediaAssets()).find((item) => item.id === normalized.id) ?? null : null;
    const saved = await saveDurableMediaAsset(normalized);
    if (saved) {
      return {
        asset: saved,
        storageMode: "durable",
        savedAt,
        operation: existing ? "updated" : "created",
      };
    }
  }

  return mutateStore(async (store) => {
    const asset = normalized;
    const existingIndex = store.mediaAssets.findIndex((item) => item.id === asset.id);
    if (existingIndex >= 0) {
      store.mediaAssets[existingIndex] = asset;
    } else {
      store.mediaAssets.unshift(asset);
    }

    return {
      asset,
      storageMode: "fallback" as const,
      savedAt,
      operation: existingIndex >= 0 ? "updated" : "created",
    };
  });
}

export async function saveUploadedMediaAsset(input: {
  title: string;
  altText?: string | null;
  category?: string | null;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  uploadedBy: string;
}) {
  const savedBinary = await saveMediaBinary({
    originalFileName: input.fileName,
    bytes: input.bytes,
  });

  return saveMediaAsset({
    title: cleanString(input.title) || input.fileName,
    altText: cleanString(input.altText),
    url: savedBinary.publicUrl,
    assetType: "image",
    category: cleanString(input.category) || "content",
    sourceKind: "upload",
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
    uploadedBy: input.uploadedBy,
    status: "published",
  });
}

export async function getSystemSettings() {
  if (hasDurableCmsStateStore()) {
    const settings = await getDurableSystemSettings();
    if (settings) {
      return settings;
    }
  }

  const store = await readStore();
  return store.settings;
}

export async function saveSystemSettings(input: SaveSystemSettingsInput): Promise<SaveSystemSettingsResult> {
  const savedAt = new Date().toISOString();
  const sanitizedPublicHeadCode =
    input.publicHeadCode === undefined
      ? undefined
      : (sanitizeSystemHeadCodeInput(input.publicHeadCode) ?? "");
  if (hasDurableCmsStateStore()) {
    const currentSettings = (await getDurableSystemSettings()) ?? defaultSettings();
    const nextSettings: SystemSettings = {
      ...currentSettings,
      ...input,
      siteName: cleanString(input.siteName) || currentSettings.siteName,
      defaultMetaTitleSuffix:
        cleanString(input.defaultMetaTitleSuffix) || currentSettings.defaultMetaTitleSuffix,
      defaultMetaDescription:
        cleanString(input.defaultMetaDescription) || currentSettings.defaultMetaDescription,
      defaultOgImage: cleanString(input.defaultOgImage),
      defaultCanonicalBase: cleanString(input.defaultCanonicalBase),
      publicHeadCode:
        sanitizedPublicHeadCode === undefined
          ? currentSettings.publicHeadCode
          : sanitizedPublicHeadCode,
      defaultMembershipTier:
        cleanString(input.defaultMembershipTier) || currentSettings.defaultMembershipTier,
      defaultLockedCtaLabel:
        cleanString(input.defaultLockedCtaLabel) || currentSettings.defaultLockedCtaLabel,
      supportEmail: cleanString(input.supportEmail),
      supportRoute: cleanString(input.supportRoute) || currentSettings.supportRoute,
      defaultNoIndex:
        typeof input.defaultNoIndex === "boolean" ? input.defaultNoIndex : currentSettings.defaultNoIndex,
      previewEnabled:
        typeof input.previewEnabled === "boolean" ? input.previewEnabled : currentSettings.previewEnabled,
      mediaUploadsEnabled:
        typeof input.mediaUploadsEnabled === "boolean"
          ? input.mediaUploadsEnabled
          : currentSettings.mediaUploadsEnabled,
      watchlistEnabled:
        typeof input.watchlistEnabled === "boolean"
          ? input.watchlistEnabled
          : currentSettings.watchlistEnabled,
      portfolioEnabled:
        typeof input.portfolioEnabled === "boolean"
          ? input.portfolioEnabled
          : currentSettings.portfolioEnabled,
      updatedAt: savedAt,
    };
    const saved = await saveDurableSystemSettings(nextSettings);
    if (saved) {
      return { settings: saved, storageMode: "durable", savedAt };
    }
  }

  return mutateStore(async (store) => {
    store.settings = {
      ...store.settings,
      ...input,
      siteName: cleanString(input.siteName) || store.settings.siteName,
      defaultMetaTitleSuffix:
        cleanString(input.defaultMetaTitleSuffix) || store.settings.defaultMetaTitleSuffix,
      defaultMetaDescription:
        cleanString(input.defaultMetaDescription) || store.settings.defaultMetaDescription,
      defaultOgImage: cleanString(input.defaultOgImage),
      defaultCanonicalBase: cleanString(input.defaultCanonicalBase),
      publicHeadCode:
        sanitizedPublicHeadCode === undefined ? store.settings.publicHeadCode : sanitizedPublicHeadCode,
      defaultMembershipTier:
        cleanString(input.defaultMembershipTier) || store.settings.defaultMembershipTier,
      defaultLockedCtaLabel:
        cleanString(input.defaultLockedCtaLabel) || store.settings.defaultLockedCtaLabel,
      supportEmail: cleanString(input.supportEmail),
      supportRoute: cleanString(input.supportRoute) || store.settings.supportRoute,
      defaultNoIndex:
        typeof input.defaultNoIndex === "boolean" ? input.defaultNoIndex : store.settings.defaultNoIndex,
      previewEnabled:
        typeof input.previewEnabled === "boolean" ? input.previewEnabled : store.settings.previewEnabled,
      mediaUploadsEnabled:
        typeof input.mediaUploadsEnabled === "boolean"
          ? input.mediaUploadsEnabled
          : store.settings.mediaUploadsEnabled,
      watchlistEnabled:
        typeof input.watchlistEnabled === "boolean"
          ? input.watchlistEnabled
          : store.settings.watchlistEnabled,
      portfolioEnabled:
        typeof input.portfolioEnabled === "boolean"
          ? input.portfolioEnabled
          : store.settings.portfolioEnabled,
      updatedAt: savedAt,
    };

    return { settings: store.settings, storageMode: "fallback" as const, savedAt };
  });
}

export async function createCmsPreviewSession(input: {
  family: string;
  slug: string;
  title: string;
  routeTarget: string | null;
  createdBy: string;
  payload: SaveAdminRecordInput;
}) {
  const preview = normalizePreview({
    family: input.family,
    slug: input.slug,
    title: input.title,
    routeTarget: input.routeTarget,
    createdBy: input.createdBy,
    payload: input.payload,
  });

  if (hasDurableCmsStateStore()) {
    await expireDurableCmsPreviewSessionsForRecord(preview.family, preview.slug);
    const saved = await createDurableCmsPreviewSession(preview);
    if (saved) {
      return saved;
    }
  }

  return mutateStore(async (store) => {
    store.previews = [
      preview,
      ...pruneExpiredPreviewSessions(store.previews).filter(
        (item) =>
          item.token !== preview.token &&
          !(item.family === preview.family && item.slug === preview.slug),
      ),
    ].slice(0, 50);
    return preview;
  });
}

export async function getCmsPreviewSession(token: string) {
  if (!isValidCmsPreviewToken(token)) {
    return null;
  }

  if (hasDurableCmsStateStore()) {
    const preview = await getDurableCmsPreviewSession(token);
    if (preview) {
      return preview;
    }
  }

  const store = await readStore();
  return (
    pruneExpiredPreviewSessions(store.previews).find((item) => item.token === cleanString(token)) ?? null
  );
}

export async function getLatestCmsPreviewSessionForRecord(family: string, slug: string) {
  const normalizedFamily = cleanString(family);
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedFamily || !normalizedSlug) {
    return null;
  }

  if (hasDurableCmsStateStore()) {
    const preview = await getLatestDurableCmsPreviewSessionForRecord(normalizedFamily, normalizedSlug);
    if (preview) {
      return preview;
    }
  }

  const store = await readStore();
  return pruneExpiredPreviewSessions(store.previews)
    .filter((item) => item.family === normalizedFamily && item.slug === normalizedSlug)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}

export async function appendCmsRecordVersion(input: {
  family: string;
  slug: string;
  title: string;
  savedBy: string;
  status: AdminPublishState;
  routeTarget: string | null;
  changedFields: string[];
  snapshot: SaveAdminRecordInput;
}) {
  if (hasDurableCmsStateStore()) {
    const version = normalizeVersion({
      family: input.family,
      slug: input.slug,
      title: input.title,
      savedBy: input.savedBy,
      status: input.status,
      routeTarget: input.routeTarget,
      changedFields: input.changedFields,
      snapshot: input.snapshot,
    });
    const saved = await appendDurableCmsRecordVersion(version);
    if (saved) {
      return saved;
    }
  }

  return mutateStore(async (store) => {
    const version = normalizeVersion({
      family: input.family,
      slug: input.slug,
      title: input.title,
      savedBy: input.savedBy,
      status: input.status,
      routeTarget: input.routeTarget,
      changedFields: input.changedFields,
      snapshot: input.snapshot,
    });
    store.versions = [version, ...store.versions].slice(0, 500);
    return version;
  });
}

export async function getCmsRecordVersions(
  family: string,
  slug: string,
  limit = 10,
) {
  const normalizedFamily = cleanString(family);
  const normalizedSlug = normalizeSlug(slug);

  if (hasDurableCmsStateStore()) {
    const versions = await listDurableCmsRecordVersions(normalizedFamily, normalizedSlug, limit);
    if (versions) {
      return versions;
    }
  }

  const store = await readStore();
  return store.versions
    .filter((item) => item.family === normalizedFamily && item.slug === normalizedSlug)
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .slice(0, limit);
}

export async function appendRefreshJobRun(input: Omit<RefreshJobRun, "id">) {
  if (hasDurableCmsStateStore()) {
    const run = normalizeRefreshJobRun(input);
    const saved = await appendDurableRefreshJobRun(run);
    if (saved) {
      return saved;
    }
  }

  return mutateStore(async (store) => {
    const run = normalizeRefreshJobRun(input);
    store.refreshJobRuns = [run, ...store.refreshJobRuns].slice(0, 500);
    return run;
  });
}

export async function getRefreshJobRuns(jobKey: string, limit = 10) {
  const normalized = cleanString(jobKey);

  if (hasDurableCmsStateStore()) {
    const runs = await listDurableRefreshJobRuns(normalized, limit);
    if (runs) {
      return runs;
    }
  }

  const store = await readStore();
  return store.refreshJobRuns
    .filter((item) => item.jobKey === normalized)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .slice(0, limit);
}
