import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type BuiltCommand, type CancellationToken, type ExecutionContext, type GeneratedMessageResult } from "./providers/types";

export interface ExecutionErrorMessages {
  emptyMessage: string;
  missingCli: string;
  invalidCommand: string;
  timeout: string;
  unexpected: string;
}

export class MessageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessageGenerationError";
  }
}

export class MessageGenerationCanceledError extends Error {
  constructor() {
    super("Commit message generation canceled.");
    this.name = "MessageGenerationCanceledError";
  }
}

export async function generateMessage(
  prompt: string,
  timeoutMs: number,
  buildCommand: (context: ExecutionContext) => BuiltCommand,
  errorMessages: ExecutionErrorMessages,
  cancellationToken?: CancellationToken
): Promise<GeneratedMessageResult> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "generate-git-message-"));
  const promptFile = join(tempDirectory, "prompt.txt");
  const outputFile = join(tempDirectory, "last-message.txt");

  try {
    await writeFile(promptFile, prompt, "utf8");

    const { command, args, stdin } = buildCommand({ prompt, promptFile, outputFile });
    if (!command) {
      throw new MessageGenerationError(errorMessages.invalidCommand);
    }

    const startedAt = Date.now();
    const { stdout, stderr } = await runCommand(command, args, stdin, timeoutMs, cancellationToken);
    const durationMs = Date.now() - startedAt;

    const outputFileContent = await readOutputFile(outputFile);
    const message = selectCommitMessage(stdout, outputFileContent);
    if (!message) {
      throw new MessageGenerationError(errorMessages.emptyMessage);
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
    throw toExecutionError(error, errorMessages);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
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

async function runCommand(
  command: string,
  args: string[],
  stdin: string | undefined,
  timeoutMs: number,
  cancellationToken?: CancellationToken
): Promise<{ stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "pipe"
    });

    let stdout = "";
    let stderr = "";
    let finished = false;
    let cancellationDisposable: { dispose(): void } | undefined;

    const finish = (callback: () => void) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeout);
      cancellationDisposable?.dispose();
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => {
        child.kill();
        const error = new Error("Command timed out") as NodeJS.ErrnoException;
        error.code = "ETIMEDOUT";
        reject(error);
      });
    }, timeoutMs);

    const cancel = () => {
      finish(() => {
        child.kill();
        reject(new MessageGenerationCanceledError());
      });
    };

    if (cancellationToken?.isCancellationRequested) {
      cancel();
      return;
    }

    cancellationDisposable = cancellationToken?.onCancellationRequested(cancel);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      finish(() => reject(error));
    });

    child.on("close", (code) => {
      finish(() => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(new Error(stderr.trim() || `Command exited with code ${code ?? "unknown"}.`));
      });
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

function toExecutionError(error: unknown, errorMessages: ExecutionErrorMessages): MessageGenerationError {
  if (error instanceof MessageGenerationCanceledError) {
    return error;
  }

  if (error instanceof MessageGenerationError) {
    return error;
  }

  if (isNodeError(error) && error.code === "ENOENT") {
    return new MessageGenerationError(errorMessages.missingCli);
  }

  if (isNodeError(error) && error.code === "ETIMEDOUT") {
    return new MessageGenerationError(errorMessages.timeout);
  }

  if (error instanceof Error) {
    return new MessageGenerationError(error.message);
  }

  return new MessageGenerationError(errorMessages.unexpected);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
