/** Supabase sign-in errors in Thai; anything unexpected keeps its original text. */
export function loginErrorMessage(error: { code?: string; message: string }) {
  switch (error.code) {
    case "invalid_credentials":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "email_not_confirmed":
      return "บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาติดต่อผู้ดูแลระบบ";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
    default:
      return error.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : error.message;
  }
}
