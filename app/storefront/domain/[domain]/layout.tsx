import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
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
      customCss: true,
      ownerUser: {
        select: {
          plan: true,
        },
      },
      categories: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!store) {
    notFound();
  }

  const ownerPlan = getPlanOrDefault(store.ownerUser?.plan);
  const limits = getPlanLimits(ownerPlan);

  return (
    <StorefrontShell
      store={store}
      categories={store.categories}
      allowCustomCss={limits.allowCustomCss}
    >
      {children}
    </StorefrontShell>
  );
}
