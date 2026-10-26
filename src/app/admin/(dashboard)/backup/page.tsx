import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase, faDownload, faLock, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/server";
import { formCardClassName, submitButtonClassName } from "@/lib/ui-classes";

const when = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });

export default async function BackupPage() {
  const supabase = await createClient();
  const [{ count: invoices }, { count: certificates }, { data: last }] = await Promise.all([
    supabase.from("tax_invoices").select("id", { count: "exact", head: true }),
    supabase.from("wht_certificates").select("id", { count: "exact", head: true }),
    supabase
      .from("audit_logs")
      .select("occurred_at, actor_email")
      .eq("action", "data.backup")
      .order("occurred_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-teal-950">💾 สำรองข้อมูล</h1>
      <p className="mt-1 text-teal-700">ดาวน์โหลดสำเนาข้อมูลเอกสารภาษีทั้งหมดเก็บไว้นอกระบบ — ป้องกันข้อมูลสูญหาย</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className={formCardClassName}>
          <h2 className="flex items-center gap-2 font-semibold text-teal-950">
            <FontAwesomeIcon icon={faDatabase} className="text-teal-600" />
            สำรองข้อมูลเอกสารภาษี
          </h2>
          <p className="mt-2 text-sm text-teal-700">
            ไฟล์ Excel ประกอบด้วย ข้อมูลบริษัท · ใบกำกับภาษี {invoices ?? 0} ใบ พร้อมรายการสินค้า · หนังสือรับรองหัก ณ ที่จ่าย{" "}
            {certificates ?? 0} ใบ พร้อมรายการเงินได้ · ประวัติการใช้งานของเอกสารทั้งหมด (รวมใบที่ยกเลิก)
          </p>
          <a href="/admin/backup/download" className={`${submitButtonClassName} mt-4 inline-flex items-center gap-2`}>
            <FontAwesomeIcon icon={faDownload} />
            ดาวน์โหลดไฟล์สำรอง (.xlsx)
          </a>
          <p className="mt-3 text-xs text-teal-500">แนะนำ: ดาวน์โหลดทุกสิ้นเดือน แล้วเก็บไว้ในที่ปลอดภัยแยกจากระบบ (เช่น Google Drive ของบริษัท)</p>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-teal-500">สำรองล่าสุด</h3>
          {last && last.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-teal-800">
              {last.map((l) => (
                <li key={l.occurred_at}>
                  {when(l.occurred_at)} · {l.actor_email ?? "-"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-700">ยังไม่เคยสำรองข้อมูล</p>
          )}
        </div>

        <div className={`${formCardClassName} space-y-4 text-sm text-teal-800`}>
          <h2 className="flex items-center gap-2 font-semibold text-teal-950">
            <FontAwesomeIcon icon={faShieldHalved} className="text-teal-600" />
            มาตรการป้องกันข้อมูลในระบบ
          </h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>ฐานข้อมูล Supabase (PostgreSQL) สำรองข้อมูลอัตโนมัติรายวันโดยผู้ให้บริการ</li>
            <li>เอกสารที่ออกแล้วแก้ไขหรือลบโดยตรงไม่ได้ — ระบบบังคับที่ฐานข้อมูล ต้องแก้ไข/ยกเลิกผ่านเมนู ซึ่งเก็บฉบับเดิมไว้เสมอ</li>
            <li>ทุกเอกสารเก็บลายนิ้วมือดิจิทัล (SHA-256) ตรวจได้ว่าข้อมูลไม่ถูกแก้ไขหลังออก</li>
            <li>ประวัติการใช้งาน (Audit Log) แก้ไขหรือลบไม่ได้แม้แต่ผู้ดูแลระบบ</li>
          </ul>
          <h2 className="flex items-center gap-2 pt-2 font-semibold text-teal-950">
            <FontAwesomeIcon icon={faLock} className="text-teal-600" />
            การควบคุมการเข้าถึง
          </h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>เข้าระบบด้วยอีเมลและรหัสผ่าน (อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข) ผ่านการเชื่อมต่อเข้ารหัส HTTPS</li>
            <li>สิทธิ์แยกตามฝ่าย (ขาย / จัดซื้อ / บุคคล) และสิทธิ์เอกสาร ดู / เพิ่ม / แก้ไข / ยกเลิก / อนุมัติ รายคน</li>
            <li>ปิดการใช้งานบัญชีได้ทันทีเมื่อพนักงานลาออก โดยประวัติยังอยู่ครบ</li>
            <li>บันทึกการเข้า-ออกระบบ และการเข้าระบบไม่สำเร็จ พร้อม IP</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
