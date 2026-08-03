import { prisma } from "@/lib/prisma";
import { RequestActions } from "./request-actions";

export default async function AccountRequestsPage() {
  try {
    const requests = await prisma.accountRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        approvedAt: true,
        createdAt: true,
      },
    });
    type AccountRequestItem = (typeof requests)[number];

    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(237,242,247,0.94)_40%,_rgba(226,232,240,0.9))] px-6 py-10 text-slate-900 lg:px-10">
        <section className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Onboarding Queue
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Account requests
              </h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">
                Review new merchant signup submissions from the landing page.
              </p>
            </div>

            <a
              href="/stores"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Back to stores
            </a>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total requests"
              value={requests.length.toString()}
              note="All submissions"
            />
            <StatCard
              label="Last 7 days"
              value={requests
                .filter((request: AccountRequestItem) => Date.now() - new Date(request.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000)
                .length.toString()}
              note="Recent interest"
            />
            <StatCard
              label="Unique companies"
              value={new Set(requests.map((request: AccountRequestItem) => request.company).filter(Boolean)).size.toString()}
              note="Company names provided"
            />
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Onboarding
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      No account requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((request: AccountRequestItem) => (
                    <tr key={request.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-sm text-slate-800">{request.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{request.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{request.company ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(request.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="space-y-2">
                          {request.approvedAt ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Pending
                            </span>
                          )}
                          <RequestActions requestId={request.id} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  } catch (error) {
    console.error("[ACCOUNT_REQUESTS_PAGE_ERROR]", error);

    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(237,242,247,0.94)_40%,_rgba(226,232,240,0.9))] px-6 py-10 text-slate-900 lg:px-10">
        <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Account requests
          </h1>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Could not load account requests. Check database connectivity and try again.
          </p>
          <a
            href="/stores"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Back to stores
          </a>
        </section>
      </main>
    );
  }
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}
