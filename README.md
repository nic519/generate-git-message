# Generate Git Message

Generate concise Git commit messages from your VS Code changes with your existing local Codex or Claude CLI, then write the result directly into VS Code's native Source Control input box.

![](https://files.seeusercontent.com/2026/04/18/Prp3/fe1ccb0c-e6ca-4af5-9872-10809424.png)

## Why generate-git-message?

You're already investing in Codex or Claude Code. Why pay for Copilot or Cursor just for commit message generation?

This extension leverages your existing AI subscription to bring the same AI-powered commit message workflow directly to VS Code.

Zero additional cost. Zero complexity. Just works.


## Usage

![](https://files.seeusercontent.com/2026/04/18/U4ju/ScreenShot_2026-04-19_070444_309.png)

1. Open the Source Control view.
2. Stage changes if you want the message to use only staged diffs.
3. Click `Generate Commit Message` in the Source Control title bar.
4. Review or edit the generated message.
5. Commit with VS Code as usual.

You can also open the `Generate Git Message` activity bar icon to choose provider, model, output language, prompt, CLI paths, timeout, and debug logging.

## Settings

Common settings:

- `generateGitMessage.provider`: `codex` or `claude`.
- `generateGitMessage.model`: Codex model.
- `generateGitMessage.claudeModel`: Claude model.
- `generateGitMessage.outputLanguage`: `en`, `zh`, `zh-Hant`, or `ja`.
- `generateGitMessage.promptTemplate`: shared prompt template. Use `{{diff}}` where the Git diff should be inserted.
- `generateGitMessage.debugLogging`: writes diagnostics to the `Generate Git Message` output channel.

CLI settings:

- `generateGitMessage.codexPath`: defaults to `codex`.
- `generateGitMessage.claudePath`: defaults to `claude`.
- `generateGitMessage.timeoutMs`: defaults to `20000`.

## Notes

- The extension only fills the commit message box. It never commits for you.
- Existing SCM input text is overwritten by the generated message.
- Multi-repository workspaces are supported with a repository picker.
- If the selected CLI is missing, times out, or returns empty output, the SCM input is left unchanged.
