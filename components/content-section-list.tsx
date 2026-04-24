import { GlowCard } from "@/components/ui";
import type { ContentSection } from "@/lib/content-sections";

export function ContentSectionList({
  sections,
  emptyMessage,
}: {
  sections: ContentSection[];
  emptyMessage: string;
}) {
  if (sections.length === 0) {
    return (
      <GlowCard>
        <h2 className="text-2xl font-semibold text-white">Content blocks</h2>
        <p className="mt-4 text-sm leading-7 text-mist/72">{emptyMessage}</p>
      </GlowCard>
    );
  }

  return (
    <div className="grid gap-4">
      {sections.map((section) => (
        <GlowCard key={section.sectionKey}>
          <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
          <p className="mt-4 text-sm leading-7 text-mist/74">{section.body}</p>
        </GlowCard>
      ))}
    </div>
  );
}
