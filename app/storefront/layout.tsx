export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* hide the root layout's global footer on all storefront routes */}
      <style>{`.public-footer { display: none !important; }`}</style>
      {children}
    </>
  );
}
