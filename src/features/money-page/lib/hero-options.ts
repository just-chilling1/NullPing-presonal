import { fetchNicheRelatedImage } from "@/features/blog-builder/lib/images";

export type NicheImageFetcher = (params: {
  niche?: string | null;
  productName?: string;
  seedOffset?: number;
  excludeUrls?: string[];
  excludeStockIds?: string[];
}) => Promise<string | null>;

const DEFAULT_COUNT = 5;
const MAX_ATTEMPTS_FACTOR = 3;

export async function fetchMoneyPageHeroOptions(params: {
  niche?: string | null;
  productName?: string;
  count?: number;
  excludeUrls?: string[];
  fetchOne?: NicheImageFetcher;
}): Promise<string[]> {
  const count = Math.max(0, Math.min(params.count ?? DEFAULT_COUNT, 10));
  if (count === 0) return [];

  const fetchOne = params.fetchOne ?? fetchNicheRelatedImage;
  const excludeUrls = [...(params.excludeUrls ?? [])];
  const out: string[] = [];
  const maxAttempts = count * MAX_ATTEMPTS_FACTOR;

  for (let attempt = 0; attempt < maxAttempts && out.length < count; attempt++) {
    const url = await fetchOne({
      niche: params.niche,
      productName: params.productName,
      seedOffset: attempt,
      excludeUrls,
    });
    if (!url) break;
    if (out.includes(url) || excludeUrls.includes(url)) continue;
    out.push(url);
    excludeUrls.push(url);
  }

  return out;
}
