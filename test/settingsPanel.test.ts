import test from "node:test";
import assert from "node:assert/strict";

import {
  applySettingsPanelSaveMessage,
  buildSettingsPanelHtml,
  getSettingsPanelState,
  getSettingsPanelSaveTarget,
  isSettingsPanelSaveMessage,
  mapSettingsPanelSaveMessageToUpdates
} from "../src/settingsPanel";

function makeConfiguration(values: Record<string, unknown>) {
  return {
    get<T>(key: string, defaultValue?: T): T {
      const fullKey = `generateGitMessage.${key}`;
      if (fullKey in values) {
        return values[fullKey] as T;
      }

      return defaultValue as T;
    },
    inspect(key: string) {
      const fullKey = `generateGitMessage.${key}`;
      if (fullKey in values) {
        return {
          globalValue: values[fullKey]
        };
      }

      return undefined;
    }
  };
}

test("getSettingsPanelState serializes provider commit templates and all provider settings", () => {
  const state = getSettingsPanelState(
    makeConfiguration({
      "generateGitMessage.provider": "claude",
      "generateGitMessage.commitTemplateEn": "Shared prompt EN:\n{{diff}}",
      "generateGitMessage.commitTemplateZh": "Shared prompt ZH:\n{{diff}}",
      "generateGitMessage.commitTemplateZhHant": "Shared prompt ZH-Hant:\n{{diff}}",
      "generateGitMessage.outputLanguage": "zh",
      "generateGitMessage.timeoutMs": 15000,
      "generateGitMessage.debugLogging": true,
      "generateGitMessage.codexPath": "/usr/local/bin/codex",
      "generateGitMessage.model": "gpt-5.4-mini",
      "generateGitMessage.reasoningEffort": "high",
      "generateGitMessage.claudePath": "/opt/homebrew/bin/claude",
      "generateGitMessage.claudeModel": "claude-haiku-4-5-20251001"
    })
  );

  assert.deepEqual(state, {
    provider: "claude",
    commitTemplates: {
      en: "Shared prompt EN:\n{{diff}}",
      zh: "Shared prompt ZH:\n{{diff}}",
      "zh-Hant": "Shared prompt ZH-Hant:\n{{diff}}"
    },
    common: {
      timeoutMs: 15000,
      debugLogging: true,
      outputLanguage: "zh"
    },
    codex: {
      codexPath: "/usr/local/bin/codex",
      model: "gpt-5.4-mini",
      reasoningEffort: "high"
    },
    claude: {
      claudePath: "/opt/homebrew/bin/claude",
      claudeModel: "claude-haiku-4-5-20251001"
    }
  });
});

test("mapSettingsPanelSaveMessageToUpdates maps panel state fields to generateGitMessage settings keys", () => {
  const updates = mapSettingsPanelSaveMessageToUpdates({
    provider: "codex",
    commitTemplates: {
      en: "Prompt EN:\n{{diff}}",
      zh: "Prompt ZH:\n{{diff}}",
      "zh-Hant": "Prompt ZH-Hant:\n{{diff}}"
    },
    common: {
      timeoutMs: 20000,
      debugLogging: false,
      outputLanguage: "en"
    },
    codex: {
      codexPath: "codex",
      model: "",
      reasoningEffort: "medium"
    },
    claude: {
      claudePath: "claude",
      claudeModel: "claude-haiku-4-5-20251001"
    }
  });

  assert.deepEqual(updates, [
    { key: "provider", value: "codex" },
    { key: "commitTemplateEn", value: "Prompt EN:\n{{diff}}" },
    { key: "commitTemplateZh", value: "Prompt ZH:\n{{diff}}" },
    { key: "commitTemplateZhHant", value: "Prompt ZH-Hant:\n{{diff}}" },
    { key: "outputLanguage", value: "en" },
    { key: "timeoutMs", value: 20000 },
    { key: "debugLogging", value: false },
    { key: "codexPath", value: "codex" },
    { key: "model", value: "" },
    { key: "reasoningEffort", value: "medium" },
    { key: "claudePath", value: "claude" },
    { key: "claudeModel", value: "claude-haiku-4-5-20251001" }
  ]);
});

