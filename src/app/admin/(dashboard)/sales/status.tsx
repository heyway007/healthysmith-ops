import type { StatusConfig } from "@/components/ui/status-badge";

export const ORDER_STATUS: StatusConfig = {
  pending: { label: "รอชำระเงิน", className: "bg-amber-100 text-amber-700" },
  confirmed: { label: "รอจัดส่ง", className: "bg-cyan-100 text-cyan-700" },
  processing: { label: "กำลังเตรียม", className: "bg-cyan-100 text-cyan-700" },
  shipped: { label: "กำลังจัดส่ง", className: "bg-sky-100 text-sky-700" },
  completed: { label: "สำเร็จ", className: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "ยกเลิก / คืน", className: "bg-gray-200 text-gray-600" },
};

/** Badge colors per sales_channels.code. */
export const CHANNEL_BADGE: Record<string, string> = {
  shopee: "bg-orange-100 text-orange-700",
  lazada: "bg-indigo-100 text-indigo-700",
  tiktok: "bg-gray-900 text-white",
  website: "bg-teal-100 text-teal-700",
  line: "bg-green-100 text-green-700",
  facebook: "bg-blue-100 text-blue-700",
  offline: "bg-amber-100 text-amber-700",
};

export function ChannelBadge({ code, name }: { code: string | null; name: string | null }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        CHANNEL_BADGE[code ?? ""] ?? "bg-teal-100 text-teal-700"
      }`}
    >
      {name ?? "-"}
    </span>
  );
}
