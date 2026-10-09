import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Marketplace order exports (.xlsx) are uploaded through a Server Action.
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  // Holidays / teams moved out of the HR module into their own back-office menus.
  async redirects() {
    return [
      { source: "/admin/hr/holidays", destination: "/admin/holidays", permanent: true },
      { source: "/admin/hr/holidays/:path*", destination: "/admin/holidays/:path*", permanent: true },
      // Teams moved out of the HR module into their own menu.
      { source: "/admin/hr/teams", destination: "/admin/teams", permanent: true },
    ];
  },
};

export default nextConfig;
