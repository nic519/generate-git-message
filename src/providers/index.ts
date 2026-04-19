import { type ExtensionOptions, type OutputLanguage, type Provider } from "../config";
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
  workingDirectory?: string,
  cancellationToken?: CancellationToken
): Promise<GeneratedMessageResult> {
  const prompt = buildCommitPrompt(options.common.promptTemplate, diff, options.common.outputLanguage);

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
          invalidCommand: "Claude command did not produce an executable.",
          timeout: "Claude CLI timed out before returning a commit message.",
          unexpected: "Claude CLI failed unexpectedly."
        },
        cancellationToken,
        workingDirectory
      );
    case "codex":
    default:
      return await executeMessage(
        prompt,
        options.common.timeoutMs,
        ({ prompt: promptText, promptFile, outputFile, workingDirectory: cwd }) =>
          buildCodexCommand({ codex: options.codex }, promptText, promptFile, outputFile, cwd),
        {
          emptyMessage: "Codex returned an empty commit message.",
          missingCli: "Could not find the Codex CLI. Check generateGitMessage.codexPath.",
          invalidCommand: "Codex command did not produce an executable.",
          timeout: "Codex CLI timed out before returning a commit message.",
          unexpected: "Codex CLI failed unexpectedly."
        },
        cancellationToken,
        workingDirectory
      );
  }
}

export function buildCommitPrompt(template: string, diff: string, outputLanguage: string): string {
  const language = resolvePromptLanguage(outputLanguage);
  const prompt = template.replace("{{diff}}", diff);

  return (
    `${prompt.trim()}\n\n` +
    "Use only the git diff included in this prompt. Do not inspect files or infer changes from the current directory.\n" +
    `Output language requirement: Write the final commit message in ${language}.\n` +
    "Return only the commit message, with no explanation, no markdown, and no surrounding quotes."
  );
}

function resolvePromptLanguage(outputLanguage: string): string {
  const languageNames: Record<OutputLanguage, string> = {
    en: "English",
    zh: "Simplified Chinese",
    "zh-Hant": "Traditional Chinese",
    ja: "Japanese"
  };

  return languageNames[outputLanguage as OutputLanguage] ?? languageNames.en;
}
