import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, verified: false }, { status: 401 });
    }
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      plan: user.plan,
      authenticated: true,
      verified: true,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
