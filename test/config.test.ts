import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  resolveClaudeOptions,
  resolveCommonOptions,
  resolveCodexOptions,
  resolveExtensionOptions
} from "../src/config";

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

test("resolveCommonOptions uses common defaults", () => {
  const options = resolveCommonOptions(makeConfiguration({}));

  assert.equal(options.debugLogging, false);
  assert.equal(options.promptTemplate, "根据以下 git diff，生成一个简洁明确的 git commit message。要求：\n- 直接只输出最终 commit message\n- 不要解释\n- 默认使用 Conventional Commits 风格，但描述使用中文\n- 尽量准确概括本次变更\n- 如果无法判断，给出最稳妥的一行提交信息\n\n{{diff}}");
  assert.equal(options.timeoutMs, 20000);
});

test("resolveCodexOptions uses codex defaults", () => {
  const options = resolveCodexOptions(makeConfiguration({}));

  assert.equal(options.codexPath, "codex");
  assert.equal(options.model, "");
  assert.equal(options.reasoningEffort, "medium");
  assert.equal(options.commandTemplate, "");
});

test("resolveCodexOptions respects workspace overrides", () => {
  const options = resolveCodexOptions(
    makeConfiguration({
      "generateGitMessage.codexPath": "/usr/local/bin/codex",
      "generateGitMessage.model": "gpt-5.4-mini",
      "generateGitMessage.reasoningEffort": "low",
      "generateGitMessage.debugLogging": true,
      "generateGitMessage.commandTemplate": "codex exec --input {{promptFile}}",
      "generateGitMessage.promptTemplate": "Commit:\n{{diff}}",
      "generateGitMessage.timeoutMs": 15000
    })
  );

  assert.equal(options.codexPath, "/usr/local/bin/codex");
  assert.equal(options.model, "gpt-5.4-mini");
  assert.equal(options.reasoningEffort, "low");
  assert.equal(options.commandTemplate, "codex exec --input {{promptFile}}");
});

test("resolveClaudeOptions uses claude defaults", () => {
  const options = resolveClaudeOptions(makeConfiguration({}));

  assert.equal(options.claudePath, "claude");
  assert.equal(options.claudeCommandTemplate, "");
});

test("resolveExtensionOptions defaults provider to codex", () => {
  const options = resolveExtensionOptions(makeConfiguration({}));

  assert.equal(options.provider, "codex");
  assert.equal(options.common.debugLogging, false);
  assert.equal(options.common.timeoutMs, 20000);
  assert.equal(options.codex.codexPath, "codex");
  assert.equal(options.codex.reasoningEffort, "medium");
  assert.equal(options.claude.claudePath, "claude");
  assert.equal(options.claude.claudeCommandTemplate, "");
});

test("resolveExtensionOptions falls back to codex for invalid provider values", () => {
  const options = resolveExtensionOptions(
    makeConfiguration({
      "generateGitMessage.provider": "anthropic"
    })
  );

  assert.equal(options.provider, "codex");
});

test("resolveExtensionOptions falls back to medium for invalid reasoningEffort values", () => {
  const options = resolveExtensionOptions(
    makeConfiguration({
      "generateGitMessage.reasoningEffort": "super-high"
    })
  );

  assert.equal(options.codex.reasoningEffort, "medium");
});

test("resolveExtensionOptions reads grouped config and claude-specific config", () => {
  const options = resolveExtensionOptions(
    makeConfiguration({
      "generateGitMessage.provider": "claude",
      "generateGitMessage.codexPath": "/usr/local/bin/codex",
      "generateGitMessage.model": "gpt-5.4-mini",
      "generateGitMessage.reasoningEffort": "high",
      "generateGitMessage.debugLogging": true,
      "generateGitMessage.commandTemplate": "codex exec --input {{promptFile}}",
      "generateGitMessage.promptTemplate": "Commit:\n{{diff}}",
      "generateGitMessage.timeoutMs": 15000,
      "generateGitMessage.claudePath": "/usr/local/bin/claude",
      "generateGitMessage.claudeCommandTemplate": "claude run --file {{promptFile}}"
    })
  );

  assert.equal(options.provider, "claude");
  assert.equal(options.common.debugLogging, true);
  assert.equal(options.common.promptTemplate, "Commit:\n{{diff}}");
  assert.equal(options.common.timeoutMs, 15000);
  assert.equal(options.codex.codexPath, "/usr/local/bin/codex");
  assert.equal(options.codex.model, "gpt-5.4-mini");
  assert.equal(options.codex.reasoningEffort, "high");
  assert.equal(options.codex.commandTemplate, "codex exec --input {{promptFile}}");
  assert.equal(options.claude.claudePath, "/usr/local/bin/claude");
  assert.equal(options.claude.claudeCommandTemplate, "claude run --file {{promptFile}}");
});

test("package manifest defaults stay aligned with resolver defaults", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    activationEvents: string[];
    contributes: {
      commands?: Array<{ command: string; title: string; category?: string }>;
      configuration: {
        properties: Record<string, { default: unknown }>;
      };
      viewsContainers?: {
        activitybar?: Array<{ id: string; title: string; icon: string }>;
      };
      views?: Record<string, Array<{ id: string; name: string; type?: string }>>;
    };
  };
  const contributes = packageJson.contributes;
  const properties = contributes.configuration.properties;

  assert.deepEqual(packageJson.activationEvents, ["onCommand:generateGitMessage.generateMessage", "onView:generateGitMessage.sidebar"]);
  assert.deepEqual(contributes.commands, [
    {
      command: "generateGitMessage.generateMessage",
      title: "Generate Commit Message",
      category: "Generate Git Message",
      icon: "$(sparkle)"
    }
  ]);
  assert.equal(properties["generateGitMessage.provider"].default, "codex");
  assert.equal(properties["generateGitMessage.codexPath"].default, "codex");
  assert.equal(properties["generateGitMessage.claudePath"].default, "claude");
  assert.equal(properties["generateGitMessage.reasoningEffort"].default, "medium");
  assert.equal(properties["generateGitMessage.commandTemplate"].default, "");
  assert.equal(properties["generateGitMessage.claudeCommandTemplate"].default, "");
  assert.match(String(properties["generateGitMessage.promptTemplate"].default), /git diff/);
  assert.equal(properties["generateGitMessage.timeoutMs"].default, 20000);

  assert.deepEqual(contributes.viewsContainers?.activitybar, [
    {
      id: "generateGitMessage",
      title: "Generate Git Message",
      icon: "media/activity-bar.svg"
    }
  ]);
  assert.deepEqual(contributes.views?.generateGitMessage, [
    {
      id: "generateGitMessage.sidebar",
      name: "Workspace",
      type: "webview"
    }
  ]);
});

test("activity bar icon uses the git pull request artwork", () => {
  const svg = readFileSync("media/activity-bar.svg", "utf8");

  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /<circle cx="18" cy="18" r="3"\/>/);
  assert.match(svg, /<circle cx="6" cy="6" r="3"\/>/);
  assert.match(svg, /<path d="M13 6h3a2 2 0 0 1 2 2v7"\/>/);
  assert.match(svg, /<line x1="6" x2="6" y1="9" y2="21"\/>/);
});
