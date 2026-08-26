import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractQuestionnaireQuestions } from "./questionnaire-runtime";

describe("extractQuestionnaireQuestions", () => {
  it("reads questions JSON from stored scripts without executing them", () => {
    const questions = extractQuestionnaireQuestions([
      `(function() {
        var questions = [{"id":"q1","question":"Goal?","options":[{"label":"A","value":"a"},{"label":"B","value":"b"}]}];
        eval("alert(1)");
        window.Quiz = { next: function() {} };
      })();`,
    ]);
    assert.equal(questions.length, 1);
    assert.equal(questions[0]?.id, "q1");
    assert.equal(questions[0]?.options.length, 2);
  });

  it("prefers application/json payload when present", () => {
    const questions = extractQuestionnaireQuestions([
      `[{"id":"from-json","question":"Ok?","options":[{"label":"Yes","value":"yes"}]}]`,
    ]);
    assert.equal(questions[0]?.id, "from-json");
  });

  it("returns an empty list for hostile non-JSON scripts", () => {
    const questions = extractQuestionnaireQuestions(["alert(1); window.location = 'https://evil.example'"]);
    assert.equal(questions.length, 0);
  });
});
