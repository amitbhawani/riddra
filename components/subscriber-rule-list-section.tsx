import type { ReactNode } from "react";

import { GlowCard } from "@/components/ui";

type SubscriberRuleListSectionProps = {
  title: string;
  rules: string[];
  description?: string;
  actions?: ReactNode;
};

export function SubscriberRuleListSection({
  title,
  rules,
  description,
  actions,
}: SubscriberRuleListSectionProps) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-7 text-mist/74">{description}</p> : null}
      <div className="mt-5 grid gap-3">
        {rules.map((rule) => (
          <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
            {rule}
          </div>
        ))}
      </div>
      {actions ? <div className="mt-6">{actions}</div> : null}
    </GlowCard>
  );
}
