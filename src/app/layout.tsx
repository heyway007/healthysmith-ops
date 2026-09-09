import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "@/lib/fontawesome";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบบัญชีและหลังบ้าน",
  description: "ระบบขาย จัดซื้อ และพนักงาน/เงินเดือน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`h-full antialiased ${kanit.variable}`}>
      <body className="min-h-full flex flex-col bg-linear-to-br from-teal-50 via-cyan-50 to-teal-100 text-teal-950">
        {children}
      </body>
    </html>
  );
}
