import { GlowCard } from "@/components/ui";

export function FaqListCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item.question} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
            <p className="text-sm font-medium text-white">{item.question}</p>
            <p className="mt-3 text-sm leading-7 text-mist/74">{item.answer}</p>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}
