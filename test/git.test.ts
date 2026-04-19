import test from "node:test";
import assert from "node:assert/strict";

import { getRepositoryDiff } from "../src/repositoryDiff";

test("getRepositoryDiff prefers staged changes when they exist", async () => {
  const calls: Array<boolean | undefined> = [];
  const repository = {
    rootUri: { fsPath: "/tmp/current-repository" } as never,
    inputBox: { value: "" },
    async diff(cached?: boolean): Promise<string> {
      calls.push(cached);
      return cached ? "staged diff" : "working tree diff";
    }
  };

  const result = await getRepositoryDiff(repository);

  assert.equal(result.diff, "staged diff");
  assert.equal(result.source, "staged");
  assert.equal(result.rootPath, "/tmp/current-repository");
  assert.deepEqual(calls, [true]);
});

test("getRepositoryDiff falls back to working tree changes when nothing is staged", async () => {
  const calls: Array<boolean | undefined> = [];
  const repository = {
    rootUri: { fsPath: "/tmp/current-repository" } as never,
    inputBox: { value: "" },
    async diff(cached?: boolean): Promise<string> {
      calls.push(cached);
      return cached ? "   " : "working tree diff";
    }
  };

  const result = await getRepositoryDiff(repository);

  assert.equal(result.diff, "working tree diff");
  assert.equal(result.source, "workingTree");
  assert.equal(result.rootPath, "/tmp/current-repository");
  assert.deepEqual(calls, [true, undefined]);
});
