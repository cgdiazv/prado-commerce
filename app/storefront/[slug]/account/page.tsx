import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StorefrontAccountContent from "../../storefront-account-content";

type PageProps = { params: Promise<{ slug: string }> };

export default async function StorefrontAccountPage({ params }: PageProps) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, logoUrl: true, activeTheme: true, mainColor: true, currency: true },
  });

  if (!store) notFound();

  return <StorefrontAccountContent store={store} />;
}
