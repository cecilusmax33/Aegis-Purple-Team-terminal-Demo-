
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TerminalLine, Scenario, Attack, Score, TerminalLineType, TmiResponse, Session, Theme, SplitMode, UserConfig } from './types';
import Terminal from './components/Terminal';
import Dashboard from './components/Dashboard';
import WiresharkSim from './components/WiresharkSim';
import BurpSuiteSim from './components/BurpSuiteSim';
import { persistenceService } from './services/persistenceService';
import { analyzeCommand, chatWithGemini, fetchIntelligence } from './services/geminiService';

interface MsfContext {
  activeModule: string | null;
  options: Record<string, string>;
}

const App: React.FC = () => {
  const [userId] = useState<string>("local-operative");
  
  // Per-session state management
  const [sessions, setSessions] = useState<Session[]>([
    { 
      id: 'default', 
      name: 'Main Console', 
      splitMode: 'none',
      lines: [
        { type: TerminalLineType.SYSTEM, text: 'Aegis Terminal V3.2 - Environment initialized.' },
        { type: TerminalLineType.SYSTEM, text: 'Storage Provider: LOCAL_SECURE_STORAGE' }
      ] 
    }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [secondarySessionId, setSecondarySessionId] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('aegis');
  const [userConfig, setUserConfig] = useState<UserConfig>(persistenceService.getConfig());

  // Metasploit state
  const [msfContext, setMsfContext] = useState<MsfContext>({
    activeModule: null,
    options: {
      'RHOSTS': '',
      'LHOST': '10.10.14.5',
      'LPORT': '4444',
      'PAYLOAD': 'linux/x64/meterpreter/reverse_tcp'
    }
  });

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [attackHistory, setAttackHistory] = useState<Attack[]>([]);
  const [score, setScore] = useState<Score>({ averageScore: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWireshark, setShowWireshark] = useState(false);
  const [showBurp, setShowBurp] = useState(false);

  useEffect(() => {
    try {
      persistenceService.init();
      const config = persistenceService.getConfig();
      setUserConfig(config);
      
      const loadedScenarios = persistenceService.getScenarios();
      setScenarios(loadedScenarios);
      if (loadedScenarios.length > 0) {
        setActiveScenario(loadedScenarios[0]);
      }

      setAttackHistory(persistenceService.getAttackHistory());
      setScore(persistenceService.getScore());

      addTerminalLine({ 
        type: TerminalLineType.SYSTEM, 
        text: `Persistence established via ${config.storageMode.toUpperCase()} buffer.` 
      }, 'default');
    } catch (err: any) {
      addTerminalLine({ 
        type: TerminalLineType.ERROR, 
        text: `Critical System Error: Persistence Service initialization failed. [Reason: ${err.message}]` 
      }, 'default');
    }
  }, []);

  const addTerminalLine = (line: TerminalLine, targetId: string) => {
    setSessions(prev => prev.map(s => 
      s.id === targetId ? { ...s, lines: [...s.lines, line] } : s
    ));
  };

  const handleCreateSession = (name: string = `Session ${sessions.length + 1}`, initialLines?: TerminalLine[]) => {
    const newId = `session-${Date.now()}`;
    const defaultLines: TerminalLine[] = [
      { type: TerminalLineType.SYSTEM, text: `Terminal spawn: instance_${newId.substring(newId.length - 4)} initialized.` },
      { type: TerminalLineType.SYSTEM, text: 'Awaiting tactical directive in secure buffer.' }
    ];
    const newSession: Session = {
      id: newId,
      name: name,
      splitMode: 'none',
      lines: initialLines || defaultLines
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
    return newId;
  };

  const handleCloseSession = (id: string) => {
    if (sessions.length === 1) return;
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
    if (secondarySessionId === id) {
      setSecondarySessionId(null);
    }
  };

  const handleSplitModeChange = (mode: SplitMode) => {
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, splitMode: mode } : s
    ));
    if (mode !== 'none' && !secondarySessionId) {
      const other = sessions.find(s => s.id !== activeSessionId);
      if (other) setSecondarySessionId(other.id);
      else handleCreateSession();
    }
  };

  const showHelp = (targetId: string) => {
    const helpText = `
[ AEGIS TACTICAL MANUAL - RECON & EXPLOIT ]

NETWORK DISCOVERY:
  arp-scan, nmap, ping, netstat

WEB VULN ANALYSIS:
  sqlmap, gobuster, nikto, burpsuite

OFFENSIVE OPS:
  infect, sendpacket, dnsspoof, nc, msfconsole

INTELLIGENCE:
  intel <query>, gemini-cli

CORE:
  clear, help, whoami, date, theme, wireshark, settings, user_config
    `;
    addTerminalLine({ type: TerminalLineType.HELP, text: helpText }, targetId);
  };

  const clearTerminal = (targetId: string) => {
    setSessions(prev => prev.map(s => 
      s.id === targetId ? { ...s, lines: [
        { type: TerminalLineType.SYSTEM, text: 'Buffer purged. Environment stable.' }
      ] } : s
    ));
  }

  const triggerTmiAnalysis = useCallback(async (content: string, targetId: string) => {
    setIsProcessing(true);
    try {
      const tmi: TmiResponse = await analyzeCommand(content, activeScenario?.name || 'Sandbox', [...attackHistory]);
      addTerminalLine({ type: TerminalLineType.TMI_LOG, text: `${tmi.tmiStatus} [Det:${tmi.detectionScore}% | Impact:${tmi.impactScore}%]` }, targetId);
      addTerminalLine({ type: TerminalLineType.TMI_SUGGESTION, text: `Remediation Strategy: ${tmi.remediationSuggestion}`, metadata: { sources: tmi.sources } }, targetId);
      
      const { updatedAttacks, newAverage } = persistenceService.saveAttack(content, tmi, activeScenario);
      setAttackHistory(updatedAttacks);
      setScore({ averageScore: newAverage });
    } catch (e: any) {
      addTerminalLine({ 
        type: TerminalLineType.ERROR, 
        text: `TMI Uplink Interrupted: ${e.message}`,
        metadata: { suggestion: "Verify network status or API availability before retrying." }
      }, targetId);
    } finally {
      setIsProcessing(false);
    }
  }, [activeScenario, attackHistory]);

  const handleMsfCommand = useCallback(async (command: string, targetId: string) => {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();

    try {
      if (cmd === 'use') {
        const module = parts[1];
        if (module) {
          setMsfContext(prev => ({ ...prev, activeModule: module }));
          addTerminalLine({ type: TerminalLineType.SYSTEM, text: `[*] Using module: ${module}` }, targetId);
        } else {
          addTerminalLine({ type: TerminalLineType.ERROR, text: "Syntax Error: Usage: use <module_name>" }, targetId);
        }
      } else if (cmd === 'set') {
        const option = parts[1]?.toUpperCase();
        const value = parts.slice(2).join(' ');
        if (option && value) {
          setMsfContext(prev => ({
            ...prev,
            options: { ...prev.options, [option]: value }
          }));
          addTerminalLine({ type: TerminalLineType.SYSTEM, text: `${option} => ${value}` }, targetId);
        } else {
          addTerminalLine({ type: TerminalLineType.ERROR, text: "Syntax Error: Usage: set <option> <value>" }, targetId);
        }
      } else if (cmd === 'exploit' || cmd === 'run') {
        if (!msfContext.activeModule) {
          addTerminalLine({ type: TerminalLineType.ERROR, text: "Operational Block: No module selected for execution." }, targetId);
          return;
        }
        addTerminalLine({ type: TerminalLineType.SYSTEM, text: "[*] Started reverse TCP handler on 10.10.14.5:4444" }, targetId);
        await new Promise(r => setTimeout(r, 800));
        addTerminalLine({ type: TerminalLineType.SYSTEM, text: "[+] Meterpreter session 1 opened" }, targetId);
        await triggerTmiAnalysis(`Metasploit exploit ${msfContext.activeModule} executed`, targetId);
      } else if (cmd === 'exit') {
          handleCloseSession(targetId);
      } else {
        addTerminalLine({ type: TerminalLineType.ERROR, text: `Unknown MSF Directive: '${cmd}'` }, targetId);
      }
    } catch (err: any) {
      addTerminalLine({ type: TerminalLineType.ERROR, text: `Framework Exception: ${err.message}` }, targetId);
    }
  }, [msfContext, triggerTmiAnalysis, handleCloseSession]);

  const handleCommandSubmit = useCallback(async (command: string, sessionId?: string) => {
    const lowerCmd = command.toLowerCase().trim();
    if (!lowerCmd) return;

    const launchedSessionId = sessionId || activeSessionId;
    const currentSession = sessions.find(s => s.id === launchedSessionId);
    
    addTerminalLine({ type: TerminalLineType.INPUT, text: command }, launchedSessionId);
    
    try {
      if (currentSession?.name === '@METASPLOIT') {
        await handleMsfCommand(command, launchedSessionId);
        return;
      }

      if (currentSession?.name === '@google/gemini-cli') {
          setIsProcessing(true);
          const aiResponse = await chatWithGemini(command);
          addTerminalLine({ type: TerminalLineType.SYSTEM, text: aiResponse }, launchedSessionId);
          setIsProcessing(false);
          return;
      }

      const parts = lowerCmd.split(/\s+/);
      const cmd = parts[0];

      // Persistence & View Settings
      if (cmd === 'settings' || cmd === 'user_config') {
          const sub = parts[1];
          if (sub === 'storage') {
              const mode = parts[2] as 'local' | 'session';
              if (mode === 'local' || mode === 'session') {
                  const cfg = persistenceService.updateConfig({ storageMode: mode });
                  setUserConfig(cfg);
                  addTerminalLine({ type: TerminalLineType.SYSTEM, text: `Configuration Synchronized: storage set to ${mode.toUpperCase()}. Note: Existing buffer data remains in previous provider.` }, launchedSessionId);
              } else {
                  addTerminalLine({ type: TerminalLineType.ERROR, text: "Config Fault: Usage: user_config storage <local|session>" }, launchedSessionId);
              }
          } else if (sub === 'font_size' || sub === 'fontsize') {
              const size = parseInt(parts[2]);
              if (!isNaN(size) && size >= 8 && size <= 32) {
                  const cfg = persistenceService.updateConfig({ fontSize: size });
                  setUserConfig(cfg);
                  addTerminalLine({ type: TerminalLineType.SYSTEM, text: `View Synchronized: terminal font size set to ${size}px.` }, launchedSessionId);
              } else {
                  addTerminalLine({ type: TerminalLineType.ERROR, text: "Config Fault: Usage: user_config font_size <8-32>" }, launchedSessionId);
              }
          } else if (sub === 'clear') {
              persistenceService.clearAll();
              setAttackHistory([]);
              setScore({ averageScore: 0 });
              addTerminalLine({ type: TerminalLineType.SYSTEM, text: "Storage purged. Tactical history has been zeroed out." }, launchedSessionId);
          } else {
              addTerminalLine({ type: TerminalLineType.SYSTEM, text: `Active Configuration Log:\n- Persistence: ${userConfig.storageMode.toUpperCase()}\n- Font Size: ${userConfig.fontSize}px\n- Telemetry Monitoring: ${userConfig.telemetryEnabled ? 'ENABLED' : 'DISABLED'}\n\nAvailable Directives:\n- user_config storage <local|session>\n- user_config font_size <8-32>\n- user_config clear` }, launchedSessionId);
          }
          return;
      }

      // Core Commands
      if (cmd === 'help') { showHelp(launchedSessionId); return; }
      if (cmd === 'clear') { clearTerminal(launchedSessionId); return; }
      if (cmd === 'wireshark') { setShowWireshark(true); return; }
      if (cmd === 'burpsuite') { setShowBurp(true); return; }
      if (cmd === 'whoami') { addTerminalLine({ type: TerminalLineType.SYSTEM, text: `operative_v32 (Identity verified: RED_TEAM_AUDITOR)` }, launchedSessionId); return; }
      if (cmd === 'theme') { 
          const themes: Theme[] = ['aegis', 'cyber', 'matrix', 'ghost', 'nord', 'dracula', 'solarized', 'crimson'];
          const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
          setTheme(nextTheme);
          return; 
      }

      // Tool simulation triggers
      if (['arp-scan', 'nmap', 'ping', 'netstat', 'sqlmap', 'gobuster', 'nikto', 'nc', 'infect', 'sendpacket', 'dnsspoof'].includes(cmd)) {
          addTerminalLine({ type: TerminalLineType.SYSTEM, text: `[*] Initiating ${cmd} simulation layer...` }, launchedSessionId);
          await triggerTmiAnalysis(command, launchedSessionId);
          return;
      }

      if (cmd === 'msfconsole') {
          handleCreateSession('@METASPLOIT', [{ type: TerminalLineType.BANNER, text: "Metasploit Simulation Hub [Operational]" }]);
          return;
      }

      if (cmd === 'intel') {
        const query = parts.slice(1).join(' ');
        if (!query) { addTerminalLine({ type: TerminalLineType.ERROR, text: "Intel Fault: Usage: intel <query|url>" }, launchedSessionId); return; }
        setIsProcessing(true);
        const report = await fetchIntelligence(query);
        addTerminalLine({ type: TerminalLineType.INTEL_REPORT, text: report }, launchedSessionId);
        setIsProcessing(false);
        return;
      }

      if (cmd === 'gemini-cli') {
          handleCreateSession('@google/gemini-cli', [{ type: TerminalLineType.SYSTEM, text: 'Direct Link to Gemini Tactical Hub Established.' }]);
          return;
      }

      addTerminalLine({ type: TerminalLineType.ERROR, text: `Command Fault: Directive '${cmd}' is not recognized in this environment.` }, launchedSessionId);

    } catch (err: any) {
      addTerminalLine({ 
        type: TerminalLineType.ERROR, 
        text: `Execution Exception: ${err.message}`,
        metadata: { suggestion: "Unexpected state encountered. Restart the console if issue persists." }
      }, launchedSessionId);
      setIsProcessing(false);
    }

  }, [activeSessionId, activeScenario, attackHistory, msfContext, sessions, handleMsfCommand, triggerTmiAnalysis, handleCreateSession, handleCloseSession, theme, userConfig]);

  const handleScenarioChange = (scenarioId: string) => {
    try {
      const scenario = scenarios.find(s => s.id === scenarioId);
      if (scenario) {
        setActiveScenario(scenario);
        addTerminalLine({ type: TerminalLineType.SYSTEM, text: `Tactical focus shifted to: ${scenario.name}` }, activeSessionId);
      }
    } catch (err: any) {
      addTerminalLine({ type: TerminalLineType.ERROR, text: `Scenario Switch Fault: ${err.message}` }, activeSessionId);
    }
  };

  const handleUpdateFontSize = (newSize: number) => {
    const cfg = persistenceService.updateConfig({ fontSize: newSize });
    setUserConfig(cfg);
  };

  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <main className="w-full h-screen flex justify-center items-center p-2 md:p-8 bg-[#010409]">
      <div className="w-full max-w-7xl h-full flex flex-col md:flex-row bg-[#0D1117] rounded-xl shadow-[0_0_100px_rgba(16,185,129,0.1)] border border-[#30363D] overflow-hidden">
        <Terminal
          sessions={sessions}
          activeSessionId={activeSessionId}
          secondarySessionId={secondarySessionId}
          onSwitchSession={setActiveSessionId}
          onSwitchSecondarySession={setSecondarySessionId}
          onNewSession={() => handleCreateSession()}
          onRenameSession={(id, name) => setSessions(prev => prev.map(s => s.id === id ? { ...s, name } : s))}
          onCloseSession={handleCloseSession}
          isProcessing={isProcessing}
          onCommandSubmit={handleCommandSubmit}
          userId={userId}
          activeScenarioName={activeScenario?.name}
          theme={theme}
          onThemeChange={setTheme}
          splitMode={currentSession.splitMode}
          onSplitModeChange={handleSplitModeChange}
          msfModule={activeSessionId === sessions.find(s => s.name === '@METASPLOIT')?.id ? msfContext.activeModule : null}
          fontSize={userConfig.fontSize}
          onFontSizeChange={handleUpdateFontSize}
        />
        <Dashboard
          scenarios={scenarios}
          activeScenario={activeScenario}
          onScenarioChange={handleScenarioChange}
          score={score.averageScore}
          attackHistory={attackHistory}
          isLocalMode={userConfig.storageMode === 'local'}
        />
      </div>

      {showWireshark && (
        <WiresharkSim onClose={() => setShowWireshark(false)} />
      )}

      {showBurp && (
        <BurpSuiteSim 
          onClose={() => setShowBurp(false)} 
          onAction={(a, d) => triggerTmiAnalysis(`Burp Intercept: ${a} - ${d}`, activeSessionId)}
        />
      )}
    </main>
  );
};

export default App;
