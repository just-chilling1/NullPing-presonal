import { generateStructuredJSON, generateWithGPT, extractJsonFromText } from "./ai";
import {
  ARTICLE_SYSTEM_PROMPT,
  buildArticleUserPrompt,
  buildTerritorySuggestionsPrompt,
  normalizeArticleContent,
} from "./prompts";
import { localTerritorySuggestions } from "./local-territory-suggestions";
import { buildLocalArticleContent } from "./local-article-content";
import { buildRecurringStreamArticleContent } from "./authority-article-content";
import type { ArticleAngle, ContentTier, GeneratedPostContent } from "../types";

export async function generateBlogPostContent(params: {
  topic: string;
  territory: string;
  hobby: string;
  angle?: ArticleAngle;
  affiliateContext?: string;
  productContext?: string;
  productName?: string;
  trendContext?: string;
  contentTier?: ContentTier;
}): Promise<GeneratedPostContent> {
  const angle = params.angle ?? "pillar-guide";
  const tier = params.contentTier ?? "full";
  const hasAiKey = Boolean(process.env.RAPIDAPI_KEY?.trim());

  if (!hasAiKey) {
    if (tier === "authority") {
      const { wordCount: _wc, ...content } = buildRecurringStreamArticleContent(params);
      return content;
    }
    return buildLocalArticleContent(params);
  }

  const userPrompt = buildArticleUserPrompt({
    topic: params.topic,
    territory: params.territory,
    hobby: params.hobby,
    angle,
    affiliateContext: params.affiliateContext,
    productContext: params.productContext,
    productName: params.productName,
    trendContext: params.trendContext,
    contentTier: tier,
  });

  try {
    return await generateStructuredJSON<GeneratedPostContent>({
      systemPrompt: ARTICLE_SYSTEM_PROMPT,
      userPrompt,
      repairHint:
        "Return ONLY valid JSON with keys title, excerpt, metaDescription, html. The html must include at least three <h2> sections and several <p> paragraphs. No markdown fences.",
      validate: (raw) => {
        if (!raw || typeof raw !== "object") return null;
        return normalizeArticleContent(
          raw as Partial<GeneratedPostContent>,
          params.topic,
          params.territory,
          tier === "authority" ? { minWords: 1000, requireFaq: true } : undefined
        );
      },
      options: {
        temperature: 0.3,
        maxRetries: tier === "deploy" ? 2 : tier === "authority" ? 4 : 3,
        maxRepairAttempts: tier === "deploy" ? 1 : tier === "authority" ? 3 : 2,
      },
    });
  } catch (err) {
    if (tier === "deploy" || tier === "authority") {
      console.warn("[generate-content] AI failed — using local fallback", err);
      if (tier === "authority") {
        const { wordCount: _wc, ...content } = buildRecurringStreamArticleContent(params);
        return content;
      }
      return buildLocalArticleContent(params);
    }
    throw err;
  }
}

export async function suggestTerritories(hobby: string): Promise<string[]> {
  const { system, user } = buildTerritorySuggestionsPrompt(hobby);

  try {
    const raw = await generateWithGPT(system, user, { temperature: 0.5, maxRetries: 2 });
    const parsed = extractJsonFromText(raw) as { suggestions?: string[] } | null;

    if (parsed?.suggestions?.length) {
      return parsed.suggestions
        .filter((s) => typeof s === "string" && s.trim().length > 8)
        .slice(0, 6);
    }
  } catch {
    /* fallback */
  }

  return localTerritorySuggestions(hobby);
}
