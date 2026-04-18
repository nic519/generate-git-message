# Generate Git Message

Generate a git commit message from your Git changes with your local Codex or Claude CLI and write it into VS Code's native Source Control input box.

## How it works

1. Stage your changes if you want the message to reflect only what will be committed.
2. Open the Source Control view.
3. Click `Generate Commit Message` in the Source Control title bar, or open the `Generate Git Message` icon from the VS Code activity bar.
4. Wait for the selected local provider CLI (`codex` or `claude`) to analyze the staged diff first, or fall back to current working tree changes when nothing is staged.
5. Review or edit the generated message in the native commit input box.
6. Use VS Code's normal commit action to create the commit.

The extension prefers staged changes. If nothing is staged, it falls back to current working tree changes and shows an information message. It only generates and backfills the SCM input box; it does not commit on your behalf.

## Settings

Use the built-in sidebar to choose the active provider and configure the shared prompt, CLI paths, and runtime settings in one place.
Open the `Generate Git Message` icon from the VS Code activity bar to access the full interface.
When you save from the panel, existing workspace-scoped values stay in the workspace; otherwise settings fall back to global.

### `generateGitMessage.codexPath`

Path to the local Codex CLI executable. Defaults to `codex`.

### `generateGitMessage.provider`

Choose which local CLI provider should generate commit messages. Defaults to `codex`.

### `generateGitMessage.model`

Optional Codex model override. Leave empty to use your Codex CLI default model. Example: `gpt-5.4-mini`.

### `generateGitMessage.reasoningEffort`

Reasoning effort passed to Codex. Defaults to `medium`.

- Use `none` or `low` when you want faster commit messages.
- Use `medium` as the safe default.
- Use `high` or `xhigh` only when you really want deeper analysis.

### `generateGitMessage.debugLogging`

When enabled, the extension writes provider diagnostics to the `Generate Git Message` output channel in VS Code.

### `generateGitMessage.claudePath`

Path to the local Claude CLI executable. Defaults to `claude`.

### `generateGitMessage.promptTemplate`

Prompt template shared by both providers. Use `{{diff}}` where the selected Git diff should be inserted. The extension passes whichever diff is active, preferring staged changes and falling back to the working tree when nothing is staged.

Default:

```text
根据以下 git diff，生成一个简洁明确的 git commit message。要求：
- 直接只输出最终 commit message
- 不要解释
- 默认使用 Conventional Commits 风格，但描述使用中文
- 尽量准确概括本次变更
- 如果无法判断，给出最稳妥的一行提交信息

{{diff}}
```

### `generateGitMessage.timeoutMs`

Timeout in milliseconds for the selected local CLI provider process. Defaults to `20000`.

## Notes

- The generated message always overwrites the current Source Control input value.
- Provider-specific command execution uses the selected CLI configuration, and both providers are wrapped so the extension can read the generated message back before filling the SCM box.
- If `generateGitMessage.debugLogging` is enabled, open `View: Output` and switch to `Generate Git Message` to inspect model selection, diff source, command, duration, and useful stderr lines.
- If the selected provider CLI is missing, times out, or returns empty output, the extension shows an error and does not modify the input box.
- Multi-repository workspaces are supported through a quick pick when more than one Git repository is open.
