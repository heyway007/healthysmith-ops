import { createClient } from "@/lib/supabase/server";
import { IMPORT_FORMATS, type ImportFormat } from "@/lib/order-import/formats";
import { ImportForm } from "./import-form";

export default async function ImportOrdersPage() {
  const supabase = await createClient();
  const [{ data: channels }, { data: imports }] = await Promise.all([
    supabase.from("sales_channels").select("id, code, name, is_marketplace").eq("is_active", true).order("name"),
    supabase.from("order_imports").select("*").order("created_at", { ascending: false }).limit(10),
  ]);
  const channelName = new Map((channels ?? []).map((c) => [c.id, c.name]));

  const formats = (Object.keys(IMPORT_FORMATS) as ImportFormat[]).map((key) => ({
    key,
    label: IMPORT_FORMATS[key].label,
    hint: IMPORT_FORMATS[key].hint,
    needsChannel: IMPORT_FORMATS[key].channelCode === null,
  }));
  const directChannels = (channels ?? [])
    .filter((c) => !c.is_marketplace)
    .map((c) => ({ code: c.code, name: c.name }));

  return (
    <div>
      <h2 className="text-lg font-semibold text-teal-950">นำเข้าออเดอร์</h2>
      <p className="mt-1 text-sm text-teal-700">
        Export ไฟล์ออเดอร์จาก Seller Center แล้วอัปโหลดที่นี่ — อัปโหลดไฟล์ซ้ำหรือช่วงวันที่ทับกันได้
        ระบบจะอัปเดตออเดอร์เดิมแทนการเพิ่มซ้ำ
      </p>

      <div className="mt-6">
        <ImportForm formats={formats} channels={directChannels} />
      </div>

      <h3 className="mt-10 text-sm font-semibold uppercase tracking-wide text-teal-500">ประวัติการนำเข้าล่าสุด</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-teal-100 bg-linear-to-r from-teal-50 to-cyan-50 text-left text-xs font-medium uppercase text-teal-700">
              <th className="px-4 py-3">เวลา</th>
              <th className="px-4 py-3">ช่องทาง</th>
              <th className="px-4 py-3">ไฟล์</th>
              <th className="px-4 py-3 text-right">ออเดอร์</th>
              <th className="px-4 py-3 text-right">ใหม่</th>
              <th className="px-4 py-3 text-right">อัปเดต</th>
              <th className="px-4 py-3 text-right">ออกใบกำกับแล้ว (อัปเดตแค่สถานะ)</th>
            </tr>
          </thead>
          <tbody>
            {imports?.map((i) => (
              <tr key={i.id} className="border-t border-teal-100">
                <td className="whitespace-nowrap px-4 py-3 text-teal-700">
                  {new Date(i.created_at).toLocaleString("th-TH", {
                    timeZone: "Asia/Bangkok",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3 text-teal-900">{channelName.get(i.sales_channel_id) ?? "-"}</td>
                <td className="max-w-64 truncate px-4 py-3 text-teal-700">{i.file_name ?? "-"}</td>
                <td className="px-4 py-3 text-right text-teal-900">{i.order_count.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{i.inserted_count.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-teal-700">{i.updated_count.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-teal-500">{i.locked_count.toLocaleString()}</td>
              </tr>
            ))}
            {(!imports || imports.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-teal-400">
                  ยังไม่เคยนำเข้าออเดอร์
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
