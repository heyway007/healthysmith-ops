import { redirect } from "next/navigation";

export default function InventoryIndexPage() {
  redirect("/admin/inventory/stock");
}
