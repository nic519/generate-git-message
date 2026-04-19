import * as vscode from "vscode";

import { resolveExtensionOptions } from "./config";
import { getRequestDebugLines } from "./debugLog";
import { createGenerateMessageProgressOptions } from "./extensionProgress";
import { getGitApi, pickRepository } from "./git";
import { getRepositoryDiff } from "./repositoryDiff";
import { generateMessage, getProviderDisplayName } from "./providers";
import { MessageGenerationCanceledError } from "./messageGenerator";
import {
  applySettingsPanelReset,
  applySettingsPanelSaveMessage,
  applySettingsPanelUpdateMessage,
  buildSettingsPanelHtml,
  getSettingsPanelState,
  getSettingsPanelSaveTarget,
  isSettingsPanelSaveMessage,
  isSettingsPanelUpdateMessage
} from "./settingsPanel";
import { applyCommitMessage } from "./writeMessage";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("Generate Git Message");
  let sidebarView: vscode.WebviewView | undefined;

  const refreshSidebarView = () => {
    // 只在初次渲染或侧边栏重新可见时读取配置。不要监听配置变更刷新，
    // 否则面板自己保存产生的事件可能把正在编辑的 UI 刷回旧状态。
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

        const configuration = vscode.workspace.getConfiguration("generateGitMessage");
        try {
          const updateSetting = async (key: string, value: unknown, target: "global" | "workspace" | "workspaceFolder") => {
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
          };
          const getTarget = (key: string) => getSettingsPanelSaveTarget(configuration, key);

          if (message.type === "resetSettings") {
            await applySettingsPanelReset(updateSetting, getTarget);
            refreshSidebarView();
          } else if (isSettingsPanelUpdateMessage(message)) {
            await applySettingsPanelUpdateMessage(message, updateSetting, getTarget);
          } else if (isSettingsPanelSaveMessage(message)) {
            await applySettingsPanelSaveMessage(message.state, updateSetting, getTarget);
          } else {
            return;
          }

          void sidebarView?.webview.postMessage({ type: "settingsSaved" });
        } catch (error) {
          void sidebarView?.webview.postMessage({
            type: "settingsSaveFailed",
            message: error instanceof Error ? error.message : "Settings save failed."
          });
        }
        // 面板自动保存后不要刷新或弹通知。重设 webview.html 会重建 DOM，
        // 抢走用户正在编辑的输入焦点。
      });

      const disposeDisposable = sidebarView.onDidDispose(() => {
        messageDisposable.dispose();
        sidebarView = undefined;
      });

      const visibilityDisposable = sidebarView.onDidChangeVisibility(() => {
        if (sidebarView?.visible) {
          refreshSidebarView();
        }
      });

      context.subscriptions.push(messageDisposable, disposeDisposable, visibilityDisposable);
    }
  });

  context.subscriptions.push(
    disposable,
    sidebarProviderDisposable,
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
