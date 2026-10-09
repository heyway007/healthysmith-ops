// Column layouts of the order exports from each marketplace's Seller Center,
// plus our own template for the other channels (website / LINE / Facebook /
// หน้าร้าน). Every field lists the header names it may appear under (Thai and
// English exports); headers are compared case/space/punctuation-insensitively.
//
// Seller Centers rename columns from time to time -- when an upload fails
// with "ไม่พบคอลัมน์", add the new header text to the alias list here.

export type ImportFormat = "shopee" | "lazada" | "tiktok" | "generic";

export type FieldKey =
  | "orderId"
  | "status"
  | "orderDate"
  | "username"
  | "receiver"
  | "phone"
  | "productName"
  | "variation"
  | "sku"
  | "parentSku"
  | "quantity"
  | "unitPrice"
  | "paidPrice"
  | "itemDiscount"
  | "orderDiscount"
  | "shippingFee"
  | "billingName"
  | "billingTaxId"
  | "billingBranch";

export type FormatSpec = {
  label: string;
  /** sales_channels.code this format always imports into; null = user picks */
  channelCode: string | null;
  hint: string;
  fields: Partial<Record<FieldKey, string[]>>;
  /** each entry is one column (aliases); non-empty parts are joined with a space */
  addressParts: string[][];
  billingAddressParts?: string[][];
  /** order-level platform-funded discounts (summed, first row of the order) */
  platformDiscountCols?: string[][];
  /** per-line platform-funded discounts (summed over every line) */
  platformDiscountPerLine?: string[][];
  required: FieldKey[];
  /** true when every line repeats the order's shipping fee / seller voucher (take the first row) */
  orderLevelShipping: boolean;
  /** date strings like 03/04/2026 are day-first unless the file proves otherwise */
  dayFirst: boolean;
};

