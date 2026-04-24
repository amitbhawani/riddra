export type FirstTrustedStockTarget = {
  slug: string;
  name: string;
  symbol: string;
  route: string;
};

export type FirstTrustedFundTarget = {
  slug: string;
  name: string;
  category: string;
  route: string;
};

export const firstTrustedStockTargets: FirstTrustedStockTarget[] = [
  {
    slug: "tata-motors",
    name: "Tata Motors",
    symbol: "TMCV",
    route: "/stocks/tata-motors",
  },
  {
    slug: "reliance-industries",
    name: "Reliance Industries",
    symbol: "RELIANCE",
    route: "/stocks/reliance-industries",
  },
  {
    slug: "infosys",
    name: "Infosys",
    symbol: "INFY",
    route: "/stocks/infosys",
  },
  {
    slug: "tcs",
    name: "TCS",
    symbol: "TCS",
    route: "/stocks/tcs",
  },
  {
    slug: "hdfc-bank",
    name: "HDFC Bank",
    symbol: "HDFCBANK",
    route: "/stocks/hdfc-bank",
  },
  {
    slug: "icici-bank",
    name: "ICICI Bank",
    symbol: "ICICIBANK",
    route: "/stocks/icici-bank",
  },
  {
    slug: "axis-bank",
    name: "Axis Bank",
    symbol: "AXISBANK",
    route: "/stocks/axis-bank",
  },
  {
    slug: "state-bank-of-india",
    name: "State Bank of India",
    symbol: "SBIN",
    route: "/stocks/state-bank-of-india",
  },
  {
    slug: "itc",
    name: "ITC",
    symbol: "ITC",
    route: "/stocks/itc",
  },
  {
    slug: "larsen-and-toubro",
    name: "Larsen & Toubro",
    symbol: "LT",
    route: "/stocks/larsen-and-toubro",
  },
  {
    slug: "maruti-suzuki",
    name: "Maruti Suzuki",
    symbol: "MARUTI",
    route: "/stocks/maruti-suzuki",
  },
  {
    slug: "sun-pharma",
    name: "Sun Pharma",
    symbol: "SUNPHARMA",
    route: "/stocks/sun-pharma",
  },
  {
    slug: "bharti-airtel",
    name: "Bharti Airtel",
    symbol: "BHARTIARTL",
    route: "/stocks/bharti-airtel",
  },
  {
    slug: "hcltech",
    name: "HCLTech",
    symbol: "HCLTECH",
    route: "/stocks/hcltech",
  },
  {
    slug: "bajaj-finance",
    name: "Bajaj Finance",
    symbol: "BAJFINANCE",
    route: "/stocks/bajaj-finance",
  },
  {
    slug: "kotak-mahindra-bank",
    name: "Kotak Mahindra Bank",
    symbol: "KOTAKBANK",
    route: "/stocks/kotak-mahindra-bank",
  },
  {
    slug: "hindustan-unilever",
    name: "Hindustan Unilever",
    symbol: "HINDUNILVR",
    route: "/stocks/hindustan-unilever",
  },
  {
    slug: "ntpc",
    name: "NTPC",
    symbol: "NTPC",
    route: "/stocks/ntpc",
  },
  {
    slug: "power-grid",
    name: "Power Grid",
    symbol: "POWERGRID",
    route: "/stocks/power-grid",
  },
  {
    slug: "asian-paints",
    name: "Asian Paints",
    symbol: "ASIANPAINT",
    route: "/stocks/asian-paints",
  },
  {
    slug: "wipro",
    name: "Wipro",
    symbol: "WIPRO",
    route: "/stocks/wipro",
  },
  {
    slug: "bajaj-auto",
    name: "Bajaj Auto",
    symbol: "BAJAJ-AUTO",
    route: "/stocks/bajaj-auto",
  },
];

export const firstTrustedIndexTargets = [
  {
    slug: "nifty50",
    name: "Nifty 50",
    route: "/nifty50",
  },
  {
    slug: "sensex",
    name: "Sensex",
    route: "/sensex",
  },
  {
    slug: "banknifty",
    name: "Bank Nifty",
    route: "/banknifty",
  },
  {
    slug: "finnifty",
    name: "Fin Nifty",
    route: "/finnifty",
  },
] as const;

export const firstTrustedFundTargets: FirstTrustedFundTarget[] = [
  {
    slug: "hdfc-mid-cap-opportunities",
    name: "HDFC Mid-Cap Opportunities Fund",
    category: "Mid Cap Fund",
    route: "/mutual-funds/hdfc-mid-cap-opportunities",
  },
  {
    slug: "sbi-bluechip-fund",
    name: "SBI Bluechip Fund",
    category: "Large Cap Fund",
    route: "/mutual-funds/sbi-bluechip-fund",
  },
];
