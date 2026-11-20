// Limits for the company logo upload. Shared by the browser picker (instant
// feedback) and the server action (the real check).

export const LOGO_BUCKET = "company-assets";
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_ACCEPT = LOGO_TYPES.join(",");
export const LOGO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const LOGO_MAX_SIDE_PX = 2000; // longest side
/** wider-than-tall (or taller-than-wide) by at most this factor */
export const LOGO_MAX_RATIO = 2;

export const LOGO_HINT =
  "ไฟล์ JPG / PNG / WebP ขนาดไม่เกิน 2 MB · สัดส่วนกว้าง:สูงไม่เกิน 2:1 (ดีที่สุดคือสี่เหลี่ยมจัตุรัส 1:1) · ด้านที่ยาวที่สุดไม่เกิน 2000 พิกเซล · แนะนำ 500×500 พิกเซล พื้นหลังโปร่งใส (PNG)";
