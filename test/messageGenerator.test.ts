import test from "node:test";
import assert from "node:assert/strict";

import {
  MessageGenerationCanceledError,
  normalizeMessage,
  selectCommitMessage,
  summarizeStderr,
  generateMessage as executeMessage
} from "../src/messageGenerator";
import { buildCodexCommand } from "../src/providers/codex";

test("buildCodexCommand uses the default codex executable", () => {
  const command = buildCodexCommand(
    {
      codex: {
        codexPath: "codex",
        model: "",
        reasoningEffort: "medium"
      }
    },
    "Diff:\ndiff --git a/file b/file",
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

test("buildCodexCommand adds model and reasoning overrides when configured", () => {
  const command = buildCodexCommand(
    {
      codex: {
        codexPath: "codex",
        model: "gpt-5.4-mini",
        reasoningEffort: "low"
      }
    },
    "Diff:\ndiff --git a/file b/file",
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

test("generateMessage rejects with a cancellation error when the token is canceled", async () => {
  let listener: (() => void) | undefined;
  const token = {
    isCancellationRequested: false,
    onCancellationRequested(callback: () => void) {
      listener = callback;
      return {
        dispose() {
          listener = undefined;
        }
      };
    }
  };

  const generation = executeMessage(
    "prompt",
    5000,
    () => ({
      command: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10000);"],
      stdin: "prompt"
    }),
    {
      emptyMessage: "empty",
      missingCli: "missing",
      templateError: "template",
      timeout: "timeout",
      unexpected: "unexpected"
    },
    token
  );

  token.isCancellationRequested = true;
  listener?.();

  await assert.rejects(generation, MessageGenerationCanceledError);
});
