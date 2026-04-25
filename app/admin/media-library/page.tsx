import type { Metadata } from "next";

import { AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import { AdminMediaLibraryClient } from "@/components/admin/admin-media-library-client";
import { AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { listMediaAssets } from "@/lib/user-product-store";

export const metadata: Metadata = {
  title: "Media Library",
  description: "Upload, reuse, and manage shared images and document assets for content, SEO, and attachments.",
};

export default async function AdminMediaLibraryPage() {
  const assets = await listMediaAssets();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Media Library", href: "/admin/media-library" },
        ]}
        eyebrow="Media"
        title="Media library"
        description="Upload local images, register hosted image or document URLs, and reuse the same lightweight asset library across content, SEO, courses, webinars, and document attachments."
      />

      <AdminMediaLibraryClient initialAssets={assets} />

      <AdminStorageStatusCard scope="media metadata and reusable assets" />
    </AdminPageFrame>
  );
}
