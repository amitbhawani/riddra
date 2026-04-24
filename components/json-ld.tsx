import { stringifySchema } from "@/lib/seo";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: stringifySchema(data),
      }}
      type="application/ld+json"
    />
  );
}
