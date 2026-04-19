import { type Repository } from "./types/git";

export interface RepositoryDiff {
  diff: string;
  source: "staged" | "workingTree";
  rootPath: string;
}

export async function getRepositoryDiff(repository: Repository): Promise<RepositoryDiff> {
  // 对齐 VS Code 提交流程：有暂存改动时以暂存区为准，
  // 工作区 diff 只作为未暂存时的便利回退。
  const stagedDiff = await repository.diff(true);
  if (stagedDiff.trim()) {
    return {
      diff: stagedDiff,
      source: "staged",
      rootPath: repository.rootUri.fsPath
    };
  }

  const workingTreeDiff = await repository.diff();
  return {
    diff: workingTreeDiff,
    source: "workingTree",
    rootPath: repository.rootUri.fsPath
  };
}
