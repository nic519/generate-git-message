import test from "node:test";
import assert from "node:assert/strict";

import { resolveExtensionOptions } from "../src/config";
import { getProviderDebugLines } from "../src/debugLog";

function makeConfiguration(values: Record<string, unknown>) {
  return {
    get<T>(key: string, defaultValue?: T): T {
      const fullKey = `generateGitMessage.${key}`;
      if (fullKey in values) {
        return values[fullKey] as T;
      }

      return defaultValue as T;
    }
  };
}

test("getProviderDebugLines uses Codex fields for the codex provider", () => {
  const options = resolveExtensionOptions(
    makeConfiguration({
      "generateGitMessage.provider": "codex",
      "generateGitMessage.model": "gpt-5.4-mini",
      "generateGitMessage.reasoningEffort": "low"
    })
  );

  assert.deepEqual(getProviderDebugLines(options), ["  model: gpt-5.4-mini", "  reasoningEffort: low"]);
});

test("getProviderDebugLines uses Claude fields for the claude provider", () => {
  const options = resolveExtensionOptions(
    makeConfiguration({
      "generateGitMessage.provider": "claude",
      "generateGitMessage.claudePath": "/usr/local/bin/claude"
    })
  );

  assert.deepEqual(getProviderDebugLines(options), [
    "  claudePath: /usr/local/bin/claude"
  ]);
});
