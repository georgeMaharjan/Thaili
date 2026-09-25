import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor loads the app from static files — export a fully static SPA.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
