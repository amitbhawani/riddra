import Script from "next/script";

import { extractSystemHeadScripts } from "@/lib/system-head-code";

export function SystemHeadScripts({ code }: { code: string }) {
  const scripts = extractSystemHeadScripts(code);

  if (scripts.length === 0) {
    return null;
  }

  return (
    <>
      {scripts.map((script, index) => {
        const key = script.id || script.src || `inline-head-script-${index}`;
        const crossOrigin: "anonymous" | "use-credentials" | undefined =
          script.crossOrigin === "anonymous" || script.crossOrigin === "use-credentials"
            ? script.crossOrigin
            : undefined;

        if (script.src) {
          return (
            <Script
              key={key}
              id={script.id || `external-head-script-${index}`}
              src={script.src}
              strategy="afterInteractive"
              async={script.async}
              defer={script.defer}
              crossOrigin={crossOrigin}
              type={script.type}
            />
          );
        }

        return (
          <Script
            key={key}
            id={script.id || `inline-head-script-${index}`}
            strategy="afterInteractive"
            type={script.type}
          >
            {script.inlineCode || ""}
          </Script>
        );
      })}
    </>
  );
}
