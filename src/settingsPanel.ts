import {
  OUTPUT_LANGUAGES,
  PROVIDERS,
  REASONING_EFFORTS,
  resolveExtensionOptions,
  type ConfigurationLike,
  type OutputLanguage,
  type ReasoningEffort
} from "./config";

export interface SettingsPanelState {
  provider: "codex" | "claude";
  commitTemplates: Record<OutputLanguage, string>;
  common: {
    timeoutMs: number;
    debugLogging: boolean;
    outputLanguage: OutputLanguage;
  };
  codex: {
    codexPath: string;
    model: string;
    reasoningEffort: ReasoningEffort;
  };
  claude: {
    claudePath: string;
    claudeModel: string;
  };
}

export interface SettingsPanelSaveMessage extends SettingsPanelState { }

export interface SettingsPanelUpdate {
  key: string;
  value: unknown;
}

export interface WebviewLike {
  cspSource: string;
}

export type SettingsPanelSaveTarget = "global" | "workspace" | "workspaceFolder";

export function getSettingsPanelState(configuration: ConfigurationLike): SettingsPanelState {
  const options = resolveExtensionOptions(configuration);

  return {
    provider: options.provider,
    commitTemplates: options.common.commitTemplates,
    common: {
      timeoutMs: options.common.timeoutMs,
      debugLogging: options.common.debugLogging,
      outputLanguage: options.common.outputLanguage
    },
    codex: {
      codexPath: options.codex.codexPath,
      model: options.codex.model,
      reasoningEffort: options.codex.reasoningEffort
    },
    claude: {
      claudePath: options.claude.claudePath,
      claudeModel: options.claude.claudeModel
    }
  };
}

export function getSettingsPanelSaveTarget(
  configuration: ConfigurationLike,
  key: string
): SettingsPanelSaveTarget {
  const inspected = configuration.inspect?.(key);
  if (inspected?.workspaceFolderValue !== undefined) {
    return "workspaceFolder";
  }

  if (inspected?.workspaceValue !== undefined) {
    return "workspace";
  }

  return "global";
}

