import * as vscode from "vscode";

import { type GitApi, type Repository } from "./types/git";

export async function pickRepository(repositories: Repository[]): Promise<Repository | undefined> {
  if (repositories.length === 0) {
    return undefined;
  }

  if (repositories.length === 1) {
    return repositories[0];
  }

  const items = repositories.map((repository) => ({
    label: vscode.workspace.asRelativePath(repository.rootUri, false),
    repository
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select the repository to generate a commit message for"
  });

  return selected?.repository;
}

export async function getGitApi(): Promise<GitApi | undefined> {
  const gitExtension = vscode.extensions.getExtension<{ getAPI(version: 1): GitApi }>("vscode.git");
  if (!gitExtension) {
    return undefined;
  }

  const extensionExports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
  return extensionExports.getAPI(1);
}
