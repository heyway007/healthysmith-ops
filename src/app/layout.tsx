import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "@/lib/fontawesome";
import "./globals.css";
import { Suspense } from "react";
import { NavigationProgress } from "@/components/ui/navigation-progress";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบบัญชีและพนักงาน",
  description: "ระบบขาย จัดซื้อ พนักงาน/เงินเดือน และศูนย์บริการพนักงาน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`h-full antialiased ${kanit.variable}`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {/* useSearchParams() inside needs a Suspense boundary */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
