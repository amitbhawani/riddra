import { GlowCard } from "@/components/ui";

export type SubscriberActivityLogItem = {
  id: string;
  title: string;
  scope: string;
  action: string;
  detail: string;
  timestamp: string;
};

type SubscriberActivityLogSectionProps = {
  title: string;
  description?: string;
  items: SubscriberActivityLogItem[];
};

export function SubscriberActivityLogSection({
  title,
  description,
  items,
}: SubscriberActivityLogSectionProps) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">{description}</p> : null}
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mist/58">{item.scope}</p>
              </div>
              <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                {item.action}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
            <p className="mt-3 text-xs leading-6 text-mist/56">{item.timestamp}</p>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
