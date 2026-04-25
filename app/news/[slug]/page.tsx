import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyMarketNewsDetailRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/markets/news/${slug}`);
}
