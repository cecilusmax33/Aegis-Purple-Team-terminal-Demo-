
import React, { useState, useRef, useEffect, useMemo, useCallback, useTransition } from 'react';
import { TerminalLine, TerminalLineType, Session, Theme, SplitMode } from '../types';

interface TerminalProps {
  sessions: Session[];
  activeSessionId: string;
  secondarySessionId: string | null;
  onSwitchSession: (id: string) => void;
  onSwitchSecondarySession: (id: string) => void;
  onNewSession: () => void;
  onRenameSession: (id: string, name: string) => void;
  onCloseSession: (id: string) => void;
  isProcessing: boolean;
  onCommandSubmit: (command: string, sessionId?: string) => void;
  userId: string | null;
  activeScenarioName?: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  splitMode: SplitMode;
  onSplitModeChange: (mode: SplitMode) => void;
  msfModule?: string | null;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

const THEME_STYLES: Record<Theme, any> = {
  aegis: {
    bg: 'bg-[#121212]',
    text: 'text-white',
    prompt: 'text-emerald-400',
    input: 'text-rose-400',
    system: 'text-emerald-500/80',
    border: 'border-[#30363D]',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    scrollbar: '#10b98133',
    selection: 'selection:bg-emerald-500/30'
  },
  cyber: {
    bg: 'bg-[#0f0524]',
    text: 'text-pink-100',
    prompt: 'text-cyan-400',
    input: 'text-fuchsia-400',
    system: 'text-purple-400/80',
    border: 'border-fuchsia-900/40',
    glow: 'shadow-[0_0_15px_rgba(244,114,182,0.1)]',
    scrollbar: '#f472b633',
    selection: 'selection:bg-cyan-500/30'
  },
  matrix: {
    bg: 'bg-black',
    text: 'text-green-500',
    prompt: 'text-green-600 font-bold',
    input: 'text-green-400',
    system: 'text-green-700/80',
    border: 'border-green-900/30',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.1)]',
    scrollbar: '#22c55e33',
    selection: 'selection:bg-green-500/40'
  },
  ghost: {
    bg: 'bg-[#1a1a1a]',
    text: 'text-gray-300',
    prompt: 'text-gray-500',
    input: 'text-white',
    system: 'text-gray-600',
    border: 'border-white/5',
    glow: 'shadow-[0_0_15px_rgba(255,255,255,0.05)]',
    scrollbar: '#ffffff11',
    selection: 'selection:bg-white/10'
  },
  nord: {
    bg: 'bg-[#2e3440]',
    text: 'text-[#eceff4]',
    prompt: 'text-[#88c0d0]',
    input: 'text-[#bf616a]',
    system: 'text-[#d8dee9]/60',
    border: 'border-[#4c566a]',
    glow: '',
    scrollbar: '#88c0d033',
    selection: 'selection:bg-[#88c0d0]/30'
  },
  dracula: {
    bg: 'bg-[#282a36]',
    text: 'text-[#f8f8f2]',
    prompt: 'text-[#50fa7b]',
    input: 'text-[#ff79c6]',
    system: 'text-[#6272a4]',
    border: 'border-[#44475a]',
    glow: '',
    scrollbar: '#bd93f933',
    selection: 'selection:bg-[#bd93f9]/30'
  },
  solarized: {
    bg: 'bg-[#002b36]',
    text: 'text-[#839496]',
    prompt: 'text-[#859900]',
    input: 'text-[#cb4b16]',
    system: 'text-[#586e75]',
    border: 'border-[#073642]',
    glow: '',
    scrollbar: '#85990033',
    selection: 'selection:bg-[#268bd2]/30'
  },
  crimson: {
    bg: 'bg-[#1a0505]',
    text: 'text-[#ffcccc]',
    prompt: 'text-[#ff0000]',
    input: 'text-[#ff5555]',
    system: 'text-[#660000]',
    border: 'border-[#330000]',
    glow: '',
    scrollbar: '#ff000033',
    selection: 'selection:bg-red-500/30'
  }
};

