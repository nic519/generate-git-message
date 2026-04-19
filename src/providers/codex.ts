import { type CodexOptions } from "../config";
import { type BuiltCommand } from "./types";

export function buildCodexCommand(
  options: {
    codex: CodexOptions;
  },
  prompt: string,
  _promptFile: string,
  outputFile: string,
  workingDirectory?: string
): BuiltCommand {
  const args = ["exec", "--skip-git-repo-check", "--ephemeral"];
  if (workingDirectory) {
    args.push("-C", workingDirectory);
  }
  // 优先让 Codex 把最终答案写入文件，避免从 stdout 解析进度输出。
  args.push("-o", outputFile);
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
