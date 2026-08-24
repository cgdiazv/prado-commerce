import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
      phone: user.phone,
      address: user.address,
      addressType: user.addressType,
      plan: user.plan,
      authenticated: true,
      verified: true,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, company, phone, address, addressType } = body;

    const updatedUser = await prisma.merchantUser.update({
      where: { id: user.id },
      data: {
        name: typeof name === "string" ? name.trim() : undefined,
        company: typeof company === "string" ? company.trim() : undefined,
        phone: typeof phone === "string" ? phone.trim() : undefined,
        address: typeof address === "string" ? address.trim() : undefined,
        addressType: typeof addressType === "string" ? addressType.trim() : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        company: updatedUser.company,
        phone: updatedUser.phone,
        address: updatedUser.address,
        addressType: updatedUser.addressType,
        plan: updatedUser.plan,
      },
    });
  } catch (error) {
    console.error("Error updating merchant user:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
