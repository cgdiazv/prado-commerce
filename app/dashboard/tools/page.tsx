import Link from "next/link";

export default function ToolsPage() {
  return (
    <section className="space-y-4">
      <div>
        <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Tools
        </p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          Data tools
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:max-w-xl sm:text-lg">
          Import and export your table data for migrations, backups, and bulk updates.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/tools/import-tables"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <h2 className="text-base font-semibold text-slate-950">Import tables</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload CSV or JSON files and map columns into your existing tables.
          </p>
        </Link>

        <Link
          href="/dashboard/tools/export-tables"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <h2 className="text-base font-semibold text-slate-950">Export tables</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Download your table data for reporting, migration, or offline analysis.
          </p>
        </Link>
      </div>
    </section>
  );
}
