const headWrapperPattern = /<\/?(?:html|body|head)\b[^>]*>/gi;
const docTypePattern = /<!doctype[^>]*>/gi;
const nullBytePattern = /\u0000/g;
const maxHeadCodeLength = 40_000;

export function normalizeSystemHeadCode(value: string | null | undefined) {
  return String(value ?? "")
    .replace(nullBytePattern, "")
    .replace(docTypePattern, "")
    .replace(headWrapperPattern, "")
    .trim()
    .slice(0, maxHeadCodeLength);
}

export function sanitizeSystemHeadCodeInput(value: unknown) {
  const normalized = normalizeSystemHeadCode(String(value ?? ""));

  if (!normalized) {
    return null;
  }

  if (/document\.write\s*\(/i.test(normalized)) {
    throw new Error("Head code cannot use document.write().");
  }

  return normalized;
}
