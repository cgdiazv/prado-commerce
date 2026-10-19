import { redirect } from "next/navigation";

export default function ConsignmentsRedirect() {
  redirect("/dashboard/orders/consignments");
}
