import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type MediaStorageMode = "local";

export type SaveMediaBinaryInput = {
  originalFileName: string;
  bytes: Uint8Array;
};

export type SavedMediaBinary = {
  storageMode: MediaStorageMode;
  publicUrl: string;
  absolutePath: string;
  storedFileName: string;
};

const LOCAL_MEDIA_UPLOADS_DIR = path.join(process.cwd(), "public", "media-library");

function cleanFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildStoredFileName(originalFileName: string) {
  const trimmed = originalFileName.trim();
  const extension = trimmed.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = cleanFileName(trimmed.replace(/\.[^.]+$/, "")) || "asset";
  return `${Date.now()}-${baseName}.${extension}`;
}

async function saveToLocalStorage(input: SaveMediaBinaryInput): Promise<SavedMediaBinary> {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Media upload storage"));
  }

  await mkdir(LOCAL_MEDIA_UPLOADS_DIR, { recursive: true });

  const storedFileName = buildStoredFileName(input.originalFileName);
  const absolutePath = path.join(LOCAL_MEDIA_UPLOADS_DIR, storedFileName);
  await writeFile(absolutePath, input.bytes);

  return {
    storageMode: "local",
    publicUrl: `/media-library/${storedFileName}`,
    absolutePath,
    storedFileName,
  };
}

export async function saveMediaBinary(input: SaveMediaBinaryInput) {
  return saveToLocalStorage(input);
}

export function getMediaStorageSummary() {
  if (!canUseFileFallback()) {
    return {
      mode: "local" as const,
      label: "Hosted upload blocked",
      detail:
        "Hosted mode does not allow writing media binaries to public/media-library. Configure durable remote media storage before enabling uploads in production.",
    };
  }

  return {
    mode: "local" as const,
    label: "Local filesystem adapter",
    detail: "Media binaries are currently stored under public/media-library through a storage abstraction that is ready for a future remote adapter.",
  };
}
