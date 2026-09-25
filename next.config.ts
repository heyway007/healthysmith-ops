import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Holidays moved out of the HR module into their own back-office menu.
  async redirects() {
    return [
      { source: "/admin/hr/holidays", destination: "/admin/holidays", permanent: true },
      { source: "/admin/hr/holidays/:path*", destination: "/admin/holidays/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
