import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export function AdminPageFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("mx-auto max-w-[1400px] space-y-3.5 pb-5", className)}>{children}</div>;
}

export function AdminCard({
  children,
  tone = "secondary",
  className,
  id,
}: {
  children: ReactNode;
  tone?: "primary" | "secondary" | "compact" | "warning";
  className?: string;
  id?: string;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-white"
      : tone === "warning"
        ? "bg-[#fff7ed]"
        : tone === "compact"
          ? "bg-[#f8fafc]"
          : "bg-white";

  return (
    <section
      id={id}
      className={clsx(
        "mb-3.5 rounded-lg border border-[#d1d5db] p-[14px] shadow-sm",
        toneClass,
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AdminPageHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  actions,
}: {
  breadcrumbs?: Array<{ label: string; href: string }>;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      {breadcrumbs?.length ? (
        <nav className="flex flex-wrap items-center gap-2 text-xs text-[#4b5563]">
          {breadcrumbs.map((item, index) => (
            <span key={item.href} className="flex items-center gap-2">
              {index > 0 ? <span className="text-[#c4c9d4]">/</span> : null}
              <Link href={item.href} className="transition hover:text-[#111827]">
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[24px] font-semibold tracking-tight text-[#111827]">{title}</h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-5 text-[#4b5563]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function AdminStatGrid({
  stats,
  className,
  cardClassName,
}: {
  stats: Array<{ label: string; value: string; note?: string }>;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div className={clsx("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {stats.map((stat) => (
        <AdminCard
          key={`${stat.label}-${stat.value}`}
          className={clsx("space-y-1 p-[14px]", cardClassName)}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
            {stat.label}
          </p>
          <p className="text-[26px] font-semibold tracking-tight leading-none text-[#111827]">{stat.value}</p>
          {stat.note ? <p className="line-clamp-2 text-xs leading-[18px] text-[#4b5563]">{stat.note}</p> : null}
        </AdminCard>
      ))}
    </div>
  );
}

export function AdminSectionCard({
  title,
  description,
  children,
  tone = "secondary",
  id,
  collapsible = false,
  defaultOpen = true,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "primary" | "secondary" | "compact" | "warning";
  id?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  if (collapsible) {
    const toneClass =
      tone === "primary"
        ? "bg-white"
        : tone === "warning"
          ? "bg-[#fff7ed]"
          : tone === "compact"
            ? "bg-[#f8fafc]"
            : "bg-white";

    return (
      <details
        id={id}
        open={defaultOpen}
        className={clsx(
          "rounded-lg border border-[#d1d5db] shadow-sm",
          toneClass,
          className,
        )}
      >
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-[14px] py-3">
          <div className="space-y-1">
            <h2 className="text-[14px] font-semibold text-[#111827]">{title}</h2>
            {description ? <p className="text-sm leading-5 text-[#4b5563]">{description}</p> : null}
          </div>
          <span className="shrink-0 text-[12px] font-medium text-[#6b7280]">Show</span>
        </summary>
        <div className={clsx("border-t border-[#e5e7eb] p-[14px] pt-3", contentClassName)}>
          {children}
        </div>
      </details>
    );
  }

  return (
    <AdminCard id={id} tone={tone} className={clsx("space-y-2.5", className)}>
      <div className="space-y-1 border-b border-[#e5e7eb] pb-2">
        <h2 className="text-[14px] font-semibold text-[#111827]">{title}</h2>
        {description ? <p className="text-sm leading-5 text-[#4b5563]">{description}</p> : null}
      </div>
      <div className={contentClassName}>{children}</div>
    </AdminCard>
  );
}

export function AdminBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#166534]"
      : tone === "warning"
        ? "border-[#fde68a] bg-[#fffbeb] text-[#b45309]"
        : tone === "danger"
          ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]"
          : tone === "info"
            ? "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]"
            : "border-[#e5e7eb] bg-[#f9fafb] text-[#4b5563]";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        toneClass,
      )}
    >
      {label}
    </span>
  );
}

export function AdminActionLink({
  href,
  label,
  tone = "secondary",
}: {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
}) {
  const toneClass =
    tone === "primary"
      ? "border-[#0f172a] bg-[#0f172a] text-white hover:bg-[#111c33]"
      : "border-[#d1d5db] bg-white text-[#111827] hover:bg-[#f9fafb]";

  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex h-8 shrink-0 items-center rounded-lg border px-3 text-[13px] font-medium whitespace-nowrap transition",
        toneClass,
      )}
    >
      {label}
    </Link>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-dashed border-[#d1d5db] bg-[#f8fafc] px-[14px] py-4",
        className,
      )}
    >
      <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm leading-5 text-[#4b5563]">{description}</p>
      {action ? <div className="mt-2.5">{action}</div> : null}
    </div>
  );
}

export function AdminSimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto xl:overflow-visible rounded-lg border border-[#d1d5db] bg-white shadow-sm">
      <table className="min-w-full table-fixed text-left">
        <thead className="bg-[#f3f4f6]">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="sticky top-0 xl:top-[var(--admin-sticky-offset)] z-[20] border-b border-[#d1d5db] bg-[#f3f4f6] px-3 py-2 text-[12px] font-medium text-[#6b7280]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e5e7eb]">
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="align-top transition hover:bg-[#f9fafb]">
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="px-3 py-3 align-top text-[13px] leading-5 text-[#111827]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
