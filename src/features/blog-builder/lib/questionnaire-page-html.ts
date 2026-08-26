import type { ThemeConfig } from "../types";
import { resolveThemeConfig, THEME_PRESETS, getReadyTemplateFromConfig } from "../themes";
import type { QuestionnaireCopy } from "./questionnaire-copy";
import { normalizeAffiliateUrl } from "./affiliate-url";

export interface ThemedQuestionnaireInput {
  siteId: string;
  niche: string;
  productName: string;
  copy: QuestionnaireCopy;
  affiliateUrl: string;
  themeConfig?: ThemeConfig | null;
  /** Skip track-click and link straight to the affiliate URL (accelerator preview). */
  directAffiliateLink?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trackClickHref(siteId: string, affiliateUrl: string): string {
  const url = normalizeAffiliateUrl(affiliateUrl);
  return `/api/blog/track-click?site=${encodeURIComponent(siteId)}&to=${encodeURIComponent(url)}`;
}

function parseHexColor(value: string): { r: number; g: number; b: number } | null {
  const hex = value.trim().replace("#", "");
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) return null;
  const normalized =
    hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function relativeLuminance(value: string): number {
  const rgb = parseHexColor(value);
  if (!rgb) return 0.5;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function brightenHex(value: string, amount = 0.45): string {
  const rgb = parseHexColor(value);
  if (!rgb) return "#fbbf24";
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(rgb.r)}${mix(rgb.g)}${mix(rgb.b)}`;
}

function accentOnBackground(accent: string, background: string): string {
  const accentLum = relativeLuminance(accent);
  const bgLum = relativeLuminance(background);
  if (bgLum < 0.25 && accentLum < 0.35) return brightenHex(accent, 0.55);
  if (bgLum > 0.7 && accentLum > 0.75) return "#0f766e";
  return accent;
}

function buildQuestionsJson(copy: QuestionnaireCopy): string {
  return JSON.stringify(copy.questions).replace(/</g, "\\u003c");
}

/** Build a full interactive questionnaire HTML document. */
export function buildThemedQuestionnairePage(input: ThemedQuestionnaireInput): string {
  const template = getReadyTemplateFromConfig(input.themeConfig);
  const { preset, colors, headingFont, bodyFont } = resolveThemeConfig(input.themeConfig);
  const presetDef = THEME_PRESETS[preset.id] ?? THEME_PRESETS.editorial;
  const googleFontsUrl = template.googleFontsUrl ?? presetDef.fonts.googleUrl;
  const normalizedAffiliate = normalizeAffiliateUrl(input.affiliateUrl);
  const ctaHref = input.directAffiliateLink
    ? normalizedAffiliate
    : trackClickHref(input.siteId, normalizedAffiliate);

  const isDark = template.structureId === "conversion";
  const isMinimal = template.structureId === "minimal";
  const bg = isDark ? "#0f0f10" : colors.bg;
  const surface = isDark ? "#18181b" : colors.surface;
  const text = isDark ? "#f4f4f5" : colors.text;
  const muted = isDark ? "#a1a1aa" : colors.muted;
  const accent = colors.accent;
  const accentSoft = colors.accentSoft ?? `${accent}1a`;
  const labelColor = accentOnBackground(accent, bg);
  const border = isDark ? "rgba(255,255,255,0.08)" : colors.border;
  const cardBg = isDark ? "#ffffff" : surface;
  const cardText = isDark ? "#1c1917" : colors.text;
  const cardMuted = isDark ? "#57534e" : colors.muted;
  const gradient = `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})`;
  const maxWidth = isMinimal ? "520px" : "640px";
  const borderRadius = isMinimal ? "12px" : isDark ? "16px" : "20px";

  const copy = input.copy;
  const title = escapeHtml(copy.title);
  const metaDescription = escapeHtml(copy.subtitle.slice(0, 155));
  const questionsJson = buildQuestionsJson(copy);
  const totalSteps = copy.questions.length + 2;

  const promoBulletsHtml = copy.promoBullets
    .map(
      (b) =>
        `<li><span class="bullet-icon">✓</span><span>${escapeHtml(b)}</span></li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${metaDescription}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${metaDescription}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsUrl}" rel="stylesheet">
  <style>
    .questionnaire-root {
      --bg: ${bg};
      --surface: ${surface};
      --text: ${text};
      --muted: ${muted};
      --accent: ${accent};
      --accent-soft: ${accentSoft};
      --label: ${labelColor};
      --border: ${border};
      --card-bg: ${cardBg};
      --card-text: ${cardText};
      --card-muted: ${cardMuted};
      --gradient: ${gradient};
      --heading-font: ${headingFont};
      --body-font: ${bodyFont};
      --max-width: ${maxWidth};
      --radius: ${borderRadius};
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: var(--body-font);
      line-height: 1.6;
    }
    .questionnaire-root * { margin: 0; padding: 0; box-sizing: border-box; }
    .questionnaire-root .quiz-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: clamp(24px, 5vw, 48px) 20px;
    }
    .questionnaire-root .quiz-card {
      width: 100%;
      max-width: var(--max-width);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: clamp(28px, 5vw, 40px);
      box-shadow: ${isDark ? "0 24px 64px rgba(0,0,0,0.45)" : "0 16px 48px rgba(0,0,0,0.06)"};
    }
    .questionnaire-root .progress-wrap {
      width: 100%;
      max-width: var(--max-width);
      margin-bottom: 20px;
    }
    .questionnaire-root .progress-meta {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .questionnaire-root .progress-bar {
      height: 6px;
      background: color-mix(in srgb, var(--accent) 12%, var(--surface));
      border-radius: 999px;
      overflow: hidden;
    }
    .questionnaire-root .progress-fill {
      height: 100%;
      background: var(--gradient);
      border-radius: 999px;
      transition: width 0.35s ease;
      width: 0%;
    }
    .questionnaire-root .step { display: none; animation: fadeIn 0.35s ease; }
    .questionnaire-root .step.active { display: block; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .questionnaire-root .badge {
      display: inline-block;
      padding: 6px 14px;
      background: var(--accent-soft);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: var(--label);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 16px;
    }
    .questionnaire-root h1 {
      font-family: var(--heading-font);
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      font-weight: 700;
      line-height: 1.15;
      margin-bottom: 12px;
      color: var(--text);
    }
    .questionnaire-root .subtitle {
      font-size: 1.05rem;
      color: var(--muted);
      margin-bottom: 24px;
      line-height: 1.55;
    }
    .questionnaire-root .intro-text {
      font-size: 1rem;
      color: var(--muted);
      margin-bottom: 28px;
      line-height: 1.65;
    }
    .questionnaire-root .question-text {
      font-family: var(--heading-font);
      font-size: clamp(1.15rem, 3vw, 1.45rem);
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--text);
      line-height: 1.35;
    }
    .questionnaire-root .options {
      display: grid;
      gap: 10px;
      margin-bottom: 28px;
    }
    .questionnaire-root .option-btn {
      display: block;
      width: 100%;
      text-align: left;
      padding: 16px 18px;
      background: ${isDark ? "rgba(255,255,255,0.04)" : "var(--card-bg)"};
      color: ${isDark ? "#f4f4f5" : "var(--card-text)"};
      border: 2px solid var(--border);
      border-radius: calc(var(--radius) - 4px);
      font-family: var(--body-font);
      font-size: 0.95rem;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s, transform 0.15s;
    }
    .questionnaire-root .option-btn:hover {
      border-color: color-mix(in srgb, var(--accent) 45%, transparent);
      transform: translateY(-1px);
    }
    .questionnaire-root .option-btn.selected {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--text);
    }
    .questionnaire-root .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 16px 28px;
      background: var(--gradient);
      color: #fff;
      border: none;
      border-radius: calc(var(--radius) - 4px);
      font-family: var(--body-font);
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 30%, transparent);
    }
    .questionnaire-root .btn-primary:hover { transform: translateY(-2px); }
    .questionnaire-root .btn-primary:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }
    .questionnaire-root .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 20px;
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 4px);
      font-family: var(--body-font);
      font-size: 0.9rem;
      cursor: pointer;
      margin-top: 12px;
      width: 100%;
      transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s;
    }
    .questionnaire-root .btn-secondary:hover {
      background: color-mix(in srgb, var(--accent) 8%, var(--surface));
      border-color: color-mix(in srgb, var(--accent) 35%, transparent);
      color: var(--text);
      transform: translateY(-1px);
    }
    .questionnaire-root .btn-secondary:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }
    .questionnaire-root .result-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--accent-soft);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 20px;
    }
    .questionnaire-root .promo-box {
      margin-top: 28px;
      padding: 24px;
      background: ${isDark ? "rgba(255,255,255,0.04)" : "var(--card-bg)"};
      border: 2px solid color-mix(in srgb, var(--accent) 35%, transparent);
      border-radius: calc(var(--radius) - 4px);
    }
    .questionnaire-root .promo-box h2 {
      font-family: var(--heading-font);
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 10px;
      color: ${isDark ? "#f4f4f5" : "var(--card-text)"};
    }
    .questionnaire-root .promo-box p {
      font-size: 0.95rem;
      color: ${isDark ? "#a1a1aa" : "var(--card-muted)"};
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .questionnaire-root .promo-list {
      list-style: none;
      display: grid;
      gap: 8px;
      margin-bottom: 20px;
    }
    .questionnaire-root .promo-list li {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font-size: 0.9rem;
      color: ${isDark ? "#e4e4e7" : "var(--card-text)"};
    }
    .questionnaire-root .bullet-icon {
      color: var(--label);
      font-weight: 800;
      flex-shrink: 0;
    }
    .questionnaire-root .promo-sub {
      font-size: 0.8rem;
      color: var(--muted);
      text-align: center;
      margin-top: 12px;
    }
    .questionnaire-root footer {
      margin-top: 32px;
      text-align: center;
      font-size: 12px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="questionnaire-root">
    <div class="quiz-shell">
      <div class="progress-wrap">
        <div class="progress-meta">
          <span id="step-label">Getting started</span>
          <span id="step-count">1 / ${totalSteps}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
      </div>

      <div class="quiz-card">
        <!-- Intro step -->
        <div class="step active" data-step="0">
          <span class="badge">${escapeHtml(input.niche)} Quiz</span>
          <h1>${title}</h1>
          <p class="subtitle">${escapeHtml(copy.subtitle)}</p>
          <p class="intro-text">${escapeHtml(copy.intro)}</p>
          <button type="button" class="btn-primary" onclick="Quiz.next()">Start the quiz →</button>
        </div>

        <!-- Question steps (rendered by JS) -->
        <div id="question-steps"></div>

        <!-- Results + promo step -->
        <div class="step" data-step="results">
          <div class="result-icon">✓</div>
          <h1>${escapeHtml(copy.resultHeadline)}</h1>
          <p class="intro-text">${escapeHtml(copy.resultMessage)}</p>

          <div class="promo-box">
            <h2>${escapeHtml(copy.promoHeadline)}</h2>
            <p>${escapeHtml(copy.promoBody)}</p>
            ${promoBulletsHtml ? `<ul class="promo-list">${promoBulletsHtml}</ul>` : ""}
            <a href="${ctaHref}" class="btn-primary" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.promoCta)} →</a>
            <p class="promo-sub">${escapeHtml(copy.promoSubtext)}</p>
          </div>
        </div>
      </div>

      <footer>© ${new Date().getFullYear()} · ${escapeHtml(input.niche)} Assessment</footer>
    </div>
  </div>

  <script type="application/json" id="questionnaire-data">${questionsJson}</script>
  <script>
  (function() {
    var questions = ${questionsJson};
    var totalSteps = ${totalSteps};
    var currentStep = 0;
    var answers = {};
    var container = document.getElementById('question-steps');
    var progressFill = document.getElementById('progress-fill');
    var stepLabel = document.getElementById('step-label');
    var stepCount = document.getElementById('step-count');

    questions.forEach(function(q, qi) {
      var stepDiv = document.createElement('div');
      stepDiv.className = 'step';
      stepDiv.setAttribute('data-step', String(qi + 1));
      var html = '<p class="badge">Question ' + (qi + 1) + ' of ' + questions.length + '</p>';
      html += '<p class="question-text">' + q.question.replace(/</g, '&lt;') + '</p>';
      html += '<div class="options">';
      q.options.forEach(function(opt) {
        html += '<button type="button" class="option-btn" data-qid="' + q.id + '" data-value="' + opt.value.replace(/"/g, '&quot;') + '" onclick="Quiz.select(this)">' + opt.label.replace(/</g, '&lt;') + '</button>';
      });
      html += '</div>';
      html += '<button type="button" class="btn-primary" id="next-' + q.id + '" disabled onclick="Quiz.next()">Continue →</button>';
      if (qi > 0) {
        html += '<button type="button" class="btn-secondary" onclick="Quiz.back()">← Back</button>';
      }
      stepDiv.innerHTML = html;
      container.appendChild(stepDiv);
    });

    function updateProgress() {
      var pct = Math.round((currentStep / (totalSteps - 1)) * 100);
      progressFill.style.width = pct + '%';
      stepCount.textContent = (currentStep + 1) + ' / ' + totalSteps;
      if (currentStep === 0) stepLabel.textContent = 'Getting started';
      else if (currentStep <= questions.length) stepLabel.textContent = 'Question ' + currentStep;
      else stepLabel.textContent = 'Your results';
    }

    function showStep(n) {
      document.querySelectorAll('.questionnaire-root .step').forEach(function(el) {
        el.classList.remove('active');
      });
      var target;
      if (n === 0) target = document.querySelector('[data-step="0"]');
      else if (n <= questions.length) target = document.querySelector('[data-step="' + n + '"]');
      else target = document.querySelector('[data-step="results"]');
      if (target) target.classList.add('active');
      currentStep = n;
      updateProgress();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.Quiz = {
      select: function(btn) {
        var qid = btn.getAttribute('data-qid');
        var val = btn.getAttribute('data-value');
        answers[qid] = val;
        btn.parentElement.querySelectorAll('.option-btn').forEach(function(b) {
          b.classList.remove('selected');
        });
        btn.classList.add('selected');
        var nextBtn = document.getElementById('next-' + qid);
        if (nextBtn) nextBtn.disabled = false;
      },
      next: function() {
        if (currentStep < questions.length) showStep(currentStep + 1);
        else showStep(questions.length + 1);
      },
      back: function() {
        if (currentStep > 0) showStep(currentStep - 1);
      }
    };

    updateProgress();

    // #start → intro (used by "Check questionnaire page"). #offer → final results step.
    if (location.hash === '#offer') showStep(questions.length + 1);
    else showStep(0);
  })();
  </script>
</body>
</html>`;
}

/** Re-export for ProductSiteView compatibility */
export { parseSalesPageDocument } from "./product-sales-page-html";
