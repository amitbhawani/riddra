"use client";

import { useMemo, useState } from "react";

import { LegacyToolEmbed } from "@/components/legacy-tool-embed";

type ToolCalculatorPanelProps = {
  slug: string;
};

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function ToolCalculatorPanel({ slug }: ToolCalculatorPanelProps) {
  const legacyTools: Record<
    string,
    { rootId: string; scriptPath: string; chartJs?: boolean; note?: string }
  > = {
    "sip-goal-planner": {
      rootId: "mg-sip-root",
      scriptPath: "/legacy-tools/sip.js",
      chartJs: true,
    },
    "swp-withdrawal-planner": {
      rootId: "mg-swp-root",
      scriptPath: "/legacy-tools/swp.js",
      chartJs: true,
    },
    "fire-retirement-calculator": {
      rootId: "mg-fire-root",
      scriptPath: "/legacy-tools/fire.js",
      chartJs: true,
    },
    "gold-price-tracker": {
      rootId: "mg-gold-root",
      scriptPath: "/legacy-tools/gold.js",
      chartJs: true,
      note: "Live rates are fetched from market APIs inside the embedded tracker. Historical save/load calls are safely shimmed for this Next.js setup.",
    },
    "silver-price-tracker": {
      rootId: "mg-silver-root",
      scriptPath: "/legacy-tools/silver.js",
      chartJs: true,
      note: "Live rates are fetched from market APIs inside the embedded tracker. Historical save/load calls are safely shimmed for this Next.js setup.",
    },
    "pdf-compressor": {
      rootId: "mg-pdf-compress-root",
      scriptPath: "/legacy-tools/pdf-compress.js",
    },
    "pdf-to-word-converter": {
      rootId: "mg-pdf-word-root",
      scriptPath: "/legacy-tools/pdf-to-word.js",
    },
    "pdf-splitter": {
      rootId: "mg-pdf-split-root",
      scriptPath: "/legacy-tools/pdf-split.js",
    },
    "pdf-merger": {
      rootId: "mg-pdf-merge-root",
      scriptPath: "/legacy-tools/pdf-merge.js",
    },
    "pdf-unlocker": {
      rootId: "mg-pdf-unlock-root",
      scriptPath: "/legacy-tools/pdf-unlock.js",
    },
    "pdf-protector": {
      rootId: "mg-pdf-protect-root",
      scriptPath: "/legacy-tools/pdf-protect.js",
    },
    "instagram-reel-downloader": {
      rootId: "mg-ig-reel-root",
      scriptPath: "/legacy-tools/ig-reel-downloader.js",
      note: "This downloader depends on the attached proxy worker URL inside the original tool script, so its availability depends on that upstream service staying reachable.",
    },
  };

  if (slug === "position-size-calculator") {
    return <PositionSizeCalculator />;
  }

  if (slug === "ipo-lot-calculator") {
    return <IpoLotCalculator />;
  }

  if (slug === "breakout-checklist") {
    return <BreakoutChecklistCalculator />;
  }

  if (legacyTools[slug]) {
    const tool = legacyTools[slug];
    return <LegacyToolEmbed rootId={tool.rootId} scriptPath={tool.scriptPath} chartJs={tool.chartJs} note={tool.note} />;
  }

  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
      This tool now has a real interaction panel on the roadmap. The first live calculator set is being rolled out for position sizing, IPO lots, and SIP goal planning before the rest of the utility stack gets the same treatment.
    </div>
  );
}

