// Print pages live outside the dashboard layout (no sidebar/header) but are
// still under /admin, so they use the back-office session. Each print area
// checks its own role in a nested layout (holidays: hr, tax-invoices: sales).
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-avoid-break { break-inside: avoid; }
        }
      `}</style>
      {children}
    </div>
  );
}
