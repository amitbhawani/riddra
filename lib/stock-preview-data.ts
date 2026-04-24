export type StockPreviewPeer = {
  label: string;
  price: string;
  change1Y: string;
  ratioValue: string;
  marketCap?: string;
  href?: string;
};

export type StockPreviewData = {
  session: {
    open: string;
    high: string;
    low: string;
    close: string;
    previousClose: string;
    volume: string;
  };
  performance: {
    day1: string;
    week1: string;
    month1: string;
    year1: string;
    peerOneYearAverage: string;
  };
  benchmarkPreview?: {
    nifty50: {
      day1: string;
      week1: string;
      month1: string;
      month3: string;
      year1: string;
      year3: string;
    };
    category: {
      label: string;
      day1: string;
      week1: string;
      month1: string;
      month3: string;
      year1: string;
      year3: string;
    };
  };
  trailing: {
    latestMove: string;
    month1: string;
    month3: string;
    month6: string;
    year1: string;
    year3: string;
    year5: string;
  };
  fundamentals: {
    sector: string;
    industry: string;
    marketCap: string;
    pe: string;
  };
  peers: StockPreviewPeer[];
};

const STOCK_PREVIEW_DATA: Record<string, StockPreviewData> = {
  "tata-motors": {
    session: {
      open: "₹442.40",
      high: "₹446.00",
      low: "₹433.10",
      close: "₹435.20",
      previousClose: "₹429.80",
      volume: "~2.04 Cr",
    },
    performance: {
      day1: "Approx. -0.6%",
      week1: "Approx. +3.1%",
      month1: "Approx. +7.4%",
      year1: "Approx. +17.8%",
      peerOneYearAverage: "Approx. +24.0%",
    },
    benchmarkPreview: {
      nifty50: {
        day1: "Approx. +0.7%",
        week1: "Approx. +1.8%",
        month1: "Approx. +3.6%",
        month3: "Approx. +5.9%",
        year1: "Approx. +10.8%",
        year3: "Approx. +34.0%",
      },
      category: {
        label: "Nifty Auto",
        day1: "Approx. +0.4%",
        week1: "Approx. +2.8%",
        month1: "Approx. +6.3%",
        month3: "Approx. +8.7%",
        year1: "Approx. +15.1%",
        year3: "Approx. +41.0%",
      },
    },
    trailing: {
      latestMove: "Approx. -0.6%",
      month1: "Approx. +7.4%",
      month3: "Approx. +9.8%",
      month6: "Approx. +13.5%",
      year1: "Approx. +17.8%",
      year3: "Sample data preview",
      year5: "Sample data preview",
    },
    fundamentals: {
      sector: "Auto",
      industry: "Passenger Vehicles",
      marketCap: "Approx. ₹1.61L Cr",
      pe: "Approx. 13.8x",
    },
    peers: [
      { label: "Tata Motors", price: "₹435.20", change1Y: "Approx. +17.8%", ratioValue: "Approx. 13.8x", marketCap: "Approx. ₹1.61L Cr", href: "/stocks/tata-motors" },
      { label: "Mahindra & Mahindra", price: "₹2,860.00", change1Y: "Approx. +38.0%", ratioValue: "Approx. 29.0x", marketCap: "Approx. ₹3.56L Cr", href: "/stocks" },
      { label: "Maruti Suzuki", price: "₹12,620.00", change1Y: "Approx. +16.5%", ratioValue: "Approx. 29.5x", marketCap: "Approx. ₹3.97L Cr", href: "/stocks/maruti-suzuki" },
      { label: "Ashok Leyland", price: "₹238.00", change1Y: "Approx. +41.0%", ratioValue: "Approx. 24.0x", marketCap: "Approx. ₹70.1K Cr", href: "/stocks" },
    ],
  },
  infosys: {
    session: {
      open: "₹1,558.00",
      high: "₹1,572.00",
      low: "₹1,544.00",
      close: "₹1,563.00",
      previousClose: "₹1,551.00",
      volume: "~82.5 L",
    },
    performance: {
      day1: "Approx. +0.8%",
      week1: "Approx. +2.6%",
      month1: "Approx. +6.1%",
      year1: "Approx. +11.4%",
      peerOneYearAverage: "Approx. +12.8%",
    },
    benchmarkPreview: {
      nifty50: {
        day1: "Approx. +0.7%",
        week1: "Approx. +1.8%",
        month1: "Approx. +3.6%",
        month3: "Approx. +5.9%",
        year1: "Approx. +10.8%",
        year3: "Approx. +34.0%",
      },
      category: {
        label: "Nifty IT",
        day1: "Approx. +0.5%",
        week1: "Approx. +2.1%",
        month1: "Approx. +4.4%",
        month3: "Approx. +7.1%",
        year1: "Approx. +12.1%",
        year3: "Approx. +29.0%",
      },
    },
    trailing: {
      latestMove: "Approx. +0.8%",
      month1: "Approx. +6.1%",
      month3: "Approx. +8.7%",
      month6: "Approx. +10.5%",
      year1: "Approx. +11.4%",
      year3: "Sample data preview",
      year5: "Sample data preview",
    },
    fundamentals: {
      sector: "Information Technology",
      industry: "IT Services",
      marketCap: "Approx. ₹6.48L Cr",
      pe: "Approx. 24.8x",
    },
    peers: [
      { label: "Infosys", price: "₹1,563.00", change1Y: "Approx. +11.4%", ratioValue: "Approx. 24.8x", marketCap: "Approx. ₹6.48L Cr", href: "/stocks/infosys" },
      { label: "TCS", price: "₹4,185.00", change1Y: "Approx. +9.8%", ratioValue: "Approx. 31.2x", marketCap: "Approx. ₹15.1L Cr", href: "/stocks/tcs" },
      { label: "HCLTech", price: "₹1,655.00", change1Y: "Approx. +14.2%", ratioValue: "Approx. 26.0x", marketCap: "Approx. ₹4.49L Cr", href: "/stocks/hcltech" },
      { label: "Wipro", price: "₹515.00", change1Y: "Approx. +15.8%", ratioValue: "Approx. 23.1x", marketCap: "Approx. ₹2.69L Cr", href: "/stocks/wipro" },
    ],
  },
  "hdfc-bank": {
    session: {
      open: "₹1,782.00",
      high: "₹1,798.00",
      low: "₹1,768.00",
      close: "₹1,791.00",
      previousClose: "₹1,775.00",
      volume: "~1.18 Cr",
    },
    performance: {
      day1: "Approx. +0.9%",
      week1: "Approx. +2.2%",
      month1: "Approx. +5.6%",
      year1: "Approx. +9.7%",
      peerOneYearAverage: "Approx. +14.9%",
    },
    benchmarkPreview: {
      nifty50: {
        day1: "Approx. +0.7%",
        week1: "Approx. +1.8%",
        month1: "Approx. +3.6%",
        month3: "Approx. +5.9%",
        year1: "Approx. +10.8%",
        year3: "Approx. +34.0%",
      },
      category: {
        label: "Bank Nifty",
        day1: "Approx. +0.9%",
        week1: "Approx. +2.3%",
        month1: "Approx. +5.1%",
        month3: "Approx. +7.2%",
        year1: "Approx. +14.2%",
        year3: "Approx. +37.0%",
      },
    },
    trailing: {
      latestMove: "Approx. +0.9%",
      month1: "Approx. +5.6%",
      month3: "Approx. +7.3%",
      month6: "Approx. +8.8%",
      year1: "Approx. +9.7%",
      year3: "Sample data preview",
      year5: "Sample data preview",
    },
    fundamentals: {
      sector: "Financial Services",
      industry: "Private Sector Bank",
      marketCap: "Approx. ₹13.72L Cr",
      pe: "Approx. 19.6x",
    },
    peers: [
      { label: "HDFC Bank", price: "₹1,791.00", change1Y: "Approx. +9.7%", ratioValue: "Approx. 19.6x", marketCap: "Approx. ₹13.72L Cr", href: "/stocks/hdfc-bank" },
      { label: "ICICI Bank", price: "₹1,355.00", change1Y: "Approx. +17.2%", ratioValue: "Approx. 18.4x", marketCap: "Approx. ₹9.61L Cr", href: "/stocks/icici-bank" },
      { label: "Kotak Mahindra Bank", price: "₹1,845.00", change1Y: "Approx. +8.5%", ratioValue: "Approx. 20.8x", marketCap: "Approx. ₹3.67L Cr", href: "/stocks/kotak-mahindra-bank" },
      { label: "Axis Bank", price: "₹1,165.00", change1Y: "Approx. +14.1%", ratioValue: "Approx. 14.9x", marketCap: "Approx. ₹3.62L Cr", href: "/stocks/axis-bank" },
    ],
  },
  "reliance-industries": {
    session: {
      open: "₹1,488.00",
      high: "₹1,498.00",
      low: "₹1,471.00",
      close: "₹1,481.00",
      previousClose: "₹1,472.00",
      volume: "~1.32 Cr",
    },
    performance: {
      day1: "Approx. +0.6%",
      week1: "Approx. +1.9%",
      month1: "Approx. +4.8%",
      year1: "Approx. +6.8%",
      peerOneYearAverage: "Approx. +11.5%",
    },
    benchmarkPreview: {
      nifty50: {
        day1: "Approx. +0.7%",
        week1: "Approx. +1.8%",
        month1: "Approx. +3.6%",
        month3: "Approx. +5.9%",
        year1: "Approx. +10.8%",
        year3: "Approx. +34.0%",
      },
      category: {
        label: "Nifty Energy",
        day1: "Approx. +0.5%",
        week1: "Approx. +1.7%",
        month1: "Approx. +4.0%",
        month3: "Approx. +5.5%",
        year1: "Approx. +8.9%",
        year3: "Approx. +28.0%",
      },
    },
    trailing: {
      latestMove: "Approx. +0.6%",
      month1: "Approx. +4.8%",
      month3: "Approx. +6.4%",
      month6: "Approx. +7.9%",
      year1: "Approx. +6.8%",
      year3: "Sample data preview",
      year5: "Sample data preview",
    },
    fundamentals: {
      sector: "Energy",
      industry: "Oil, Gas & Petrochemicals",
      marketCap: "Approx. ₹20.10L Cr",
      pe: "Approx. 24.5x",
    },
    peers: [
      { label: "Reliance Industries", price: "₹1,481.00", change1Y: "Approx. +6.8%", ratioValue: "Approx. 24.5x", marketCap: "Approx. ₹20.10L Cr", href: "/stocks/reliance-industries" },
      { label: "Bharti Airtel", price: "₹1,385.00", change1Y: "Approx. +21.0%", ratioValue: "Approx. 49.0x", marketCap: "Approx. ₹8.31L Cr", href: "/stocks/bharti-airtel" },
      { label: "Larsen & Toubro", price: "₹3,715.00", change1Y: "Approx. +14.8%", ratioValue: "Approx. 33.0x", marketCap: "Approx. ₹5.11L Cr", href: "/stocks/larsen-and-toubro" },
      { label: "NTPC", price: "₹384.00", change1Y: "Approx. +11.2%", ratioValue: "Approx. 18.7x", marketCap: "Approx. ₹3.72L Cr", href: "/stocks/ntpc" },
    ],
  },
};

export function getLocalStockPreviewData(slug: string): StockPreviewData | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return STOCK_PREVIEW_DATA[slug] ?? null;
}
