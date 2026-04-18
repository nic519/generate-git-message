import test from "node:test";
import assert from "node:assert/strict";

import { createGenerateMessageProgressOptions } from "../src/extensionProgress";

test("createGenerateMessageProgressOptions enables the notification cancel button", () => {
  const options = createGenerateMessageProgressOptions("notification", "Codex");

  assert.deepEqual(options, {
    location: "notification",
    title: "Generating commit message with Codex",
    cancellable: true
  });
});
