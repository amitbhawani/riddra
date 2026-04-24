import { SubscriberAuditSection, type SubscriberAuditStat } from "@/components/subscriber-audit-section";

type SubscriberWorkspaceRegistrySectionProps = {
  title: string;
  description: string;
  headline: string;
  stats: SubscriberAuditStat[];
  downloadHref: string;
  downloadLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  embedded?: boolean;
};

export type SubscriberWorkspaceRegistryStat = SubscriberAuditStat;

export function SubscriberWorkspaceRegistrySection({
  title,
  description,
  headline,
  stats,
  downloadHref,
  downloadLabel,
  secondaryHref,
  secondaryLabel,
  embedded = false,
}: SubscriberWorkspaceRegistrySectionProps) {
  return (
    <SubscriberAuditSection
      title={title}
      description={description}
      headline={headline}
      stats={stats}
      downloadHref={downloadHref}
      downloadLabel={downloadLabel}
      secondaryHref={secondaryHref}
      secondaryLabel={secondaryLabel}
      embedded={embedded}
    />
  );
}
