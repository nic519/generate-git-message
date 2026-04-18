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
    }
  };
}

test("getSettingsPanelState serializes provider shared prompt and all provider settings", () => {
  const state = getSettingsPanelState(
    makeConfiguration({
      "generateGitMessage.provider": "claude",
      "generateGitMessage.promptTemplate": "Shared prompt:\n{{diff}}",
      "generateGitMessage.timeoutMs": 15000,
      "generateGitMessage.debugLogging": true,
      "generateGitMessage.codexPath": "/usr/local/bin/codex",
      "generateGitMessage.model": "gpt-5.4-mini",
      "generateGitMessage.reasoningEffort": "high",
      "generateGitMessage.commandTemplate": "codex exec --input {{promptFile}}",
      "generateGitMessage.claudePath": "/opt/homebrew/bin/claude",
      "generateGitMessage.claudeCommandTemplate": "claude -p --output-format text --input {{promptFile}}"
    })
  );

  assert.deepEqual(state, {
    provider: "claude",
    sharedPromptTemplate: "Shared prompt:\n{{diff}}",
    common: {
      timeoutMs: 15000,
      debugLogging: true
    },
    codex: {
      codexPath: "/usr/local/bin/codex",
      model: "gpt-5.4-mini",
      reasoningEffort: "high",
      commandTemplate: "codex exec --input {{promptFile}}"
    },
    claude: {
      claudePath: "/opt/homebrew/bin/claude",
      claudeCommandTemplate: "claude -p --output-format text --input {{promptFile}}"
    }
  });
});

test("mapSettingsPanelSaveMessageToUpdates maps panel state fields to generateGitMessage settings keys", () => {
  const updates = mapSettingsPanelSaveMessageToUpdates({
    provider: "codex",
    sharedPromptTemplate: "Prompt:\n{{diff}}",
    common: {
      timeoutMs: 20000,
      debugLogging: false
    },
    codex: {
      codexPath: "codex",
      model: "",
      reasoningEffort: "medium",
      commandTemplate: ""
    },
    claude: {
      claudePath: "claude",
      claudeCommandTemplate: ""
    }
  });

  assert.deepEqual(updates, [
    { key: "provider", value: "codex" },
    { key: "promptTemplate", value: "Prompt:\n{{diff}}" },
    { key: "timeoutMs", value: 20000 },
    { key: "debugLogging", value: false },
    { key: "codexPath", value: "codex" },
    { key: "model", value: "" },
    { key: "reasoningEffort", value: "medium" },
    { key: "commandTemplate", value: "" },
    { key: "claudePath", value: "claude" },
    { key: "claudeCommandTemplate", value: "" }
  ]);
});

test("isSettingsPanelSaveMessage rejects invalid provider reasoningEffort timeout and string fields", () => {
  assert.equal(
    isSettingsPanelSaveMessage({
      type: "saveSettings",
      state: {
        provider: "anthropic",
        sharedPromptTemplate: "Prompt",
        common: {
          timeoutMs: 20000,
          debugLogging: true
        },
        codex: {
          codexPath: "codex",
          model: "",
          reasoningEffort: "medium",
          commandTemplate: ""
        },
        claude: {
          claudePath: "claude",
          claudeCommandTemplate: ""
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
        sharedPromptTemplate: "Prompt",
        common: {
          timeoutMs: Number.NaN,
          debugLogging: true
        },
        codex: {
          codexPath: "codex",
          model: "",
          reasoningEffort: "medium",
          commandTemplate: ""
        },
        claude: {
          claudePath: "claude",
          claudeCommandTemplate: ""
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
        sharedPromptTemplate: "Prompt",
        common: {
          timeoutMs: 20000,
          debugLogging: true
        },
        codex: {
          codexPath: 123,
          model: "",
          reasoningEffort: "super-high",
          commandTemplate: ""
        },
        claude: {
          claudePath: "claude",
          claudeCommandTemplate: ""
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
      sharedPromptTemplate: "Prompt",
      common: {
        timeoutMs: 22000,
        debugLogging: false
      },
      codex: {
        codexPath: "/usr/local/bin/codex",
        model: "gpt-5.4-mini",
        reasoningEffort: "low",
        commandTemplate: "codex exec --input {{promptFile}}"
      },
      claude: {
        claudePath: "/opt/homebrew/bin/claude",
        claudeCommandTemplate: "claude -p --output-format text"
      }
    },
    (key, value, target) => {
      updates.push({ key, value, target });
    }
  );

  assert.equal(updates.length, 10);
  assert.equal(updates.every((update) => update.target === "global"), true);
});

test("applySettingsPanelSaveMessage uses the provided target resolver for each key", async () => {
  const updates: Array<{ key: string; value: unknown; target: string }> = [];

  await applySettingsPanelSaveMessage(
    {
      provider: "claude",
      sharedPromptTemplate: "Prompt",
      common: {
        timeoutMs: 22000,
        debugLogging: false
      },
      codex: {
        codexPath: "/usr/local/bin/codex",
        model: "gpt-5.4-mini",
        reasoningEffort: "low",
        commandTemplate: "codex exec --input {{promptFile}}"
      },
      claude: {
        claudePath: "/opt/homebrew/bin/claude",
        claudeCommandTemplate: "claude -p --output-format text"
      }
    },
    (key, value, target) => {
      updates.push({ key, value, target });
    },
    (key) => (key === "timeoutMs" ? "workspace" : "global")
  );

  assert.equal(updates.length, 10);
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

test("buildSettingsPanelHtml escapes user content in the rendered HTML", () => {
  const html = buildSettingsPanelHtml(
    { cspSource: "vscode-resource:" },
    {
      provider: "codex",
      sharedPromptTemplate: `Prompt <script>alert("x")</script>`,
      common: {
        timeoutMs: 20000,
        debugLogging: true
      },
      codex: {
        codexPath: `codex&"<'`,
        model: `<model>`,
        reasoningEffort: "medium",
        commandTemplate: `run <{{promptFile}}> & ok`
      },
      claude: {
        claudePath: `claude<'">`,
        claudeCommandTemplate: `claude --input <file>`
      }
    }
  );

  assert.match(html, /Prompt &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /codex&amp;&quot;&lt;&#39;/);
  assert.match(html, /&lt;model&gt;/);
  assert.match(html, /claude&lt;&#39;&quot;&gt;/);
  assert.match(html, /vscode-resource:/);
});

test("buildSettingsPanelHtml renders the redesigned studio layout", () => {
  const html = buildSettingsPanelHtml(
    { cspSource: "vscode-resource:" },
    {
      provider: "codex",
      sharedPromptTemplate: "Prompt:\n{{diff}}",
      common: {
        timeoutMs: 20000,
        debugLogging: true
      },
      codex: {
        codexPath: "codex",
        model: "gpt-5.4-mini",
        reasoningEffort: "medium",
        commandTemplate: ""
      },
      claude: {
        claudePath: "claude",
        claudeCommandTemplate: ""
      }
    }
  );

  assert.match(html, /Control Studio/);
  assert.match(html, /Provider Runtime/);
  assert.match(html, /Prompt System/);
  assert.match(html, /Save Workspace Settings/);
  assert.match(html, /Generate Message/);
  assert.match(html, /M11\.017 2\.814/);
  assert.match(html, /M20 2v4/);
  assert.match(html, /circle cx="4" cy="20" r="2"/);
  assert.match(html, /status-pill/);
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
