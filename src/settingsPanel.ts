import {
  PROVIDERS,
  REASONING_EFFORTS,
  resolveExtensionOptions,
  type ConfigurationLike,
  type ReasoningEffort
} from "./config";

export interface SettingsPanelState {
  provider: "codex" | "claude";
  sharedPromptTemplate: string;
  common: {
    timeoutMs: number;
    debugLogging: boolean;
  };
  codex: {
    codexPath: string;
    model: string;
    reasoningEffort: ReasoningEffort;
    commandTemplate: string;
  };
  claude: {
    claudePath: string;
    claudeCommandTemplate: string;
  };
}

export interface SettingsPanelSaveMessage extends SettingsPanelState {}

export interface SettingsPanelUpdate {
  key: string;
  value: unknown;
}

export interface WebviewLike {
  cspSource: string;
}

export type SettingsPanelSaveTarget = "global" | "workspace";

export function getSettingsPanelState(configuration: ConfigurationLike): SettingsPanelState {
  const options = resolveExtensionOptions(configuration);

  return {
    provider: options.provider,
    sharedPromptTemplate: options.common.promptTemplate,
    common: {
      timeoutMs: options.common.timeoutMs,
      debugLogging: options.common.debugLogging
    },
    codex: {
      codexPath: options.codex.codexPath,
      model: options.codex.model,
      reasoningEffort: options.codex.reasoningEffort,
      commandTemplate: options.codex.commandTemplate
    },
    claude: {
      claudePath: options.claude.claudePath,
      claudeCommandTemplate: options.claude.claudeCommandTemplate
    }
  };
}

export function getSettingsPanelSaveTarget(
  configuration: ConfigurationLike,
  key: string
): SettingsPanelSaveTarget {
  const inspected = configuration.inspect?.(key);
  return inspected?.workspaceValue !== undefined ? "workspace" : "global";
}

export function mapSettingsPanelSaveMessageToUpdates(message: SettingsPanelSaveMessage): SettingsPanelUpdate[] {
  return [
    { key: "provider", value: message.provider },
    { key: "promptTemplate", value: message.sharedPromptTemplate },
    { key: "timeoutMs", value: message.common.timeoutMs },
    { key: "debugLogging", value: message.common.debugLogging },
    { key: "codexPath", value: message.codex.codexPath },
    { key: "model", value: message.codex.model },
    { key: "reasoningEffort", value: message.codex.reasoningEffort },
    { key: "commandTemplate", value: message.codex.commandTemplate },
    { key: "claudePath", value: message.claude.claudePath },
    { key: "claudeCommandTemplate", value: message.claude.claudeCommandTemplate }
  ];
}

export async function applySettingsPanelSaveMessage(
  message: SettingsPanelSaveMessage,
  updateSetting: (key: string, value: unknown, target: SettingsPanelSaveTarget) => void | Promise<void>,
  getTarget: (key: string) => SettingsPanelSaveTarget = () => "global"
): Promise<void> {
  for (const update of mapSettingsPanelSaveMessageToUpdates(message)) {
    await updateSetting(update.key, update.value, getTarget(update.key));
  }
}

