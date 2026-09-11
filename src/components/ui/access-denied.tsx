import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";

export function AccessDenied({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-teal-100 bg-white py-16 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <FontAwesomeIcon icon={faLock} />
      </div>
      <p className="mt-4 text-lg font-semibold text-teal-950">ไม่มีสิทธิ์เข้าถึง{moduleName}</p>
      <p className="mt-1 text-sm text-teal-600">
        บัญชีของคุณไม่ได้รับสิทธิ์ในส่วนนี้ ติดต่อผู้ดูแลระบบหากคิดว่านี่เป็นความผิดพลาด
      </p>
    </div>
  );
}
