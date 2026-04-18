import test from "node:test";
import assert from "node:assert/strict";

import { buildCommand, normalizeMessage, selectCommitMessage, summarizeStderr } from "../src/codex";

test("buildCommand uses the default codex executable", () => {
  const command = buildCommand(
    {
      codexPath: "codex",
      model: "",
      reasoningEffort: "medium",
      debugLogging: false,
      commandTemplate: "",
      promptTemplate: "Diff:\n{{diff}}",
      timeoutMs: 60000
    },
    "diff --git a/file b/file",
    "/tmp/codex-prompt.txt",
    "/tmp/codex-last-message.txt"
  );

  assert.equal(command.command, "codex");
  assert.deepEqual(command.args, [
    "exec",
    "--skip-git-repo-check",
    "-o",
    "/tmp/codex-last-message.txt",
    "-c",
    "model_reasoning_effort=\"medium\"",
    "-"
  ]);
  assert.equal(command.stdin, "Diff:\ndiff --git a/file b/file");
});

test("buildCommand adds model and reasoning overrides when configured", () => {
  const command = buildCommand(
    {
      codexPath: "codex",
      model: "gpt-5.4-mini",
      reasoningEffort: "low",
      debugLogging: false,
      commandTemplate: "",
      promptTemplate: "Diff:\n{{diff}}",
      timeoutMs: 60000
    },
    "diff --git a/file b/file",
    "/tmp/codex-prompt.txt",
    "/tmp/codex-last-message.txt"
  );

  assert.deepEqual(command.args, [
    "exec",
    "--skip-git-repo-check",
    "-o",
    "/tmp/codex-last-message.txt",
    "-m",
    "gpt-5.4-mini",
    "-c",
    "model_reasoning_effort=\"low\"",
    "-"
  ]);
  assert.equal(command.stdin, "Diff:\ndiff --git a/file b/file");
});

test("buildCommand expands the prompt file placeholder in a custom template", () => {
  const command = buildCommand(
    {
      codexPath: "codex",
      model: "",
      reasoningEffort: "medium",
      debugLogging: false,
      commandTemplate: "custom-codex --input {{promptFile}} --mode commit",
      promptTemplate: "unused {{diff}}",
      timeoutMs: 60000
    },
    "ignored",
    "/tmp/codex-prompt.txt",
    "/tmp/codex-last-message.txt"
  );

  assert.equal(command.command, "custom-codex");
  assert.deepEqual(command.args, ["--input", "/tmp/codex-prompt.txt", "--mode", "commit"]);
  assert.equal(command.stdin, undefined);
});

test("normalizeMessage trims surrounding whitespace", () => {
  assert.equal(normalizeMessage("  feat(core): 支持中文提交 \n"), "feat(core): 支持中文提交");
});

test("selectCommitMessage prefers the output file content", () => {
  assert.equal(selectCommitMessage("stdout value", " file value \n"), "file value");
});

test("selectCommitMessage falls back to stdout when the output file is empty", () => {
  assert.equal(selectCommitMessage(" stdout value \n", "   "), "stdout value");
});

test("summarizeStderr keeps only meaningful log lines", () => {
  const summary = summarizeStderr(`
Reading additional input from stdin...
2026-04-18T20:13:37Z  WARN codex_core::plugins::manifest: noisy warning
OpenAI Codex v0.121.0
--------
workdir: /tmp/example
model: gpt-5.4
provider: openai
approval: never
sandbox: workspace-write
reasoning effort: none
session id: abc123
--------
user
只输出 OK
final useful warning
`);

  assert.equal(summary, "final useful warning");
});