function PositionSizeCalculator() {
  const [capital, setCapital] = useState("200000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entry, setEntry] = useState("945");
  const [stop, setStop] = useState("922");

  const result = useMemo(() => {
    const capitalValue = Number(capital);
    const riskValue = Number(riskPercent);
    const entryValue = Number(entry);
    const stopValue = Number(stop);
    const perShareRisk = Math.abs(entryValue - stopValue);

    if (!capitalValue || !riskValue || !entryValue || !stopValue || perShareRisk <= 0) {
      return null;
    }

    const maxRisk = capitalValue * (riskValue / 100);
    const quantity = Math.floor(maxRisk / perShareRisk);
    const positionValue = quantity * entryValue;

    return {
      maxRisk,
      perShareRisk,
      quantity,
      positionValue,
    };
  }, [capital, riskPercent, entry, stop]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3">
        <CalculatorInput label="Capital" value={capital} onChange={setCapital} />
        <CalculatorInput label="Risk per trade (%)" value={riskPercent} onChange={setRiskPercent} />
        <CalculatorInput label="Entry price" value={entry} onChange={setEntry} />
        <CalculatorInput label="Stop loss" value={stop} onChange={setStop} />
      </div>
      <div className="grid gap-3">
        <CalculatorCard label="Max rupee risk" value={result ? formatInr(result.maxRisk) : "Enter valid values"} />
        <CalculatorCard label="Risk per share" value={result ? formatInr(result.perShareRisk) : "Pending"} />
        <CalculatorCard label="Suggested quantity" value={result ? `${result.quantity} shares` : "Pending"} />
        <CalculatorCard label="Approx position value" value={result ? formatInr(result.positionValue) : "Pending"} />
      </div>
    </div>
  );
}

function IpoLotCalculator() {
  const [lotSize, setLotSize] = useState("26");
  const [pricePerShare, setPricePerShare] = useState("560");
  const [lots, setLots] = useState("3");

  const result = useMemo(() => {
    const lotSizeValue = Number(lotSize);
    const priceValue = Number(pricePerShare);
    const lotsValue = Number(lots);

    if (!lotSizeValue || !priceValue || !lotsValue) {
      return null;
    }

    const shares = lotSizeValue * lotsValue;
    const amount = shares * priceValue;

    return {
      shares,
      amount,
      amountPerLot: lotSizeValue * priceValue,
    };
  }, [lotSize, pricePerShare, lots]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3">
        <CalculatorInput label="Lot size" value={lotSize} onChange={setLotSize} />
        <CalculatorInput label="Price per share" value={pricePerShare} onChange={setPricePerShare} />
        <CalculatorInput label="Number of lots" value={lots} onChange={setLots} />
      </div>
      <div className="grid gap-3">
        <CalculatorCard label="Amount per lot" value={result ? formatInr(result.amountPerLot) : "Enter valid values"} />
        <CalculatorCard label="Total shares" value={result ? `${result.shares} shares` : "Pending"} />
        <CalculatorCard label="Total application amount" value={result ? formatInr(result.amount) : "Pending"} />
      </div>
    </div>
  );
}

function SipGoalPlanner() {
  const [goalAmount, setGoalAmount] = useState("5000000");
  const [years, setYears] = useState("10");
  const [annualReturn, setAnnualReturn] = useState("12");

  const result = useMemo(() => {
    const goal = Number(goalAmount);
    const yearsValue = Number(years);
    const annual = Number(annualReturn);

    if (!goal || !yearsValue || annual < 0) {
      return null;
    }

    const monthlyRate = annual / 12 / 100;
    const months = yearsValue * 12;

    if (months <= 0) {
      return null;
    }

    const sip =
      monthlyRate === 0
        ? goal / months
        : goal * (monthlyRate / (Math.pow(1 + monthlyRate, months) - 1));

    const invested = sip * months;

    return {
      monthlySip: sip,
      invested,
      estimatedGrowth: goal - invested,
    };
  }, [goalAmount, years, annualReturn]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3">
        <CalculatorInput label="Goal amount" value={goalAmount} onChange={setGoalAmount} />
        <CalculatorInput label="Years to goal" value={years} onChange={setYears} />
        <CalculatorInput label="Expected annual return (%)" value={annualReturn} onChange={setAnnualReturn} />
      </div>
      <div className="grid gap-3">
        <CalculatorCard label="Estimated monthly SIP" value={result ? formatInr(result.monthlySip) : "Enter valid values"} />
        <CalculatorCard label="Total invested" value={result ? formatInr(result.invested) : "Pending"} />
        <CalculatorCard label="Estimated growth contribution" value={result ? formatInr(result.estimatedGrowth) : "Pending"} />
        <CalculatorCard label="Assumed CAGR" value={result ? formatPercent(Number(annualReturn)) : "Pending"} />
      </div>
    </div>
  );
}

function BreakoutChecklistCalculator() {
  const [stock, setStock] = useState("Tata Motors");
  const [breakoutPrice, setBreakoutPrice] = useState("960");
  const [currentPrice, setCurrentPrice] = useState("968");
  const [volumeRatio, setVolumeRatio] = useState("1.9");
  const [stopDistance, setStopDistance] = useState("2.8");

  const result = useMemo(() => {
    const breakoutValue = Number(breakoutPrice);
    const currentValue = Number(currentPrice);
    const volumeValue = Number(volumeRatio);
    const stopValue = Number(stopDistance);

    if (!breakoutValue || !currentValue || !volumeValue || !stopValue) {
      return null;
    }

    const distancePercent = ((currentValue - breakoutValue) / breakoutValue) * 100;
    const score =
      (currentValue >= breakoutValue ? 30 : 10) +
      Math.min(volumeValue * 20, 30) +
      Math.max(0, 20 - stopValue * 3) +
      (distancePercent > 0 && distancePercent < 3 ? 20 : distancePercent <= 0 ? 5 : 10);

    const verdict =
      score >= 75
        ? "Healthy breakout structure"
        : score >= 55
          ? "Needs one more confirmation"
          : "Too early or weak";

    return {
      score: Math.min(Math.round(score), 100),
      distancePercent,
      verdict,
      action:
        score >= 75
          ? `Keep ${stock} on the active watchlist and move to the chart route for execution planning.`
          : score >= 55
            ? `Wait for stronger confirmation in ${stock} before escalating into alerts or trade planning.`
            : `Treat ${stock} as a setup-in-progress rather than a live breakout candidate.`,
    };
  }, [stock, breakoutPrice, currentPrice, volumeRatio, stopDistance]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-3">
        <CalculatorInput label="Stock name" value={stock} onChange={setStock} />
        <CalculatorInput label="Breakout level" value={breakoutPrice} onChange={setBreakoutPrice} />
        <CalculatorInput label="Current price" value={currentPrice} onChange={setCurrentPrice} />
        <CalculatorInput label="Volume vs average (x)" value={volumeRatio} onChange={setVolumeRatio} />
        <CalculatorInput label="Stop distance (%)" value={stopDistance} onChange={setStopDistance} />
      </div>
      <div className="grid gap-3">
        <CalculatorCard
          label="Breakout score"
          value={result ? `${result.score}/100` : "Enter valid values"}
        />
        <CalculatorCard
          label="Price above breakout"
          value={result ? formatPercent(result.distancePercent) : "Pending"}
        />
        <CalculatorCard
          label="Checklist verdict"
          value={result ? result.verdict : "Pending"}
        />
        <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
          <p className="text-sm text-mist/66">Suggested next move</p>
          <p className="mt-2 text-sm leading-7 text-white">
            {result ? result.action : "Add the setup details to get a breakout decision summary."}
          </p>
        </div>
      </div>
    </div>
  );
}

function CalculatorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-mist/40"
        inputMode="decimal"
      />
    </label>
  );
}

function CalculatorCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
      <p className="text-sm text-mist/66">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
