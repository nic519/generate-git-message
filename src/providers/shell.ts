import { type BuiltCommand } from "./types";

export interface ShellCommandEnvironment {
  platform?: NodeJS.Platform;
  comSpec?: string;
}

export interface ShellCommandSpec {
  command: string;
  args: string[];
}

export function resolveShellCommand(
  platform: NodeJS.Platform = process.platform,
  comSpec: string | undefined = process.env.ComSpec
): ShellCommandSpec {
  if (platform === "win32") {
    return {
      command: comSpec?.trim() || "cmd.exe",
      args: ["/d", "/s", "/c"]
    };
  }

  return {
    command: "/bin/sh",
    args: ["-lc"]
  };
}

export function buildShellCommand(commandLine: string, environment?: ShellCommandEnvironment): BuiltCommand {
  const shell = resolveShellCommand(environment?.platform, environment?.comSpec);

  return {
    command: shell.command,
    args: [...shell.args, commandLine]
  };
}