export const IMPORT_FORMATS: Record<ImportFormat, FormatSpec> = {
  shopee: {
    label: "Shopee",
    channelCode: "shopee",
    hint: "Seller Centre → คำสั่งซื้อของฉัน → ทั้งหมด → เลือกช่วงวันที่ → Export (.xlsx)",
    fields: {
      orderId: ["หมายเลขคำสั่งซื้อ", "Order ID"],
      status: ["สถานะการสั่งซื้อ", "Order Status"],
      orderDate: ["วันที่ทำการสั่งซื้อ", "Order Creation Date"],
      username: ["ชื่อผู้ใช้ (ผู้ซื้อ)", "Username (Buyer)"],
      receiver: ["ชื่อผู้รับ", "Receiver Name"],
      phone: ["หมายเลขโทรศัพท์", "Phone Number"],
      productName: ["ชื่อสินค้า", "Product Name"],
      variation: ["ชื่อตัวเลือก", "Variation Name"],
      sku: ["เลขอ้างอิง SKU (SKU Reference No.)", "SKU Reference No.", "เลขอ้างอิง SKU"],
      parentSku: ["เลขอ้างอิง Parent SKU", "Parent SKU Reference No."],
      quantity: ["จำนวน", "Quantity"],
      unitPrice: ["ราคาขาย", "Deal Price"],
      orderDiscount: ["โค้ดส่วนลดชำระโดยผู้ขาย", "Seller Voucher"],
      shippingFee: ["ค่าจัดส่งที่ชำระโดยผู้ซื้อ", "Buyer Paid Shipping Fee"],
    },
    addressParts: [["ที่อยู่ในการจัดส่ง", "Delivery Address"]],
    platformDiscountCols: [
      ["โค้ดส่วนลดชำระโดย Shopee", "Shopee Voucher"],
      ["ส่วนลดจาก Shopee", "Shopee Rebate"],
      ["ส่วนลดจากการใช้เหรียญ", "Shopee Coins Offset", "Coins Offset"],
    ],
    required: ["orderId", "orderDate", "productName", "quantity", "unitPrice"],
    orderLevelShipping: true,
    dayFirst: true,
  },
  lazada: {
    label: "Lazada",
    channelCode: "lazada",
    hint: "Seller Center → Orders → เลือกช่วงวันที่ → Export → All fields (.xlsx / .csv)",
    fields: {
      orderId: ["orderNumber", "Order Number", "Order No."],
      status: ["status", "Order Status"],
      orderDate: ["createTime", "Created at", "Create Time", "Order Date"],
      username: ["customerName", "Customer Name"],
      receiver: ["shippingName", "Shipping Name"],
      phone: ["shippingPhone", "Shipping Phone"],
      productName: ["itemName", "Item Name", "Product Name"],
      variation: ["variation"],
      sku: ["sellerSku", "Seller SKU"],
      quantity: ["quantity"],
      unitPrice: ["unitPrice", "Unit Price", "itemPrice"],
      paidPrice: ["paidPrice", "Paid Price"],
      itemDiscount: ["sellerDiscountTotal", "Seller Discount Total"],
      shippingFee: ["shippingFee", "Shipping Fee"],
      billingName: ["billingName", "Billing Name"],
      billingTaxId: ["taxCode", "Tax Code", "Tax ID"],
      billingBranch: ["branchNumber", "Branch Number"],
    },
    addressParts: [
      ["shippingAddress", "Shipping Address"],
      ["shippingAddress2"],
      ["shippingAddress3"],
      ["shippingAddress4"],
      ["shippingAddress5"],
      ["shippingCity", "Shipping City"],
      ["shippingPostCode", "Shipping Postcode"],
    ],
    billingAddressParts: [
      ["billingAddr", "Billing Address"],
      ["billingAddr2"],
      ["billingAddr3"],
      ["billingAddr4"],
      ["billingAddr5"],
      ["billingCity", "Billing City"],
      ["billingPostCode", "Billing Postcode"],
    ],
    required: ["orderId", "orderDate", "productName", "unitPrice"],
    orderLevelShipping: false,
    dayFirst: true,
  },
  tiktok: {
    label: "TikTok Shop",
    channelCode: "tiktok",
    hint: "Seller Center → Orders → Manage orders → Export → เลือกช่วงวันที่ (.xlsx / .csv)",
    fields: {
      orderId: ["Order ID"],
      status: ["Order Status"],
      orderDate: ["Created Time", "Paid Time"],
      username: ["Buyer Username", "Buyer Nickname"],
      receiver: ["Recipient"],
      phone: ["Phone #", "Phone"],
      productName: ["Product Name"],
      variation: ["Variation"],
      sku: ["Seller SKU"],
      quantity: ["Quantity"],
      unitPrice: ["SKU Unit Original Price"],
      itemDiscount: ["SKU Seller Discount"],
      shippingFee: ["Shipping Fee After Discount"],
    },
    addressParts: [
      ["Detail Address", "Address Line 1"],
      ["Additional address information", "Address Line 2"],
      ["Districts", "District"],
      ["Province"],
      ["Zipcode", "Postal Code"],
    ],
    platformDiscountPerLine: [["SKU Platform Discount"]],
    required: ["orderId", "orderDate", "productName", "quantity", "unitPrice"],
    orderLevelShipping: true,
    dayFirst: true,
  },
  generic: {
    label: "ไฟล์มาตรฐาน (เว็บไซต์ / LINE / Facebook / อื่นๆ)",
    channelCode: null,
    hint: "ดาวน์โหลดไฟล์ตัวอย่าง กรอก 1 แถวต่อ 1 รายการสินค้า — ออเดอร์เดียวกันใช้เลขที่ออเดอร์ซ้ำกัน",
    fields: {
      orderId: ["เลขที่ออเดอร์", "เลขที่คำสั่งซื้อ", "order_id", "Order ID"],
      status: ["สถานะ", "status"],
      orderDate: ["วันที่", "วันที่สั่งซื้อ", "order_date", "Date"],
      receiver: ["ชื่อลูกค้า", "ชื่อผู้ซื้อ", "buyer_name", "Customer Name"],
      phone: ["เบอร์โทร", "phone"],
      sku: ["รหัสสินค้า", "sku"],
      productName: ["ชื่อสินค้า", "product_name", "Product Name"],
      quantity: ["จำนวน", "quantity", "qty"],
      unitPrice: ["ราคาต่อหน่วย", "unit_price", "price"],
      itemDiscount: ["ส่วนลด", "discount"],
      shippingFee: ["ค่าส่ง", "shipping_fee"],
      billingName: ["ชื่อในใบกำกับ", "billing_name"],
      billingTaxId: ["เลขผู้เสียภาษี", "tax_id"],
      billingBranch: ["สาขา", "branch"],
    },
    addressParts: [["ที่อยู่", "ที่อยู่จัดส่ง", "address"]],
    billingAddressParts: [["ที่อยู่ในใบกำกับ", "billing_address"]],
    required: ["orderId", "productName", "quantity", "unitPrice"],
    orderLevelShipping: true,
    dayFirst: true,
  },
};

export const FIELD_LABELS: Record<FieldKey, string> = {
  orderId: "เลขที่ออเดอร์",
  status: "สถานะ",
  orderDate: "วันที่สั่งซื้อ",
  username: "ชื่อผู้ใช้ผู้ซื้อ",
  receiver: "ชื่อผู้รับ",
  phone: "เบอร์โทร",
  productName: "ชื่อสินค้า",
  variation: "ตัวเลือกสินค้า",
  sku: "SKU",
  parentSku: "Parent SKU",
  quantity: "จำนวน",
  unitPrice: "ราคาต่อหน่วย",
  paidPrice: "ราคาที่ชำระ",
  itemDiscount: "ส่วนลดจากร้าน",
  orderDiscount: "โค้ดส่วนลดจากร้าน",
  shippingFee: "ค่าส่ง",
  billingName: "ชื่อในใบกำกับ",
  billingTaxId: "เลขผู้เสียภาษี",
  billingBranch: "สาขา",
};
