import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Marketplace order exports (.xlsx) and purchase attachments (up to 5 files:
  // resized photos or PDFs of at most 5 MB) are uploaded through Server
  // Actions. The proxy buffers request bodies too, and cuts them off at its
  // own limit (10 MB by default), so both limits must be raised together.
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
    proxyClientMaxBodySize: "30mb",
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
