export const DEFAULT_COMMIT_TEMPLATES = {
  en:
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
    "Git diff:\n{{diff}}",
  zh:
    "根据以下 git diff 生成标准化的 git commit message。\n" +
    "请遵循 Conventional Commits 规范。\n\n" +
    "工作流程：\n" +
    "1. 分析 diff，识别主要逻辑变更。\n" +
    "2. 选择最准确的 type：feat、fix、docs、style、refactor、perf、test、build、ci、chore 或 revert。\n" +
    "3. 根据受影响的模块、包或文件范围推断可选 scope；如果没有明确且稳定的 scope，则省略。\n" +
    "4. 使用现在时、祈使语气撰写 72 字符以内的描述。\n" +
    "5. 仅在能切实说明原因、影响或风险时，才添加简短 body。\n" +
    "6. 如果 diff 包含 API 移除、不兼容变更、迁移要求或其他 breaking change，请在 header 中标记 !，或添加 BREAKING CHANGE footer。\n\n" +
    "输出规则：\n" +
    "- 只返回最终 commit message。\n" +
    "- 不要解释分析过程。\n" +
    "- 如果 diff 混合了多个无关改动，只总结最主要的改动，不要编造细节。\n" +
    "- 不要提及 diff 中不存在的文件。\n\n" +
    "格式：\n" +
    "<type>[optional scope]: <description>\n\n" +
    "[optional body]\n\n" +
    "[optional footer]\n\n" +
    "Git diff:\n{{diff}}",
  "zh-Hant":
    "根據以下 git diff 生成標準化的 git commit message。\n" +
    "請遵循 Conventional Commits 規範。\n\n" +
    "工作流程：\n" +
    "1. 分析 diff，識別主要邏輯變更。\n" +
    "2. 選擇最準確的 type：feat、fix、docs、style、refactor、perf、test、build、ci、chore 或 revert。\n" +
    "3. 根據受影響的模組、套件或檔案範圍推斷可選 scope；如果沒有明確且穩定的 scope，則省略。\n" +
    "4. 使用現在式、祈使語氣撰寫 72 字元以內的描述。\n" +
    "5. 僅在能切實說明原因、影響或風險時，才加入簡短 body。\n" +
    "6. 如果 diff 包含 API 移除、不相容變更、遷移需求或其他 breaking change，請在 header 中標記 !，或加入 BREAKING CHANGE footer。\n\n" +
    "輸出規則：\n" +
    "- 只回傳最終 commit message。\n" +
    "- 不要解釋分析過程。\n" +
    "- 如果 diff 混合了多個無關改動，只總結最主要的改動，不要編造細節。\n" +
    "- 不要提及 diff 中不存在的檔案。\n\n" +
    "格式：\n" +
    "<type>[optional scope]: <description>\n\n" +
    "[optional body]\n\n" +
    "[optional footer]\n\n" +
    "Git diff:\n{{diff}}"
} as const;

export const REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh"] as const;
export const PROVIDERS = ["codex", "claude"] as const;
export const OUTPUT_LANGUAGES = ["en", "zh", "zh-Hant"] as const;

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
  commitTemplates: Record<OutputLanguage, string>;
  outputLanguage: OutputLanguage;
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
  const legacyPromptTemplate = resolveLegacyPromptTemplate(configuration);
  return {
    debugLogging: configuration.get<boolean>("debugLogging", false),
    commitTemplates: {
      en: configuration.get<string>("commitTemplateEn", legacyPromptTemplate ?? DEFAULT_COMMIT_TEMPLATES.en),
      zh: configuration.get<string>("commitTemplateZh", legacyPromptTemplate ?? DEFAULT_COMMIT_TEMPLATES.zh),
      "zh-Hant": configuration.get<string>("commitTemplateZhHant", legacyPromptTemplate ?? DEFAULT_COMMIT_TEMPLATES["zh-Hant"])
    },
    outputLanguage: resolveOutputLanguage(configuration.get<string>("outputLanguage", "zh")),
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
  return isOutputLanguage(value) ? value : "zh";
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

function resolveLegacyPromptTemplate(configuration: ConfigurationLike): string | undefined {
  const value = configuration.get<string | undefined>("promptTemplate", undefined);
  return typeof value === "string" ? value : undefined;
}
