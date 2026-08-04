export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* hide the root layout's global footer on checkout routes */}
      <style>{`.public-footer { display: none !important; }`}</style>
      {children}
    </>
  );
}
