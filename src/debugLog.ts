import { type ExtensionOptions } from "./config";

export function getProviderDebugLines(options: ExtensionOptions): string[] {
  if (options.provider === "claude") {
    return [
      `  claudePath: ${options.claude.claudePath}`,
      `  claudeCommandTemplate: ${options.claude.claudeCommandTemplate.trim() ? "(custom)" : "(default)"}`
    ];
  }

  return [
    `  model: ${options.codex.model || "(default)"}`,
    `  reasoningEffort: ${options.codex.reasoningEffort}`
  ];
}
