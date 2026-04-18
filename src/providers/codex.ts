import { type CodexOptions } from "../config";
import { buildShellCommand } from "./shell";
import { type BuiltCommand } from "./types";

export function buildCodexCommand(
  options: {
    codex: CodexOptions;
  },
  prompt: string,
  promptFile: string,
  outputFile: string
): BuiltCommand {
  if (options.codex.commandTemplate.trim()) {
    return buildShellCommand(options.codex.commandTemplate.replaceAll("{{promptFile}}", promptFile));
  }

  const args = ["exec", "--skip-git-repo-check", "-o", outputFile];
  if (options.codex.model.trim()) {
    args.push("-m", options.codex.model.trim());
  }
  args.push("-c", `model_reasoning_effort="${options.codex.reasoningEffort}"`);
  args.push("-");

  return {
    command: options.codex.codexPath,
    args,
    stdin: prompt
  };
}
