import { NextResponse } from "next/server";
import { syncMerchantsToResendAudience } from "@/lib/newsletter-sync";

export async function POST(req: Request) {
    try {
        // Optional: Protect with an internal CRON_SECRET or session check
        const authHeader = req.headers.get("authorization");
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await syncMerchantsToResendAudience();
        return NextResponse.json({ success: true, ...result });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Sync failed";
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
