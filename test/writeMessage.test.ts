import test from "node:test";
import assert from "node:assert/strict";

import { applyCommitMessage } from "../src/writeMessage";

test("applyCommitMessage overwrites the SCM input box value", () => {
  const repository = {
    inputBox: {
      value: "old value"
    }
  };

  applyCommitMessage(repository, "feat(core): 支持中文提交");

  assert.equal(repository.inputBox.value, "feat(core): 支持中文提交");
});
