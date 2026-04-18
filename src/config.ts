export const DEFAULT_PROMPT_TEMPLATE =
  "根据以下 git diff，生成一个简洁明确的 git commit message。要求：\n" +
  "- 直接只输出最终 commit message\n" +
  "- 不要解释\n" +
  "- 默认使用 Conventional Commits 风格，但描述使用中文\n" +
  "- 尽量准确概括本次变更\n" +
  "- 如果无法判断，给出最稳妥的一行提交信息\n\n" +
  "{{diff}}";

export const REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh"] as const;
export const PROVIDERS = ["codex", "claude"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
export type Provider = (typeof PROVIDERS)[number];

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
    promptTemplate: configuration.get<string>("promptTemplate", DEFAULT_PROMPT_TEMPLATE),
    timeoutMs: configuration.get<number>("timeoutMs", 20_000)
  };
}

export function resolveCodexProviderOptions(configuration: ConfigurationLike): CodexOptions {
  const reasoningEffort = configuration.get<string>("reasoningEffort", "medium");

  return {
    codexPath: configuration.get<string>("codexPath", "codex"),
    model: configuration.get<string>("model", ""),
    reasoningEffort: isReasoningEffort(reasoningEffort) ? reasoningEffort : "medium"
  };
}

export function resolveClaudeOptions(configuration: ConfigurationLike): ClaudeOptions {
  return {
    claudePath: configuration.get<string>("claudePath", "claude")
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

function isReasoningEffort(value: string): value is ReasoningEffort {
  return REASONING_EFFORTS.includes(value as ReasoningEffort);
}

function isProvider(value: string): value is Provider {
  return PROVIDERS.includes(value as Provider);
}
