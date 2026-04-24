import { ProductCard, ProductPageShell, ProductPageTwoColumnLayout } from "@/components/product-page-system";

export default function TestMotorsLoading() {
  return (
    <ProductPageShell
      className="[&>div]:max-w-[1160px]"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Stocks", href: "/stocks" },
        { label: "Test Motors Page", href: "/stocks/test-motors" },
      ]}
      hero={null}
      stickyTabs={null}
      summary={
        <ProductPageTwoColumnLayout
          className="lg:items-start lg:grid-cols-[minmax(0,72%)_minmax(280px,28%)] xl:grid-cols-[minmax(0,73.5%)_minmax(292px,26.5%)]"
          left={
            <div className="space-y-4 animate-pulse">
              <ProductCard tone="primary" className="space-y-4 p-4">
                <div className="flex gap-2">
                  <div className="h-9 w-16 rounded-full bg-[rgba(27,58,107,0.12)]" />
                  <div className="h-9 w-16 rounded-full bg-[rgba(27,58,107,0.08)]" />
                  <div className="h-9 w-20 rounded-full bg-[rgba(27,58,107,0.08)]" />
                  <div className="h-9 w-20 rounded-full bg-[rgba(27,58,107,0.08)]" />
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_154px]">
                  <div className="space-y-3">
                    <div className="h-11 w-36 rounded-[12px] bg-[rgba(27,58,107,0.1)]" />
                    <div className="h-10 w-64 rounded-[10px] bg-[rgba(27,58,107,0.14)]" />
                    <div className="h-4 w-80 rounded bg-[rgba(107,114,128,0.14)]" />
                    <div className="h-12 w-44 rounded bg-[rgba(27,58,107,0.12)]" />
                    <div className="grid gap-2 sm:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-16 rounded-[12px] bg-white/90" />
                      ))}
                    </div>
                  </div>
                  <div className="h-[180px] rounded-[18px] bg-white/90" />
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-16 rounded-[12px] bg-white/90" />
                  ))}
                </div>
              </ProductCard>

              <div className="h-14 rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[rgba(251,250,248,0.98)]" />

              <ProductCard tone="primary" className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-20 rounded bg-[rgba(107,114,128,0.14)]" />
                    <div className="h-6 w-48 rounded bg-[rgba(27,58,107,0.14)]" />
                  </div>
                  <div className="h-10 w-56 rounded-[10px] bg-[rgba(27,58,107,0.08)]" />
                </div>
                <div className="h-[320px] rounded-[14px] bg-[rgba(27,58,107,0.08)]" />
                <div className="grid gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-24 rounded-[12px] bg-white/90" />
                  ))}
                </div>
              </ProductCard>
            </div>
          }
          right={
            <div className="space-y-3 animate-pulse">
              <ProductCard tone="primary" className="space-y-3 p-3.5">
                <div className="h-32 rounded-[14px] bg-white/90" />
                <div className="h-36 rounded-[14px] bg-white/90" />
              </ProductCard>
              {Array.from({ length: 4 }).map((_, index) => (
                <ProductCard key={index} tone="secondary" className="space-y-3 p-3.5">
                  <div className="h-12 rounded-[14px] bg-white/90" />
                  <div className="grid gap-2">
                    {Array.from({ length: 4 }).map((__, rowIndex) => (
                      <div key={rowIndex} className="h-14 rounded-[12px] bg-white/90" />
                    ))}
                  </div>
                </ProductCard>
              ))}
            </div>
          }
        />
      }
    />
  );
}