const TerminalLineItem = React.memo(({ line, styles, time, filter, fontSize }: { line: TerminalLine; styles: any; time: string; filter?: string; fontSize: number }) => {
  const itemStyle = useMemo(() => ({ contentVisibility: 'auto', fontSize: `${fontSize}px` } as React.CSSProperties), [fontSize]);

  if (filter && !line.text.toLowerCase().includes(filter.toLowerCase())) return null;

  switch (line.type) {
    case TerminalLineType.INPUT:
      return (
        <div className="mt-2 flex" style={itemStyle}>
          <span className={`${styles.prompt} shrink-0`}>op@aegis:~$</span>
          <span className={`${styles.input} ml-2 break-all`}>{line.text}</span>
        </div>
      );
    case TerminalLineType.SYSTEM:
      return (
        <div className={`${styles.system} font-mono mt-1 leading-relaxed border-l border-emerald-500/10 pl-2`} style={itemStyle}>
          <span className="opacity-30 text-[0.8em] mr-2">[{time}]</span> {line.text}
        </div>
      );
    case TerminalLineType.ERROR:
      return (
        <div className="flex flex-col mt-4" style={itemStyle}>
          <div className="text-rose-400 font-bold p-3 bg-rose-500/10 border border-rose-500/30 rounded-t-md font-mono shadow-inner border-b-0">
            <span className="mr-2 opacity-50 font-black">!FAULT:</span> {line.text}
          </div>
          {line.metadata?.suggestion && (
            <div className="bg-rose-500/5 border border-rose-500/20 border-t-0 p-2 text-[0.85em] text-rose-300/60 italic rounded-b-md">
              <span className="font-bold uppercase mr-1">Suggestion:</span> {line.metadata.suggestion}
            </div>
          )}
        </div>
      );
    case TerminalLineType.CRITICAL_ERROR:
      return (
        <div className="text-white font-black p-4 bg-rose-600 border-2 border-rose-900 rounded-md mt-6 font-mono animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.5)]" style={itemStyle}>
          <div className="flex justify-between items-center mb-2">
            <span>[ SYSTEM ALERT ]</span>
            <span className="text-[0.7em] opacity-70 tracking-widest uppercase">Emergency Suppression</span>
          </div>
          <pre className="whitespace-pre-wrap leading-tight">{line.text}</pre>
        </div>
      );
    case TerminalLineType.HELP:
      return (
        <div className="text-emerald-300 whitespace-pre-wrap font-mono border border-emerald-500/20 p-5 rounded bg-black/40 my-6 leading-relaxed shadow-xl" style={itemStyle}>
          {line.text}
        </div>
      );
    case TerminalLineType.BANNER:
      return (
        <div className="text-blue-400 whitespace-pre font-mono leading-tight my-4 drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]" style={itemStyle}>
          {line.text}
        </div>
      );
    case TerminalLineType.TMI_LOG:
      return (
        <div className="bg-blue-900/10 border-l-2 border-blue-500 p-3 my-2 rounded-r" style={itemStyle}>
          <p className="text-blue-400 font-black text-[0.8em] uppercase tracking-widest">TMI ANALYSIS</p>
          <p className="text-blue-100 font-mono mt-1">{line.text}</p>
        </div>
      );
    case TerminalLineType.TMI_SUGGESTION:
      return (
        <div className="ml-4 mb-4 border-l border-white/10 pl-4 py-1" style={itemStyle}>
          <p className="text-blue-300/80 italic leading-relaxed mb-3">{line.text}</p>
          {line.metadata?.sources && line.metadata.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {line.metadata.sources.map((s: any, idx: number) => (
                <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[0.75em] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                  {s.title}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    case TerminalLineType.INTEL_REPORT:
      return (
        <div className="border border-amber-500/30 bg-amber-500/5 p-5 my-6 rounded-lg shadow-[0_0_30px_rgba(245,158,11,0.05)]" style={itemStyle}>
          <div className="flex items-center justify-between mb-4 border-b border-amber-500/20 pb-2">
            <span className="text-amber-500 font-black text-[0.8em] uppercase tracking-[0.3em]">OSINT Tactical Brief</span>
            <span className="text-amber-600 font-mono text-[0.7em] opacity-50">#ID-{Math.floor(Math.random()*1000)}</span>
          </div>
          <div className="text-amber-200/90 font-mono leading-relaxed whitespace-pre-wrap">
            {line.text}
          </div>
        </div>
      );
    default:
      return <div className="text-gray-400" style={itemStyle}>{line.text}</div>;
  }
});

const TerminalHistory = React.memo(({ lines, styles, sessionId, filter, fontSize }: { lines: TerminalLine[]; styles: any; sessionId: string; filter?: string; fontSize: number }) => {
  const now = useMemo(() => new Date().toLocaleTimeString([], { hour12: false }), [lines.length]);
  return (
    <>
      {lines.map((line, index) => (
        <TerminalLineItem key={`${sessionId}-${index}`} line={line} styles={styles} time={now} filter={filter} fontSize={fontSize} />
      ))}
    </>
  );
});

const TerminalInput = React.memo(({ 
  onCommandSubmit, 
  isProcessing, 
  styles, 
  promptPrefix,
  sessionName,
  msfModule,
  sessionId,
  fontSize
}: { 
  onCommandSubmit: (cmd: string, sId: string) => void; 
  isProcessing: boolean; 
  styles: any; 
  promptPrefix: string;
  sessionName: string;
  msfModule?: string | null;
  sessionId: string;
  fontSize: number;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const commandText = inputValue.trim();
      if (commandText) {
        setInputValue('');
        startTransition(() => {
          onCommandSubmit(commandText, sessionId);
        });
      }
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [isProcessing, sessionId]);

  const renderPrompt = () => {
    if (sessionName === '@METASPLOIT') {
      return (
        <span className="font-mono shrink-0" style={{ fontSize: `${fontSize}px` }}>
          <span className="text-white">msf6 </span>
          {msfModule && (
            <span className="text-rose-500">exploit(<span className="text-rose-400 font-bold">{msfModule.split('/').pop()}</span>) </span>
          )}
          <span className="text-white">&gt; </span>
        </span>
      );
    }
    return (
      <span className={`${styles.prompt} font-black mr-4 shrink-0 font-mono relative`} style={{ fontSize: `${fontSize}px` }}>
        {promptPrefix}
        {isProcessing && (
          <span className="absolute -right-2 top-0 text-[0.6em] text-amber-500 animate-pulse opacity-50">PROCESSING</span>
        )}
      </span>
    );
  };

  return (
    <div className="flex items-center group relative">
      {renderPrompt()}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`flex-grow bg-transparent ${styles.text} border-0 p-0 focus:outline-none focus:ring-0 font-mono caret-emerald-500`}
        style={{ fontSize: `${fontSize}px` }}
        placeholder="..."
        autoFocus
        spellCheck={false}
      />
    </div>
  );
});

const TerminalLoading = React.memo(({ fontSize }: { fontSize: number }) => {
  const [step, setStep] = useState(0);
  const steps = ["Processing Uplink...", "Analyzing Telemetry...", "Generating TMI Frame...", "Syncing Results..."];
  useEffect(() => {
    const interval = setInterval(() => setStep(s => (s + 1) % steps.length), 1200);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex items-center mt-6">
      <div className="w-1.5 h-4 bg-emerald-500 animate-pulse mr-3 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
      <span className="text-emerald-500/60 font-black uppercase tracking-widest font-mono" style={{ fontSize: `${fontSize * 0.75}px` }}>{steps[step]}</span>
    </div>
  );
});

const Toolbar: React.FC<{
  onSplit: (mode: SplitMode) => void;
  onToggleFind: () => void;
  currentSplit: SplitMode;
  onThemeToggle: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}> = ({ onSplit, onToggleFind, currentSplit, onThemeToggle, fontSize, onFontSizeChange }) => {
  return (
    <div className="bg-[#1C1C1C] border-b border-white/5 px-4 py-1.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button onClick={() => onSplit('none')} className={`p-1 rounded hover:bg-white/5 transition-colors ${currentSplit === 'none' ? 'text-emerald-500 bg-white/5' : 'text-gray-500'}`} title="Single View">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
        </button>
        <button onClick={() => onSplit('vertical')} className={`p-1 rounded hover:bg-white/5 transition-colors ${currentSplit === 'vertical' ? 'text-emerald-500 bg-white/5' : 'text-gray-500'}`} title="Split Vertical">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 16h-4V5h4v14z"/></svg>
        </button>
        <button onClick={() => onSplit('horizontal')} className={`p-1 rounded hover:bg-white/5 transition-colors ${currentSplit === 'horizontal' ? 'text-emerald-500 bg-white/5' : 'text-gray-500'}`} title="Split Horizontal">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 10H5v-4h14v4z"/></svg>
        </button>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
          <span className="text-[9px] font-black uppercase text-gray-500 tracking-tighter">View</span>
          <button 
            onClick={() => onFontSizeChange(Math.max(8, fontSize - 1))}
            className="text-[10px] text-gray-400 hover:text-white font-bold p-1 bg-white/5 rounded"
          >
            A-
          </button>
          <span className="text-[10px] text-emerald-500 font-mono w-4 text-center">{fontSize}</span>
          <button 
            onClick={() => onFontSizeChange(Math.min(32, fontSize + 1))}
            className="text-[10px] text-gray-400 hover:text-white font-bold p-1 bg-white/5 rounded"
          >
            A+
          </button>
        </div>
        <button onClick={onToggleFind} className="p-1 rounded hover:bg-white/5 text-gray-500 transition-colors" title="Find (Ctrl+F)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </button>
        <button onClick={onThemeToggle} className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">Visual Recalibration</button>
      </div>
    </div>
  );
};

const Terminal: React.FC<TerminalProps> = ({ 
  sessions, activeSessionId, secondarySessionId, onSwitchSession, onSwitchSecondarySession, onNewSession, onRenameSession, onCloseSession, 
  isProcessing, onCommandSubmit, userId, activeScenarioName, theme, onThemeChange, splitMode, onSplitModeChange,
  msfModule, fontSize, onFontSizeChange
}) => {
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const outputRef1 = useRef<HTMLDivElement>(null);
  const outputRef2 = useRef<HTMLDivElement>(null);
  const activeStyles = THEME_STYLES[theme];

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId) || sessions[0], [sessions, activeSessionId]);
  const secondarySession = useMemo(() => sessions.find(s => s.id === secondarySessionId) || null, [sessions, secondarySessionId]);

  useEffect(() => {
    if (outputRef1.current) outputRef1.current.scrollTop = outputRef1.current.scrollHeight;
    if (outputRef2.current) outputRef2.current.scrollTop = outputRef2.current.scrollHeight;
  }, [activeSession.lines, secondarySession?.lines, isProcessing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setIsFindOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getPromptPrefix = (session: Session) => session.name === '@google/gemini-cli' ? 'gemini>' : 'op@aegis:~$';

  const themes: Theme[] = ['aegis', 'cyber', 'matrix', 'ghost', 'nord', 'dracula', 'solarized', 'crimson'];
  const handleThemeToggle = () => {
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    onThemeChange(themes[nextIndex]);
  };

  const renderSessionPane = (session: Session, ref: React.RefObject<HTMLDivElement>) => (
    <div className={`flex flex-col h-full overflow-hidden ${splitMode !== 'none' ? 'border border-white/5 shadow-inner' : ''}`}>
      <div className="bg-[#1A1A1A] px-4 py-1 flex items-center justify-between border-b border-black/40">
        <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">{session.name}</span>
        {splitMode !== 'none' && (
          <select value={session.id} onChange={(e) => session.id === activeSessionId ? onSwitchSession(e.target.value) : onSwitchSecondarySession(e.target.value)} className="bg-transparent text-[8px] text-gray-500 font-bold focus:outline-none cursor-pointer">
            {sessions.map(s => <option key={s.id} value={s.id} className="bg-[#121212]">{s.name}</option>)}
          </select>
        )}
      </div>
      <div ref={ref} className="flex-grow p-6 overflow-y-auto font-mono custom-scrollbar">
        <TerminalHistory lines={session.lines} styles={activeStyles} sessionId={session.id} filter={findQuery} fontSize={fontSize} />
        {isProcessing && activeSessionId === session.id && <TerminalLoading fontSize={fontSize} />}
      </div>
      <div className={`${activeStyles.bg} border-t border-white/5 p-6`}>
        <TerminalInput 
          onCommandSubmit={onCommandSubmit}
          isProcessing={isProcessing}
          styles={activeStyles}
          promptPrefix={getPromptPrefix(session)}
          sessionName={session.name}
          msfModule={activeSessionId === session.id ? msfModule : null}
          sessionId={session.id}
          fontSize={fontSize}
        />
      </div>
    </div>
  );

  return (
    <div className={`w-full md:w-2/3 flex flex-col h-3/5 md:h-full ${activeStyles.bg} border-r ${activeStyles.border} relative overflow-hidden font-sans shadow-2xl`}>
      <div className="bg-[#242424] flex text-[10px] h-10 border-b border-black/60 items-end overflow-hidden">
        {sessions.map(s => (
          <div key={s.id} onClick={() => onSwitchSession(s.id)} className={`flex items-center gap-3 px-6 h-8 min-w-[120px] cursor-pointer transition-all border-r border-black/40 rounded-t-md ${activeSessionId === s.id ? 'bg-[#121212] text-emerald-400 border-t-2 border-emerald-500' : 'bg-black/10 text-gray-500'}`}>
            <span className="whitespace-nowrap font-black uppercase tracking-tight text-[9px] truncate">{s.name}</span>
            <button onClick={(e) => { e.stopPropagation(); onCloseSession(s.id); }} className="text-gray-600 hover:text-rose-500 transition-colors">×</button>
          </div>
        ))}
        <button onClick={onNewSession} className="px-4 h-8 flex items-center text-gray-600 hover:text-emerald-400 font-bold text-[9px] tracking-widest">NEW_TERM</button>
      </div>

      <Toolbar 
        onSplit={onSplitModeChange} 
        onToggleFind={() => setIsFindOpen(!isFindOpen)} 
        currentSplit={splitMode} 
        onThemeToggle={handleThemeToggle} 
        fontSize={fontSize}
        onFontSizeChange={onFontSizeChange}
      />

      <div className={`flex-grow overflow-hidden ${splitMode === 'vertical' ? 'flex flex-row' : splitMode === 'horizontal' ? 'flex flex-col' : ''}`}>
        <div className={`flex-grow h-full min-h-0 min-w-0 ${splitMode === 'vertical' ? 'w-1/2' : splitMode === 'horizontal' ? 'h-1/2' : 'w-full'}`}>
          {renderSessionPane(activeSession, outputRef1)}
        </div>
        {splitMode !== 'none' && secondarySession && (
          <div className={`flex-grow h-full min-h-0 min-w-0 ${splitMode === 'vertical' ? 'w-1/2' : splitMode === 'horizontal' ? 'h-1/2' : ''}`}>
            {renderSessionPane(secondarySession, outputRef2)}
          </div>
        )}
      </div>

      {isFindOpen && (
        <div className="absolute bottom-24 left-6 right-6 bg-[#1C1C1C] border border-white/10 rounded-md p-2 flex items-center gap-3 shadow-2xl z-20">
          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" autoFocus placeholder="Search tactical log..." className="bg-transparent border-none text-xs text-white focus:outline-none w-full font-mono" value={findQuery} onChange={(e) => setFindQuery(e.target.value)} />
          <button onClick={() => { setIsFindOpen(false); setFindQuery(''); }} className="text-gray-500 hover:text-white font-bold text-xs px-2">ESC</button>
        </div>
      )}
    </div>
  );
};

export default Terminal;
