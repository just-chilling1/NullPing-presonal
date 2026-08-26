"use client";

import { useEffect, useMemo, useRef } from "react";
import { parseSalesPageDocument } from "../lib/product-sales-page-html";
import {
  extractQuestionnaireQuestions,
  mountQuestionnaireQuiz,
} from "../lib/questionnaire-runtime";
import { isAllowedStylesheetUrl, sanitizeCss, sanitizePostHtml } from "../lib/sanitize-html";

interface QuestionnaireSiteEmbedProps {
  html: string;
}

/** Client-only mount. Stored scripts are parsed as JSON, never executed. */
export function QuestionnaireSiteEmbed({ html }: QuestionnaireSiteEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { styles, bodyHtml, scripts, googleFontsUrl } = useMemo(
    () => parseSalesPageDocument(html),
    [html]
  );
  const safeBody = useMemo(() => sanitizePostHtml(bodyHtml), [bodyHtml]);
  const safeStyles = useMemo(() => sanitizeCss(styles), [styles]);
  const questions = useMemo(() => extractQuestionnaireQuestions(scripts), [scripts]);
  const fontHref = googleFontsUrl && isAllowedStylesheetUrl(googleFontsUrl) ? googleFontsUrl : null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = safeBody;
    const unmount = mountQuestionnaireQuiz(container, questions);

    return () => {
      unmount();
      container.innerHTML = "";
    };
  }, [safeBody, questions]);

  return (
    <>
      {fontHref ? (
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      ) : null}
      {fontHref ? (
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      ) : null}
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}
      {safeStyles ? <style dangerouslySetInnerHTML={{ __html: safeStyles }} /> : null}
      <div ref={containerRef} className="min-h-screen isolate" />
    </>
  );
}
