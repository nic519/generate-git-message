import test from "node:test";
import assert from "node:assert/strict";

import { resolveExtensionOptions } from "../src/config";
import { getProviderDebugLines, getRequestDebugLines } from "../src/debugLog";
import { shouldRefreshSidebarViewForConfigurationChange } from "../src/sidebarRefresh";

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
      "generateGitMessage.claudePath": "/usr/local/bin/claude",
      "generateGitMessage.claudeModel": "claude-haiku-4-5-20251001"
    })
  );

  assert.deepEqual(getProviderDebugLines(options), [
    "  claudePath: /usr/local/bin/claude",
    "  claudeModel: claude-haiku-4-5-20251001"
  ]);
});

test("getRequestDebugLines includes repository execution context", () => {
  const options = resolveExtensionOptions(
    makeConfiguration({
      "generateGitMessage.provider": "codex",
      "generateGitMessage.model": "gpt-5.4-mini",
      "generateGitMessage.reasoningEffort": "low"
    })
  );

  assert.deepEqual(
    getRequestDebugLines({
      diffSource: "staged",
      diffLength: 1234,
      repositoryRoot: "/tmp/current-repository",
      options,
      debug: {
        command: "codex",
        args: ["exec", "-C", "/tmp/current-repository", "-"],
        durationMs: 987,
        stderrSummary: ""
      }
    }),
    [
      "  repositoryRoot: /tmp/current-repository",
      "  cwd: /tmp/current-repository",
      "  diffSource: staged",
      "  diffLength: 1234",
      "  model: gpt-5.4-mini",
      "  reasoningEffort: low",
      "  command: codex exec -C /tmp/current-repository -",
      "  durationMs: 987"
    ]
  );
});

test("sidebar skips configuration refresh while saving settings from the panel", () => {
  assert.equal(shouldRefreshSidebarViewForConfigurationChange(true, true), false);
  assert.equal(shouldRefreshSidebarViewForConfigurationChange(true, false), true);
  assert.equal(shouldRefreshSidebarViewForConfigurationChange(false, false), false);
});
