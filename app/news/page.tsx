import { redirect } from "next/navigation";

export default function LegacyMarketNewsPage() {
  redirect("/markets/news");
}
