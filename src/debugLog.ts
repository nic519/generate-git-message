import { type ExtensionOptions } from "./config";

export function getProviderDebugLines(options: ExtensionOptions): string[] {
  if (options.provider === "claude") {
    return [
      `  claudePath: ${options.claude.claudePath}`,
      `  claudeModel: ${options.claude.claudeModel}`
    ];
  }

  return [
    `  model: ${options.codex.model || "(default)"}`,
    `  reasoningEffort: ${options.codex.reasoningEffort}`
  ];
}
