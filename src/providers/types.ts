export interface BuiltCommand {
  command: string;
  args: string[];
  stdin?: string;
}

export interface ExecutionContext {
  prompt: string;
  promptFile: string;
  outputFile: string;
}

export interface GeneratedMessageDebug {
  command: string;
  args: string[];
  durationMs: number;
  stderrSummary: string;
}

export interface GeneratedMessageResult {
  message: string;
  debug: GeneratedMessageDebug;
}
