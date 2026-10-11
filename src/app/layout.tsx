import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./fonts.css";

export const metadata: Metadata = {
  title: "Thaili",
  description: "Where your money goes",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // needed for env(safe-area-inset-*)
  themeColor: "#FDF8EC",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
