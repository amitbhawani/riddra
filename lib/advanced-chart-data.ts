export type CandlePoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type HistogramPoint = {
  time: string;
  value: number;
  color: string;
};

export type LinePoint = {
  time: string;
  value: number;
};

export const candleSeries: CandlePoint[] = [
  { time: "2026-04-01", open: 924, high: 932, low: 919, close: 930 },
  { time: "2026-04-02", open: 931, high: 939, low: 928, close: 937 },
  { time: "2026-04-03", open: 936, high: 944, low: 933, close: 941 },
  { time: "2026-04-04", open: 940, high: 948, low: 934, close: 936 },
  { time: "2026-04-05", open: 936, high: 951, low: 935, close: 949 },
  { time: "2026-04-06", open: 948, high: 955, low: 942, close: 946 },
  { time: "2026-04-07", open: 946, high: 959, low: 944, close: 956 },
  { time: "2026-04-08", open: 956, high: 963, low: 949, close: 952 },
  { time: "2026-04-09", open: 953, high: 967, low: 950, close: 964 },
  { time: "2026-04-10", open: 964, high: 972, low: 958, close: 968 },
  { time: "2026-04-11", open: 968, high: 976, low: 960, close: 963 },
  { time: "2026-04-12", open: 963, high: 978, low: 961, close: 972 },
];

export const volumeSeries: HistogramPoint[] = candleSeries.map((point, index) => ({
  time: point.time,
  value: [9.8, 10.4, 11.1, 8.9, 12.2, 9.5, 11.8, 10.2, 12.9, 13.4, 10.7, 14.1][index],
  color: point.close >= point.open ? "rgba(90, 230, 198, 0.75)" : "rgba(255, 107, 107, 0.75)",
}));

export const trendSeries: LinePoint[] = [
  { time: "2026-04-01", value: 926 },
  { time: "2026-04-02", value: 929 },
  { time: "2026-04-03", value: 933 },
  { time: "2026-04-04", value: 936 },
  { time: "2026-04-05", value: 939 },
  { time: "2026-04-06", value: 942 },
  { time: "2026-04-07", value: 946 },
  { time: "2026-04-08", value: 949 },
  { time: "2026-04-09", value: 953 },
  { time: "2026-04-10", value: 957 },
  { time: "2026-04-11", value: 960 },
  { time: "2026-04-12", value: 964 },
];

export const signalSeries: LinePoint[] = [
  { time: "2026-04-01", value: 922 },
  { time: "2026-04-02", value: 925 },
  { time: "2026-04-03", value: 929 },
  { time: "2026-04-04", value: 931 },
  { time: "2026-04-05", value: 935 },
  { time: "2026-04-06", value: 938 },
  { time: "2026-04-07", value: 943 },
  { time: "2026-04-08", value: 945 },
  { time: "2026-04-09", value: 950 },
  { time: "2026-04-10", value: 954 },
  { time: "2026-04-11", value: 957 },
  { time: "2026-04-12", value: 962 },
];

export const chartPresets = [
  {
    title: "Trend Bias",
    description: "Daily structure view with price, trend line, and signal line for directional clarity.",
  },
  {
    title: "Momentum Stack",
    description: "Focused workspace for continuation setups once your proprietary Pine logic is plugged in.",
  },
  {
    title: "Subscriber Workspace",
    description: "The paid layout where saved presets, alerts, and your indicator edge will live.",
  },
];

export const chartSignalNotes = [
  "Green structure with rising volume suggests trend participation improving.",
  "The secondary line is a placeholder for your proprietary signal logic until the Pine Script is restored.",
  "This page is intentionally built so your indicator can plug into the same visual system later.",
];

export const indicatorPresetGroups = [
  {
    title: "Trend and structure",
    items: ["EMA ribbon", "Supertrend", "Anchored VWAP", "Higher-high / lower-low map"],
  },
  {
    title: "Momentum and volume",
    items: ["RSI", "MACD", "Volume thrust", "Delivery and breakout confirmation"],
  },
  {
    title: "Profile and derivatives",
    items: ["Market profile placeholder", "OI overlay", "PCR bias", "Max-pain band"],
  },
];

export const chartControlRows = [
  {
    title: "Timeframe stack",
    description: "Switch between scalp, intraday, swing, and position views without losing the layout logic.",
  },
  {
    title: "Drawing memory",
    description: "Persist levels, zones, trend lines, and replay notes so repeated chart review feels cumulative.",
  },
  {
    title: "Scanner handoff",
    description: "A screened symbol should open into the correct chart preset with the right timeframe and bias blocks already visible.",
  },
];

export const chartToolGroups = [
  {
    title: "Drawing stack",
    items: ["Trend lines", "Horizontal and anchored levels", "Parallel channels", "Fib tools", "Risk-reward boxes"],
  },
  {
    title: "Indicator stack",
    items: ["EMA and VWAP overlays", "RSI and MACD lanes", "Volume profile placeholder", "OI-linked trigger overlays", "Subscriber presets"],
  },
  {
    title: "Execution views",
    items: ["Scalp layout", "Swing layout", "Index replay layout", "Sector-relative layout", "Option-chain linked layout"],
  },
];

export const chartWorkspaceLanes = [
  {
    title: "Fast discovery lane",
    description: "Public users should be able to open a chart, switch timeframe, review structure, and jump into the stock or options context without friction.",
  },
  {
    title: "Trader decision lane",
    description: "Active traders should get preset stacks, structure notes, derivatives context, and replay-ready layouts that feel closer to a workstation than a marketing page.",
  },
  {
    title: "Subscriber edge lane",
    description: "Your proprietary indicator, saved layouts, and trade-review workflows should sit on the same chart system instead of becoming a disconnected premium add-on.",
  },
];

export const derivativesModules = [
  {
    title: "Option chain handoff",
    description: "Link every major chart into strike selection, OI build-up, max pain, and PCR context instead of treating charts and derivatives as separate products.",
  },
  {
    title: "Scanner-to-chart workflow",
    description: "A screened stock or index setup should open directly into the relevant chart layout with the right timeframe and bias notes already in view.",
  },
  {
    title: "Replay and review loop",
    description: "Intraday and swing traders should be able to replay structure, annotate decisions, and keep layout memory for repeated daily use.",
  },
];
