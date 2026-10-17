import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prado Commerce",
    short_name: "Prado",
    description:
      "Streamlined e-commerce, multi-store management, point of sale, and embeddable checkout flows.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "any",
    categories: ["business", "shopping", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
