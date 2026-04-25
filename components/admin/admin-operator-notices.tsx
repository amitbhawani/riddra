import { hasDurableCmsStateStore } from "@/lib/cms-durable-state";
import { AdminActionLink, AdminBadge, AdminCard } from "@/components/admin/admin-primitives";
import { clsx } from "clsx";

type NoticeLink = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

export function AdminStorageStatusCard({
  scope,
}: {
  scope: string;
}) {
  const durableActive = hasDurableCmsStateStore();
  const summaryLabel = durableActive ? "Primary storage active" : "Current workspace storage";
  const summaryText = durableActive
    ? `${scope} is saving through the primary shared storage path for this environment.`
    : `${scope} is currently saving through the active workspace storage path for this environment.`;
  const detailText = durableActive
    ? `This area is already using the main shared storage path. Save banners show when the latest change was recorded.`
    : `This area is still using the current workspace storage path. Your saves continue to work here while the final shared-storage proof is being completed.`;

  return (
    <AdminCard tone="compact" className="space-y-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 py-0.5 marker:content-none">
          <AdminBadge
            label={summaryLabel}
            tone={durableActive ? "success" : "warning"}
          />
          <p className="text-sm font-medium text-[#111827]">Storage details for {scope}</p>
          <span className="text-xs text-[#6b7280]">Advanced</span>
        </summary>
        <div className="space-y-2 pt-2">
          <p className="text-sm leading-6 text-[#4b5563]">{summaryText}</p>
          <p className="text-sm leading-6 text-[#6b7280]">{detailText}</p>
        </div>
      </details>
    </AdminCard>
  );
}

export function AdminGuidanceCard({
  title,
  description,
  items,
  links = [],
  className,
}: {
  title: string;
  description: string;
  items: string[];
  links?: NoticeLink[];
  className?: string;
}) {
  return (
    <AdminCard tone="compact" className={clsx("space-y-2.5", className)}>
      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-[#111827]">{title}</p>
        <p className="text-sm leading-6 text-[#4b5563]">{description}</p>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-[#4b5563]">
            {item}
          </p>
        ))}
      </div>
      {links.length ? (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <AdminActionLink
              key={`${link.href}-${link.label}`}
              href={link.href}
              label={link.label}
              tone={link.tone ?? "secondary"}
            />
          ))}
        </div>
      ) : null}
    </AdminCard>
  );
}
