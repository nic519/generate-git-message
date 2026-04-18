export interface RepositoryLike {
  inputBox: {
    value: string;
  };
}

export function applyCommitMessage(repository: RepositoryLike, message: string): void {
  repository.inputBox.value = message;
}
