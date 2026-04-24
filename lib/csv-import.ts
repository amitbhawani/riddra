export type CsvRow = Record<string, string>;

export type ParsedCsv = {
  headers: string[];
  rows: CsvRow[];
};

function cleanCell(value: string) {
  return value.replace(/^"(.*)"$/, "$1").trim();
}

export function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\"") {
      const nextCharacter = line[index + 1];

      if (inQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(cleanCell(current));
      current = "";
      continue;
    }

    current += character;
  }

  values.push(cleanCell(current));
  return values;
}

export function parseCsvText(text: string): ParsedCsv {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("The CSV file needs a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  if (!headers.length || headers.every((header) => !header)) {
    throw new Error("The CSV header row is empty.");
  }

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });

  return {
    headers,
    rows,
  };
}

export function guessCsvHeader(
  headers: string[],
  candidates: string[],
  fallback = "",
) {
  const normalizedCandidates = candidates.map((candidate) => candidate.toLowerCase());
  const exactMatch =
    headers.find((header) => normalizedCandidates.includes(header.toLowerCase())) ?? null;

  if (exactMatch) {
    return exactMatch;
  }

  const relaxedMatch =
    headers.find((header) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      return normalizedCandidates.includes(normalizedHeader);
    }) ?? null;

  return relaxedMatch ?? fallback;
}

function stringifyCsvCell(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }

  return value;
}

export function buildCsvTemplate(headers: string[], row: Record<string, string>) {
  const headerLine = headers.join(",");
  const rowLine = headers.map((header) => stringifyCsvCell(row[header] ?? "")).join(",");
  return `${headerLine}\n${rowLine}\n`;
}
