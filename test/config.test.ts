import test from "node:test";
import assert from "node:assert/strict";

import { resolveCodexOptions } from "../src/config";

function makeConfiguration(values: Record<string, unknown>) {
  return {
    get<T>(key: string, defaultValue?: T): T {
      const fullKey = `codexCommit.${key}`;
      if (fullKey in values) {
        return values[fullKey] as T;
      }

      return defaultValue as T;
    }
  };
}

test("resolveCodexOptions uses codex defaults", () => {
  const options = resolveCodexOptions(makeConfiguration({}));
  assert.equal(options.codexPath, "codex");
  assert.equal(options.model, "");
  assert.equal(options.reasoningEffort, "medium");
  assert.equal(options.debugLogging, false);
  assert.equal(options.commandTemplate, "");
  assert.equal(options.timeoutMs, 20000);
  assert.match(options.promptTemplate, /git diff/);
});

test("resolveCodexOptions respects workspace overrides", () => {
  const options = resolveCodexOptions(
    makeConfiguration({
      "codexCommit.codexPath": "/usr/local/bin/codex",
      "codexCommit.model": "gpt-5.4-mini",
      "codexCommit.reasoningEffort": "low",
      "codexCommit.debugLogging": true,
      "codexCommit.commandTemplate": "codex exec --input {{promptFile}}",
      "codexCommit.promptTemplate": "Commit:\n{{diff}}",
      "codexCommit.timeoutMs": 15000
    })
  );

  assert.equal(options.codexPath, "/usr/local/bin/codex");
  assert.equal(options.model, "gpt-5.4-mini");
  assert.equal(options.reasoningEffort, "low");
  assert.equal(options.debugLogging, true);
  assert.equal(options.commandTemplate, "codex exec --input {{promptFile}}");
  assert.equal(options.promptTemplate, "Commit:\n{{diff}}");
  assert.equal(options.timeoutMs, 15000);
});
