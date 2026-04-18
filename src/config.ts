export const DEFAULT_PROMPT_TEMPLATE =
  "根据以下 git diff，生成一个简洁明确的 git commit message。要求：\n" +
  "- 直接只输出最终 commit message\n" +
  "- 不要解释\n" +
  "- 默认使用 Conventional Commits 风格，但描述使用中文\n" +
  "- 尽量准确概括本次变更\n" +
  "- 如果无法判断，给出最稳妥的一行提交信息\n\n" +
  "{{diff}}";

export const REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export interface ConfigurationLike {
  get<T>(key: string, defaultValue?: T): T;
}

export interface CodexOptions {
  codexPath: string;
  model: string;
  reasoningEffort: ReasoningEffort;
  debugLogging: boolean;
  commandTemplate: string;
  promptTemplate: string;
  timeoutMs: number;
}

export function resolveCodexOptions(configuration: ConfigurationLike): CodexOptions {
  const reasoningEffort = configuration.get<string>("reasoningEffort", "medium");

  return {
    codexPath: configuration.get<string>("codexPath", "codex"),
    model: configuration.get<string>("model", ""),
    reasoningEffort: isReasoningEffort(reasoningEffort) ? reasoningEffort : "medium",
    debugLogging: configuration.get<boolean>("debugLogging", false),
    commandTemplate: configuration.get<string>("commandTemplate", ""),
    promptTemplate: configuration.get<string>("promptTemplate", DEFAULT_PROMPT_TEMPLATE),
    timeoutMs: configuration.get<number>("timeoutMs", 20_000)
  };
}

function isReasoningEffort(value: string): value is ReasoningEffort {
  return REASONING_EFFORTS.includes(value as ReasoningEffort);
}
