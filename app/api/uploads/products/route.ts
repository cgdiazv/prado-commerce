import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        {
          error:
            "Image uploads are not configured. Set BLOB_READ_WRITE_TOKEN in your environment and restart the server.",
        },
        { status: 500 },
      );
    }

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP and GIF images are allowed" }, { status: 400 });
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const pathname = `products/${user.id}/${Date.now()}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      token: blobToken,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[UPLOAD_PRODUCT_IMAGE_ERROR]", error);
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 500 },
    );
  }
}
