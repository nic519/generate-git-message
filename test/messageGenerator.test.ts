import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMessage, selectCommitMessage, summarizeStderr } from "../src/messageGenerator";
import { buildCodexCommand } from "../src/providers/codex";
import { resolveShellCommand } from "../src/providers/shell";

test("buildCodexCommand uses the default codex executable", () => {
  const command = buildCodexCommand(
    {
      codex: {
        codexPath: "codex",
        model: "",
        reasoningEffort: "medium",
        commandTemplate: ""
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
        reasoningEffort: "low",
        commandTemplate: ""
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

test("buildCodexCommand expands the prompt file placeholder in a custom template", () => {
  const command = buildCodexCommand(
    {
      codex: {
        codexPath: "codex",
        model: "",
        reasoningEffort: "medium",
        commandTemplate: 'custom-codex --input "{{promptFile}}" --mode commit'
      }
    },
    "unused prompt text",
    "/tmp/codex prompt file.txt",
    "/tmp/codex-last-message.txt"
  );

  const shell = resolveShellCommand();
  assert.equal(command.command, shell.command);
  assert.deepEqual(command.args, [...shell.args, 'custom-codex --input "/tmp/codex prompt file.txt" --mode commit']);
  assert.equal(command.stdin, undefined);
});

test("resolveShellCommand returns the Windows command shape when requested", () => {
  const shell = resolveShellCommand("win32", "C:\\Windows\\System32\\cmd.exe");

  assert.equal(shell.command, "C:\\Windows\\System32\\cmd.exe");
  assert.deepEqual(shell.args, ["/d", "/s", "/c"]);
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
