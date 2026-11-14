import React, { useState } from 'react';

// Define a common color theme
const colors = {
  green: '#00ff41',
  black: '#1a1a1a',
  yellow: '#ffff00',
  red: '#ff0041',
};

// Main App Component
const App = () => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'win', 'lose'
  const [message, setMessage] = useState('Welcome, Agent.');

  const handleStartGame = () => {
    setGameState('playing');
    setMessage('Access Granted. Find the hidden FLAG.');
  };

  const renderContent = () => {
    switch (gameState) {
      case 'menu':
        return (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6 text-[--color-green]">// HACKER TERMINAL V1.0 //</h1>
            <p className="mb-8 text-[--color-yellow]">Initiate protocol 'AURORA'.</p>
            <button
              onClick={handleStartGame}
              className="px-6 py-3 bg-[--color-green] text-black font-semibold rounded-lg shadow-lg hover:bg-opacity-80 transition duration-300"
            >
              START HACKING
            </button>
          </div>
        );
      case 'playing':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-mono text-[--color-red]">Processing Data Stream...</h2>
            <div className="bg-[--color-black] p-4 rounded-lg border border-[--color-green] shadow-inner">
              <p className="font-mono text-[--color-green] overflow-auto max-h-80">
                {/* Simulated Data Stream */}
                {Array.from({ length: 150 }).map((_, i) => (
                  <span key={i} className="opacity-75">
                    0x{i.toString(16).padStart(4, '0')} F0 DE AD BE EF F0 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F{' '}
                  </span>
                ))}
              </p>
            </div>

            <p className="text-xl text-[--color-yellow] pt-4">
              Look for the signal pattern: <code className="text-[--color-yellow]">0xBADF00D</code>
            </p>

            <p className="text-sm text-[--color-green]">
              Security Tip: The payload contains a marker: <code className="text-[--color-yellow]">{'FLAG{...}'}</code> hidden in the data.
            </p>

            <button
              onClick={() => setMessage("Scanning... Found nothing yet.")}
              className="mt-6 px-4 py-2 bg-[--color-red] text-white font-semibold rounded-lg hover:bg-opacity-80 transition duration-300"
            >
              SCAN FOR FLAG
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4" style={{
      '--color-green': colors.green,
      '--color-black': colors.black,
      '--color-yellow': colors.yellow,
      '--color-red': colors.red,
      fontFamily: '"Inter", monospace',
    }}>
      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-xl shadow-2xl border border-[--color-green] text-white space-y-4">
        <div className="text-lg text-[--color-green] font-mono border-b border-[--color-green] pb-2 mb-4">
          Status: {message}
        </div>
        {renderContent()}
        <div className="text-xs text-gray-500 pt-4 border-t border-[--color-green] mt-4">
          // END OF SESSION //
        </div>
      </div>
    </div>
  );
};

export default App;