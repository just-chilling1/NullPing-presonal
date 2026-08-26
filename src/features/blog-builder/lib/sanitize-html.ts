import * as cheerio from "cheerio";

const FORBIDDEN_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "link",
  "meta",
  "base",
  "svg",
  "math",
]);

/**
 * Strip executable / dangerous markup from member-edited post HTML.
 * Keeps normal article tags; removes scripts, event handlers, and javascript: URLs.
 */
export function sanitizePostHtml(html: string): string {
  const $ = cheerio.load(html, { xml: false }, false);

  $(Array.from(FORBIDDEN_TAGS).join(",")).remove();

  $("*").each((_, el) => {
    const node = el as {attribs?: Record<string, string> };
    const attribs = node.attribs;
    if (!attribs) return;
    for (const name of Object.keys(attribs)) {
      const lower = name.toLowerCase();
      if (lower.startsWith("on") || lower === "srcdoc" || lower === "formaction") {
        $(el).removeAttr(name);
        continue;
      }
      if (lower === "href" || lower === "src" || lower === "xlink:href") {
        const value = (attribs[name] ?? "").trim().toLowerCase();
        if (
          value.startsWith("javascript:") ||
          value.startsWith("vbscript:") ||
          value.startsWith("data:text/html")
        ) {
          $(el).removeAttr(name);
        }
      }
    }
  });

  return $.root().html()?.trim() ?? "";
}

/** Escape JSON for embedding inside <script type="application/ld+json">. */
export function safeJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

const GOOGLE_FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com"]);

export function isAllowedStylesheetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && GOOGLE_FONT_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/** Strip CSS constructs that can execute code or pull in attacker-controlled sheets. */
export function sanitizeCss(css: string): string {
  let out = css.replace(/<\/style/gi, "");
  out = out.replace(/@import\b[^;]*;?/gi, "");
  out = out.replace(/expression\s*\(/gi, "(");
  out = out.replace(/-moz-binding/gi, "");
  out = out.replace(/behavior\s*:/gi, "prop:");
  out = out.replace(/url\s*\(\s*(['"]?)\s*javascript:[^)]*\)/gi, "url()");
  out = out.replace(/url\s*\(\s*(['"]?)\s*data:\s*text\/html[^)]*\)/gi, "url()");
  out = out.replace(/javascript\s*:/gi, "");
  out = out.replace(/vbscript\s*:/gi, "");
  return out;
}
