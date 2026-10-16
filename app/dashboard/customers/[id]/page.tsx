import type { ComponentProps } from "react";
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

  let serializedStores: Array<{ id: string; name: string; currency: string }> = [];
  let serializedCustomer: ComponentProps<typeof EditCustomerForm>["customer"] | null = null;
  let serializedGroups: Array<{ id: string; name: string }> = [];
  let isNotFoundError = false;
  let loadError: string | null = null;

  try {
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
      isNotFoundError = true;
    } else {
      const groups = await prisma.customerGroup.findMany({
        where: { storeId: customer.storeId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
        },
      });

      serializedCustomer = JSON.parse(
        JSON.stringify({
          id: customer.id,
          storeId: customer.storeId,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          groupId: customer.groupId,
          shippingAddress: customer.shippingAddress,
          billingAddress: customer.billingAddress,
        })
      );

      serializedStores = JSON.parse(JSON.stringify(stores));
      serializedGroups = JSON.parse(JSON.stringify(groups));
    }
  } catch (error) {
    console.error("[CUSTOMER_EDIT_PAGE_DB_ERROR]", error);
    loadError = "Could not load customer details. Please check database connectivity and refresh.";
  }

  if (isNotFoundError) {
    notFound();
  }

  if (loadError || !serializedCustomer) {
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadError || "Customer not found."}
        </div>
      </section>
    );
  }

  return (
    <EditCustomerForm
      stores={serializedStores}
      customer={serializedCustomer}
      groups={serializedGroups}
    />
  );
}
