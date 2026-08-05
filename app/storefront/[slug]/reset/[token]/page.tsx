import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PasswordResetForm from "../../../password-reset-form";

type PageProps = {
  params: Promise<{ slug: string; token: string }>;
};

export default async function StorefrontPasswordResetPage({ params }: PageProps) {
  const { slug, token } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });

  if (!store) {
    notFound();
  }

  return <PasswordResetForm token={token} successPath={`/storefront/${store.slug}/account`} storeName={store.name} />;
}