test("isSettingsPanelSaveMessage rejects invalid provider reasoningEffort timeout and string fields", () => {
  assert.equal(
    isSettingsPanelSaveMessage({
      type: "saveSettings",
      state: {
        provider: "anthropic",
        commitTemplates: {
          en: "Prompt EN",
          zh: "Prompt ZH",
          "zh-Hant": "Prompt ZH-Hant"
        },
        common: {
          timeoutMs: 20000,
          debugLogging: true,
          outputLanguage: "en"
        },
        codex: {
          codexPath: "codex",
          model: "",
          reasoningEffort: "medium"
        },
        claude: {
          claudePath: "claude",
          claudeModel: "claude-haiku-4-5-20251001"
        }
      }
    }),
    false
  );

  assert.equal(
    isSettingsPanelSaveMessage({
      type: "saveSettings",
      state: {
        provider: "codex",
        commitTemplates: {
          en: "Prompt EN",
          zh: "Prompt ZH",
          "zh-Hant": "Prompt ZH-Hant"
        },
        common: {
          timeoutMs: Number.NaN,
          debugLogging: true,
          outputLanguage: "en"
        },
        codex: {
          codexPath: "codex",
          model: "",
          reasoningEffort: "medium"
        },
        claude: {
          claudePath: "claude",
          claudeModel: "claude-haiku-4-5-20251001"
        }
      }
    }),
    false
  );

  assert.equal(
    isSettingsPanelSaveMessage({
      type: "saveSettings",
      state: {
        provider: "codex",
        commitTemplates: {
          en: "Prompt EN",
          zh: "Prompt ZH",
          "zh-Hant": "Prompt ZH-Hant"
        },
        common: {
          timeoutMs: 20000,
          debugLogging: true,
          outputLanguage: "en"
        },
        codex: {
          codexPath: 123,
          model: "",
          reasoningEffort: "super-high"
        },
        claude: {
          claudePath: "claude",
          claudeModel: "claude-haiku-4-5-20251001"
        }
      }
    }),
    false
  );
});

test("applySettingsPanelSaveMessage uses the global target by default", async () => {
  const updates: Array<{ key: string; value: unknown; target: string }> = [];

  await applySettingsPanelSaveMessage(
    {
      provider: "claude",
      commitTemplates: {
        en: "Prompt EN",
        zh: "Prompt ZH",
        "zh-Hant": "Prompt ZH-Hant"
      },
      common: {
        timeoutMs: 22000,
        debugLogging: false,
        outputLanguage: "en"
      },
      codex: {
        codexPath: "/usr/local/bin/codex",
        model: "gpt-5.4-mini",
        reasoningEffort: "low"
      },
      claude: {
        claudePath: "/opt/homebrew/bin/claude",
        claudeModel: "claude-haiku-4-5-20251001"
      }
    },
    (key, value, target) => {
      updates.push({ key, value, target });
    }
  );

  assert.equal(updates.length, 12);
  assert.equal(updates.every((update) => update.target === "global"), true);
});

test("applySettingsPanelSaveMessage uses the provided target resolver for each key", async () => {
  const updates: Array<{ key: string; value: unknown; target: string }> = [];

  await applySettingsPanelSaveMessage(
    {
      provider: "claude",
      commitTemplates: {
        en: "Prompt EN",
        zh: "Prompt ZH",
        "zh-Hant": "Prompt ZH-Hant"
      },
      common: {
        timeoutMs: 22000,
        debugLogging: false,
        outputLanguage: "en"
      },
      codex: {
        codexPath: "/usr/local/bin/codex",
        model: "gpt-5.4-mini",
        reasoningEffort: "low"
      },
      claude: {
        claudePath: "/opt/homebrew/bin/claude",
        claudeModel: "claude-haiku-4-5-20251001"
      }
    },
    (key, value, target) => {
      updates.push({ key, value, target });
    },
    (key) => (key === "timeoutMs" ? "workspace" : "global")
  );

  assert.equal(updates.length, 12);
  assert.equal(updates.find((update) => update.key === "timeoutMs")?.target, "workspace");
  assert.equal(updates.filter((update) => update.key !== "timeoutMs").every((update) => update.target === "global"), true);
});

test("getSettingsPanelSaveTarget keeps workspace-scoped keys in workspace", () => {
  const configuration = {
    get<T>(_key: string, defaultValue?: T): T {
      return defaultValue as T;
    },
    inspect(key: string) {
      if (key === "timeoutMs") {
        return {
          globalValue: 20000,
          workspaceValue: 15000
        };
      }

      return {
        globalValue: "codex"
      };
    }
  };

  assert.equal(getSettingsPanelSaveTarget(configuration, "timeoutMs"), "workspace");
  assert.equal(getSettingsPanelSaveTarget(configuration, "provider"), "global");
});

test("getSettingsPanelSaveTarget keeps workspace folder scoped keys in workspace folder", () => {
  const configuration = {
    get<T>(_key: string, defaultValue?: T): T {
      return defaultValue as T;
    },
    inspect(key: string) {
      if (key === "commitTemplateEn") {
        return {
          workspaceFolderValue: "Folder prompt:\n{{diff}}"
        };
      }

      return undefined;
    }
  };

  assert.equal(getSettingsPanelSaveTarget(configuration, "commitTemplateEn"), "workspaceFolder");
});

