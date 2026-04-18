import test from "node:test";
import assert from "node:assert/strict";

import { buildClaudeCommand } from "../src/providers/claude";

test("buildClaudeCommand uses the default local claude executable", () => {
  const command = buildClaudeCommand(
    {
      claude: {
        claudePath: "claude",
        claudeModel: "claude-haiku-4-5-20251001"
      }
    },
    "feat: add provider support",
    "/tmp/claude-prompt.txt",
    "/tmp/claude-last-message.txt"
  );

  assert.equal(command.command, "claude");
  assert.deepEqual(command.args, ["-p", "--model", "claude-haiku-4-5-20251001", "--output-format", "text"]);
  assert.equal(command.stdin, "feat: add provider support");
});
