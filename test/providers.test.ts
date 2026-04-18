import test from "node:test";
import assert from "node:assert/strict";

import { buildCommitPrompt } from "../src/providers";

test("buildCommitPrompt appends the selected output language instruction", () => {
  const prompt = buildCommitPrompt(
    "Generate a commit message for:\n{{diff}}",
    "diff --git a/file b/file",
    "ja"
  );

  assert.match(prompt, /diff --git a\/file b\/file/);
  assert.match(prompt, /Write the final commit message in Japanese\./);
  assert.match(prompt, /Return only the commit message/);
});

test("buildCommitPrompt supports traditional Chinese output", () => {
  const prompt = buildCommitPrompt("Message:\n{{diff}}", "diff", "zh-Hant");

  assert.match(prompt, /Write the final commit message in Traditional Chinese\./);
});

test("buildCommitPrompt defaults invalid output language values to English", () => {
  const prompt = buildCommitPrompt("Message:\n{{diff}}", "diff", "korean");

  assert.match(prompt, /Write the final commit message in English\./);
});
