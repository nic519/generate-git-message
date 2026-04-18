# Codex Commit

Generate a git commit message from your Git changes with your local Codex CLI and write it into VS Code's native Source Control input box.

## How it works

1. Stage your changes if you want the message to reflect only what will be committed.
2. Open the Source Control view.
3. Click `Generate Commit Message` in the Source Control title bar.
4. Wait for the local `codex` CLI to analyze the staged diff, or fall back to current working tree changes when nothing is staged.
5. Review or edit the generated message in the native commit input box.
6. Use VS Code's normal commit action to create the commit.

The extension prefers staged changes. If nothing is staged, it falls back to current working tree changes and shows an information message.

## Settings

### `codexCommit.codexPath`

Path to the local Codex CLI executable. Defaults to `codex`.

### `codexCommit.model`

Optional Codex model override. Leave empty to use your Codex CLI default model. Example: `gpt-5.4-mini`.

### `codexCommit.reasoningEffort`

Reasoning effort passed to Codex. Defaults to `medium`.

- Use `none` or `low` when you want faster commit messages.
- Use `medium` as the safe default.
- Use `high` or `xhigh` only when you really want deeper analysis.

### `codexCommit.debugLogging`

When enabled, the extension writes Codex CLI diagnostics to the `Codex Commit` output channel in VS Code.

### `codexCommit.commandTemplate`

Optional full command template for advanced setups. The extension writes the rendered prompt into a temporary file and replaces `{{promptFile}}` with that path.

Example:

```text
/usr/local/bin/codex exec --skip-git-repo-check "$(cat {{promptFile}})"
```

For the MVP implementation, the command template is split on whitespace before execution, so keep it simple unless you point directly at a wrapper script.

### `codexCommit.promptTemplate`

Prompt template sent to Codex. Use `{{diff}}` where the selected Git diff should be inserted.

Default:

```text
根据以下 staged git diff，生成一个简洁明确的 git commit message。要求：
- 直接只输出最终 commit message
- 不要解释
- 默认使用 Conventional Commits 风格，但描述使用中文
- 尽量准确概括本次变更
- 如果无法判断，给出最稳妥的一行提交信息

{{diff}}
```

### `codexCommit.timeoutMs`

Timeout in milliseconds for the local Codex CLI process. Defaults to `20000`.

## Notes

- The generated message always overwrites the current Source Control input value.
- The default Codex invocation writes the final reply to a temporary file and reads that file first, which is more reliable than parsing terminal output directly.
- If `codexCommit.debugLogging` is enabled, open `View: Output` and switch to `Codex Commit` to inspect model selection, diff source, command, duration, and useful stderr lines.
- If Codex is missing, times out, or returns empty output, the extension shows an error and does not modify the input box.
- Multi-repository workspaces are supported through a quick pick when more than one Git repository is open.
