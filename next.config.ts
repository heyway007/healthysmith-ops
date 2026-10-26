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
      // Tax invoices, 50 ทวิ certificates and the company details moved into
      // their own "เอกสารภาษี" menu.
      { source: "/admin/sales/tax-invoices/:path*", destination: "/admin/tax-documents/tax-invoices/:path*", permanent: true },
      { source: "/admin/sales/settings", destination: "/admin/tax-documents/company", permanent: true },
      { source: "/admin/purchase/wht/:path*", destination: "/admin/tax-documents/wht/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
