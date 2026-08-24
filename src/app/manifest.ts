import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "BetterWebUntis", short_name: "WebUntis", description: "Persönlicher Stundenplan mit Kursfiltern", start_url: "/", display: "standalone", background_color: "#f5f7fb", theme_color: "#3457d5", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] }; }
