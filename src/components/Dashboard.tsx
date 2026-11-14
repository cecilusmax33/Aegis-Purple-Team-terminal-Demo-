
import React from 'react';
import { Scenario, Attack } from '../types';
import { DashboardIcon } from './icons/DashboardIcon';

interface DashboardProps {
  scenarios: Scenario[];
  activeScenario: Scenario | null;
  onScenarioChange: (scenarioId: string) => void;
  score: number;
  attackHistory: Attack[];
  isLocalMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  scenarios, 
  activeScenario, 
  onScenarioChange, 
  score, 
  attackHistory,
  isLocalMode 
}) => {
  
  const getDetectionColor = (detectionChance: number): string => {
    if (detectionChance >= 70) return 'text-rose-400';
    if (detectionChance >= 40) return 'text-amber-400';
    return 'text-emerald-400';
  }

  return (
    <div className="w-full md:w-1/3 flex flex-col p-6 md:p-10 border-t md:border-t-0 md:border-l border-[#30363D] bg-[#0D1117] h-2/5 md:h-full relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-emerald-500/5 blur-[120px] -z-10 rounded-full"></div>
      
      <div className="flex items-center justify-between mb-10">
        <h2 className="text-lg md:text-xl font-black text-emerald-400 flex items-center tracking-widest uppercase">
          <DashboardIcon className="w-6 h-6 mr-3 text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
          Tactical Intel
        </h2>
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-black/40 rounded-full border border-white/5">
          <div className={`w-1.5 h-1.5 rounded-full ${isLocalMode ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
          <span className="text-[8px] uppercase font-black text-gray-500 tracking-[0.2em]">
            {isLocalMode ? 'Persistent Storage' : 'Volatile Buffer'}
          </span>
        </div>
      </div>
      
      <div className="bg-[#161B22]/60 backdrop-blur-xl p-6 rounded-2xl mb-8 shadow-2xl border border-white/5 group hover:border-emerald-500/20 transition-all duration-500">
        <label htmlFor="scenario-selector" className="block text-[9px] font-black text-emerald-500/50 mb-3.5 uppercase tracking-[0.3em]">Operational Sector</label>
        <div className="relative">
          <select 
            id="scenario-selector" 
            className="w-full bg-[#0D1117] border border-[#30363D] text-white p-4 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm appearance-none font-bold"
            value={activeScenario?.id || ''}
            onChange={(e) => onScenarioChange(e.target.value)}
          >
            {scenarios.length === 0 ? (
              <option value="">Awaiting Intelligence...</option>
            ) : (
              scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
            )}
          </select>
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-emerald-500/40">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <div className="text-[11px] text-gray-400 mt-5 leading-relaxed font-medium italic opacity-70 min-h-[3.5rem] border-t border-white/5 pt-4">
          {activeScenario?.description || 'Select a mission sector to begin tactical scoring.'}
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#161B22] to-[#0D1117] p-8 rounded-2xl mb-10 shadow-2xl border border-white/5 relative overflow-hidden group">
        <div className="absolute -top-5 -right-5 p-3 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
           <DashboardIcon className="w-24 h-24" />
        </div>
        <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-[0.3em] mb-2">Combat Effectiveness (CE)</p>
        <div className="flex items-baseline gap-4">
          <p className="text-6xl font-black text-emerald-400 tabular-nums drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            {score}%
          </p>
          <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest opacity-60">Global Rating</span>
        </div>
        <div className="w-full bg-black/40 h-2 mt-6 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div 
            className="h-full bg-emerald-500 transition-all duration-[2000ms] shadow-[0_0_12px_#10b981]" 
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.3em]">Campaign History</h3>
        <span className="text-[8px] text-gray-500 font-black tracking-widest bg-white/5 px-2 py-0.5 rounded-sm">{attackHistory.length} ENTRIES</span>
      </div>
      
      <div className="flex-grow bg-[#010409]/40 backdrop-blur-md p-5 rounded-2xl overflow-y-auto text-sm border border-white/5 custom-scrollbar shadow-inner">
        {attackHistory.length > 0 ? (
          attackHistory.map((attack) => (
            <div key={attack.id} className="border-b border-white/5 pb-6 mb-6 last:border-b-0 last:mb-0 group/item">
              <div className="flex justify-between items-start mb-3">
                <p className="text-gray-600 text-[9px] font-black tracking-widest opacity-80">
                  [{new Date(attack.timestamp).toLocaleTimeString([], { hour12: false })}]
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded bg-black/60 ${getDetectionColor(attack.detectionChance)} border border-white/5 shadow-sm`}>
                    {attack.detectionChance}% DETECTION
                  </span>
                </div>
              </div>
              <p className="text-gray-100 font-mono text-xs break-all mb-3 group-hover/item:text-emerald-400 transition-colors leading-relaxed border-l-2 border-transparent group-hover/item:border-emerald-500 pl-0 group-hover/item:pl-3 transition-all">
                <span className="text-gray-600 mr-2 font-bold opacity-40">$</span>{attack.command}
              </p>
              <div className="flex gap-3 items-center text-[10px] text-gray-400 bg-white/5 p-3 rounded-lg border border-white/5 group-hover/item:bg-white/10 transition-colors">
                <span className="text-blue-500 font-black text-[9px] tracking-tighter bg-blue-500/10 px-1.5 py-0.5 rounded-sm">SIGINT</span>
                <span className="truncate leading-tight font-medium">{attack.tmiStatus}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-10 py-16">
            <DashboardIcon className="w-16 h-16 mb-6 animate-pulse" />
            <p className="text-[10px] uppercase tracking-[0.5em] font-black">Awaiting Mission Data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
