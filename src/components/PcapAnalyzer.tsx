import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where, getDocs, runTransaction, updateDoc, writeBatch } from 'firebase/firestore';

// --- Global Variables (Provided by Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// The model to use for the Threat Metric Intelligence (TMI) engine
const TMI_MODEL = 'gemini-2.5-flash-preview-09-2025';
const TMI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TMI_MODEL}:generateContent?key=`;

// --- CORE DATA: Forensic Artifacts and Clues for SCEN-004 ---
const forensicArtifacts = [
    // Artifact 1: Contains the date/location clue
    { id: '1', name: 'vacation_pics.zip', type: 'Email Attachment', size: '1.2 GB', status: 'Pending Analysis', 
      metadata: 'Date Taken: 2024-05-15 14:30:00\nGPS Location: 34.0522 N, 118.2437 W (Los Angeles, CA)', 
      clue: 'Geographic Clue: Los Angeles, CA. Date: 2024-05-15.' 
    },
    // Artifact 2: Contains the flag (red herring for now, the flag is in artifact 3)
    { id: '2', name: 'server_logs.txt', type: 'Server Log', size: '2.4 MB', status: 'Pending Analysis', metadata: 'Creation Time: 2024-11-19 09:00:00\nPermissions: RWX\nHash: N/A', clue: 'No EXIF data found. Try analyzing the logs directly.' },
    // Artifact 3: Requires the pcap tool and holds the flag
    { id: '3', name: 'traffic.pcap', type: 'Network Capture', size: '500 MB', status: 'Pending Analysis', 
      metadata: 'Packet Count: 120,000\nProtocol Summary: HTTP, DNS, TLS\nKey String Found: A suspicious DNS request followed by a large HTTP POST.', 
      clue: 'Network traffic analysis required. Filter on suspicious protocols like "dns and http".', 
      correctFilter: 'dns and http', // The required filter string
      finalFlag: 'FLAG{DATA_EXFILTRATION_COMPLETE}' // The final flag
    },
    // Artifact 4: Instructions/Red Herring
    { id: '4', name: 'README.txt', type: 'Instructions', size: '1 KB', status: 'Complete', metadata: 'Created By: Admin\nLast Modified: 2024-11-18', clue: 'Nothing useful here.' },
];


// --- Core Data Structures (Public) ---
const seedScenarios = [
    { id: 'scen-001', name: 'Default: Phishing and Initial Access', description: 'Focus on HTTP/S and basic network activity. High priority on egress connections. Default baseline for Blue Team defenses.', detectionMap: {} },
    { id: 'scen-002', name: 'Advanced: Lateral Movement Evasion', description: 'Blue Team is tuned for persistence and credential dumping. Obfuscation is key. Attacks must bypass specific EDR rules.', detectionMap: {} },
    { id: 'scen-003', name: 'Elite: Credential Harvesting', description: 'Blue Team has excellent network egress monitoring. Focus attacks on local persistence, lateral movement, and memory credential harvesting (e.g., LSASS).', detectionMap: {} },
    { id: 'scen-004', name: 'Forensics: The Insider Threat', description: 'Shift to Blue Team analysis. Investigate forensic artifacts to find a data leak flag.', detectionMap: {} }, 
];

const seedRewards = [
    // THEMES
    { id: 'theme-aegis-classic', type: 'theme', name: 'Aegis Classic Theme', requiredScenarioId: 'none', description: 'The original neon-green Aegis Terminal theme.', themeData: 'aegis-classic' },
    { id: 'theme-solarized-dark', type: 'theme', name: 'Solarized Dark Theme', requiredScenarioId: 'scen-003', description: 'A high-contrast, low-glare theme for late-night operations.', themeData: 'solarized-dark' },
    // LAYOUTS
    { id: 'layout-default', type: 'layout', name: 'Default Metrics Layout', requiredScenarioId: 'none', description: 'The original Red Team metrics dashboard.', layoutData: 'default' },
    { id: 'layout-forensics-split', type: 'layout', name: 'Forensic TUI Split View', requiredScenarioId: 'scen-004', description: 'Replaces the dashboard with a dynamic artifact and metadata viewer TUI.', layoutData: 'forensics-split' },
];

// --- Core Data Structures (Private) ---
const initialUserData = {
    totalEffectiveness: 0,
    attackCount: 0,
    completedScenarios: [], 
    unlockedFeatures: ['theme-aegis-classic', 'layout-default'], 
    history: [],
    cesScore: 100,
    currentScenarioId: 'scen-001',
    currentThemeId: 'theme-aegis-classic', 
    currentLayoutId: 'layout-default',
};

// --- Theme Data Mapping ---
const themeDataMap = {
    'aegis-classic': {
        name: 'Aegis Classic', bg: '#0C1217', surface: '#1B2129', border: '#3A404B', 
        red: '#FF6B6B', blue: '#5B9EFF', green: '#3DFF9F', 
        yellow: '#FFC947', cyan: '#3AFEFF', purple: '#C07AFF',
    },
    'solarized-dark': {
        name: 'Solarized Dark', bg: '#002B36', surface: '#073642', border: '#586E75', 
        red: '#DC322F', blue: '#268BD2', green: '#859900', 
        yellow: '#B58900', cyan: '#2AA198', purple: '#6C71C4',
    }
    // Add more themes here as they are created
};


// --- Helper Functions ---

/**
 * Calculates the Cyber Effectiveness Score (CES) for a single attack.
 * (Red Team mode only)
 */
const calculateIndividualCES = (detection, impact) => {
    if (impact <= 0) return 0;
    const ces = ((100 - detection) / impact) * 100;
    return Math.min(100, Math.round(ces));
};

/**
 * Retries a promise function with exponential backoff.
 */
const withExponentialBackoff = async (fn, retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * (2 ** i)));
        }
    }
};

// --- Custom Components ---

/**
 * The standard Red Team Metrics Dashboard
 */
const MetricsDashboard = ({ scenarios, userData, currentScenario, getScoreColorClass, getStatusBarClass }) => (
    <>
        {/* Scenario Selector */}
        <div className="bg-[--color-bg] rounded-lg p-3 border border-[--color-border]">
            <label htmlFor="scenario-selector" className="text-xs font-semibold text-[--color-purple] block mb-2">Simulation Scenario</label>
            <select
                id="scenario-selector"
                value={currentScenario.id}
                onChange={currentScenario.handleScenarioChange}
                className="w-full bg-[--color-surface] border border-[--color-border] rounded-md p-2 text-sm text-white focus:ring-[--color-green] focus:border-[--color-green] transition duration-200"
            >
                {scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {userData.completedScenarios.includes(s.id) ? ' (COMPLETE)' : ''}</option>
                ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-2 italic">{currentScenario.description}</p>
        </div>

        {/* CES Score Panel */}
        <div className="bg-[--color-bg] rounded-lg p-3 border border-[--color-border]">
            <h2 className="text-sm font-semibold text-[--color-purple] mb-2 border-b border-gray-800 pb-1">Current State Metrics</h2>
            <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-400">Cyber Effectiveness Score (CES)</span>
                <span className={`text-4xl font-extrabold ${getScoreColorClass(userData.cesScore)} transition-colors duration-500`}>{userData.cesScore}%</span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
                {userData.attackCount > 0 ? (
                    <span className={getScoreColorClass(userData.cesScore)}>
                        {userData.cesScore >= 90 ? 'Threat Level: LOW' : userData.cesScore >= 70 ? 'Threat Level: MEDIUM' : 'Threat Level: CRITICAL'}
                    </span>
                ) : (
                    <span>Status: Awaiting First Command</span>
                )}
            </div>
        </div>

        {/* Attack History */}
        <div id="attack-history" className="flex-grow bg-[--color-bg] rounded-lg p-3 border border-[--color-border] overflow-y-auto custom-scrollbar">
            <h2 className="text-sm font-semibold text-[--color-purple] mb-3 border-b border-gray-800 pb-1">Attack History ({userData.attackCount} Total)</h2>
            <div className="space-y-3">
                {userData.history.map((attack) => (
                    <div key={attack.id} className={`${getStatusBarClass(attack.ces)} p-2 rounded-md transition-shadow duration-300`}>
                        <p className={`text-xs font-bold ${getScoreColorClass(attack.ces)}`}>{attack.summary}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                            <span className="text-[--color-cyan]">{attack.mitreId}</span> | Det: {attack.detection}% | Imp: {attack.impact}% | **CES: {attack.ces}%**
                        </p>
                        <p className="text-[10px] italic text-gray-500 mt-1">Cmd: {attack.command.substring(0, 50)}...</p>
                    </div>
                ))}
                {userData.history.length === 0 && <p className="text-xs text-gray-600 italic">No attacks logged yet.</p>}
            </div>
        </div>
    </>
);

/**
 * The new Forensic TUI for analyzing artifacts
 */
const ArtifactViewerTUI = ({ currentScenario, artifacts, extractedMetadata }) => {

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="bg-[--color-bg] rounded-lg p-3 border border-[--color-border]">
                <h2 className="text-sm font-semibold text-[--color-purple] mb-2 border-b border-gray-800 pb-1">FORENSIC WORKSTATION - Artifact List</h2>
                <p className="text-[10px] text-gray-500 italic mt-1">Scenario: {currentScenario.name}</p>
            </div>
            
            {/* Artifact List */}
            <div className="flex-grow bg-[--color-bg] rounded-lg p-3 border border-[--color-border] overflow-y-auto custom-scrollbar">
                <pre className="text-xs text-[--color-cyan] font-mono leading-tight">
                    {"# ID  FILE NAME           TYPE             SIZE     STATUS\n"}
                    {"# --- ------------------- ---------------- -------- --------------\n"}
                    {artifacts.map((a) => {
                        const statusColor = a.status === 'Complete' ? 'text-[--color-green]' : 'text-[--color-yellow]';
                        return (
                            <span key={a.id}>
                                {`${a.id}`.padEnd(4, ' ')}
                                {`${a.name}`.padEnd(20, ' ')}
                                {`${a.type}`.padEnd(17, ' ')}
                                {`${a.size}`.padEnd(9, ' ')}
                                <span className={statusColor}>{a.status}</span>
                                {"\n"}
                            </span>
                        );
                    })}
                </pre>
                <div className="mt-4 text-xs text-gray-400">
                    <p>Commands: <code className="text-[--color-green]">exif &lt;id&gt;</code>, <code className="text-[--color-green]">pcap &lt;id&gt; &lt;filter&gt;</code>.</p>
                    <p>Goal: Find the <code className="text-[--color-yellow]">FLAG{'{...}'}</code> hidden in the data.</p>
                </div>
            </div>

            {/* Extracted Metadata/Timeline */}
            <div className="bg-[--color-bg] rounded-lg p-3 border border-[--color-border] min-h-[150px] max-h-[30vh] overflow-y-auto custom-scrollbar">
                <h3 className="text-xs font-semibold text-[--color-blue] border-b border-gray-800 pb-1 mb-2">EXTRACTED METADATA</h3>
                <pre className="text-xs text-[--color-cyan] whitespace-pre-wrap font-mono">
                    {extractedMetadata || <span className="text-gray-600 italic">Run 'exif &lt;id&gt;' to view metadata here.</span>}
                </pre>
            </div>
        </div>
    );
};

// Main React Component
const App = () => {
    // --- Firebase State ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // --- Application State ---
    const [currentCommand, setCurrentCommand] = useState('');
    const [terminalOutput, setTerminalOutput] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(initialUserData);
    const [scenarios, setScenarios] = useState([]);
    const [rewards, setRewards] = useState([]); 
    const [currentScenario, setCurrentScenario] = useState(seedScenarios[0]);
    const terminalOutputRef = useRef(null);

    // --- NEW FORENSIC STATE ---
    const [forensicState, setForensicState] = useState({
        artifacts: forensicArtifacts,
        extractedMetadata: '',
    });
    
    // --- Firebase Initialization and Auth ---

    // 1. Initialize Firebase and handle authentication
    useEffect(() => {
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is missing.");
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Set session persistence and attempt sign-in
            setPersistence(firebaseAuth, browserSessionPersistence)
                .then(() => {
                    if (initialAuthToken) {
                        return signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        return signInAnonymously(firebaseAuth);
                    }
                })
                .catch((error) => {
                    console.error("Authentication failed:", error);
                });

            // Set up Auth State Listener
            const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                    // Initial message display should wait for user data to load
                } else {
                    setUserId(null);
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
            setIsAuthReady(true);
        }
    }, []);

    // 2. Seed default data if it doesn't exist
    const seedNewData = useCallback(async (dbInstance, uid) => {
        const userDocRef = doc(dbInstance, `/artifacts/${appId}/users/${uid}/data/metrics`);
        const docSnap = await getDocs(collection(dbInstance, `/artifacts/${appId}/users/${uid}/data`));
        
        if (docSnap.empty) {
            console.log("Seeding initial user data...");
            await setDoc(userDocRef, initialUserData);
        }
    }, []);

    // 3. User data listener (metrics, history, scenario, theme)
    useEffect(() => {
        if (db && userId && isAuthReady) {
            seedNewData(db, userId); 
            
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/data/metrics`);
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    
                    const currentScen = seedScenarios.find(s => s.id === data.currentScenarioId);
                    if (currentScen) {
                        setCurrentScenario(currentScen);
                    }

                    if (terminalOutput.length === 0) {
                         setTerminalOutput([
                            `Welcome, user ${userId}.`,
                            `System: Aegis Terminal v1.4 ready.`,
                            `System: Scenario loaded: ${currentScen ? currentScen.name : 'N/A'}.`,
                            `System: Type 'sys help' for system commands.`
                        ]);
                    }
                }
            }, (error) => {
                console.error("Error listening to user data:", error);
            });
            return () => unsubscribe();
        }
    }, [db, userId, isAuthReady, seedNewData]);

    // 4. Public data listener (scenarios, rewards)
    useEffect(() => {
        if (db && isAuthReady) {
            const scenariosRef = collection(db, `/artifacts/${appId}/public/data/scenarios`);
            const rewardsRef = collection(db, `/artifacts/${appId}/public/data/rewards`);
            
            const seedPublicData = async () => {
                const batch = writeBatch(db);
                
                if ((await getDocs(scenariosRef)).empty) {
                    seedScenarios.forEach(s => batch.set(doc(scenariosRef, s.id), s));
                }
                if ((await getDocs(rewardsRef)).empty) {
                    seedRewards.forEach(r => batch.set(doc(rewardsRef, r.id), r));
                }
                await batch.commit();
            };

            const unsubscribeScenarios = onSnapshot(scenariosRef, (snapshot) => {
                setScenarios(snapshot.docs.map(doc => doc.data()));
            });
            const unsubscribeRewards = onSnapshot(rewardsRef, (snapshot) => {
                setRewards(snapshot.docs.map(doc => doc.data()));
            });

            seedPublicData();

            return () => {
                unsubscribeScenarios();
                unsubscribeRewards();
            };
        }
    }, [db, isAuthReady]);

    // Scroll to bottom on output change
    useEffect(() => {
        if (terminalOutputRef.current) {
            terminalOutputRef.current.scrollTop = terminalOutputRef.current.scrollHeight;
        }
    }, [terminalOutput, loading]);

    // --- TMI Engine & Command Processing ---

    // Simplified TMI engine call (always returns a placeholder response for Red Team mode)
    const callTmiEngine = useCallback(async (command, scenario) => { 
        return {
            detectionScore: 50 + Math.floor(Math.random() * 50),
            impactScore: 50 + Math.floor(Math.random() * 50),
            mitreId: 'T1059.003 (PowerShell)',
            summary: `Simulated analysis of '${command}'. The system registered a medium-impact exploit attempt.`,
            remediation: 'Patch CVE-2024-XXXX and enforce least privilege principles.',
        };
    }, []); 

    const handleSysCommand = async (command, args) => {
        const cmd = args[0];
        const subCmd = args[1];
        let message = '';
        const userDocRef = doc(db, `/artifacts/${appId}/users/${userId}/data/metrics`);
        
        if (cmd === 'help') {
            message = [
                'System: Available Commands:',
                '- sys help (Displays this help)',
                '- sys upgrade <feature_id> (Unlocks a feature from rewards)',
                '- sys theme <theme_id> (Applies an unlocked theme)',
                '- sys layout <layout_id> (Switches main panel view)',
                '- Red Team: Any command (e.g., "exec powershell -c bypass") to run a simulation against the current scenario.',
                '- Blue Team (SCEN-004): use `exif <id>` and `pcap <id> <filter>`.'
            ].join('\n');
        } else if (cmd === 'upgrade' || cmd === 'theme' || cmd === 'layout') {
            message = `System: Command '${cmd}' is temporarily disabled for this version (v1.5).`;
        } else {
            message = `System: Unknown command 'sys ${cmd}'. Type 'sys help'.`;
        }
        
        setTerminalOutput(prev => [...prev, message]);
    };

    /**
     * Handles Blue Team forensics commands for SCEN-004.
     */
    const handleForensicsCommand = async (command, args) => {
        const cmd = args[0];
        const artifactId = args[1];
        let message = '';
        
        // --- EXIFTOOL Logic ---
        if (cmd === 'exif') {
            if (!artifactId) {
                message = 'System: ERROR: Usage: exif <artifact_id>';
            } else {
                const artifact = forensicState.artifacts.find(a => a.id === artifactId);
                
                if (!artifact) {
                    message = `System: ERROR: Artifact ID '${artifactId}' not found.`;
                } else {
                    // Success: Extract and display metadata
                    setForensicState(prev => ({
                        ...prev,
                        extractedMetadata: artifact.metadata
                    }));
                    
                    message = [
                        `Tool: **EXIFTOOL** executed on artifact ID ${artifactId} (${artifact.name}).`,
                        `Tool: Extracted Clue: ${artifact.clue}`,
                        `Tool: Full metadata payload loaded to artifact viewer panel.`
                    ].join('\n');
                }
            }
        } 
        
        // --- PCAP ANALYZER Logic (New) ---
        else if (cmd === 'pcap') {
            const filterString = args.slice(2).join(' ').toLowerCase().trim();
            
            if (!artifactId || !filterString) {
                message = 'System: ERROR: Usage: pcap <artifact_id> <filter_string>';
            } else {
                const artifact = forensicState.artifacts.find(a => a.id === artifactId);

                if (!artifact) {
                    message = `System: ERROR: Artifact ID '${artifactId}' not found.`;
                } else if (artifactId !== '3') {
                    message = `Tool: PCAP Analyzer is designed for network captures (ID 3). Use 'exif' on this artifact first.`;
                } else {
                    // Target artifact ID '3'
                    const targetFilter = artifact.correctFilter.toLowerCase().trim();
                    
                    if (filterString === targetFilter) {
                        // --- SUCCESS: FLAG FOUND ---
                        const flag = artifact.finalFlag;
                        message = [
                            `Tool: **PCAP ANALYZER** - Filter applied: '${targetFilter}'`,
                            `Tool: **SUCCESS** - A single suspicious session matched the filter.`,
                            `Tool: DATA EXFILTRATION SESSION FOUND!`,
                            `==================================================`,
                            `|| FINAL FLAG: ${flag} ||`,
                            `==================================================`,
                        ].join('\n');
                        
                        // Mark Scenario 004 as complete in Firestore
                        const scenarioId = 'scen-004';
                        if (!userData.completedScenarios.includes(scenarioId)) {
                            const userDocRef = doc(db, `/artifacts/${appId}/users/${userId}/data/metrics`);
                            await runTransaction(db, async (transaction) => {
                                const docSnap = await transaction.get(userDocRef);
                                const currentData = docSnap.exists() ? docSnap.data() : initialUserData;
                                
                                const updatedCompletedScenarios = [...(currentData.completedScenarios || []), scenarioId];
                                
                                transaction.update(userDocRef, {
                                    completedScenarios: updatedCompletedScenarios,
                                });
                                
                                // Update status of artifact 3 in local state
                                setForensicState(prev => ({
                                    ...prev,
                                    artifacts: prev.artifacts.map(a => 
                                        a.id === '3' ? { ...a, status: 'Complete' } : a
                                    ),
                                }));
                            });
                            message += '\nSystem: **SCENARIO COMPLETE** - Insider Threat Forensics finished!';
                        } else {
                             message += '\nSystem: Scenario already marked as complete.';
                        }

                    } else {
                        // --- FAILURE: WRONG FILTER ---
                        message = [
                            `Tool: **PCAP ANALYZER** - Filter applied: '${filterString}'`,
                            `Tool: **NO RESULTS** - Filter returned zero packets. Try adjusting the protocol or connection parameters (e.g., protocols, source/dest IP).`,
                            `Tool: Hint: Look for anomalous sequences (e.g., DNS resolution followed by bulk HTTP transfer).`
                        ].join('\n');
                    }
                }
            }
        } 
        
        // --- Unknown Forensics Command ---
        else {
            message = `System: ERROR: Unknown forensics command '${cmd}'. Try 'exif <id>' or 'pcap <id> <filter>'.`;
        }

        setTerminalOutput(prev => [...prev, message]);
    };


    const processCommand = async () => {
        if (!currentCommand || loading || !db || !userId) return;

        const commandToProcess = currentCommand.trim();
        setCurrentCommand('');
        setLoading(true);

        const newOutput = [`user@aegis:~$ ${commandToProcess}`];
        setTerminalOutput(prev => [...prev, ...newOutput]);

        const parts = commandToProcess.split(' ');
        const isForensicsMode = currentScenario.id === 'scen-004';
        
        // --- Command Routing ---
        if (parts[0] === 'sys') {
            await handleSysCommand(commandToProcess, parts.slice(1));
        } 
        else if (isForensicsMode) {
            // --- Blue Team Command ---
            await handleForensicsCommand(commandToProcess, parts);
        }
        else {
            // --- Red Team Command (Send to TMI Engine) ---
            setTerminalOutput(prev => [...prev, 'TMI ANALYZING... (Querying LLM for CTI)']);
            try {
                const ctiData = await callTmiEngine(commandToProcess, currentScenario);
                const { detectionScore, impactScore, mitreId, summary, remediation } = ctiData;
                
                const individualCES = calculateIndividualCES(detectionScore, impactScore);

                const isScenarioCompleted = individualCES <= 70; 

                const newAttack = {
                    command: commandToProcess,
                    timestamp: new Date().toISOString(),
                    detection: detectionScore,
                    impact: impactScore,
                    ces: individualCES,
                    mitreId: mitreId,
                    summary: summary,
                    remediation: remediation,
                    id: crypto.randomUUID(),
                    scenarioId: currentScenario.id, 
                };

                // Update Firestore via Transaction
                const userDocRef = doc(db, `/artifacts/${appId}/users/${userId}/data/metrics`);
                await runTransaction(db, async (transaction) => {
                    const docSnap = await transaction.get(userDocRef);
                    const currentData = docSnap.exists() ? docSnap.data() : initialUserData;

                    const updatedAttackCount = currentData.attackCount + 1;
                    const updatedTotalEffectiveness = currentData.totalEffectiveness + individualCES;
                    const overallCES = Math.round(updatedTotalEffectiveness / updatedAttackCount);
                    const updatedHistory = [newAttack, ...(currentData.history || [])].slice(0, 20);
                    
                    let updatedCompletedScenarios = currentData.completedScenarios || [];
                    if (isScenarioCompleted && !updatedCompletedScenarios.includes(currentScenario.id)) {
                        updatedCompletedScenarios = [...updatedCompletedScenarios, currentScenario.id];
                        setTerminalOutput(prev => [...prev, `System: **SCENARIO COMPLETE** - ${currentScenario.name}!`]);
                    }

                    transaction.update(userDocRef, {
                        attackCount: updatedAttackCount,
                        totalEffectiveness: updatedTotalEffectiveness,
                        cesScore: overallCES,
                        history: updatedHistory,
                        completedScenarios: updatedCompletedScenarios,
                    });
                });

                // Update Terminal Output with CTI Results
                const ctiOutput = [
                    summary,
                    `MITRE ATT&CK: ${mitreId}`,
                    `Detection Chance: ${detectionScore}% | Impact Score: ${impactScore}%`,
                    `Individual CES: ${individualCES}%`,
                    `Remediation: ${remediation}`,
                    'System: Action logged.'
                ];
                setTerminalOutput(prev => [...prev, ...ctiOutput]);

            } catch (error) {
                console.error("TMI Processing Error:", error);
                setTerminalOutput(prev => [...prev, `System Error: Failed to process command. (${error.message})`]);
            }
        }
        
        setLoading(false);
    };

    // --- User Interface Handlers & Logic (Same as before) ---

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            processCommand();
        }
    };

    const handleScenarioChange = async (e) => {
        const newScenarioId = e.target.value;
        const selectedScenario = scenarios.find(s => s.id === newScenarioId);
        
        if (selectedScenario) {
            setCurrentScenario(selectedScenario);
            setTerminalOutput(prev => [
                ...prev, 
                `System: Scenario changed to '${selectedScenario.name}'.`,
                `System: Context: ${selectedScenario.description}`
            ]);
            
            if (db && userId) {
                try {
                    const userDocRef = doc(db, `/artifacts/${appId}/users/${userId}/data/metrics`);
                    await updateDoc(userDocRef, { currentScenarioId: newScenarioId });
                } catch (e) {
                    console.error("Error updating scenario ID in Firestore:", e);
                }
            }
        }
    };

    const getScoreColorClass = (score) => {
        if (score >= 90) return 'text-[--color-green]';
        if (score >= 70) return 'text-[--color-yellow]';
        return 'text-[--color-red]';
    };

    const getStatusBarClass = (score) => {
        if (score >= 90) return 'status-bar-success';
        if (score >= 70) return 'status-bar-info';
        return 'status-bar-danger';
    };
    
    // Determine which dashboard/TUI to show
    const isDefaultLayout = userData.currentLayoutId === 'layout-default';

    // --- Dynamic Theme Application ---
    const activeThemeId = userData.currentThemeId || 'theme-aegis-classic';
    const activeThemeData = themeDataMap[activeThemeId] || themeDataMap['aegis-classic'];

    if (!isAuthReady) {
        return (
            <div className="min-h-screen bg-[--color-bg] flex items-center justify-center">
                <p className="text-[--color-cyan] font-mono text-lg">Initializing Aegis Terminal...</p>
            </div>
        );
    }
    
    // --- Render Component ---
    return (
        <div className="min-h-screen bg-[--color-bg] flex justify-center items-center p-4">
            
            {/* Dynamic Custom CSS for variables, keyframes, and scrollbars */}
            <style jsx="true">{`
                :root {
                    --color-bg: ${activeThemeData.bg};
                    --color-surface: ${activeThemeData.surface};
                    --color-border: ${activeThemeData.border};
                    --color-red: ${activeThemeData.red};
                    --color-blue: ${activeThemeData.blue};
                    --color-green: ${activeThemeData.green};
                    --color-yellow: ${activeThemeData.yellow};
                    --color-cyan: ${activeThemeData.cyan};
                    --color-purple: ${activeThemeData.purple};
                }

                /* Custom Scrollbar (uses dynamic variables) */
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: var(--color-surface); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-cyan); }

                /* TMI Loading Animation (Packet Trace) - uses dynamic colors */
                @keyframes trace {
                    0% { content: '|...'; color: var(--color-yellow); }
                    25% { content: '.|..'; color: var(--color-yellow); }
                    50% { content: '..|. (LLM Processing)'; color: var(--color-cyan); }
                    75% { content: '...| (Awaiting CTI)'; color: var(--color-red); }
                    100% { content: '|...'; color: var(--color-yellow); }
                }
                .trace-anim::before {
                    content: '|...'; 
                    display: inline-block;
                    animation: trace 1.5s infinite steps(4);
                    font-family: 'Fira Code', monospace;
                }

                /* Input Focus Glow - uses dynamic colors */
                .input-glow:focus {
                    outline: none;
                    box-shadow: 0 0 10px ${activeThemeData.green}50, 0 0 5px ${activeThemeData.green}30;
                    border-color: var(--color-green);
                }
                
                /* Select element styling */
                #scenario-selector {
                    -webkit-appearance: none; -moz-appearance: none; appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%239CA3AF'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 0.5rem center;
                    background-size: 1.5em 1.5em;
                }
                
                /* Status bar styles */
                .status-bar-danger {
                    background-color: ${activeThemeData.red}1A; /* 10% opacity */
                    border-left: 4px solid var(--color-red);
                }
                .status-bar-info {
                    background-color: ${activeThemeData.blue}1A;
                    border-left: 4px solid var(--color-blue);
                }
                .status-bar-success {
                    background-color: ${activeThemeData.green}1A;
                    border-left: 4px solid var(--color-green);
                }
            `}</style>

            <div 
                id="app-container" 
                className="flex flex-col lg:flex-row w-full max-w-7xl h-[95vh] bg-[--color-surface] rounded-xl shadow-2xl shadow-black/70 border border-[--color-border] overflow-hidden transition-all duration-300"
            >
                {/* -------------------- Terminal Panel (2/3 Width) -------------------- */}
                <div className={`w-full ${isDefaultLayout ? 'lg:w-2/3' : 'lg:w-2/3'} flex flex-col p-4 border-b lg:border-r lg:border-b-0 border-[--color-border] font-mono transition-all duration-300`}>
                    
                    {/* Header */}
                    <div className="mb-4 pb-2 flex justify-between items-center border-b border-[--color-border]">
                        <h1 className="text-xl font-bold text-[--color-cyan]">AEGIS TERMINAL v1.5 <span className="text-gray-500 text-sm ml-2">Purple Team Simulation</span></h1>
                        <span className="text-xs text-gray-500 font-sans">User ID: <span className="text-[--color-blue]">{userId || 'Connecting...'}</span> | Layout: <span className="text-[--color-purple]">{userData.currentLayoutId}</span></span>
                    </div>

                    {/* Output Area */}
                    <div ref={terminalOutputRef} id="terminal-output" className="flex-grow overflow-y-auto custom-scrollbar text-sm text-[#E6EDF3] leading-relaxed mb-4">
                        <pre className="whitespace-pre-wrap">
                            {terminalOutput.map((line, index) => {
                                let colorClass = 'text-[#E6EDF3]';
                                if (line.includes('user@aegis:~$')) colorClass = 'text-[--color-green]';
                                else if (line.includes('System Error:') || line.includes('CRITICAL ALERT') || line.includes('FINAL FLAG:')) colorClass = 'text-[--color-red]';
                                else if (line.includes('TMI ANALYZING...')) colorClass = 'text-[--color-yellow]';
                                else if (line.includes('MITRE ATT&CK:') || line.includes('SCENARIO COMPLETE') || line.includes('Tool:')) colorClass = 'text-[--color-cyan]';
                                else if (line.includes('System:')) colorClass = 'text-[--color-blue]';
                                
                                return (
                                    <span key={index} className={colorClass}>
                                        {line}
                                        {index === terminalOutput.length - 1 && loading && <span className="trace-anim ml-2 font-normal text-xs text-[--color-yellow]"></span>}
                                        {'\n'}
                                    </span>
                                );
                            })}
                        </pre>
                    </div>

                    {/* Input Area */}
                    <div className="flex items-center">
                        <span className="text-[--color-green] font-bold text-sm lg:text-base mr-2 whitespace-nowrap">user@aegis:~$</span>
                        <input
                            id="terminal-input"
                            type="text"
                            value={currentCommand}
                            onChange={(e) => setCurrentCommand(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            className={`input-glow flex-grow bg-transparent border-b border-[--color-border] p-1 text-sm lg:text-base text-white transition duration-200 font-mono ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder={loading ? "Analyzing command..." : "Enter command, e.g., 'pcap 3 dns and http'"}
                        />
                    </div>
                </div>

                {/* -------------------- Dashboard/TUI Panel (1/3 Width) -------------------- */}
                <div className="w-full lg:w-1/3 p-4 flex flex-col gap-4 transition-all duration-300">
                    
                    {isDefaultLayout ? (
                        // Red Team Metrics Dashboard
                        <MetricsDashboard 
                            scenarios={scenarios} 
                            userData={userData} 
                            currentScenario={{...currentScenario, handleScenarioChange}}
                            getScoreColorClass={getScoreColorClass}
                            getStatusBarClass={getStatusBarClass}
                        />
                    ) : (
                        // Forensic TUI Split View
                        <ArtifactViewerTUI 
                            currentScenario={currentScenario} 
                            artifacts={forensicState.artifacts}
                            extractedMetadata={forensicState.extractedMetadata}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;