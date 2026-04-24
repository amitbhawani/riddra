export function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}

export function compactSearchText(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

export function singularizeToken(value: string) {
  return value.endsWith("s") && value.length > 3 ? value.slice(0, -1) : value;
}

export function tokenizeSearchText(value: string, stopWords: ReadonlySet<string>) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function boundedEditDistance(left: string, right: string, maxDistance: number) {
  if (left === right) {
    return 0;
  }

  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    let current = row;
    let diagonal = row - 1;
    let rowMin = current;

    for (let column = 1; column <= right.length; column += 1) {
      const nextDiagonal = previous[column];
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      const value = Math.min(
        previous[column] + 1,
        current + 1,
        diagonal + substitutionCost,
      );

      previous[column] = current;
      current = value;
      diagonal = nextDiagonal;
      rowMin = Math.min(rowMin, value);
    }

    previous[right.length] = current;

    if (rowMin > maxDistance) {
      return maxDistance + 1;
    }
  }

  return previous[right.length];
}

export function isFuzzyTokenMatch(queryToken: string, candidateToken: string) {
  const normalizedQuery = singularizeToken(queryToken);
  const normalizedCandidate = singularizeToken(candidateToken);

  if (!normalizedQuery || !normalizedCandidate) {
    return false;
  }

  if (normalizedQuery === normalizedCandidate) {
    return true;
  }

  if (
    normalizedQuery.length >= 4 &&
    normalizedCandidate.length >= 4 &&
    (normalizedCandidate.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedCandidate))
  ) {
    return true;
  }

  if (normalizedQuery.length < 4 || normalizedCandidate.length < 4) {
    return false;
  }

  const maxDistance = normalizedQuery.length >= 7 && normalizedCandidate.length >= 7 ? 2 : 1;

  return boundedEditDistance(normalizedQuery, normalizedCandidate, maxDistance) <= maxDistance;
}

export function findFuzzyTokenMatch(queryToken: string, candidateTokens: Iterable<string>) {
  for (const candidateToken of candidateTokens) {
    if (isFuzzyTokenMatch(queryToken, candidateToken)) {
      return candidateToken;
    }
  }

  return null;
}
