import { ProductCard } from "@/components/product-page-system";

const rows = [
  {
    feature: "Daily mood and weighted breadth",
    publicLayer: "Yes",
    premiumLayer: "Enhanced intraday depth",
  },
  {
    feature: "Pullers and draggers",
    publicLayer: "Top view",
    premiumLayer: "Full ranked table with alerts",
  },
  {
    feature: "Intraday tracker timeline",
    publicLayer: "Basic recent snapshots",
    premiumLayer: "Historical archive and replay",
  },
  {
    feature: "AI explanation",
    publicLayer: "Light summary",
    premiumLayer: "Rich why-changed analysis",
  },
];

export function IndexAccessCard() {
  return (
    <ProductCard tone="secondary" className="p-4">
      <h2 className="text-[16px] font-semibold text-[#111827]">Public vs premium tracker structure</h2>
      <div className="mt-4 overflow-hidden rounded-[12px] border border-[rgba(221,215,207,0.96)]">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-[rgba(248,246,243,0.92)] text-[rgba(107,114,128,0.8)]">
            <tr>
              <th className="px-4 py-3 font-medium">Feature</th>
              <th className="px-4 py-3 font-medium">Public</th>
              <th className="px-4 py-3 font-medium">Premium</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-t border-[rgba(221,215,207,0.9)]">
                <td className="px-4 py-3 text-[#111827]">{row.feature}</td>
                <td className="px-4 py-3 text-[rgba(75,85,99,0.86)]">{row.publicLayer}</td>
                <td className="px-4 py-3 text-[rgba(75,85,99,0.86)]">{row.premiumLayer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProductCard>
  );
}
