import { type CodexOptions } from "./config";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface BuiltCommand {
  command: string;
  args: string[];
  stdin?: string;
}

export interface GeneratedMessageDebug {
  command: string;
  args: string[];
  durationMs: number;
  stderrSummary: string;
}

export interface GeneratedMessageResult {
  message: string;
  debug: GeneratedMessageDebug;
}

export class CodexExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexExecutionError";
  }
}

export function buildCommand(
  options: CodexOptions,
  diff: string,
  promptFile: string,
  outputFile: string
): BuiltCommand {
  if (options.commandTemplate.trim()) {
    return parseCommandTemplate(options.commandTemplate.replaceAll("{{promptFile}}", promptFile));
  }

  const args = ["exec", "--skip-git-repo-check", "-o", outputFile];
  if (options.model.trim()) {
    args.push("-m", options.model.trim());
  }
  args.push("-c", `model_reasoning_effort="${options.reasoningEffort}"`);
  args.push("-");

  return {
    command: options.codexPath,
    args,
    stdin: options.promptTemplate.replace("{{diff}}", diff)
  };
}

export function normalizeMessage(output: string): string {
  return output.trim();
}

export function selectCommitMessage(stdout: string, outputFileContent: string): string {
  const fileMessage = normalizeMessage(outputFileContent);
  if (fileMessage) {
    return fileMessage;
  }

  return normalizeMessage(stdout);
}

export function summarizeStderr(stderr: string): string {
  const ignoredPatterns = [
    /^Reading additional input from stdin\.\.\.$/,
    /^OpenAI Codex v/i,
    /^-+$/,
    /^workdir:/,
    /^model:/,
    /^provider:/,
    /^approval:/,
    /^sandbox:/,
    /^reasoning effort:/,
    /^reasoning summaries:/,
    /^session id:/,
    /^user$/,
    /^\d{4}-\d{2}-\d{2}.*WARN codex_core::plugins::manifest:/,
    /^\d{4}-\d{2}-\d{2}.*WARN codex_core::shell_snapshot:/
  ];

  const lines = stderr.split(/\r?\n/).map((line) => line.trim());
  const filteredLines: string[] = [];
  let skipNextPromptLine = false;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (skipNextPromptLine) {
      skipNextPromptLine = false;
      continue;
    }

    if (line === "user") {
      skipNextPromptLine = true;
      continue;
    }

    if (ignoredPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    filteredLines.push(line);
  }

  return filteredLines.join("\n");
}

export async function generateMessage(options: CodexOptions, diff: string): Promise<GeneratedMessageResult> {
  const prompt = options.promptTemplate.replace("{{diff}}", diff);
  const tempDirectory = await mkdtemp(join(tmpdir(), "codex-commit-"));
  const promptFile = join(tempDirectory, "prompt.txt");
  const outputFile = join(tempDirectory, "last-message.txt");

  try {
    await writeFile(promptFile, prompt, "utf8");

    const { command, args, stdin } = buildCommand(options, diff, promptFile, outputFile);
    if (!command) {
      throw new CodexExecutionError("Codex command template did not produce an executable.");
    }

    const startedAt = Date.now();
    const { stdout, stderr } = await runCommand(command, args, stdin, options.timeoutMs);
    const durationMs = Date.now() - startedAt;

    const outputFileContent = await readOutputFile(outputFile);
    const message = selectCommitMessage(stdout, outputFileContent);
    if (!message) {
      throw new CodexExecutionError("Codex returned an empty commit message.");
    }

    return {
      message,
      debug: {
        command,
        args,
        durationMs,
        stderrSummary: summarizeStderr(stderr)
      }
    };
  } catch (error) {
    throw toCodexExecutionError(error);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function parseCommandTemplate(template: string): BuiltCommand {
  const parts = template.trim().split(/\s+/).filter(Boolean);
  const [command = "", ...args] = parts;

  return { command, args };
}

async function runCommand(
  command: string,
  args: string[],
  stdin: string | undefined,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "pipe"
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) {
        return;
      }

      finished = true;
      child.kill();
      const error = new Error("Command timed out") as NodeJS.ErrnoException;
      error.code = "ETIMEDOUT";
      reject(error);
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeout);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || `Command exited with code ${code ?? "unknown"}.`));
    });

    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

async function readOutputFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

function toCodexExecutionError(error: unknown): CodexExecutionError {
  if (error instanceof CodexExecutionError) {
    return error;
  }

  if (isNodeError(error) && error.code === "ENOENT") {
    return new CodexExecutionError("Could not find the Codex CLI. Check codexCommit.codexPath.");
  }

  if (isNodeError(error) && error.code === "ETIMEDOUT") {
    return new CodexExecutionError("Codex CLI timed out before returning a commit message.");
  }

  if (error instanceof Error) {
    return new CodexExecutionError(error.message);
  }

  return new CodexExecutionError("Codex CLI failed unexpectedly.");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
