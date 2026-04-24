import Link from "next/link";

type SubscriberRouteLinkCard = {
  href: string;
  title: string;
  note: string;
};

type SubscriberRouteLinkGridProps = {
  items: SubscriberRouteLinkCard[];
};

function getGridClassName(count: number) {
  if (count <= 2) {
    return "grid gap-4 md:grid-cols-2";
  }

  if (count === 3) {
    return "grid gap-4 md:grid-cols-3";
  }

  if (count === 4) {
    return "grid gap-4 md:grid-cols-2 xl:grid-cols-4";
  }

  return "grid gap-4 md:grid-cols-2 xl:grid-cols-4";
}

export function SubscriberRouteLinkGrid({ items }: SubscriberRouteLinkGridProps) {
  return (
    <div className={getGridClassName(items.length)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 py-4 text-sm leading-7 text-[rgba(75,85,99,0.84)] transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.03)]"
        >
          <span className="font-semibold text-[#1B3A6B]">{item.title}</span>
          <span className="mt-2 block text-[rgba(75,85,99,0.78)]">{item.note}</span>
        </Link>
      ))}
    </div>
  );
}
