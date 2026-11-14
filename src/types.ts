export enum TerminalLineType {
  INPUT = 'input',
  SYSTEM = 'system',
  ERROR = 'error',
  CRITICAL_ERROR = 'critical_error',
  HELP = 'help',
  BANNER = 'banner',
  TMI_LOG = 'tmi_log',
  TMI_SUGGESTION = 'tmi_suggestion',
  INTEL_REPORT = 'intel_report',
}

export type Theme = 'aegis' | 'cyber' | 'matrix' | 'ghost' | 'nord' | 'dracula' | 'solarized' | 'crimson';
export type SplitMode = 'none' | 'horizontal' | 'vertical';

export interface TerminalLine {
  type: TerminalLineType;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface Session {
  id: string;
  name: string;
  splitMode: SplitMode;
  lines: TerminalLine[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
}

export interface TmiResponse {
  tmiStatus: string;
  detectionScore: number;
  impactScore: number;
  remediationSuggestion: string;
  sources: string[];
}

export interface Attack {
  id: string;
  scenarioId: string;
  command: string;
  tmiStatus: string;
  detectionChance: number;
  impactScore: number;
  remediationSuggestion: string;
  timestamp: number;
  sources: string[];
}

export interface Score {
  averageScore: number;
}

export interface UserConfig {
  storageMode: 'local' | 'session';
  autoClear: boolean;
  telemetryEnabled: boolean;
  fontSize: number;
}
