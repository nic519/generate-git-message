import * as vscode from "vscode";

import { resolveCodexOptions } from "./config";
import { CodexExecutionError, generateMessage } from "./codex";
import { getGitApi, pickRepository } from "./git";
import { getRepositoryDiff } from "./repositoryDiff";
import { applyCommitMessage } from "./writeMessage";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Codex Commit");

  const disposable = vscode.commands.registerCommand("codexCommit.generateMessage", async () => {
    const git = await getGitApi();
    if (!git) {
      void vscode.window.showErrorMessage("The built-in Git extension is not available.");
      return;
    }

    const repository = await pickRepository(git.repositories);
    if (!repository) {
      void vscode.window.showWarningMessage("No Git repository is available for Codex Commit.");
      return;
    }

    const repositoryDiff = await getRepositoryDiff(repository);
    if (!repositoryDiff.diff.trim()) {
      void vscode.window.showErrorMessage("No changes found. Make some changes before generating a commit message.");
      return;
    }

    if (repositoryDiff.source === "workingTree") {
      void vscode.window.showInformationMessage(
        "No staged changes found. Generating the commit message from current working tree changes instead."
      );
    }

    const options = resolveCodexOptions(vscode.workspace.getConfiguration("codexCommit"));

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating commit message with Codex",
          cancellable: false
        },
        async () => generateMessage(options, repositoryDiff.diff)
      );

      if (options.debugLogging) {
        writeDebugLog(outputChannel, repositoryDiff.source, options, result.debug);
      }

      applyCommitMessage(repository, result.message);
    } catch (error) {
      if (options.debugLogging) {
        outputChannel.appendLine(`[${new Date().toISOString()}] Codex Commit failed`);
        outputChannel.appendLine(`  reason: ${error instanceof Error ? error.message : String(error)}`);
        outputChannel.show(true);
      }

      const message =
        error instanceof CodexExecutionError
          ? error.message
          : "Failed to generate a commit message with Codex.";
      void vscode.window.showErrorMessage(message);
    }
  });

  context.subscriptions.push(disposable, outputChannel);
}

export function deactivate(): void {}

function writeDebugLog(
  outputChannel: vscode.OutputChannel,
  diffSource: "staged" | "workingTree",
  options: ReturnType<typeof resolveCodexOptions>,
  debug: {
    command: string;
    args: string[];
    durationMs: number;
    stderrSummary: string;
  }
): void {
  outputChannel.appendLine(`[${new Date().toISOString()}] Codex Commit request`);
  outputChannel.appendLine(`  diffSource: ${diffSource}`);
  outputChannel.appendLine(`  model: ${options.model || "(default)"}`);
  outputChannel.appendLine(`  reasoningEffort: ${options.reasoningEffort}`);
  outputChannel.appendLine(`  command: ${debug.command} ${debug.args.join(" ")}`);
  outputChannel.appendLine(`  durationMs: ${debug.durationMs}`);

  if (debug.stderrSummary) {
    outputChannel.appendLine("  stderr:");
    for (const line of debug.stderrSummary.split("\n")) {
      outputChannel.appendLine(`    ${line}`);
    }
  }

  outputChannel.appendLine("");
}
