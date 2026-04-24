import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Riddra",
    short_name: "Riddra",
    description: "SEO-first Indian market intelligence platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b15",
    theme_color: "#070b15",
    icons: [],
  };
}
