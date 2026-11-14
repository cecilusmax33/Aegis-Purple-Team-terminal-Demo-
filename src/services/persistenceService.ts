import { Scenario, Attack, Score, TmiResponse, UserConfig } from "../types";

const SCENARIOS_KEY = 'aegis_scenarios';
const ATTACKS_KEY = 'aegis_attacks';
const SCORE_KEY = 'aegis_score';
const CONFIG_KEY = 'aegis_user_config';

const DEFAULT_SCENARIOS: Scenario[] = [
  { name: "Network Reconnaissance", id: "scen-001", description: "Discovery phase using tools like arp-scan. Goal: Map local subnets and identify live hosts without triggering NIDS." },
  { name: "Auth Credential Auditing", id: "scen-002", description: "Automated authentication scanning. Analyze the threshold of modern rate-limiting and brute-force detection." },
  { name: "Web Exploitation", id: "scen-003", description: "Manual SQL Injection and Directory traversal on high-value web targets." },
  { name: "Exfiltration & Evasion", id: "scen-004", description: "Advanced data exfiltration using non-standard protocols. Focus on stealth and egress filtering bypass." }
];

const DEFAULT_CONFIG: UserConfig = { storageMode: 'local', autoClear: false, telemetryEnabled: true, fontSize: 12 };

class PersistenceService {
  private get storage(): Storage {
    const config = this.getConfig();
    return config.storageMode === 'local' ? localStorage : sessionStorage;
  }

  init() {
    if (!this.storage.getItem(SCENARIOS_KEY)) this.storage.setItem(SCENARIOS_KEY, JSON.stringify(DEFAULT_SCENARIOS));
  }

  getConfig(): UserConfig {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_CONFIG;
  }

  updateConfig(newConfig: Partial<UserConfig>) {
    const updated = { ...this.getConfig(), ...newConfig };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    return updated;
  }

  getScenarios(): Scenario[] {
    const data = this.storage.getItem(SCENARIOS_KEY);
    return data ? JSON.parse(data) : DEFAULT_SCENARIOS;
  }

  getAttackHistory(): Attack[] {
    const data = this.storage.getItem(ATTACKS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getScore(): Score {
    const data = this.storage.getItem(SCORE_KEY);
    return data ? JSON.parse(data) : { averageScore: 0 };
  }

  saveAttack(command: string, tmi: TmiResponse, scenario: Scenario | null) {
    const attacks = this.getAttackHistory();
    const newAttack: Attack = { id: `atk-${Date.now()}`, scenarioId: scenario?.id || 'sandbox', command, tmiStatus: tmi.tmiStatus, detectionChance: tmi.detectionScore, impactScore: tmi.impactScore, remediationSuggestion: tmi.remediationSuggestion, timestamp: Date.now(), sources: tmi.sources };
    const updatedAttacks = [newAttack, ...attacks].slice(0, 50);
    this.storage.setItem(ATTACKS_KEY, JSON.stringify(updatedAttacks));
    const effectiveness = tmi.impactScore > 0 ? Math.round(((100 - tmi.detectionScore) / tmi.impactScore) * 100) : 0;
    const clampedEffectiveness = Math.min(100, Math.max(0, effectiveness));
    const currentScore = this.getScore();
    const totalAttacks = updatedAttacks.length;
    const newAverage = Math.round(((currentScore.averageScore * (totalAttacks - 1)) + clampedEffectiveness) / totalAttacks);
    this.storage.setItem(SCORE_KEY, JSON.stringify({ averageScore: newAverage }));
    return { updatedAttacks, newAverage };
  }

  clearAll() {
    this.storage.removeItem(ATTACKS_KEY);
    this.storage.removeItem(SCORE_KEY);
  }
}

export const persistenceService = new PersistenceService();
