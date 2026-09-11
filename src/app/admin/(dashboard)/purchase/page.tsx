import { redirect } from "next/navigation";

export default function PurchaseIndexPage() {
  redirect("/admin/purchase/requests");
}
