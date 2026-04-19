import { type ExtensionOptions } from "./config";
import { type GeneratedMessageDebug } from "./providers/types";

export interface RequestDebugContext {
  diffSource: "staged" | "workingTree";
  diffLength: number;
  repositoryRoot: string;
  options: ExtensionOptions;
  debug: GeneratedMessageDebug;
}

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

export function getRequestDebugLines(context: RequestDebugContext): string[] {
  return [
    `  repositoryRoot: ${context.repositoryRoot}`,
    `  cwd: ${context.repositoryRoot}`,
    `  diffSource: ${context.diffSource}`,
    `  diffLength: ${context.diffLength}`,
    ...getProviderDebugLines(context.options),
    `  command: ${context.debug.command} ${context.debug.args.join(" ")}`,
    `  durationMs: ${context.debug.durationMs}`
  ];
}
