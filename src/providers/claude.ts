import { type ClaudeOptions } from "../config";
import { type BuiltCommand } from "./types";

export function buildClaudeCommand(
  options: {
    claude: ClaudeOptions;
  },
  prompt: string,
  _promptFile: string,
  _outputFile: string
): BuiltCommand {
  return {
    command: options.claude.claudePath,
    args: ["-p", "--output-format", "text"],
    stdin: prompt
  };
}
