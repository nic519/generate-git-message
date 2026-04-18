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
      color-scheme: dark;
      --bg: #071018;
      --panel: rgba(10, 16, 26, 0.86);
      --panel-strong: rgba(11, 18, 30, 0.96);
      --panel-soft: rgba(16, 24, 38, 0.74);
      --line: rgba(148, 163, 184, 0.18);
      --text: #f7fbff;
      --muted: #98a7bd;
      --accent: #6ee7c8;
      --accent-strong: #2dd4bf;
      --accent-soft: rgba(110, 231, 200, 0.14);
      --danger-soft: rgba(248, 113, 113, 0.16);
      --shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      padding: 28px;
      background:
        radial-gradient(circle at top left, rgba(45, 212, 191, 0.22), transparent 28%),
        radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 24%),
        linear-gradient(180deg, #09111b 0%, #05080d 100%);
      color: var(--text);
      font: 13px/1.55 "SF Pro Display", "Segoe UI", sans-serif;
    }

    .shell {
      max-width: 1180px;
      margin: 0 auto;
      display: grid;
      gap: 18px;
    }

    .hero,
    .section,
    .footer-bar {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: var(--shadow);
      background: linear-gradient(180deg, var(--panel) 0%, var(--panel-strong) 100%);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
      gap: 24px;
      padding: 26px;
      min-height: 280px;
    }

    .hero::after,
    .section::after,
    .footer-bar::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.04), transparent 48%);
      pointer-events: none;
    }

    .hero-copy {
      max-width: 560px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 18px;
    }

    .eyebrow {
      margin: 0;
      color: var(--accent);
      font-size: 11px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1 {
      font-size: clamp(34px, 4vw, 56px);
      line-height: 0.95;
      letter-spacing: -0.06em;
    }

    .hero p {
      color: var(--muted);
    }

    .hero-grid {
      display: grid;
      gap: 12px;
      align-content: end;
    }

    .hero-stat {
      padding: 14px 16px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: var(--panel-soft);
      backdrop-filter: blur(12px);
    }

    .hero-stat-label {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .hero-stat-value {
      margin-top: 8px;
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.04em;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 999px;
      border: 1px solid rgba(110, 231, 200, 0.18);
      background: var(--accent-soft);
      color: #d6fff5;
      width: fit-content;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 12px currentColor;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    .section {
      padding: 22px;
    }

    .section-header {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    .section h2 {
      font-size: 20px;
      letter-spacing: -0.03em;
    }

    .section p {
      color: var(--muted);
    }

    .field-grid {
      display: grid;
      gap: 14px;
    }

    label {
      display: grid;
      gap: 7px;
    }

    label span {
      color: #eaf1fb;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    input,
    select,
    textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 12px 14px;
      font: inherit;
      color: var(--text);
      background: rgba(8, 13, 21, 0.9);
      transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: none;
      border-color: rgba(110, 231, 200, 0.44);
      box-shadow: 0 0 0 4px rgba(110, 231, 200, 0.1);
      transform: translateY(-1px);
    }

    textarea {
      min-height: 132px;
      resize: vertical;
    }

    .inline {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--panel-soft);
    }

    .inline input {
      width: 18px;
      height: 18px;
      margin: 0;
      accent-color: var(--accent-strong);
      box-shadow: none;
      transform: none;
    }

    .inline span {
      margin: 0;
      color: var(--text);
      font-size: 13px;
      letter-spacing: 0;
      text-transform: none;
      font-weight: 600;
    }

    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 22px;
    }

    .footer-copy {
      display: grid;
      gap: 6px;
      max-width: 560px;
    }

    .footer-copy p:last-child {
      color: var(--muted);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    button {
      appearance: none;
      border: 1px solid transparent;
      border-radius: 14px;
      padding: 12px 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
    }

    button svg {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
    }

    button:hover {
      transform: translateY(-1px);
    }

    .primary {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
      color: #02130f;
    }

    .secondary {
      background: var(--danger-soft);
      border-color: rgba(248, 113, 113, 0.18);
      color: #ffe1e1;
    }

    .helper {
      color: var(--muted);
      font-size: 12px;
    }

    @media (max-width: 960px) {
      .hero {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 820px) {
      body {
        padding: 16px;
      }

      .grid {
        grid-template-columns: 1fr;
      }

      .footer-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .actions {
        width: 100%;
      }

      .actions button {
        flex: 1 1 auto;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="hero-copy">
        <div>
          <p class="eyebrow">Control Studio</p>
          <h1>Generate Git Message</h1>
        </div>
        <p>一个更适合日常提交工作的控制台式设置面板。你可以在这里切换 provider、调整 prompt 模板、控制超时时间，并保持配置保存到合适的作用域。</p>
        <div class="status-pill">
          <span class="status-dot"></span>
          <span>${state.common.debugLogging ? "Debug logging enabled" : "Debug logging disabled"}</span>
        </div>
      </div>

      <div class="hero-grid">
        <div class="hero-stat">
          <div class="hero-stat-label">Active Provider</div>
          <div class="hero-stat-value">${escapeHtml(state.provider)}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">Timeout Window</div>
          <div class="hero-stat-value">${state.common.timeoutMs} ms</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-label">Prompt Mode</div>
          <div class="hero-stat-value">Shared Across Providers</div>
        </div>
      </div>
    </section>

    <form id="settings-form">
      <div class="grid">
        <div class="section">
          <div class="section-header">
            <h2>Provider Runtime</h2>
            <p>定义当前工作区使用哪个本地 CLI，以及这次请求的运行窗口。</p>
          </div>
          <div class="field-grid">
            <label>
              <span>Provider</span>
              <select name="provider">
                <option value="codex"${state.provider === "codex" ? " selected" : ""}>codex</option>
                <option value="claude"${state.provider === "claude" ? " selected" : ""}>claude</option>
              </select>
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
        </div>

        <div class="section">
          <div class="section-header">
            <h2>Prompt System</h2>
            <p>共享 prompt 会同时服务于 Codex 与 Claude，适合统一提交语气与输出约束。</p>
          </div>
          <div class="field-grid">
            <label>
              <span>Shared prompt template</span>
              <textarea name="sharedPromptTemplate">${escapeHtml(state.sharedPromptTemplate)}</textarea>
            </label>
            <p class="helper">使用 <code>{{diff}}</code> 作为 Git diff 占位符。这里建议只保留会影响提交质量的硬约束。</p>
          </div>
        </div>
      </div>

      <div class="grid" style="margin-top: 18px;">
        <div class="section">
          <div class="section-header">
            <h2>Codex Runtime</h2>
            <p>为 Codex CLI 配置本地执行路径、模型和命令模板。</p>
          </div>
          <div class="field-grid">
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

        <div class="section">
          <div class="section-header">
            <h2>Claude Runtime</h2>
            <p>如果你切换到 Claude，本区定义 CLI 路径与自定义命令模板。</p>
          </div>
          <div class="field-grid">
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
      </div>

      <div class="footer-bar" style="margin-top: 18px;">
        <div class="footer-copy">
          <h3>Save Workspace Settings</h3>
          <p>保存时会尽量保留你原有的 workspace / global 作用域，不会强行改写配置位置。</p>
        </div>
        <div class="actions">
          <button class="secondary" type="reset">Reset Form</button>
          <button class="secondary" id="generate-message-button" type="button">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
              <path d="M20 2v4"/>
              <path d="M22 4h-4"/>
              <circle cx="4" cy="20" r="2"/>
            </svg>
            <span>Generate Message</span>
          </button>
          <button class="primary" type="submit">Save Settings</button>
        </div>
      </div>
    </form>
  </main>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = ${jsonState};
    const form = document.getElementById('settings-form');
    const generateButton = document.getElementById('generate-message-button');

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

    generateButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'generateMessage' });
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
