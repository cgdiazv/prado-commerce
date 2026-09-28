import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { EditCustomerForm } from "./edit-customer-form";

type CustomerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CustomerEditPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again after database connectivity is restored.
        </div>
      </section>
    );
  }

  let stores = [];
  let customer = null;

  try {
    stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    customer = await prisma.customer.findFirst({
      where: {
        id,
        store: {
          ownerUserId: user.id,
        },
      },
    });

    if (!customer) {
      notFound();
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String((error as any).digest).startsWith("NEXT_NOT_FOUND")) {
      throw error;
    }
    console.error("[CUSTOMER_EDIT_PAGE_DB_ERROR]", error);
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load customer details. Please check database connectivity and refresh.
        </div>
      </section>
    );
  }

  const serializedCustomer = JSON.parse(
    JSON.stringify({
      id: customer.id,
      storeId: customer.storeId,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      shippingAddress: customer.shippingAddress,
      billingAddress: customer.billingAddress,
    })
  );

  const serializedStores = JSON.parse(JSON.stringify(stores));

  return <EditCustomerForm stores={serializedStores} customer={serializedCustomer} />;
}
