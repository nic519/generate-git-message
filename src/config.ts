export const DEFAULT_PROMPT_TEMPLATE =
  "Generate a concise git commit message from the following git diff.\n" +
  "Requirements:\n" +
  "- Return only the final commit message.\n" +
  "- Do not explain the result.\n" +
  "- Prefer Conventional Commits style when it fits the change.\n" +
  "- Accurately summarize the main intent of the change.\n" +
  "- If the change is ambiguous, choose the safest concise message.\n\n" +
  "{{diff}}";

export const REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh"] as const;
export const PROVIDERS = ["codex", "claude"] as const;
export const OUTPUT_LANGUAGES = ["en", "zh", "ja"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
export type Provider = (typeof PROVIDERS)[number];
export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number];

export interface ConfigurationLike {
  get<T>(key: string, defaultValue?: T): T;
  inspect?(key: string): {
    defaultValue?: unknown;
    globalValue?: unknown;
    workspaceFolderValue?: unknown;
    workspaceValue?: unknown;
  } | undefined;
}

export interface CommonOptions {
  debugLogging: boolean;
  outputLanguage: OutputLanguage;
  promptTemplate: string;
  timeoutMs: number;
}

export interface CodexOptions {
  codexPath: string;
  model: string;
  reasoningEffort: ReasoningEffort;
}

export interface ClaudeOptions {
  claudePath: string;
  claudeModel: string;
}

export interface ExtensionOptions {
  provider: Provider;
  common: CommonOptions;
  codex: CodexOptions;
  claude: ClaudeOptions;
}

export function resolveCodexOptions(configuration: ConfigurationLike): CodexOptions {
  return resolveCodexProviderOptions(configuration);
}

export function resolveCommonOptions(configuration: ConfigurationLike): CommonOptions {
  return {
    debugLogging: configuration.get<boolean>("debugLogging", false),
    outputLanguage: resolveOutputLanguage(configuration.get<string>("outputLanguage", "en")),
    promptTemplate: configuration.get<string>("promptTemplate", DEFAULT_PROMPT_TEMPLATE),
    timeoutMs: configuration.get<number>("timeoutMs", 20_000)
  };
}

export function resolveCodexProviderOptions(configuration: ConfigurationLike): CodexOptions {
  const reasoningEffort = configuration.get<string>("reasoningEffort", "medium");

  return {
    codexPath: configuration.get<string>("codexPath", "codex"),
    model: configuration.get<string>("model", "gpt-5.4-mini"),
    reasoningEffort: isReasoningEffort(reasoningEffort) ? reasoningEffort : "medium"
  };
}

export function resolveClaudeOptions(configuration: ConfigurationLike): ClaudeOptions {
  return {
    claudePath: configuration.get<string>("claudePath", "claude"),
    claudeModel: configuration.get<string>("claudeModel", "claude-haiku-4-5-20251001")
  };
}

export function resolveExtensionOptions(configuration: ConfigurationLike): ExtensionOptions {
  return {
    provider: resolveProvider(configuration.get<string>("provider", "codex")),
    common: resolveCommonOptions(configuration),
    codex: resolveCodexProviderOptions(configuration),
    claude: resolveClaudeOptions(configuration)
  };
}

function resolveProvider(value: string): Provider {
  return isProvider(value) ? value : "codex";
}

function resolveOutputLanguage(value: string): OutputLanguage {
  return isOutputLanguage(value) ? value : "en";
}

function isReasoningEffort(value: string): value is ReasoningEffort {
  return REASONING_EFFORTS.includes(value as ReasoningEffort);
}

function isProvider(value: string): value is Provider {
  return PROVIDERS.includes(value as Provider);
}

function isOutputLanguage(value: string): value is OutputLanguage {
  return OUTPUT_LANGUAGES.includes(value as OutputLanguage);
}
