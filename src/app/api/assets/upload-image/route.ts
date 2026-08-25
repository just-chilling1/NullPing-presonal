import { NextResponse } from "next/server";
import { featureApiGuard } from "@/lib/feature-api-guard";
import { getApiUser } from "@/lib/api-auth";
import { NO_STORE_HEADERS } from "@/lib/api-cache-headers";
import { isSupportedImageType, uploadUserImage } from "@/features/blog-builder/lib/images";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

/** Upload a user-supplied image for the money page hero; return Supabase public URL. */
export async function POST(request: Request) {
  const guard = featureApiGuard("money-page");
  if (guard) return guard;

  const { supabase, user } = await getApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const contentType = file.type || "image/jpeg";
  if (!isSupportedImageType(contentType)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use PNG, JPG, WebP, GIF or AVIF." },
      { status: 415, headers: NO_STORE_HEADERS }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is too large (max 8MB)." },
      { status: 413, headers: NO_STORE_HEADERS }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadUserImage({ supabase, userId: user.id, buffer, contentType });
  if (!url) {
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json({ url }, { headers: NO_STORE_HEADERS });
}
