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
      <section className="overflow-hidden rounded-xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again after database connectivity is restored.
        </div>
      </section>
    );
  }

  const stores = await prisma.store.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      currency: true,
    },
  });

  const customer = await prisma.customer.findFirst({
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

  const serializedCustomer = {
    id: customer.id,
    storeId: customer.storeId,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    shippingAddress: customer.shippingAddress,
    billingAddress: customer.billingAddress,
  };

  return <EditCustomerForm stores={stores} customer={serializedCustomer} />;
}
