import { ImageResponse } from "next/og";
import { getServiceRoleClient } from "@/lib/api-auth";
import { readFile } from "fs/promises";
import path from "path";
import { pinRenderBackgroundCandidates } from "@/features/traffic/lib/pin-images";
import { pinOverlayHeadline } from "@/features/traffic/lib/pin-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIN_WIDTH = 1200;
const PIN_HEIGHT = 675;

async function loadFont(): Promise<ArrayBuffer | undefined> {
  const file = path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf");
  try {
    const buf = await readFile(file);
    const magic = buf.subarray(0, 4).toString("ascii");
    const valid =
      magic === "\0\u0001\0\0" || magic === "OTTO" || magic === "true" || magic === "wOFF" || magic === "wOF2";
    if (!valid) return undefined;
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  } catch {
    return undefined;
  }
}

function sniffMime(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "image/jpeg";
}

/** Fetch photo server-side and embed as data URI so Satori always has pixels. */
async function toDataImageUrl(url: string): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  if (url.startsWith("data:image/")) return url;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "NullPingPinImage/1.0", Accept: "image/*,*/*" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 64) return null;
    const mime = sniffMime(buf);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ pinId: string }> }
) {
  const { pinId } = await context.params;
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return new Response("Server misconfigured", { status: 503 });
  }

  let pinQuery = await supabase
    .from("site_pins")
    .select("id, headline, title, site_id, source_image_url, idx")
    .eq("id", pinId)
    .maybeSingle();

  if (pinQuery.error) {
    pinQuery = await supabase
      .from("site_pins")
      .select("id, headline, title, site_id")
      .eq("id", pinId)
      .maybeSingle();
  }

  const pin = pinQuery.data;
  if (!pin) {
    return new Response("Not found", { status: 404 });
  }

  const { data: site } = await supabase
    .from("sites")
    .select("product_name, title, hobby, sales_page_json")
    .eq("id", pin.site_id)
    .maybeSingle();

  const { data: siblingPins } = await supabase
    .from("site_pins")
    .select("id, source_image_url, idx")
    .eq("site_id", pin.site_id)
    .neq("id", pinId);

  const siblingSources = (siblingPins ?? [])
    .map((row) => (row as { source_image_url?: string | null }).source_image_url)
    .filter((url): url is string => Boolean(url?.trim()));

  const copy = (site?.sales_page_json ?? {}) as {
    heroImage?: string;
    pinImages?: Record<string, string>;
  };
  const headline = pinOverlayHeadline(pin.headline || pin.title || "Read the review");
  const product = site?.product_name || site?.title || "";
  const download = new URL(request.url).searchParams.get("download") === "1";
  const pinIdx = typeof (pin as { idx?: number }).idx === "number" ? (pin as { idx: number }).idx : -1;
  const safeIdx = pinIdx >= 0 ? pinIdx : Math.abs(pinId.split("").reduce((n, c) => n + c.charCodeAt(0), 0)) % 10;

  const candidateUrls = pinRenderBackgroundCandidates({
    sourceImageUrl: (pin as { source_image_url?: string | null }).source_image_url,
    pinImageUrl: copy.pinImages?.[pin.id],
    heroImage: copy.heroImage,
    productName: product,
    pinIdx: safeIdx,
    headline,
    hobby: site?.hobby ?? null,
    width: PIN_WIDTH,
    height: PIN_HEIGHT,
    excludeUrls: [
      ...siblingSources,
      ...Object.values(copy.pinImages ?? {}).filter((url) => url !== copy.pinImages?.[pin.id]),
    ],
  });

  let backgroundDataUrl: string | null = null;
  for (const candidate of candidateUrls) {
    backgroundDataUrl = await toDataImageUrl(candidate);
    if (backgroundDataUrl) break;
  }

  const fontData = await loadFont();
  const overlay = pinOverlayHeadline(headline, 34);
  const headlineSize = overlay.length > 28 ? 36 : overlay.length > 20 ? 40 : 44;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: PIN_WIDTH,
          height: PIN_HEIGHT,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "#F8FAFC",
          fontFamily: "Inter",
          background: "#050508",
        }}
      >
        {backgroundDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={backgroundDataUrl}
            width={PIN_WIDTH}
            height={PIN_HEIGHT}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: PIN_WIDTH,
              height: PIN_HEIGHT,
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: PIN_WIDTH,
              height: PIN_HEIGHT,
              background: "linear-gradient(135deg, #0A1020 0%, #050508 55%, #121832 100%)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: PIN_WIDTH,
            height: 200,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "28px 48px 36px",
            background:
              "linear-gradient(180deg, rgba(5,5,8,0) 0%, rgba(5,5,8,0.72) 42%, rgba(5,5,8,0.94) 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: "#00F0FF",
              marginBottom: 10,
              letterSpacing: 2.5,
              fontWeight: 700,
            }}
          >
            NULLPING CASH
          </div>
          <div
            style={{
              display: "flex",
              fontSize: headlineSize,
              lineHeight: 1.2,
              fontWeight: 700,
              width: 1100,
              height: 100,
              overflow: "hidden",
            }}
          >
            {overlay}
          </div>
        </div>
      </div>
    ),
    {
      width: PIN_WIDTH,
      height: PIN_HEIGHT,
      fonts: fontData
        ? [{ name: "Inter", data: fontData, weight: 700, style: "normal" }]
        : undefined,
      headers: download
        ? {
            "Content-Disposition": `attachment; filename="pin-${pinId.slice(0, 8)}.png"`,
          }
        : undefined,
    }
  );

  return image;
}
