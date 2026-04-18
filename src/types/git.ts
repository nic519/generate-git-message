import * as vscode from "vscode";

import { type RepositoryLike } from "../writeMessage";

export interface Repository extends RepositoryLike {
  rootUri: vscode.Uri;
  diff(cached?: boolean): Promise<string>;
}

export interface GitApi {
  repositories: Repository[];
}
