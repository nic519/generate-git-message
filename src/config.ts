export const DEFAULT_PROMPT_TEMPLATE =
  "Create a standardized git commit message from the following git diff.\n" +
  "Follow the Conventional Commits specification.\n\n" +
  "Workflow:\n" +
  "1. Analyze the diff to identify the primary logical change.\n" +
  "2. Choose the most accurate type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, or revert.\n" +
  "3. Infer an optional scope from the affected module, package, or file area. Omit the scope if no stable scope is clear.\n" +
  "4. Write a present-tense, imperative description under 72 characters.\n" +
  "5. Add a short body only when it materially explains the reason, impact, or risk.\n" +
  "6. If the diff contains an API removal, incompatible behavior change, migration requirement, or other breaking change, mark the header with ! or add a BREAKING CHANGE footer.\n\n" +
  "Output rules:\n" +
  "- Return only the final commit message.\n" +
  "- Do not explain your analysis.\n" +
  "- Prefer one logical change; if the diff mixes unrelated changes, summarize the dominant change without inventing details.\n" +
  "- Never mention files that are not present in the diff.\n\n" +
  "Format:\n" +
  "<type>[optional scope]: <description>\n\n" +
  "[optional body]\n\n" +
  "[optional footer]\n\n" +
  "Git diff:\n{{diff}}";

export const REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh"] as const;
export const PROVIDERS = ["codex", "claude"] as const;
export const OUTPUT_LANGUAGES = ["en", "zh", "zh-Hant", "ja"] as const;

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
    timeoutMs: configuration.get<number>("timeoutMs", 50_000)
  };
}

export function resolveCodexProviderOptions(configuration: ConfigurationLike): CodexOptions {
  const reasoningEffort = configuration.get<string>("reasoningEffort", "low");

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
