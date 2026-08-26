import type { QuestionnaireQuestion } from "./questionnaire-copy";

function asQuestion(raw: unknown): QuestionnaireQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const question = typeof item.question === "string" ? item.question : "";
  const id = typeof item.id === "string" && item.id.trim() ? item.id : "";
  if (!question || !id) return null;
  const optionsRaw = Array.isArray(item.options) ? item.options : [];
  const options = optionsRaw
    .map((opt, index) => {
      if (!opt || typeof opt !== "object") return null;
      const row = opt as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label : "";
      const value =
        typeof row.value === "string" && row.value.trim()
          ? row.value
          : `opt${index + 1}`;
      if (!label) return null;
      return { label, value };
    })
    .filter((opt): opt is { label: string; value: string } => Boolean(opt));
  if (options.length === 0) return null;
  return { id, question, options };
}

function parseQuestionsJson(raw: string): QuestionnaireQuestion[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(asQuestion).filter((item): item is QuestionnaireQuestion => Boolean(item));
  } catch {
    return [];
  }
}

function extractJsonArrayLiteral(source: string): string | null {
  const marker = source.indexOf("var questions");
  const startFrom = marker >= 0 ? marker : 0;
  const start = source.indexOf("[", startFrom);
  if (start < 0) return null;

  let depth = 0;
  let inString: '"' | "'" | null = null;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

/** Parse quiz questions from stored page scripts. Never evals the script. */
export function extractQuestionnaireQuestions(scripts: string[]): QuestionnaireQuestion[] {
  for (const script of scripts) {
    const trimmed = script.trim();
    if (!trimmed) continue;
    const direct = parseQuestionsJson(trimmed);
    if (direct.length > 0) return direct;
    const literal = extractJsonArrayLiteral(trimmed);
    if (literal) {
      const fromVar = parseQuestionsJson(literal);
      if (fromVar.length > 0) return fromVar;
    }
  }
  return [];
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** First-party quiz controller. Does not run stored inline scripts. */
export function mountQuestionnaireQuiz(
  container: HTMLElement,
  questions: QuestionnaireQuestion[]
): () => void {
  const stepsRoot = container.querySelector("#question-steps");
  if (!stepsRoot || questions.length === 0) return () => undefined;

  stepsRoot.replaceChildren();
  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    const step = el("div", "step");
    step.setAttribute("data-step", String(qi + 1));
    step.appendChild(el("p", "badge", `Question ${qi + 1} of ${questions.length}`));
    step.appendChild(el("p", "question-text", q.question));
    const options = el("div", "options");
    for (const opt of q.options) {
      const btn = el("button", "option-btn", opt.label);
      btn.type = "button";
      btn.dataset.qid = q.id;
      btn.dataset.value = opt.value;
      options.appendChild(btn);
    }
    step.appendChild(options);
    const next = el("button", "btn-primary", "Continue →");
    next.type = "button";
    next.id = `next-${q.id}`;
    next.disabled = true;
    next.dataset.quiz = "next";
    step.appendChild(next);
    if (qi > 0) {
      const back = el("button", "btn-secondary", "← Back");
      back.type = "button";
      back.dataset.quiz = "back";
      step.appendChild(back);
    }
    stepsRoot.appendChild(step);
  }

  const introNext = container.querySelector<HTMLButtonElement>('.step[data-step="0"] .btn-primary');
  if (introNext && introNext.tagName === "BUTTON") {
    introNext.dataset.quiz = "next";
    introNext.removeAttribute("onclick");
  }

  const progressFill = container.querySelector<HTMLElement>("#progress-fill");
  const stepLabel = container.querySelector<HTMLElement>("#step-label");
  const stepCount = container.querySelector<HTMLElement>("#step-count");
  const totalSteps = questions.length + 2;
  let currentStep = 0;
  const answers: Record<string, string> = {};

  function updateProgress() {
    if (progressFill) {
      progressFill.style.width = `${Math.round((currentStep / (totalSteps - 1)) * 100)}%`;
    }
    if (stepCount) stepCount.textContent = `${currentStep + 1} / ${totalSteps}`;
    if (stepLabel) {
      if (currentStep === 0) stepLabel.textContent = "Getting started";
      else if (currentStep <= questions.length) stepLabel.textContent = `Question ${currentStep}`;
      else stepLabel.textContent = "Your results";
    }
  }

  function showStep(n: number) {
    container.querySelectorAll(".questionnaire-root .step").forEach((node) => {
      node.classList.remove("active");
    });
    let target: Element | null = null;
    if (n === 0) target = container.querySelector('[data-step="0"]');
    else if (n <= questions.length) target = container.querySelector(`[data-step="${n}"]`);
    else target = container.querySelector('[data-step="results"]');
    target?.classList.add("active");
    currentStep = n;
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onClick(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const option = target.closest<HTMLElement>(".option-btn");
    if (option && container.contains(option)) {
      const qid = option.dataset.qid;
      const val = option.dataset.value;
      if (!qid || val == null) return;
      answers[qid] = val;
      option.parentElement?.querySelectorAll(".option-btn").forEach((btn) => {
        btn.classList.remove("selected");
      });
      option.classList.add("selected");
      const nextBtn = container.querySelector<HTMLButtonElement>(`#next-${CSS.escape(qid)}`);
      if (nextBtn) nextBtn.disabled = false;
      return;
    }
    const action = target.closest<HTMLElement>("[data-quiz]");
    if (!action || !container.contains(action)) return;
    if (action.dataset.quiz === "next") {
      if (currentStep < questions.length) showStep(currentStep + 1);
      else showStep(questions.length + 1);
      return;
    }
    if (action.dataset.quiz === "back" && currentStep > 0) {
      showStep(currentStep - 1);
    }
  }

  container.addEventListener("click", onClick);
  if (window.location.hash === "#offer") showStep(questions.length + 1);
  else showStep(0);

  return () => {
    container.removeEventListener("click", onClick);
  };
}
