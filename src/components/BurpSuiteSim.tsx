
import React, { useState, useEffect, useRef } from 'react';

interface BurpSuiteSimProps {
  onClose: () => void;
  onAction: (action: string, details: string) => void;
}

interface IntruderResult {
  id: number;
  payload: string;
  status: number;
  length: number;
  time: number;
  notes?: string;
}

interface RepeaterTab {
  id: number;
  name: string;
  request: string;
  response: string;
}

const DEFAULT_REQUEST = `POST /login HTTP/1.1
Host: target.local
Content-Type: application/x-www-form-urlencoded
Content-Length: 45

username=admin&password=§password§&csrf=vRy7u92P`;

const DEFAULT_WORDLIST = `password
123456
qwerty
admin
letmein
dragon`;

const BurpSuiteSim: React.FC<BurpSuiteSimProps> = ({ onClose, onAction }) => {
  const [activeTab, setActiveTab] = useState<'Proxy' | 'Repeater' | 'Intruder' | 'Decoder'>('Proxy');
  const [intruderSubTab, setIntruderSubTab] = useState<'Target' | 'Positions' | 'Payloads' | 'Options' | 'Results'>('Positions');
  const [interceptOn, setInterceptOn] = useState(true);
  const [requestBody, setRequestBody] = useState(DEFAULT_REQUEST);
  const [responseBody, setResponseBody] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);

  // Intruder State
  const [intruderRequest, setIntruderRequest] = useState(DEFAULT_REQUEST);
  const [wordlist, setWordlist] = useState(DEFAULT_WORDLIST);
  const [intruderResults, setIntruderResults] = useState<IntruderResult[]>([]);
  const [isIntruding, setIsIntruding] = useState(false);
  const intruderRequestRef = useRef<HTMLTextAreaElement>(null);

  // Repeater State
  const [repeaterTabs, setRepeaterTabs] = useState<RepeaterTab[]>([
    { id: 1, name: '1', request: DEFAULT_REQUEST, response: '' }
  ]);
  const [activeRepeaterTabId, setActiveRepeaterTabId] = useState(1);

  // CSRF Simulation State
  const [requiredCsrfParam, setRequiredCsrfParam] = useState('csrf');
  const [validCsrfValue, setValidCsrfValue] = useState('vRy7u92P');

  const activeRepeaterTab = repeaterTabs.find(t => t.id === activeRepeaterTabId) || repeaterTabs[0];

  const handleForward = () => {
    setIsForwarding(true);
    onAction('Forward Intercepted Request', requestBody);
    
    setTimeout(() => {
      setResponseBody(`HTTP/1.1 200 OK
Server: nginx/1.18.0
Content-Type: text/html; charset=UTF-8
Connection: close

<html>
  <body>
    <h1>Login Successful</h1>
    <p>Welcome back, administrator.</p>
  </body>
</html>`);
      setIsForwarding(false);
    }, 1500);
  };

  const handleRepeaterGo = () => {
    setIsForwarding(true);
    const currentReq = activeRepeaterTab.request;
    onAction(`Repeater Send (Tab ${activeRepeaterTabId})`, currentReq);
    
    const hasValidCsrf = currentReq.includes(`${requiredCsrfParam}=${validCsrfValue}`);
    const isLogin = currentReq.includes('POST /login');

    setTimeout(() => {
      let response = '';
      if (!hasValidCsrf) {
        response = `HTTP/1.1 403 Forbidden
Server: nginx/1.18.0
Content-Type: application/json

{"error": "CSRF token missing or invalid", "code": 403}`;
      } else if (isLogin && currentReq.includes('password=letmein')) {
         response = `HTTP/1.1 200 OK
Server: nginx/1.18.0
Content-Type: text/html
Set-Cookie: session=7b92a1...; HttpOnly

<html><body><h1>Welcome Admin</h1></body></html>`;
      } else {
        response = `HTTP/1.1 401 Unauthorized
Server: nginx/1.18.0
Content-Type: application/json

{"error": "Invalid credentials"}`;
      }

      setRepeaterTabs(prev => prev.map(t => 
        t.id === activeRepeaterTabId ? { ...t, response } : t
      ));
      setIsForwarding(false);
    }, 800);
  };

  const addNewRepeaterTab = () => {
    const nextId = Math.max(...repeaterTabs.map(t => t.id), 0) + 1;
    const newTab: RepeaterTab = {
      id: nextId,
      name: `${nextId}`,
      request: DEFAULT_REQUEST,
      response: ''
    };
    setRepeaterTabs([...repeaterTabs, newTab]);
    setActiveRepeaterTabId(nextId);
  };

  const closeRepeaterTab = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (repeaterTabs.length === 1) return;
    const filtered = repeaterTabs.filter(t => t.id !== id);
    setRepeaterTabs(filtered);
    if (activeRepeaterTabId === id) {
      setActiveRepeaterTabId(filtered[0].id);
    }
  };

  const updateRepeaterRequest = (val: string) => {
    setRepeaterTabs(prev => prev.map(t => 
      t.id === activeRepeaterTabId ? { ...t, request: val } : t
    ));
  };

  const startIntruderAttack = async () => {
    const payloads = wordlist.split('\n').filter(p => p.trim());
    if (payloads.length === 0) return;

    setIsIntruding(true);
    setIntruderResults([]);
    setIntruderSubTab('Results');
    
    onAction('Intruder Attack Started', `Payload count: ${payloads.length}`);

    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      // Simulate network delay
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      
      // Intruder Logic: Replace all §...§ markers with the current payload
      // regex matches § followed by any characters until the next §
      const renderedRequest = intruderRequest.replace(/§.*?§/g, payload);
      
      const hasCsrfParam = renderedRequest.includes(`${requiredCsrfParam}=`);
      const hasValidCsrf = renderedRequest.includes(`${requiredCsrfParam}=${validCsrfValue}`);
      
      let status = 403;
      let length = 452;
      let notes = "";

      if (!hasCsrfParam) {
        status = 403;
        length = 452;
        notes = "CSRF Missing";
      } else if (!hasValidCsrf) {
        status = 403;
        length = 452;
        notes = "CSRF Invalid";
      } else {
        // Simple mock login check: check if the rendered request contains the secret password
        const isSuccess = renderedRequest.includes('password=letmein');
        status = isSuccess ? 200 : 401;
        length = isSuccess ? 1240 : 512;
        notes = isSuccess ? "Payload matched!" : "";
      }

      const result: IntruderResult = {
        id: i + 1,
        payload,
        status,
        length,
        time: Math.floor(10 + Math.random() * 30),
        notes
      };
      
      setIntruderResults(prev => [...prev, result]);
    }

    setIsIntruding(false);
    onAction('Intruder Attack Finished', `Completed ${payloads.length} requests.`);
  };

  const addPayloadMarkers = () => {
    const textarea = intruderRequestRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = intruderRequest;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end);

    setIntruderRequest(`${before}§${selected}§${after}`);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-12 font-sans">
      <div className="w-full max-w-5xl h-full flex flex-col bg-[#e6e6e6] rounded shadow-2xl border border-gray-400 overflow-hidden text-[#222]">
        
        {/* Title Bar */}
        <div className="bg-[#444] text-white p-1.5 flex justify-between items-center text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="bg-orange-500 px-1 rounded text-[10px]">Burp</span>
            <span>Burp Suite Community Edition simulation v2023.12</span>
          </div>
          <button onClick={onClose} className="hover:text-rose-400">✕</button>
        </div>

        {/* Menu Bar */}
        <div className="bg-[#f0f0f0] px-2 py-0.5 flex gap-4 text-[11px] border-b border-gray-300">
          {['Burp', 'Project', 'User', 'Help'].map(m => (
            <span key={m} className="hover:text-blue-700 cursor-pointer">{m}</span>
          ))}
        </div>

        {/* Top Tabs */}
        <div className="bg-[#f0f0f0] flex border-b border-gray-400">
          {['Dashboard', 'Target', 'Proxy', 'Intruder', 'Repeater', 'Sequencer', 'Decoder', 'Comparer', 'Extender'].map(tab => (
            <div 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 text-[11px] cursor-pointer border-r border-gray-300 transition-colors ${activeTab === tab ? 'bg-white font-bold border-b-2 border-b-orange-500' : 'hover:bg-gray-200'}`}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-grow flex flex-col bg-white overflow-hidden">
          {activeTab === 'Proxy' && (
            <div className="flex flex-col h-full">
              <div className="bg-[#f0f0f0] flex border-b border-gray-300">
                {['Intercept', 'HTTP history', 'WebSockets history', 'Options'].map(sub => (
                  <div key={sub} className={`px-4 py-1 text-[10px] border-r border-gray-300 cursor-pointer ${sub === 'Intercept' ? 'bg-white border-t-2 border-t-orange-400' : ''}`}>
                    {sub}
                  </div>
                ))}
              </div>
              <div className="p-2 border-b border-gray-300 flex items-center gap-2 bg-gray-50">
                <button 
                  onClick={handleForward}
                  disabled={!interceptOn || isForwarding}
                  className={`px-3 py-1 text-[11px] rounded border shadow-sm ${interceptOn ? 'bg-white hover:bg-gray-100' : 'bg-gray-200 text-gray-400'}`}
                >
                  Forward
                </button>
                <button className={`px-3 py-1 text-[11px] rounded border shadow-sm ${interceptOn ? 'bg-white hover:bg-gray-100' : 'bg-gray-200 text-gray-400'}`}>Drop</button>
                <button 
                  onClick={() => setInterceptOn(!interceptOn)}
                  className={`px-4 py-1 text-[11px] rounded border font-bold shadow-inner ${interceptOn ? 'bg-orange-100 border-orange-300' : 'bg-gray-200'}`}
                >
                  Intercept is {interceptOn ? 'on' : 'off'}
                </button>
              </div>
              <div className="flex-grow flex overflow-hidden">
                <div className="flex-grow flex flex-col border-r border-gray-300">
                  <div className="bg-gray-100 px-2 py-0.5 text-[10px] font-bold border-b border-gray-300 uppercase text-gray-500">Raw Request</div>
                  <textarea 
                    className="flex-grow p-3 font-mono text-xs focus:outline-none resize-none bg-gray-50"
                    spellCheck={false}
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                  />
                </div>
                <div className="w-1/2 flex flex-col bg-white">
                  <div className="bg-gray-100 px-2 py-0.5 text-[10px] font-bold border-b border-gray-300 uppercase text-gray-500">Server Response</div>
                  <div className="flex-grow p-3 font-mono text-xs overflow-auto whitespace-pre">
                    {isForwarding ? "Waiting for response..." : responseBody}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Intruder' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="bg-[#f0f0f0] flex border-b border-gray-300">
                {['Target', 'Positions', 'Payloads', 'Options', 'Results'].map(sub => (
                  <div 
                    key={sub} 
                    onClick={() => setIntruderSubTab(sub as any)}
                    className={`px-4 py-1 text-[10px] border-r border-gray-300 cursor-pointer ${intruderSubTab === sub ? 'bg-white border-t-2 border-t-orange-400 font-bold' : ''}`}
                  >
                    {sub}
                  </div>
                ))}
              </div>

              <div className="p-2 border-b border-gray-300 flex items-center gap-2 bg-gray-50">
                <button 
                  onClick={startIntruderAttack}
                  disabled={isIntruding}
                  className="px-6 py-1 text-xs bg-orange-500 text-white rounded font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {isIntruding ? 'Attack in progress...' : 'Start attack'}
                </button>
              </div>

              <div className="flex-grow overflow-auto p-4 bg-gray-100">
                {intruderSubTab === 'Positions' && (
                  <div className="bg-white border border-gray-300 rounded h-full flex flex-col">
                    <div className="bg-gray-50 p-2 border-b flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Payload Positions</span>
                      <div className="flex gap-2">
                        <button onClick={() => setIntruderRequest(DEFAULT_REQUEST)} className="text-[10px] bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-100">Reset</button>
                        <button onClick={addPayloadMarkers} className="text-[10px] bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-100">Add §</button>
                      </div>
                    </div>
                    <textarea 
                      ref={intruderRequestRef}
                      className="flex-grow p-3 font-mono text-xs focus:outline-none resize-none bg-white"
                      spellCheck={false}
                      value={intruderRequest}
                      onChange={(e) => setIntruderRequest(e.target.value)}
                    />
                  </div>
                )}

                {intruderSubTab === 'Payloads' && (
                  <div className="max-w-md bg-white border border-gray-300 rounded p-4 h-full flex flex-col">
                    <h4 className="text-[11px] font-bold mb-2">Payload Settings [Simple list]</h4>
                    <p className="text-[10px] text-gray-500 mb-4">Enter passwords for brute-force simulation:</p>
                    <textarea 
                      className="flex-grow p-3 font-mono text-xs border border-gray-200 rounded focus:outline-none resize-none"
                      spellCheck={false}
                      value={wordlist}
                      onChange={(e) => setWordlist(e.target.value)}
                    />
                  </div>
                )}

                {intruderSubTab === 'Options' && (
                   <div className="bg-white border border-gray-300 rounded p-6 h-full">
                      <h4 className="text-[11px] font-bold mb-4">Simulation Options</h4>
                      <div className="space-y-6 max-w-sm">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                           <h5 className="text-[10px] font-bold text-orange-800 uppercase mb-3">CSRF Protection Simulation</h5>
                           <div className="space-y-4">
                              <div>
                                <label className="text-[10px] block text-gray-500 mb-1">Parameter Name:</label>
                                <input 
                                  type="text" 
                                  value={requiredCsrfParam} 
                                  onChange={(e) => setRequiredCsrfParam(e.target.value)}
                                  className="text-xs font-mono border border-gray-300 p-2 w-full bg-white rounded" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] block text-gray-500 mb-1">Valid Token Value:</label>
                                <input 
                                  type="text" 
                                  value={validCsrfValue} 
                                  onChange={(e) => setValidCsrfValue(e.target.value)}
                                  className="text-xs font-mono border border-gray-300 p-2 w-full bg-white rounded" 
                                />
                              </div>
                           </div>
                        </div>
                      </div>
                   </div>
                )}

                {intruderSubTab === 'Results' && (
                  <div className="bg-white border border-gray-300 rounded h-full overflow-hidden flex flex-col">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
                        <tr>
                          <th className="p-2 border-r w-16">Request</th>
                          <th className="p-2 border-r">Payload</th>
                          <th className="p-2 border-r w-20 text-center">Status</th>
                          <th className="p-2 border-r w-24 text-right">Length</th>
                          <th className="p-2 border-r w-20 text-right">Time</th>
                          <th className="p-2 pl-4">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {intruderResults.map((res) => (
                          <tr key={res.id} className="border-b border-gray-100 hover:bg-blue-50">
                            <td className="p-2 border-r text-gray-400 text-center">{res.id}</td>
                            <td className="p-2 border-r font-bold text-blue-600 truncate max-w-[150px]">{res.payload}</td>
                            <td className={`p-2 border-r font-bold text-center ${res.status === 200 ? 'text-emerald-600' : res.status === 403 ? 'text-orange-600' : 'text-rose-500'}`}>
                              {res.status}
                            </td>
                            <td className="p-2 border-r text-right pr-4">{res.length}</td>
                            <td className="p-2 border-r text-right pr-4">{res.time}ms</td>
                            <td className={`p-2 pl-4 text-[10px] ${res.notes && res.notes.includes("matched") ? "text-emerald-600 font-bold" : "text-gray-400"}`}>
                              {res.notes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!isIntruding && intruderResults.length === 0 && (
                      <div className="flex-grow flex items-center justify-center p-12 text-center text-gray-400 text-xs italic">
                        No results available. <br/> Configure payload positions and wordlist, then click "Start attack".
                      </div>
                    )}
                  </div>
                )}
                
                {intruderSubTab === 'Target' && (
                   <div className="bg-white border border-gray-300 rounded p-6">
                      <h4 className="text-[11px] font-bold mb-4">Target Details</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] block text-gray-500 mb-1">Host:</label>
                          <input type="text" readOnly value="target.local" className="text-xs font-mono border border-gray-200 p-2 w-full bg-gray-50" />
                        </div>
                        <div>
                          <label className="text-[10px] block text-gray-500 mb-1">Port:</label>
                          <input type="text" readOnly value="80" className="text-xs font-mono border border-gray-200 p-2 w-24 bg-gray-50" />
                        </div>
                      </div>
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Repeater' && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Repeater Instance Tabs */}
              <div className="bg-[#f0f0f0] flex border-b border-gray-300 items-center">
                {repeaterTabs.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => setActiveRepeaterTabId(t.id)}
                    className={`px-4 py-1.5 text-[10px] border-r border-gray-300 cursor-pointer flex items-center gap-2 group transition-colors ${activeRepeaterTabId === t.id ? 'bg-white border-t-2 border-t-orange-400 font-bold' : 'hover:bg-gray-200'}`}
                  >
                    <span>{t.name}</span>
                    <button 
                      onClick={(e) => closeRepeaterTab(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button 
                  onClick={addNewRepeaterTab}
                  className="px-3 py-1 text-[12px] text-gray-500 hover:text-gray-800 transition-colors"
                >
                  +
                </button>
              </div>

              {/* Action Bar */}
              <div className="p-2 border-b border-gray-300 flex items-center gap-2 bg-gray-50">
                <button 
                  onClick={handleRepeaterGo}
                  disabled={isForwarding}
                  className="px-6 py-1 text-xs bg-orange-500 text-white rounded font-bold hover:bg-orange-600 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  Send
                </button>
                <div className="text-[10px] text-gray-500 font-mono ml-4">Target: http://target.local:80</div>
              </div>

              {/* Repeater Editor View */}
              <div className="flex-grow flex overflow-hidden p-2 gap-2 bg-gray-100">
                 <div className="flex-grow flex flex-col bg-white rounded border border-gray-300 shadow-sm overflow-hidden">
                    <div className="bg-[#f0f0f0] px-2 py-0.5 text-[9px] font-bold border-b border-gray-200 text-gray-500 uppercase">Request</div>
                    <textarea 
                      className="flex-grow p-3 font-mono text-xs focus:outline-none resize-none bg-gray-50/30"
                      spellCheck={false}
                      value={activeRepeaterTab.request}
                      onChange={(e) => updateRepeaterRequest(e.target.value)}
                    />
                 </div>
                 <div className="flex-grow flex flex-col bg-white rounded border border-gray-300 shadow-sm overflow-hidden">
                    <div className="bg-[#f0f0f0] px-2 py-0.5 text-[9px] font-bold border-b border-gray-200 text-gray-500 uppercase">Response</div>
                    <div className="flex-grow p-3 font-mono text-xs overflow-auto whitespace-pre bg-white">
                      {isForwarding ? (
                         <div className="flex items-center gap-2 text-orange-500 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            Waiting for response...
                         </div>
                      ) : (
                        activeRepeaterTab.response || <span className="text-gray-300 italic">No response. Click "Send" to issue request.</span>
                      )}
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-[#f0f0f0] border-t border-gray-400 p-1 flex items-center justify-between text-[10px] text-gray-500">
           <div className="flex gap-4">
              <span>Proxy: Running on 127.0.0.1:8080</span>
              <span>Repeater Tabs: {repeaterTabs.length}</span>
           </div>
           <div className="flex gap-2">
              <span className="text-orange-600 font-bold uppercase">Community Edition</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BurpSuiteSim;
