import type { ReactNode } from "react";

import { GlowCard } from "@/components/ui";

export type SubscriberStatCard = {
  label: string;
  value: ReactNode;
  detail?: string;
};

type SubscriberStatGridProps = {
  items: SubscriberStatCard[];
};

function getGridClassName(count: number) {
  if (count <= 2) {
    return "grid gap-6 lg:grid-cols-2";
  }

  if (count === 3) {
    return "grid gap-6 lg:grid-cols-3";
  }

  if (count === 4) {
    return "grid gap-6 lg:grid-cols-4";
  }

  if (count <= 6) {
    return "grid gap-6 lg:grid-cols-3 xl:grid-cols-6";
  }

  return "grid gap-6 lg:grid-cols-3 xl:grid-cols-4";
}

export function SubscriberStatGrid({ items }: SubscriberStatGridProps) {
  return (
    <div className={getGridClassName(items.length)}>
      {items.map((item) => (
        <GlowCard key={item.label}>
          <p className="text-sm text-mist/68">{item.label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
          {item.detail ? <p className="mt-3 text-sm leading-7 text-mist/72">{item.detail}</p> : null}
        </GlowCard>
      ))}
    </div>
  );
}
