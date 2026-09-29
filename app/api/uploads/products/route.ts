import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/session";

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const contentType = request.headers.get("content-type") || "";

    // 1. Client-side direct upload via @vercel/blob/client
    // This allows uploading files up to 5MB (or more) directly from the browser,
    // completely bypassing Vercel's 4.5 MB Serverless Function body limit (HTTP 413).
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as HandleUploadBody;
      try {
        const jsonResponse = await handleUpload({
          body,
          request,
          token: blobToken,
          onBeforeGenerateToken: async () => {
            return {
              allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
              maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
              tokenPayload: JSON.stringify({ userId: user.id }),
            };
          },
          onUploadCompleted: async () => {
            // Optional completion hook
          },
        });

        return NextResponse.json(jsonResponse);
      } catch (error) {
        console.error("[HANDLE_UPLOAD_ERROR]", error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Client upload authorization failed." },
          { status: 400 },
        );
      }
    }

    // 2. Fallback: multipart/form-data upload through server
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

