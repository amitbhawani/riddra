const headWrapperPattern = /<\/?(?:html|body|head)\b[^>]*>/gi;
const docTypePattern = /<!doctype[^>]*>/gi;
const nullBytePattern = /\u0000/g;
const maxHeadCodeLength = 40_000;
const scriptTagPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const htmlCommentPattern = /<!--[\s\S]*?-->/g;
const attributePattern = /([^\s=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

export type SystemHeadScriptEntry = {
  src?: string;
  inlineCode?: string;
  async?: boolean;
  defer?: boolean;
  crossOrigin?: string;
  type?: string;
  id?: string;
};

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

  const extractedScripts = extractSystemHeadScripts(normalized);
  const stripped = normalized
    .replace(htmlCommentPattern, "")
    .replace(scriptTagPattern, "")
    .trim();

  if (stripped) {
    throw new Error("Header code currently supports trusted <script> tags only.");
  }

  for (const script of extractedScripts) {
    if (!script.src) {
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(script.src);
    } catch {
      throw new Error("Header code contains an invalid external script URL.");
    }

    if (parsed.protocol !== "https:") {
      throw new Error("External header scripts must use HTTPS.");
    }

    const hostname = parsed.hostname.trim().toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    ) {
      throw new Error("Header code cannot load scripts from local-only hosts.");
    }
  }

  return normalized;
}

function decodeAttributeValue(value: string | undefined) {
  return String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

export function extractSystemHeadScripts(value: string | null | undefined): SystemHeadScriptEntry[] {
  const normalized = normalizeSystemHeadCode(value);

  if (!normalized) {
    return [];
  }

  const scripts: SystemHeadScriptEntry[] = [];
  let match: RegExpExecArray | null;
  scriptTagPattern.lastIndex = 0;

  while ((match = scriptTagPattern.exec(normalized)) !== null) {
    const [, rawAttributes = "", rawInlineCode = ""] = match;
    const entry: SystemHeadScriptEntry = {};
    let attributeMatch: RegExpExecArray | null;
    attributePattern.lastIndex = 0;

    while ((attributeMatch = attributePattern.exec(rawAttributes)) !== null) {
      const [, key, doubleQuoted, singleQuoted, bareValue] = attributeMatch;
      const normalizedKey = key.trim().toLowerCase();
      const rawValue = doubleQuoted ?? singleQuoted ?? bareValue;
      const decodedValue = decodeAttributeValue(rawValue);

      if (normalizedKey === "src" && decodedValue) {
        entry.src = decodedValue;
      } else if (normalizedKey === "async") {
        entry.async = true;
      } else if (normalizedKey === "defer") {
        entry.defer = true;
      } else if (normalizedKey === "crossorigin" && decodedValue) {
        entry.crossOrigin = decodedValue;
      } else if (normalizedKey === "type" && decodedValue) {
        entry.type = decodedValue;
      } else if (normalizedKey === "id" && decodedValue) {
        entry.id = decodedValue;
      }
    }

    const inlineCode = rawInlineCode.trim();

    if (!entry.src && inlineCode) {
      entry.inlineCode = inlineCode;
    }

    if (entry.src || entry.inlineCode) {
      scripts.push(entry);
    }
  }

  return scripts;
}
