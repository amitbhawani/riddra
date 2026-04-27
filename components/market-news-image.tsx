"use client";

import { useEffect, useMemo, useState } from "react";

export function MarketNewsImage({
  primarySrc,
  fallbackSrc,
  alt,
  className,
}: {
  primarySrc: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
}) {
  const normalizedPrimary = useMemo(() => String(primarySrc || "").trim(), [primarySrc]);
  const normalizedFallback = useMemo(() => String(fallbackSrc || "").trim(), [fallbackSrc]);
  const [src, setSrc] = useState(normalizedPrimary || normalizedFallback);

  useEffect(() => {
    setSrc(normalizedPrimary || normalizedFallback);
  }, [normalizedFallback, normalizedPrimary]);

  return (
    <img
      src={src || normalizedFallback}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (normalizedFallback && src !== normalizedFallback) {
          setSrc(normalizedFallback);
        }
      }}
    />
  );
}
