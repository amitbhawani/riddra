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

  return (
    <AdminCard tone={durableActive ? "compact" : "warning"} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <AdminBadge
          label={durableActive ? "DB-first path active" : "Local fallback mode"}
          tone={durableActive ? "success" : "warning"}
        />
        <p className="text-sm font-medium text-[#111827]">Storage mode for {scope}</p>
      </div>
      <p className="text-sm leading-6 text-[#4b5563]">
        {durableActive
          ? `${scope} is using the durable DB-first path. Save banners confirm write timing, and the local JSON copy is only a safe development mirror.`
          : `${scope} is using the local fallback path because the durable operator store is not available in this runtime. Saves still persist locally, but hosted proof stays blocked until the DB-first path is active.`}
      </p>
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
