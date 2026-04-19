import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEFAULT_PROMPT_TEMPLATE,
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
  assert.match(options.promptTemplate, /Create a standardized git commit message/);
  assert.equal(options.outputLanguage, "en");
  assert.equal(options.timeoutMs, 50000);
});

test("default prompt template follows the conventional commit generation workflow", () => {
  assert.match(DEFAULT_PROMPT_TEMPLATE, /Conventional Commits/);
  assert.match(DEFAULT_PROMPT_TEMPLATE, /type/);
  assert.match(DEFAULT_PROMPT_TEMPLATE, /scope/);
  assert.match(DEFAULT_PROMPT_TEMPLATE, /BREAKING CHANGE/);
  assert.match(DEFAULT_PROMPT_TEMPLATE, /Return only the final commit message/);
  assert.match(DEFAULT_PROMPT_TEMPLATE, /\{\{diff\}\}/);
});

test("resolveCodexOptions uses codex defaults", () => {
  const options = resolveCodexOptions(makeConfiguration({}));

  assert.equal(options.codexPath, "codex");
  assert.equal(options.model, "gpt-5.4-mini");
  assert.equal(options.reasoningEffort, "low");
});

test("resolveCodexOptions respects workspace overrides", () => {
  const options = resolveCodexOptions(
    makeConfiguration({
      "generateGitMessage.codexPath": "/usr/local/bin/codex",
      "generateGitMessage.model": "gpt-5.4-mini",
      "generateGitMessage.reasoningEffort": "low",
      "generateGitMessage.debugLogging": true,
      "generateGitMessage.outputLanguage": "ja",
      "generateGitMessage.promptTemplate": "Commit:\n{{diff}}",
      "generateGitMessage.timeoutMs": 15000
    })
  );

  assert.equal(options.codexPath, "/usr/local/bin/codex");
  assert.equal(options.model, "gpt-5.4-mini");
  assert.equal(options.reasoningEffort, "low");
});

test("resolveClaudeOptions uses claude defaults", () => {
  const options = resolveClaudeOptions(makeConfiguration({}));

  assert.equal(options.claudePath, "claude");
});

test("resolveExtensionOptions defaults provider to codex", () => {
  const options = resolveExtensionOptions(makeConfiguration({}));

  assert.equal(options.provider, "codex");
  assert.equal(options.common.debugLogging, false);
  assert.equal(options.common.timeoutMs, 50000);
  assert.equal(options.codex.codexPath, "codex");
  assert.equal(options.codex.reasoningEffort, "low");
  assert.equal(options.claude.claudePath, "claude");
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
      "generateGitMessage.outputLanguage": "zh",
      "generateGitMessage.promptTemplate": "Commit:\n{{diff}}",
      "generateGitMessage.timeoutMs": 15000,
      "generateGitMessage.claudePath": "/usr/local/bin/claude",
      "generateGitMessage.claudeModel": "claude-sonnet-4-6"
    })
  );

  assert.equal(options.provider, "claude");
  assert.equal(options.common.debugLogging, true);
  assert.equal(options.common.outputLanguage, "zh");
  assert.equal(options.common.promptTemplate, "Commit:\n{{diff}}");
  assert.equal(options.common.timeoutMs, 15000);
  assert.equal(options.codex.codexPath, "/usr/local/bin/codex");
  assert.equal(options.codex.model, "gpt-5.4-mini");
  assert.equal(options.codex.reasoningEffort, "high");
  assert.equal(options.claude.claudePath, "/usr/local/bin/claude");
  assert.equal(options.claude.claudeModel, "claude-sonnet-4-6");
});

test("package manifest defaults stay aligned with resolver defaults", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    icon: string;
    activationEvents: string[];
    contributes: {
      commands?: Array<{ command: string; title: string; category?: string }>;
      configuration: {
        properties: Record<string, { default: unknown; enum?: string[] }>;
      };
      viewsContainers?: {
        activitybar?: Array<{ id: string; title: string; icon: string }>;
      };
      views?: Record<string, Array<{ id: string; name: string; type?: string }>>;
    };
  };
  const contributes = packageJson.contributes;
  const properties = contributes.configuration.properties;

  assert.equal(packageJson.icon, "media/marketplace-icon.png");
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
  assert.equal(properties["generateGitMessage.model"].default, "gpt-5.4-mini");
  assert.equal(properties["generateGitMessage.claudePath"].default, "claude");
  assert.equal(properties["generateGitMessage.claudeModel"].default, "claude-haiku-4-5-20251001");
  assert.equal(properties["generateGitMessage.reasoningEffort"].default, "low");
  assert.equal(properties["generateGitMessage.outputLanguage"].default, "en");
  assert.deepEqual(properties["generateGitMessage.outputLanguage"].enum, ["en", "zh", "zh-Hant", "ja"]);
  assert.equal(properties["generateGitMessage.promptTemplate"].default, DEFAULT_PROMPT_TEMPLATE);
  assert.doesNotMatch(String(properties["generateGitMessage.promptTemplate"].default), /\\n/);
  assert.equal(properties["generateGitMessage.timeoutMs"].default, 50000);

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

test("marketplace icon is a png generated from the git pull request artwork", () => {
  const svg = readFileSync("media/marketplace-icon.svg", "utf8");
  const png = readFileSync("media/marketplace-icon.png");

  assert.match(svg, /viewBox="0 0 24 24"/);
  assert.match(svg, /fill="#070b16"/);
  assert.match(svg, /linearGradient id="lineGradient"/);
  assert.match(svg, /<circle cx="18" cy="18" r="3"\/>/);
  assert.match(svg, /<circle cx="6" cy="6" r="3"\/>/);
  assert.match(svg, /<path d="M13 6h3a2 2 0 0 1 2 2v7"\/>/);
  assert.match(svg, /<line x1="6" x2="6" y1="9" y2="21"\/>/);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});
