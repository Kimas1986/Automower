import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Automower Guide",
  description: "Rask oppslagsside for Husqvarna Automower-modeller.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Automower",
  },
  icons: {
    icon: [
      { url: "/automower-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/automower-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#6fa85f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}