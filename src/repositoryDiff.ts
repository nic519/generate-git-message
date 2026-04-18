import { type Repository } from "./types/git";

export interface RepositoryDiff {
  diff: string;
  source: "staged" | "workingTree";
}

export async function getRepositoryDiff(repository: Repository): Promise<RepositoryDiff> {
  const stagedDiff = await repository.diff(true);
  if (stagedDiff.trim()) {
    return {
      diff: stagedDiff,
      source: "staged"
    };
  }

  const workingTreeDiff = await repository.diff();
  return {
    diff: workingTreeDiff,
    source: "workingTree"
  };
}
