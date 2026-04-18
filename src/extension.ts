import * as vscode from "vscode";

import { resolveExtensionOptions } from "./config";
import { getProviderDebugLines } from "./debugLog";
import { getGitApi, pickRepository } from "./git";
import { getRepositoryDiff } from "./repositoryDiff";
import { generateMessage, getProviderDisplayName } from "./providers";
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
  let settingsPanel: vscode.WebviewPanel | undefined;

  const refreshSettingsPanel = () => {
    if (!settingsPanel) {
      return;
    }

    const configuration = vscode.workspace.getConfiguration("generateGitMessage");
    const state = getSettingsPanelState(configuration);
    settingsPanel.webview.html = buildSettingsPanelHtml(settingsPanel.webview, state);
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
        {
          location: vscode.ProgressLocation.Notification,
          title: `Generating commit message with ${providerName}`,
          cancellable: false
        },
        async () => generateMessage(options, repositoryDiff.diff)
      );

      if (options.common.debugLogging) {
        writeDebugLog(outputChannel, providerName, repositoryDiff.source, options, result.debug);
      }

      applyCommitMessage(repository, result.message);
    } catch (error) {
      if (options.common.debugLogging) {
        outputChannel.appendLine(`[${new Date().toISOString()}] ${providerName} Commit failed`);
        outputChannel.appendLine(`  reason: ${error instanceof Error ? error.message : String(error)}`);
        outputChannel.show(true);
      }

      void vscode.window.showErrorMessage(
        error instanceof Error ? error.message : `Failed to generate a commit message with ${providerName}.`
      );
    }
  });

  const openSettingsPanelDisposable = vscode.commands.registerCommand("generateGitMessage.openSettingsPanel", () => {
    if (settingsPanel) {
      refreshSettingsPanel();
      settingsPanel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    settingsPanel = vscode.window.createWebviewPanel(
      "generateGitMessageSettings",
      "Generate Git Message Settings",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    refreshSettingsPanel();

    const messageDisposable = settingsPanel.webview.onDidReceiveMessage(async (message: unknown) => {
      if (!isSettingsPanelSaveMessage(message)) {
        return;
      }

      const configuration = vscode.workspace.getConfiguration("generateGitMessage");
      await applySettingsPanelSaveMessage(message.state, async (key, value, target) => {
        await configuration.update(
          key,
          value,
          target === "workspace" ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global
        );
      }, (key) => getSettingsPanelSaveTarget(configuration, key));

      refreshSettingsPanel();
      void vscode.window.showInformationMessage("Generate Git Message settings saved.");
    });

    const panelDisposable = settingsPanel.onDidDispose(() => {
      messageDisposable.dispose();
      settingsPanel = undefined;
    });

    context.subscriptions.push(messageDisposable, panelDisposable);
  });

  const configurationDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (settingsPanel && event.affectsConfiguration("generateGitMessage")) {
      refreshSettingsPanel();
    }
  });

  context.subscriptions.push(disposable, openSettingsPanelDisposable, configurationDisposable, outputChannel);
}

export function deactivate(): void {}

function writeDebugLog(
  outputChannel: vscode.OutputChannel,
  providerName: string,
  diffSource: "staged" | "workingTree",
  options: ReturnType<typeof resolveExtensionOptions>,
  debug: {
    command: string;
    args: string[];
    durationMs: number;
    stderrSummary: string;
  }
): void {
  outputChannel.appendLine(`[${new Date().toISOString()}] ${providerName} Commit request`);
  outputChannel.appendLine(`  diffSource: ${diffSource}`);
  for (const line of getProviderDebugLines(options)) {
    outputChannel.appendLine(line);
  }
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
