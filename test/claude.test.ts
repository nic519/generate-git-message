import test from "node:test";
import assert from "node:assert/strict";

import { buildClaudeCommand } from "../src/providers/claude";

test("buildClaudeCommand uses the default local claude executable", () => {
  const command = buildClaudeCommand(
    {
      claude: {
        claudePath: "claude"
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
