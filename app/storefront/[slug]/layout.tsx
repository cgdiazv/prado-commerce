import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StorefrontShell from "../storefront-shell";

type StorefrontSlugLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function StorefrontSlugLayout({ children, params }: StorefrontSlugLayoutProps) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      activeTheme: true,
      mainColor: true,
      categories: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!store) {
    notFound();
  }

  const hdrs = await headers();
  const basePath = hdrs.get("x-storefront-subdomain") === "1" ? "" : `/storefront/${slug}`;

  return (
    <StorefrontShell store={store} categories={store.categories} basePath={basePath}>
      {children}
    </StorefrontShell>
  );
}
