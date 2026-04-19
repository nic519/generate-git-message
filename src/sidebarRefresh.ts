export function shouldRefreshSidebarViewForConfigurationChange(
  affectsGenerateGitMessage: boolean,
  isSavingSettingsPanel: boolean
): boolean {
  return affectsGenerateGitMessage && !isSavingSettingsPanel;
}
