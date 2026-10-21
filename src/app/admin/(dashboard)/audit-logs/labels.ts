// Display names / links for audit log entries.

export const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  insert: { label: "เพิ่ม", className: "bg-emerald-100 text-emerald-700" },
  update: { label: "แก้ไข", className: "bg-amber-100 text-amber-700" },
  delete: { label: "ลบ", className: "bg-rose-100 text-rose-700" },
  "auth.login": { label: "เข้าสู่ระบบ", className: "bg-teal-100 text-teal-700" },
  "auth.login_failed": { label: "เข้าสู่ระบบไม่สำเร็จ", className: "bg-rose-100 text-rose-700" },
  "auth.logout": { label: "ออกจากระบบ", className: "bg-gray-200 text-gray-600" },
  "account.create": { label: "สร้างบัญชี", className: "bg-indigo-100 text-indigo-700" },
  "account.update": { label: "แก้ไขบัญชี", className: "bg-indigo-100 text-indigo-700" },
};

/** Grouped for the table filter; also the Thai name shown per entry. */
export const TABLE_GROUPS: { label: string; tables: Record<string, string> }[] = [
  {
    label: "ระบบขาย",
    tables: {
      sales_orders: "ออเดอร์",
      order_imports: "นำเข้าออเดอร์",
      tax_invoices: "ใบกำกับภาษี",
      tax_invoice_orders: "ออเดอร์ในใบกำกับภาษี",
      customers: "ลูกค้า",
      customer_addresses: "ที่อยู่ลูกค้า",
      sales_channels: "ช่องทางขาย",
      quotations: "ใบเสนอราคา",
      quotation_items: "รายการใบเสนอราคา",
      invoices: "ใบแจ้งหนี้",
      invoice_items: "รายการใบแจ้งหนี้",
      receipts: "ใบเสร็จรับเงิน",
      shipments: "การจัดส่ง",
      sales_returns: "รับคืนสินค้า",
      sales_return_items: "รายการรับคืนสินค้า",
    },
  },
  {
    label: "ซื้อของ / ค่าใช้จ่าย",
    tables: {
      purchase_bills: "บิลซื้อ / ค่าใช้จ่าย",
      purchase_bill_items: "รายการในบิลซื้อ",
      ap_payments: "การจ่ายเงิน",
      suppliers: "ร้านค้า / ผู้ขาย",
      purchase_requests: "ใบขอซื้อ",
      purchase_request_items: "รายการใบขอซื้อ",
      purchase_orders: "ใบสั่งซื้อ",
      purchase_order_items: "รายการใบสั่งซื้อ",
      goods_receipts: "ใบรับสินค้า",
      goods_receipt_items: "รายการรับสินค้า",
      purchase_approvals: "การอนุมัติจัดซื้อ",
    },
  },
  {
    label: "พนักงาน & เงินเดือน",
    tables: {
      employees: "พนักงาน",
      employee_salary_history: "ประวัติเงินเดือน",
      employee_deduction_settings: "รายการหักเงิน",
      leave_requests: "ใบลา",
      leave_types: "ประเภทการลา",
      departments: "แผนก",
      positions: "ตำแหน่ง",
      teams: "ทีม",
      company_holidays: "วันหยุด / WFH",
      payroll_periods: "งวดเงินเดือน",
      payroll_runs: "รอบจ่ายเงินเดือน",
      payroll_items: "รายการเงินเดือน",
      ot_records: "OT",
      bonus_commission_records: "โบนัส / คอมมิชชั่น",
      social_security_contributions: "ประกันสังคม",
      payslips: "สลิปเงินเดือน",
    },
  },
  {
    label: "ระบบ",
    tables: {
      auth_users: "บัญชีผู้ใช้",
      user_roles: "สิทธิ์ผู้ใช้",
      companies: "ข้อมูลบริษัท",
      products: "สินค้า",
    },
  },
];

export const TABLE_LABELS: Record<string, string> = Object.assign(
  {},
  ...TABLE_GROUPS.map((g) => g.tables)
);

const RECORD_PATHS: Record<string, string> = {
  sales_orders: "/admin/sales/orders",
  tax_invoices: "/admin/sales/tax-invoices",
  tax_invoice_orders: "/admin/sales/tax-invoices",
  customers: "/admin/sales/customers",
  purchase_bills: "/admin/purchase/bills",
  suppliers: "/admin/purchase/suppliers",
  employees: "/admin/hr",
  teams: "/admin/teams",
  company_holidays: "/admin/holidays",
  user_roles: "/admin/users",
  auth_users: "/admin/users",
};

/** Link to the record's own page, when it has one and still exists. */
export function recordHref(table: string | null, recordId: string | null, action: string) {
  if (!table || !recordId || action === "delete") return null;
  const base = RECORD_PATHS[table];
  return base ? `${base}/${recordId}` : null;
}

// Personal / pay data: hidden behind a "show" toggle like the HR list.
const SENSITIVE = /salary|_pay$|^net_|^gross_|id_card|bank_account_number|social_security_number/;

export function isSensitiveField(table: string | null, key: string) {
  return SENSITIVE.test(key) || (table === "employees" && key === "tax_id");
}

/** Columns that only add noise when listing what a new/deleted row held. */
export const NOISE_FIELDS = new Set(["id", "created_at", "updated_at"]);
