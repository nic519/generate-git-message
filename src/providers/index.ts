import { type ExtensionOptions, type Provider } from "../config";
import { generateMessage as executeMessage } from "../messageGenerator";
import { buildClaudeCommand } from "./claude";
import { buildCodexCommand } from "./codex";
import { type CancellationToken, type GeneratedMessageResult } from "./types";

export function getProviderDisplayName(provider: Provider): string {
  return provider === "claude" ? "Claude" : "Codex";
}

export async function generateMessage(
  options: ExtensionOptions,
  diff: string,
  cancellationToken?: CancellationToken
): Promise<GeneratedMessageResult> {
  const prompt = options.common.promptTemplate.replace("{{diff}}", diff);

  switch (options.provider) {
    case "claude":
      return await executeMessage(
        prompt,
        options.common.timeoutMs,
        ({ prompt: promptText, promptFile, outputFile }) =>
          buildClaudeCommand({ claude: options.claude }, promptText, promptFile, outputFile),
        {
          emptyMessage: "Claude returned an empty commit message.",
          missingCli: "Could not find the Claude CLI. Check generateGitMessage.claudePath.",
          templateError: "Claude command did not produce an executable.",
          timeout: "Claude CLI timed out before returning a commit message.",
          unexpected: "Claude CLI failed unexpectedly."
        },
        cancellationToken
      );
    case "codex":
    default:
      return await executeMessage(
        prompt,
        options.common.timeoutMs,
        ({ prompt: promptText, promptFile, outputFile }) =>
          buildCodexCommand({ codex: options.codex }, promptText, promptFile, outputFile),
        {
          emptyMessage: "Codex returned an empty commit message.",
          missingCli: "Could not find the Codex CLI. Check generateGitMessage.codexPath.",
          templateError: "Codex command did not produce an executable.",
          timeout: "Codex CLI timed out before returning a commit message.",
          unexpected: "Codex CLI failed unexpectedly."
        },
        cancellationToken
      );
  }
}
