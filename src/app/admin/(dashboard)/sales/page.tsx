import { redirect } from "next/navigation";

export default function SalesIndexPage() {
  redirect("/admin/sales/orders");
}
