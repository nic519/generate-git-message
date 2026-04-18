import { type ClaudeOptions } from "../config";
import { buildShellCommand } from "./shell";
import { type BuiltCommand } from "./types";

export function buildClaudeCommand(
  options: {
    claude: ClaudeOptions;
  },
  prompt: string,
  promptFile: string,
  _outputFile: string
): BuiltCommand {
  if (options.claude.claudeCommandTemplate.trim()) {
    return buildShellCommand(options.claude.claudeCommandTemplate.replaceAll("{{promptFile}}", promptFile));
  }

  return {
    command: options.claude.claudePath,
    args: ["-p", "--output-format", "text"],
    stdin: prompt
  };
}
