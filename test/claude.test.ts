import test from "node:test";
import assert from "node:assert/strict";

import { generateMessage } from "../src/providers";
import { buildClaudeCommand } from "../src/providers/claude";
import { resolveShellCommand } from "../src/providers/shell";

test("buildClaudeCommand uses the default local claude executable", () => {
  const command = buildClaudeCommand(
    {
      claude: {
        claudePath: "claude",
        claudeCommandTemplate: ""
      }
    },
    "feat: add provider support",
    "/tmp/claude-prompt.txt",
    "/tmp/claude-last-message.txt"
  );

  assert.equal(command.command, "claude");
  assert.deepEqual(command.args, ["-p", "--output-format", "text"]);
  assert.equal(command.stdin, "feat: add provider support");
});

test("buildClaudeCommand expands the prompt file placeholder in a custom template", () => {
  const command = buildClaudeCommand(
    {
      claude: {
        claudePath: "claude",
        claudeCommandTemplate: 'claude -p --output-format text --append-system-prompt "file={{promptFile}}"'
      }
    },
    "ignored",
    "/tmp/claude prompt.txt",
    "/tmp/claude-last-message.txt"
  );

  const shell = resolveShellCommand();
  assert.equal(command.command, shell.command);
  assert.deepEqual(command.args, [
    ...shell.args,
    'claude -p --output-format text --append-system-prompt "file=/tmp/claude prompt.txt"'
  ]);
  assert.equal(command.stdin, undefined);
});

test("generateMessage executes a custom shell template", async () => {
  const result = await generateMessage(
    {
      provider: "claude",
      common: {
        debugLogging: false,
        promptTemplate: "Diff:\n{{diff}}",
        timeoutMs: 5000
      },
      codex: {
        codexPath: "codex",
        model: "",
        reasoningEffort: "medium",
        commandTemplate: ""
      },
      claude: {
        claudePath: "claude",
        claudeCommandTemplate: `printf '%s' "feat: shell command works"`
      }
    },
    "diff --git a/file b/file"
  );

  assert.equal(result.message, "feat: shell command works");
});
