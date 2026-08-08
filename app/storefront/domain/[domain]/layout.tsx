import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StorefrontShell from "../../storefront-shell";

type CustomDomainLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
};

export default async function CustomDomainLayout({ children, params }: CustomDomainLayoutProps) {
  const { domain } = await params;
  const normalizedDomain = decodeURIComponent(domain).toLowerCase();
  const candidateDomains = normalizedDomain.startsWith("www.")
    ? [normalizedDomain, normalizedDomain.slice(4)]
    : [normalizedDomain, `www.${normalizedDomain}`];

  const store = await prisma.store.findFirst({
    where: { customDomain: { in: candidateDomains } },
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

  return (
    <StorefrontShell store={store} categories={store.categories}>
      {children}
    </StorefrontShell>
  );
}
