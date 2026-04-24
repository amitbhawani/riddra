import Link from "next/link";

import { ProductCard } from "@/components/product-page-system";
import type { IndexWeightRoster } from "@/lib/index-content";
import { sampleStocks } from "@/lib/mock-data";

const stockSlugBySymbol = new Map(sampleStocks.map((stock) => [stock.symbol, stock.slug]));

export function IndexWeightRosterCard({ roster }: { roster: IndexWeightRoster }) {
  return (
    <ProductCard tone="primary" className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#111827]">{roster.title} component weights</h2>
          <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">{roster.note}</p>
        </div>
        <div className="rounded-full border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#1B3A6B]">
          Reference roster
        </div>
      </div>

      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
        {roster.lastUpdated}
      </p>

      <div className="mt-4 overflow-hidden rounded-[12px] border border-[rgba(221,215,207,0.96)]">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-[rgba(248,246,243,0.92)] text-[rgba(107,114,128,0.8)]">
            <tr>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Weight</th>
            </tr>
          </thead>
          <tbody>
            {roster.components.map((component) => (
              <tr key={`${roster.slug}-${component.symbol}`} className="border-t border-[rgba(221,215,207,0.9)]">
                <td className="px-4 py-3 text-[rgba(75,85,99,0.86)]">
                  {stockSlugBySymbol.get(component.symbol) ? (
                    <Link
                      href={`/stocks/${stockSlugBySymbol.get(component.symbol)}`}
                      className="font-medium text-[#1B3A6B] transition hover:text-[#264a83]"
                    >
                      {component.symbol}
                    </Link>
                  ) : (
                    <span className="font-medium text-[#111827]">{component.symbol}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[rgba(75,85,99,0.86)]">{component.name}</td>
                <td className="px-4 py-3 text-[#111827]">{component.weight}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ProductCard>
  );
}
