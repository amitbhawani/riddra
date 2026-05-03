"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type NativeStockChartRange = "1D" | "7D" | "1M" | "6M" | "1Y" | "5Y" | "MAX";
const NATIVE_CHART_FETCH_TIMEOUT_MS = 4_500;

type NativeStockChartPoint = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjustedClose: number | null;
  volume: number | null;
};

type NativeStockChartPayload = {
  ok: true;
  points: NativeStockChartPoint[];
  meta: {
    symbol: string | null;
    companyName: string | null;
    firstDate: string | null;
    lastDate: string | null;
    pointCount: number;
    source: "stock_price_history";
    range: NativeStockChartRange;
    interval: "1d";
  };
};

type NativeStockHistoryChartProps = {
  stockSlug: string;
  stockName: string;
  range: NativeStockChartRange;
  initialData?: NativeStockChartPayload | null;
};

type ChartState =
  | { status: "loading"; data: NativeStockChartPayload | null }
  | { status: "ready"; data: NativeStockChartPayload }
  | { status: "empty"; data: NativeStockChartPayload | null }
  | { status: "error"; data: NativeStockChartPayload | null; message: string };

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function formatTooltipDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRupee(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function formatVolume(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildChartGeometry(points: NativeStockChartPoint[]) {
  const width = 760;
  const height = 250;
  const paddingX = 18;
  const paddingY = 18;
  const closes = points
    .map((point) => point.close)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!points.length || !closes.length) {
    return null;
  }

  const rawMin = Math.min(...closes);
  const rawMax = Math.max(...closes);
  const rawRange = rawMax - rawMin;
  const paddingRange =
    rawRange === 0 ? Math.max(Math.abs(rawMax || rawMin || 0) * 0.02, 1) : 0;
  const min = rawRange === 0 ? rawMin - paddingRange : rawMin;
  const max = rawRange === 0 ? rawMax + paddingRange : rawMax;
  const range = max - min || 1;
  const stepX = (width - paddingX * 2) / Math.max(points.length - 1, 1);

  const chartPoints = points.map((point, index) => {
    const close = typeof point.close === "number" && Number.isFinite(point.close) ? point.close : min;
    const x =
      points.length === 1 ? width / 2 : paddingX + stepX * index;
    const y = paddingY + ((max - close) / range) * (height - paddingY * 2);
    return { x, y, close };
  });

  const linePath =
    chartPoints.length === 1
      ? `M ${paddingX.toFixed(2)} ${chartPoints[0]?.y.toFixed(2)} L ${(width - paddingX).toFixed(2)} ${chartPoints[0]?.y.toFixed(2)}`
      : chartPoints
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
          .join(" ");
  const areaPath =
    chartPoints.length === 1
      ? `M ${paddingX.toFixed(2)} ${chartPoints[0]?.y.toFixed(2)} L ${(width - paddingX).toFixed(2)} ${chartPoints[0]?.y.toFixed(2)} L ${(width - paddingX).toFixed(2)} ${height - paddingY} L ${paddingX.toFixed(2)} ${height - paddingY} Z`
      : `${linePath} L ${chartPoints[chartPoints.length - 1]?.x.toFixed(2)} ${height - paddingY} L ${chartPoints[0]?.x.toFixed(2)} ${height - paddingY} Z`;

  const yTicks = [max, max - range / 3, max - (range / 3) * 2, min].map((value) =>
    Number.isFinite(value) ? value : min,
  );

  return {
    width,
    height,
    min,
    max,
    chartPoints,
    linePath,
    areaPath,
    yTicks,
    paddingX,
    paddingY,
  };
}

function buildXLabels(points: NativeStockChartPoint[]) {
  if (!points.length) {
    return [];
  }

  const indexes = Array.from(
    new Set([
      0,
      Math.floor((points.length - 1) / 3),
      Math.floor(((points.length - 1) * 2) / 3),
      points.length - 1,
    ]),
  );

  return indexes.map((index) => ({
    index,
    label: formatDateLabel(points[index]?.date ?? ""),
  }));
}

export function NativeStockHistoryChart({
  stockSlug,
  stockName,
  range,
  initialData = null,
}: NativeStockHistoryChartProps) {
  const cacheRef = useRef<Record<string, NativeStockChartPayload>>(
    initialData ? { [initialData.meta.range]: initialData } : {},
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<ChartState>(() => {
    if (!initialData) {
      return { status: "loading", data: null };
    }

    return {
      status: initialData.points.length ? "ready" : "empty",
      data: initialData,
    };
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (initialData) {
      cacheRef.current = {
        [initialData.meta.range]: initialData,
      };
      setState({
        status: initialData.points.length ? "ready" : "empty",
        data: initialData,
      });
      return;
    }

    cacheRef.current = {};
    setState({ status: "loading", data: null });
  }, [initialData, stockSlug]);

  useEffect(() => {
    let cancelled = false;
    const cached = cacheRef.current[range];
    if (cached) {
      setState({
        status: cached.points.length ? "ready" : "empty",
        data: cached,
      });
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort(new Error(`Chart request exceeded ${NATIVE_CHART_FETCH_TIMEOUT_MS}ms.`));
    }, NATIVE_CHART_FETCH_TIMEOUT_MS);
    setState((current) => ({ status: "loading", data: current.data }));

    fetch(`/api/stocks/${encodeURIComponent(stockSlug)}/chart?range=${encodeURIComponent(range)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Chart request failed with status ${response.status}.`);
        }

        return (await response.json()) as NativeStockChartPayload;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        cacheRef.current[range] = payload;
        setState({
          status: payload.points.length ? "ready" : "empty",
          data: payload,
        });
      })
      .catch((error: unknown) => {
        if (cancelled || controller.signal.aborted) {
          if (!cancelled && controller.signal.reason instanceof Error) {
            setState((current) => ({
              status: "error",
              data: current.data,
              message: controller.signal.reason.message,
            }));
          }
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load chart data.";
        setState((current) => ({
          status: "error",
          data: current.data,
          message,
        }));
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [range, stockSlug]);

  useEffect(() => {
    setHoverIndex(null);
    setHoverPosition(null);
  }, [range]);

  const payload = state.data;
  const points = payload?.points ?? [];
  const geometry = useMemo(() => buildChartGeometry(points), [points]);
  const hasSinglePoint = points.length === 1;
  const xLabels = useMemo(() => buildXLabels(points), [points]);
  const latestPoint = points[points.length - 1] ?? null;
  const hoveredPoint =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length
      ? points[hoverIndex]
      : latestPoint;
  const hoveredChartPoint =
    geometry && hoverIndex !== null && hoverIndex >= 0 && hoverIndex < geometry.chartPoints.length
      ? geometry.chartPoints[hoverIndex]
      : geometry?.chartPoints[geometry.chartPoints.length - 1] ?? null;

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!geometry || !containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(relativeX, rect.width));
    const usableWidth = rect.width - geometry.paddingX * 2;
    const ratio = usableWidth > 0 ? (clampedX - geometry.paddingX) / usableWidth : 0;
    const index = Math.max(
      0,
      Math.min(points.length - 1, Math.round(Math.max(0, Math.min(ratio, 1)) * (points.length - 1))),
    );

    setHoverIndex(index);
    setHoverPosition({
      x: clampedX,
      y: event.clientY - rect.top,
    });
  }

  function clearHover() {
    setHoverIndex(null);
    setHoverPosition(null);
  }

  if (state.status === "error") {
    return (
      <div className="rounded-[12px] border border-dashed border-[rgba(226,222,217,0.92)] bg-[rgba(250,250,250,0.76)] px-4 py-10">
        <p className="text-[15px] font-semibold text-[#1F2937]">Chart temporarily unavailable</p>
        <p className="mt-2 text-sm leading-7 text-[rgba(107,114,128,0.92)]">
          {state.message}
        </p>
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="rounded-[12px] border border-dashed border-[rgba(226,222,217,0.92)] bg-[rgba(250,250,250,0.76)] px-4 py-10">
        <p className="text-[15px] font-semibold text-[#1F2937]">No stored chart history yet</p>
        <p className="mt-2 text-sm leading-7 text-[rgba(107,114,128,0.92)]">
          Riddra does not have retained daily candles for {stockName} in `stock_price_history` for this range yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(221,215,207,0.92)] bg-[#F3F4F6] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[rgba(75,85,99,0.9)]">Source</span>
          <span className="text-[11px] font-semibold text-[#1B3A6B]">Stored history</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(221,215,207,0.92)] bg-[#F3F4F6] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[rgba(75,85,99,0.9)]">Range close</span>
          <span className="text-[11px] font-semibold text-[#1B3A6B]">{formatRupee(latestPoint?.close)}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(221,215,207,0.92)] bg-[#F3F4F6] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[rgba(75,85,99,0.9)]">Coverage</span>
          <span className="text-[11px] font-semibold text-[#1B3A6B]">
            {payload?.meta.firstDate ? `${payload.meta.firstDate} to ${payload.meta.lastDate}` : "--"}
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(221,215,207,0.92)] bg-[#F3F4F6] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[rgba(75,85,99,0.9)]">Points</span>
          <span className="text-[11px] font-semibold text-[#1B3A6B]">
            {payload?.meta.pointCount?.toLocaleString("en-IN") ?? "--"}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className={[
          "relative rounded-[10px] border border-[rgba(221,215,207,0.92)] bg-[linear-gradient(180deg,rgba(27,58,107,0.04),rgba(27,58,107,0.01))] px-2 py-2 transition-opacity",
          state.status === "loading" ? "opacity-75" : "opacity-100",
        ].join(" ")}
        onPointerMove={handlePointerMove}
        onPointerLeave={clearHover}
      >
        {state.status === "loading" ? (
          <div className="absolute inset-0 z-10 animate-pulse rounded-[10px] bg-[rgba(255,255,255,0.38)]" aria-hidden="true" />
        ) : null}
        {geometry ? (
          <>
            <svg
              viewBox={`0 0 ${geometry.width} ${geometry.height}`}
              className="h-[220px] w-full sm:h-[248px]"
              role="img"
              aria-label={`${stockName} price chart`}
            >
              <defs>
                <linearGradient id={`native-stock-chart-${stockSlug}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(27, 58, 107, 0.16)" />
                  <stop offset="100%" stopColor="rgba(27, 58, 107, 0)" />
                </linearGradient>
              </defs>
              {geometry.yTicks.map((tick, index) => {
                const y =
                  geometry.paddingY +
                  ((geometry.max - tick) / (geometry.max - geometry.min || 1)) *
                    (geometry.height - geometry.paddingY * 2);

                return (
                  <g key={`${tick}-${index}`}>
                    <line
                      x1={geometry.paddingX}
                      x2={geometry.width - geometry.paddingX}
                      y1={y}
                      y2={y}
                      stroke="#E2DED9"
                    />
                    <text
                      x={geometry.width - geometry.paddingX}
                      y={Math.max(y - 6, 12)}
                      textAnchor="end"
                      fontSize="11"
                      fill="#6B7280"
                    >
                      {formatRupee(tick)}
                    </text>
                  </g>
                );
              })}
              <path
                d={geometry.areaPath}
                fill={`url(#native-stock-chart-${stockSlug}-fill)`}
              />
              <path
                d={geometry.linePath}
                fill="none"
                stroke="#1B3A6B"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {hoveredChartPoint ? (
                <>
                  <line
                    x1={hoveredChartPoint.x}
                    x2={hoveredChartPoint.x}
                    y1={geometry.paddingY}
                    y2={geometry.height - geometry.paddingY}
                    stroke="#94A3B8"
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={hoveredChartPoint.x}
                    cy={hoveredChartPoint.y}
                    r="5.5"
                    fill="#FFFFFF"
                    stroke="#1B3A6B"
                    strokeWidth="2"
                  />
                </>
              ) : null}
              {xLabels.map((label) => {
                const point = geometry.chartPoints[label.index];
                return point ? (
                  <text
                    key={`${label.index}-${label.label}`}
                    x={point.x}
                    y={geometry.height - 2}
                    textAnchor={label.index === 0 ? "start" : label.index === points.length - 1 ? "end" : "middle"}
                    fontSize="11"
                    fill="#6B7280"
                  >
                    {label.label}
                  </text>
                ) : null;
              })}
            </svg>
            {hoveredPoint && hoveredChartPoint && hoverPosition ? (
              <div
                className="pointer-events-none absolute z-20 w-[220px] rounded-[12px] border border-[rgba(27,58,107,0.16)] bg-white/98 px-3 py-2.5 shadow-[0_12px_24px_rgba(15,23,42,0.12)] backdrop-blur"
                style={{
                  left: Math.min(Math.max(hoverPosition.x + 14, 12), 520),
                  top: Math.max(hoverPosition.y - 112, 12),
                }}
              >
                <p className="text-[12px] font-semibold text-[#1F2937]">{formatTooltipDate(hoveredPoint.date)}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-[rgba(75,85,99,0.9)]">
                  <span>Open</span>
                  <span className="text-right font-semibold text-[#1B3A6B]">{formatRupee(hoveredPoint.open)}</span>
                  <span>High</span>
                  <span className="text-right font-semibold text-[#1B3A6B]">{formatRupee(hoveredPoint.high)}</span>
                  <span>Low</span>
                  <span className="text-right font-semibold text-[#1B3A6B]">{formatRupee(hoveredPoint.low)}</span>
                  <span>Close</span>
                  <span className="text-right font-semibold text-[#1B3A6B]">{formatRupee(hoveredPoint.close)}</span>
                  <span>Volume</span>
                  <span className="text-right font-semibold text-[#1B3A6B]">{formatVolume(hoveredPoint.volume)}</span>
                </div>
              </div>
            ) : null}
          </>
        ) : state.status === "loading" ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-[rgba(107,114,128,0.92)] sm:h-[248px]">
            Loading stored chart history…
          </div>
        ) : (
          <div className="flex h-[220px] items-center justify-center text-sm text-[rgba(107,114,128,0.92)] sm:h-[248px]">
            This range does not have enough stored points to draw a line chart yet.
          </div>
        )}
      </div>
      {hasSinglePoint ? (
        <p className="text-[12px] leading-6 text-[rgba(107,114,128,0.88)]">
          Only one stored trading candle is available for this range, so the chart is shown as a flat reference line.
        </p>
      ) : null}
    </div>
  );
}