export function buildSettingsPanelHtml(webview: WebviewLike, state: SettingsPanelState): string {
  const nonce = createNonce();
  const jsonState = serializeStateForScript(state);

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Generate Git Message Settings</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7fb;
      --panel: #ffffff;
      --border: #d7dbe7;
      --text: #1f2937;
      --muted: #5b6475;
      --accent: #2563eb;
    }

    body {
      margin: 0;
      padding: 24px;
      background: var(--bg);
      color: var(--text);
      font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .panel {
      max-width: 920px;
      margin: 0 auto;
      padding: 20px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
    }

    h1 {
      margin: 0 0 6px;
      font-size: 20px;
    }

    p {
      margin: 0 0 16px;
      color: var(--muted);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .section {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      background: #fff;
    }

    .section h2 {
      margin: 0 0 12px;
      font-size: 14px;
    }

    label {
      display: block;
      margin: 0 0 12px;
      font-weight: 600;
    }

    label span {
      display: block;
      margin-bottom: 4px;
    }

    input,
    select,
    textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      font: inherit;
      color: inherit;
      background: #fff;
    }

    textarea {
      min-height: 120px;
      resize: vertical;
    }

    .inline {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      font-weight: 500;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 9px 14px;
      font: inherit;
      cursor: pointer;
    }

    .primary {
      background: var(--accent);
      color: white;
    }

    .secondary {
      background: #e5e7eb;
      color: #111827;
    }

    @media (max-width: 820px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="panel">
    <h1>Generate Git Message Settings</h1>
    <p>Configure the shared prompt and provider-specific command settings.</p>

    <form id="settings-form">
      <div class="grid">
        <div class="section">
          <h2>General</h2>
          <label>
            <span>Provider</span>
            <select name="provider">
              <option value="codex"${state.provider === "codex" ? " selected" : ""}>codex</option>
              <option value="claude"${state.provider === "claude" ? " selected" : ""}>claude</option>
            </select>
          </label>
          <label>
            <span>Shared prompt template</span>
            <textarea name="sharedPromptTemplate">${escapeHtml(state.sharedPromptTemplate)}</textarea>
          </label>
          <label>
            <span>Timeout (ms)</span>
            <input name="timeoutMs" type="number" min="1000" step="1000" value="${state.common.timeoutMs}" />
          </label>
          <label class="inline">
            <input name="debugLogging" type="checkbox"${state.common.debugLogging ? " checked" : ""} />
            <span>Enable debug logging</span>
          </label>
        </div>

        <div class="section">
          <h2>Codex</h2>
          <label>
            <span>Codex path</span>
            <input name="codexPath" type="text" value="${escapeHtml(state.codex.codexPath)}" />
          </label>
          <label>
            <span>Model</span>
            <input name="model" type="text" value="${escapeHtml(state.codex.model)}" />
          </label>
          <label>
            <span>Reasoning effort</span>
            <select name="reasoningEffort">
              ${renderReasoningEffortOption("none", state.codex.reasoningEffort)}
              ${renderReasoningEffortOption("low", state.codex.reasoningEffort)}
              ${renderReasoningEffortOption("medium", state.codex.reasoningEffort)}
              ${renderReasoningEffortOption("high", state.codex.reasoningEffort)}
              ${renderReasoningEffortOption("xhigh", state.codex.reasoningEffort)}
            </select>
          </label>
          <label>
            <span>Command template</span>
            <textarea name="commandTemplate">${escapeHtml(state.codex.commandTemplate)}</textarea>
          </label>
        </div>
      </div>

      <div class="grid" style="margin-top: 16px;">
        <div class="section">
          <h2>Claude</h2>
          <label>
            <span>Claude path</span>
            <input name="claudePath" type="text" value="${escapeHtml(state.claude.claudePath)}" />
          </label>
          <label>
            <span>Claude command template</span>
            <textarea name="claudeCommandTemplate">${escapeHtml(state.claude.claudeCommandTemplate)}</textarea>
          </label>
        </div>
      </div>

      <div class="actions">
        <button class="secondary" type="reset">Reset</button>
        <button class="primary" type="submit">Save settings</button>
      </div>
    </form>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = ${jsonState};
    const form = document.getElementById('settings-form');

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const values = new FormData(form);
      const nextState = {
        provider: String(values.get('provider') || state.provider),
        sharedPromptTemplate: String(values.get('sharedPromptTemplate') || ''),
        common: {
          timeoutMs: Number(values.get('timeoutMs') || state.common.timeoutMs),
          debugLogging: values.get('debugLogging') === 'on'
        },
        codex: {
          codexPath: String(values.get('codexPath') || ''),
          model: String(values.get('model') || ''),
          reasoningEffort: String(values.get('reasoningEffort') || 'medium'),
          commandTemplate: String(values.get('commandTemplate') || '')
        },
        claude: {
          claudePath: String(values.get('claudePath') || ''),
          claudeCommandTemplate: String(values.get('claudeCommandTemplate') || '')
        }
      };

      vscode.postMessage({ type: 'saveSettings', state: nextState });
    });
  </script>
</body>
</html>`;
}

export function isSettingsPanelSaveMessage(message: unknown): message is { type: "saveSettings"; state: SettingsPanelSaveMessage } {
  if (!isRecord(message) || message.type !== "saveSettings") {
    return false;
  }

  return isSettingsPanelState(message.state);
}

function renderReasoningEffortOption(value: ReasoningEffort, selectedValue: ReasoningEffort): string {
  return `<option value="${value}"${value === selectedValue ? " selected" : ""}>${value}</option>`;
}

function isSettingsPanelState(value: unknown): value is SettingsPanelSaveMessage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isProvider(value.provider) &&
    isString(value.sharedPromptTemplate) &&
    isRecord(value.common) &&
    isFiniteNumberAtLeast(value.common.timeoutMs, 1000) &&
    isBoolean(value.common.debugLogging) &&
    isRecord(value.codex) &&
    isString(value.codex.codexPath) &&
    isString(value.codex.model) &&
    isReasoningEffort(value.codex.reasoningEffort) &&
    isString(value.codex.commandTemplate) &&
    isRecord(value.claude) &&
    isString(value.claude.claudePath) &&
    isString(value.claude.claudeCommandTemplate)
  );
}

function isProvider(value: unknown): value is SettingsPanelState["provider"] {
  return typeof value === "string" && PROVIDERS.includes(value as SettingsPanelState["provider"]);
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === "string" && REASONING_EFFORTS.includes(value as ReasoningEffort);
}

function isFiniteNumberAtLeast(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function serializeStateForScript(state: SettingsPanelState): string {
  return JSON.stringify(state).replace(/</g, "\\u003c");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createNonce(): string {
  return Math.random().toString(36).slice(2, 14);
}
