function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueAliases(values: string[]) {
  return [...new Set(values.map(normalizeText).filter((value) => value.length >= 3))];
}

export function getFundCategorySearchAliases(category: string) {
  const normalized = normalizeText(category);
  const withoutFundSuffix = normalized.replace(/\s+funds?$/i, "").trim();
  const aliases = [
    normalized,
    `${normalized} funds`,
    withoutFundSuffix,
    `${withoutFundSuffix} fund`,
    `${withoutFundSuffix} funds`,
    `${withoutFundSuffix} mutual fund`,
    `${withoutFundSuffix} mutual funds`,
  ];

  switch (withoutFundSuffix) {
    case "index":
      aliases.push(
        "passive fund",
        "passive funds",
        "index tracker fund",
        "index tracker funds",
        "benchmark tracker fund",
        "benchmark hugging fund",
        "low cost index fund",
      );
      break;
    case "elss":
      aliases.push(
        "tax saver fund",
        "tax saver funds",
        "tax saving fund",
        "tax saving funds",
        "80c fund",
        "80c funds",
        "lock in fund",
        "lock in funds",
      );
      break;
    case "balanced advantage":
      aliases.push(
        "dynamic asset allocation fund",
        "dynamic asset allocation funds",
        "hybrid allocation fund",
        "hybrid allocation funds",
        "equity debt mix fund",
      );
      break;
    case "large cap":
      aliases.push("blue chip fund", "blue chip funds", "top 100 fund", "top 100 funds");
      break;
    case "large mid cap":
      aliases.push("large and midcap fund", "large and midcap funds", "blended cap fund");
      break;
    case "mid cap":
      aliases.push("midcap fund", "midcap funds", "growth oriented fund");
      break;
    case "small cap":
      aliases.push("smallcap fund", "smallcap funds", "higher risk growth fund");
      break;
    case "flexi cap":
      aliases.push("multi cap style fund", "go anywhere equity fund", "flexicap fund", "flexicap funds");
      break;
    case "corporate bond":
      aliases.push("high quality debt fund", "credit quality debt fund", "accrual debt fund");
      break;
    case "short duration":
      aliases.push("short term debt fund", "short term debt funds", "income fund", "income funds");
      break;
    default:
      break;
  }

  return uniqueAliases(aliases);
}
