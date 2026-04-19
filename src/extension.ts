import * as vscode from "vscode";

import { resolveExtensionOptions } from "./config";
import { getRequestDebugLines } from "./debugLog";
import { createGenerateMessageProgressOptions } from "./extensionProgress";
import { getGitApi, pickRepository } from "./git";
import { getRepositoryDiff } from "./repositoryDiff";
import { generateMessage, getProviderDisplayName } from "./providers";
import { MessageGenerationCanceledError } from "./messageGenerator";
import { shouldRefreshSidebarViewForConfigurationChange } from "./sidebarRefresh";
import {
  applySettingsPanelSaveMessage,
  buildSettingsPanelHtml,
  getSettingsPanelState,
  getSettingsPanelSaveTarget,
  isSettingsPanelSaveMessage
} from "./settingsPanel";
import { applyCommitMessage } from "./writeMessage";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Generate Git Message");
  let sidebarView: vscode.WebviewView | undefined;
  let isSavingSettingsPanel = false;

  const refreshSidebarView = () => {
    if (!sidebarView) {
      return;
    }

    const configuration = vscode.workspace.getConfiguration("generateGitMessage");
    sidebarView.webview.html = buildSettingsPanelHtml(sidebarView.webview, getSettingsPanelState(configuration));
  };

  const disposable = vscode.commands.registerCommand("generateGitMessage.generateMessage", async () => {
    const git = await getGitApi();
    if (!git) {
      void vscode.window.showErrorMessage("The built-in Git extension is not available.");
      return;
    }

    const repository = await pickRepository(git.repositories);
    if (!repository) {
      void vscode.window.showWarningMessage("No Git repository is available for Generate Git Message.");
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

    const options = resolveExtensionOptions(vscode.workspace.getConfiguration("generateGitMessage"));
    const providerName = getProviderDisplayName(options.provider);

    try {
      const result = await vscode.window.withProgress(
        createGenerateMessageProgressOptions(vscode.ProgressLocation.Notification, providerName),
        async (_progress, token) => generateMessage(options, repositoryDiff.diff, repositoryDiff.rootPath, token)
      );

      if (options.common.debugLogging) {
        writeDebugLog(outputChannel, providerName, {
          diffSource: repositoryDiff.source,
          diffLength: repositoryDiff.diff.length,
          repositoryRoot: repositoryDiff.rootPath,
          options,
          debug: result.debug
        });
      }

      applyCommitMessage(repository, result.message);
    } catch (error) {
      if (error instanceof MessageGenerationCanceledError) {
        return;
      }

      if (options.common.debugLogging) {
        outputChannel.appendLine(`[${new Date().toISOString()}] ${providerName} Commit failed`);
        outputChannel.appendLine(`  repositoryRoot: ${repositoryDiff.rootPath}`);
        outputChannel.appendLine(`  cwd: ${repositoryDiff.rootPath}`);
        outputChannel.appendLine(`  diffSource: ${repositoryDiff.source}`);
        outputChannel.appendLine(`  diffLength: ${repositoryDiff.diff.length}`);
        outputChannel.appendLine(`  reason: ${error instanceof Error ? error.message : String(error)}`);
        outputChannel.show(true);
      }

      void vscode.window.showErrorMessage(
        error instanceof Error ? error.message : `Failed to generate a commit message with ${providerName}.`
      );
    }
  });

  const sidebarProviderDisposable = vscode.window.registerWebviewViewProvider("generateGitMessage.sidebar", {
    resolveWebviewView(webviewView) {
      sidebarView = webviewView;
      sidebarView.webview.options = {
        enableScripts: true
      };
      refreshSidebarView();

      const messageDisposable = sidebarView.webview.onDidReceiveMessage(async (message: unknown) => {
        if (!message || typeof message !== "object" || !("type" in message)) {
          return;
        }

        if (message.type === "generateMessage") {
          await vscode.commands.executeCommand("generateGitMessage.generateMessage");
          return;
        }

        if (!isSettingsPanelSaveMessage(message)) {
          return;
        }

        const configuration = vscode.workspace.getConfiguration("generateGitMessage");
        isSavingSettingsPanel = true;
        let saveSucceeded = false;
        try {
          await applySettingsPanelSaveMessage(message.state, async (key, value, target) => {
            const configurationTarget =
              target === "workspaceFolder"
                ? vscode.ConfigurationTarget.WorkspaceFolder
                : target === "workspace"
                  ? vscode.ConfigurationTarget.Workspace
                  : vscode.ConfigurationTarget.Global;

            await configuration.update(
              key,
              value,
              configurationTarget
            );
          }, (key) => getSettingsPanelSaveTarget(configuration, key));
          saveSucceeded = true;
        } finally {
          isSavingSettingsPanel = false;
        }

        if (saveSucceeded) {
          refreshSidebarView();
          void vscode.window.showInformationMessage("Generate Git Message settings saved and refreshed.");
        }
      });

      const disposeDisposable = sidebarView.onDidDispose(() => {
        messageDisposable.dispose();
        sidebarView = undefined;
      });

      context.subscriptions.push(messageDisposable, disposeDisposable);
    }
  });

  const configurationDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (
      sidebarView &&
      shouldRefreshSidebarViewForConfigurationChange(event.affectsConfiguration("generateGitMessage"), isSavingSettingsPanel)
    ) {
      refreshSidebarView();
    }
  });

  context.subscriptions.push(
    disposable,
    sidebarProviderDisposable,
    configurationDisposable,
    outputChannel
  );
}

export function deactivate(): void {}

function writeDebugLog(
  outputChannel: vscode.OutputChannel,
  providerName: string,
  context: Parameters<typeof getRequestDebugLines>[0]
): void {
  outputChannel.appendLine(`[${new Date().toISOString()}] ${providerName} Commit request`);
  for (const line of getRequestDebugLines(context)) {
    outputChannel.appendLine(line);
  }

  if (context.debug.stderrSummary) {
    outputChannel.appendLine("  stderr:");
    for (const line of context.debug.stderrSummary.split("\n")) {
      outputChannel.appendLine(`    ${line}`);
    }
  }

  outputChannel.appendLine("");
}