export function mapSettingsPanelSaveMessageToUpdates(message: SettingsPanelSaveMessage): SettingsPanelUpdate[] {
  return [
    { key: "provider", value: message.provider },
    { key: "commitTemplateEn", value: message.commitTemplates.en },
    { key: "commitTemplateZh", value: message.commitTemplates.zh },
    { key: "commitTemplateZhHant", value: message.commitTemplates["zh-Hant"] },
    { key: "outputLanguage", value: message.common.outputLanguage },
    { key: "timeoutMs", value: message.common.timeoutMs },
    { key: "debugLogging", value: message.common.debugLogging },
    { key: "codexPath", value: message.codex.codexPath },
    { key: "model", value: message.codex.model },
    { key: "reasoningEffort", value: message.codex.reasoningEffort },
    { key: "claudePath", value: message.claude.claudePath },
    { key: "claudeModel", value: message.claude.claudeModel }
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
      --bg: #0b1118;
      --line: rgba(148, 163, 184, 0.22);
      --line-soft: rgba(148, 163, 184, 0.12);
      --text: #f4f8fd;
      --muted: #9aa8ba;
      --accent: #6ee7c8;
      --accent-strong: #2dd4bf;
      --accent-soft: rgba(110, 231, 200, 0.11);
      --surface: rgba(9, 14, 22, 0.78);
      --surface-strong: rgba(12, 18, 28, 0.96);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      padding: 18px;
      background:
        radial-gradient(circle at top left, rgba(45, 212, 191, 0.12), transparent 30%),
        linear-gradient(180deg, #0d141d 0%, #080c12 100%);
      color: var(--text);
      font: 13px/1.55 "SF Pro Display", "Segoe UI", sans-serif;
    }

    .shell {
      display: grid;
      gap: 0;
    }

    .hero {
      padding: 0 0 18px;
      border-bottom: 1px solid var(--line);
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
      margin-top: 8px;
      font-size: 22px;
      line-height: 1.05;
      letter-spacing: -0.04em;
    }

    .hero p {
      margin-top: 10px;
      color: var(--muted);
    }

    .grid {
      display: grid;
      gap: 0;
    }

    .section {
      padding: 18px 0;
      border-bottom: 1px solid var(--line);
    }

    .section-header {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
    }

    .section h2 {
      font-size: 14px;
      letter-spacing: -0.01em;
    }

    .section p {
      color: var(--muted);
    }

    .field-grid {
      display: grid;
      gap: 12px;
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
      border-radius: 9px;
      padding: 9px 10px;
      font: inherit;
      color: var(--text);
      background: var(--surface);
      transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: none;
      border-color: rgba(110, 231, 200, 0.44);
      box-shadow: 0 0 0 2px rgba(110, 231, 200, 0.1);
    }

    textarea {
      min-height: 220px;
      resize: vertical;
    }

    .inline {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 0;
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
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
      padding: 18px 0 0;
    }

    .footer-copy {
      display: grid;
      gap: 5px;
    }

    .footer-copy p:last-child {
      color: var(--muted);
    }

    .actions {
      display: grid;
      gap: 8px;
    }

    button {
      appearance: none;
      border: 1px solid transparent;
      border-radius: 9px;
      padding: 9px 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: border-color 140ms ease, background 140ms ease;
    }

    button svg {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
    }

    button:hover {
      border-color: rgba(110, 231, 200, 0.28);
    }

    .primary {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
      color: #02130f;
    }

    .secondary {
      background: var(--surface-strong);
      border-color: var(--line);
      color: var(--text);
    }

    .helper {
      color: var(--muted);
      font-size: 12px;
    }

    @media (max-width: 820px) {
      body {
        padding: 14px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Settings</p>
      <h1>Generate Git Message</h1>
    </section>

    <form id="settings-form">
      <div class="grid">
        <div class="section">
          <div class="section-header">
            <h2>Provider Runtime</h2>
            <p>Select the local CLI provider and the request timeout for this workspace.</p>
          </div>
          <div class="field-grid">
            <label>
              <span>Provider</span>
              <select name="provider">
                <option value="codex"${state.provider === "codex" ? " selected" : ""}>codex</option>
                <option value="claude"${state.provider === "claude" ? " selected" : ""}>claude</option>
              </select>
            </label>
            <p class="helper">Available CLIs: Codex and Claude. Switch here to configure the one you want to use.</p>
            <label>
              <span>Output language</span>
              <select name="outputLanguage">
                ${renderOutputLanguageOption("zh", state.common.outputLanguage)}
                ${renderOutputLanguageOption("en", state.common.outputLanguage)}
                ${renderOutputLanguageOption("zh-Hant", state.common.outputLanguage)}
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
            <h2>Commit Templates</h2>
            <p>Edit the prompt for the currently selected output language.</p>
          </div>
          <div class="field-grid">
            ${renderCommitTemplateField(state.common.outputLanguage, state.commitTemplates[state.common.outputLanguage])}
            <p class="helper">Use <code>{{diff}}</code> as the Git diff placeholder. Keep only the constraints that improve commit message quality.</p>
          </div>
        </div>
      </div>

      <div class="grid">
        ${renderActiveRuntimeSection(state)}
      </div>

      <div class="footer-bar">
        <p class="helper">Changes save automatically.</p>
        <div class="actions">
          <button class="secondary" id="generate-message-button" type="button">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>
              <path d="M20 2v4"/>
              <path d="M22 4h-4"/>
              <circle cx="4" cy="20" r="2"/>
            </svg>
            <span>Generate Message</span>
          </button>
        </div>
      </div>
    </form>
  </main>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const state = ${jsonState};
    const form = document.getElementById('settings-form');
    const generateButton = document.getElementById('generate-message-button');
    let saveTimer;

    const collectState = () => {
      const values = new FormData(form);
      const outputLanguage = String(values.get('outputLanguage') || state.common.outputLanguage);
      const currentTemplateKey = getCommitTemplateKey(outputLanguage);
      const currentTemplate = String(values.get(currentTemplateKey) || state.commitTemplates[outputLanguage] || '');
      return {
        provider: String(values.get('provider') || state.provider),
        commitTemplates: {
          ...state.commitTemplates,
          [outputLanguage]: currentTemplate
        },
        common: {
          timeoutMs: Number(values.get('timeoutMs') || state.common.timeoutMs),
          debugLogging: values.get('debugLogging') === 'on',
          outputLanguage
        },
        codex: {
          codexPath: String(values.get('codexPath') || ''),
          model: String(values.get('model') || ''),
          reasoningEffort: String(values.get('reasoningEffort') || 'medium')
        },
        claude: {
          claudePath: String(values.get('claudePath') || ''),
          claudeModel: String(values.get('claudeModel') || '')
        }
      };
    };

    const saveSettings = () => {
      window.clearTimeout(saveTimer);
      vscode.postMessage({ type: 'saveSettings', state: collectState() });
    };

    const scheduleSave = () => {
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(saveSettings, 450);
    };

    form.addEventListener('input', () => {
      scheduleSave();
    });

    form.addEventListener('change', () => {
      saveSettings();
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

function renderOutputLanguageOption(value: OutputLanguage, selectedValue: OutputLanguage): string {
  const labels: Record<OutputLanguage, string> = {
    zh: "Chinese (Simplified)",
    en: "English",
    "zh-Hant": "Chinese (Traditional)"
  };

  return `<option value="${value}"${value === selectedValue ? " selected" : ""}>${labels[value]}</option>`;
}

function getCommitTemplateKey(language: OutputLanguage): string {
  if (language === "en") {
    return "commitTemplateEn";
  }

  if (language === "zh") {
    return "commitTemplateZh";
  }

  return "commitTemplateZhHant";
}

function renderCommitTemplateField(language: OutputLanguage, value: string): string {
  const labels: Record<OutputLanguage, string> = {
    en: "English commit template",
    zh: "简体中文 commit template",
    "zh-Hant": "繁體中文 commit template"
  };

  return /* html */ `
            <label>
              <span>${labels[language]}</span>
              <textarea name="${getCommitTemplateKey(language)}">${escapeHtml(value)}</textarea>
            </label>`;
}

function renderActiveRuntimeSection(state: SettingsPanelState): string {
  if (state.provider === "claude") {
    return /* html */ `
        <div class="section">
          <div class="section-header">
            <h2>Claude Runtime</h2>
            <p>Configure the local Claude executable used when Claude is selected as the provider.</p>
          </div>
          <div class="field-grid">
            <label>
              <span>Claude path</span>
              <input name="claudePath" type="text" value="${escapeHtml(state.claude.claudePath)}" />
            </label>
            <label>
              <span>Claude model</span>
              <input name="claudeModel" type="text" value="${escapeHtml(state.claude.claudeModel)}" />
            </label>
          </div>
        </div>`;
  }

  return /* html */ `
        <div class="section">
          <div class="section-header">
            <h2>Codex Runtime</h2>
            <p>Configure the local Codex executable, model override, and reasoning effort.</p>
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
          </div>
        </div>`;
}

function isSettingsPanelState(value: unknown): value is SettingsPanelSaveMessage {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isProvider(value.provider) &&
    isCommitTemplates(value.commitTemplates) &&
    isRecord(value.common) &&
    isFiniteNumberAtLeast(value.common.timeoutMs, 1000) &&
    isBoolean(value.common.debugLogging) &&
    isOutputLanguage(value.common.outputLanguage) &&
    isRecord(value.codex) &&
    isString(value.codex.codexPath) &&
    isString(value.codex.model) &&
    isReasoningEffort(value.codex.reasoningEffort) &&
    isRecord(value.claude) &&
    isString(value.claude.claudePath) &&
    isString(value.claude.claudeModel)
  );
}

function isProvider(value: unknown): value is SettingsPanelState["provider"] {
  return typeof value === "string" && PROVIDERS.includes(value as SettingsPanelState["provider"]);
}

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === "string" && REASONING_EFFORTS.includes(value as ReasoningEffort);
}

function isOutputLanguage(value: unknown): value is OutputLanguage {
  return typeof value === "string" && OUTPUT_LANGUAGES.includes(value as OutputLanguage);
}

function isCommitTemplates(value: unknown): value is Record<OutputLanguage, string> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.en) &&
    isString(value.zh) &&
    isString(value["zh-Hant"])
  );
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
