import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
export const metadata: Metadata = { title: { default: "BetterWebUntis", template: "%s · BetterWebUntis" }, description: "Ein übersichtlicher, filterbarer WebUntis-Stundenplan", applicationName: "BetterWebUntis", appleWebApp: { capable: true, title: "BetterWebUntis", statusBarStyle: "black-translucent" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f7fb" }, { media: "(prefers-color-scheme: dark)", color: "#10141d" }] };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="de"><body>{children}<ServiceWorker /></body></html>; }