test("buildSettingsPanelHtml escapes user content in the rendered HTML", () => {
  const html = buildSettingsPanelHtml(
    { cspSource: "vscode-resource:" },
    {
      provider: "codex",
      commitTemplates: {
        en: `Prompt EN <script>alert("x")</script>`,
        zh: `Prompt ZH <script>alert("x")</script>`,
        "zh-Hant": `Prompt ZH-Hant <script>alert("x")</script>`
      },
      common: {
        timeoutMs: 20000,
        debugLogging: true,
        outputLanguage: "en"
      },
      codex: {
        codexPath: `codex&"<'`,
        model: `<model>`,
        reasoningEffort: "medium"
      },
      claude: {
        claudePath: `claude<'">`,
        claudeModel: `claude<model>`
      }
    }
  );

  assert.match(html, /Prompt EN &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /codex&amp;&quot;&lt;&#39;/);
  assert.match(html, /&lt;model&gt;/);
  assert.match(html, /vscode-resource:/);
});

test("buildSettingsPanelHtml renders the compact sidebar layout", () => {
  const html = buildSettingsPanelHtml(
    { cspSource: "vscode-resource:" },
    {
      provider: "codex",
      commitTemplates: {
        en: "Prompt EN:\n{{diff}}",
        zh: "Prompt ZH:\n{{diff}}",
        "zh-Hant": "Prompt ZH-Hant:\n{{diff}}"
      },
      common: {
        timeoutMs: 20000,
        debugLogging: true,
        outputLanguage: "zh"
      },
      codex: {
        codexPath: "codex",
        model: "gpt-5.4-mini",
        reasoningEffort: "medium"
      },
      claude: {
        claudePath: "claude",
        claudeModel: "claude-haiku-4-5-20251001"
      }
    }
  );

  assert.match(html, /Settings/);
  assert.match(html, /Provider Runtime/);
  assert.match(html, /Available CLIs: Codex and Claude\./);
  assert.match(html, /Output language/);
  assert.match(html, /<option value="zh" selected>Chinese \(Simplified\)<\/option>/);
  assert.match(html, /<option value="en">English<\/option>/);
  assert.match(html, /<option value="zh-Hant">Chinese \(Traditional\)<\/option>/);
  assert.match(html, /Commit Templates/);
  assert.match(html, /简体中文 commit template/);
  assert.doesNotMatch(html, /English commit template/);
  assert.doesNotMatch(html, /繁體中文 commit template/);
  assert.match(html, /min-height: 220px/);
  assert.match(html, /Codex Runtime/);
  assert.match(html, /gpt-5.4-mini/);
  assert.doesNotMatch(html, /Claude Runtime/);
  assert.doesNotMatch(html, /Claude model/);
  assert.match(html, /Changes save automatically/);
  assert.match(html, /form\.addEventListener\('input'/);
  assert.match(html, /form\.addEventListener\('change'/);
  assert.match(html, /Generate Message/);
  assert.match(html, /M11\.017 2\.814/);
  assert.match(html, /M20 2v4/);
  assert.match(html, /circle cx="4" cy="20" r="2"/);
  assert.doesNotMatch(html, /Save Settings/);
  assert.doesNotMatch(html, /type="submit"/);
  assert.doesNotMatch(html, /Active Provider/);
  assert.doesNotMatch(html, /Timeout Window/);
  assert.doesNotMatch(html, /Prompt Mode/);
  assert.doesNotMatch(html, /hero-stat/);
  assert.doesNotMatch(html, /Japanese/);
});

test("buildSettingsPanelHtml renders only Claude runtime when provider is claude", () => {
  const html = buildSettingsPanelHtml(
    { cspSource: "vscode-resource:" },
    {
      provider: "claude",
      commitTemplates: {
        en: "Prompt EN:\n{{diff}}",
        zh: "Prompt ZH:\n{{diff}}",
        "zh-Hant": "Prompt ZH-Hant:\n{{diff}}"
      },
      common: {
        timeoutMs: 20000,
        debugLogging: true,
        outputLanguage: "en"
      },
      codex: {
        codexPath: "codex",
        model: "gpt-5.4-mini",
        reasoningEffort: "medium"
      },
      claude: {
        claudePath: "claude",
        claudeModel: "claude-haiku-4-5-20251001"
      }
    }
  );

  assert.match(html, /Claude Runtime/);
  assert.match(html, /Claude model/);
  assert.match(html, /claude-haiku-4-5-20251001/);
  assert.match(html, /Available CLIs: Codex and Claude\./);
  assert.doesNotMatch(html, /Codex Runtime/);
  assert.doesNotMatch(html, /Codex path/);
  assert.doesNotMatch(html, /Reasoning effort/);
  assert.match(html, /English commit template/);
  assert.doesNotMatch(html, /简体中文 commit template/);
  assert.doesNotMatch(html, /繁體中文 commit template/);
});

test("getSettingsPanelSaveTarget falls back to global when inspect reports no workspace value", () => {
  assert.equal(
    getSettingsPanelSaveTarget({
      get<T>(_key: string, defaultValue?: T): T {
        return defaultValue as T;
      },
      inspect() {
        return {
          globalValue: "codex"
        };
      }
    }, "provider"),
    "global"
  );
});
