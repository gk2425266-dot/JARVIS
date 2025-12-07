import React, { useState, useEffect, useRef } from 'react';
import { ConnectionState, AssistantMode } from './types';
import { LiveClient } from './services/liveClient';
import JarvisVisualizer from './components/JarvisVisualizer';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.IDLE);
  const [volume, setVolume] = useState(0);
  const [assistantMode, setAssistantMode] = useState<AssistantMode>(AssistantMode.GENERAL);
  const liveClientRef = useRef<LiveClient | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize client on mount (but don't connect yet)
  useEffect(() => {
    // Only set up if API key exists
    if (!process.env.API_KEY) {
      setErrorMsg("System Alert: API Key not detected in environment.");
      return;
    }
  }, []);

  const handleStartRequest = () => {
    setConnectionState(ConnectionState.REQUESTING_PERMISSION);
  };

  const handlePermissionGranted = async () => {
    if (!process.env.API_KEY) return;

    setConnectionState(ConnectionState.CONNECTING);
    setAssistantMode(AssistantMode.GENERAL); // Reset mode on new connection
    
    const client = new LiveClient(process.env.API_KEY);
    liveClientRef.current = client;

    await client.connect({
      onOpen: () => {
        setConnectionState(ConnectionState.CONNECTED);
      },
      onClose: () => {
        setConnectionState(ConnectionState.IDLE);
        setVolume(0);
        setAssistantMode(AssistantMode.GENERAL);
      },
      onError: (err) => {
        console.error(err);
        setConnectionState(ConnectionState.ERROR);
        setErrorMsg("Connection Error: " + (err instanceof Error ? err.message : String(err)));
      },
      onAudioData: (vol) => {
        setVolume(vol);
      },
      onModeChange: (mode) => {
        setAssistantMode(mode);
      }
    });
  };

  const handleDisconnect = async () => {
    if (liveClientRef.current) {
      await liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setConnectionState(ConnectionState.IDLE);
    setVolume(0);
    setAssistantMode(AssistantMode.GENERAL);
  };

  // Helper for background gradients
  const getBgClass = () => {
    if (assistantMode === AssistantMode.HOMEWORK) return 'from-purple-900 via-black to-black';
    if (assistantMode === AssistantMode.GK_QUIZ) return 'from-amber-900 via-black to-black';
    if (assistantMode === AssistantMode.SCIENCE) return 'from-emerald-900 via-black to-black';
    return 'from-gray-900 via-black to-black';
  };

  // Helper for text colors
  const getTextClass = () => {
    if (assistantMode === AssistantMode.HOMEWORK) return 'text-purple-300';
    if (assistantMode === AssistantMode.GK_QUIZ) return 'text-amber-400';
    if (assistantMode === AssistantMode.SCIENCE) return 'text-emerald-300';
    return 'text-cyan-300';
  };

  // Helper for indicator light
  const getIndicatorClass = () => {
    if (assistantMode === AssistantMode.HOMEWORK) return 'bg-purple-400 shadow-[0_0_10px_#c084fc]';
    if (assistantMode === AssistantMode.GK_QUIZ) return 'bg-amber-400 shadow-[0_0_10px_#fbbf24]';
    if (assistantMode === AssistantMode.SCIENCE) return 'bg-emerald-400 shadow-[0_0_10px_#34d399]';
    return 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]';
  };

  return (
    <div className="min-h-screen bg-black text-cyan-50 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${getBgClass()} -z-10 transition-colors duration-1000`}></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Header */}
      <header className="absolute top-8 w-full flex justify-between px-10 items-center">
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionState === ConnectionState.CONNECTED ? getIndicatorClass() : 'bg-red-500'}`}></div>
            <span className={`font-mono text-sm tracking-widest ${getTextClass()}`}>J.A.R.V.I.S. SYSTEM</span>
        </div>
        <div className="font-mono text-xs text-gray-500">
           V.2.6.0 // ONLINE
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center z-10 w-full max-w-2xl px-4">
        
        <div className="mb-12 scale-125 transition-transform duration-500">
          <JarvisVisualizer 
            isActive={connectionState === ConnectionState.CONNECTED} 
            volume={volume}
            mode={assistantMode}
          />
        </div>

        <div className="text-center min-h-[120px]">
          {connectionState === ConnectionState.IDLE && (
            <div className="space-y-4">
               <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-500 mb-4">
                PROTOCOL INITIATED
              </h1>
              <p className="text-gray-400 max-w-md mx-auto mb-8">
                System standing by. Authorization required to access auditory input sensors.
              </p>
              <button 
                onClick={handleStartRequest}
                className="group relative px-8 py-3 bg-transparent border border-cyan-500/50 text-cyan-400 font-mono tracking-wider hover:bg-cyan-500/10 transition-all duration-300 uppercase clip-path-polygon"
              >
                <span className="absolute inset-0 w-full h-full bg-cyan-400/10 blur opacity-0 group-hover:opacity-100 transition-opacity"></span>
                Initialize Jarvis
              </button>
            </div>
          )}

          {connectionState === ConnectionState.REQUESTING_PERMISSION && (
            <div className="animate-fade-in p-6 border border-cyan-800/50 bg-gray-900/50 backdrop-blur-md rounded-lg max-w-md mx-auto">
               <h2 className="text-xl font-bold text-cyan-400 mb-4">ACCESS REQUEST</h2>
               <p className="text-lg mb-6">"Would you like me to start listening?"</p>
               <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setConnectionState(ConnectionState.IDLE)}
                    className="px-6 py-2 border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-colors font-mono"
                  >
                    DENY
                  </button>
                  <button 
                    onClick={handlePermissionGranted}
                    className="px-6 py-2 bg-cyan-600 text-black font-bold hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all font-mono"
                  >
                    CONFIRM
                  </button>
               </div>
            </div>
          )}

          {connectionState === ConnectionState.CONNECTING && (
             <div className="flex flex-col items-center gap-4">
                <div className="w-64 h-1 bg-gray-800 rounded overflow-hidden">
                    <div className="h-full bg-cyan-500 animate-[loading_1.5s_ease-in-out_infinite] w-1/2"></div>
                </div>
                <span className="font-mono text-cyan-400 animate-pulse">ESTABLISHING UPLINK...</span>
             </div>
          )}

          {connectionState === ConnectionState.CONNECTED && (
             <div className="flex flex-col items-center gap-6">
                <p className={`text-xl font-light tracking-wide transition-colors duration-500 
                  ${assistantMode === AssistantMode.HOMEWORK ? 'text-purple-100' : 
                    (assistantMode === AssistantMode.GK_QUIZ ? 'text-amber-100' : 
                    (assistantMode === AssistantMode.SCIENCE ? 'text-emerald-100' : 'text-cyan-100'))}`}>
                  {assistantMode === AssistantMode.HOMEWORK && "\"Homework Protocol active. State your subject.\""}
                  {assistantMode === AssistantMode.GK_QUIZ && "\"GK Database loaded. Ready for questions.\""}
                  {assistantMode === AssistantMode.SCIENCE && "\"Science Lab initialized. Ready for analysis.\""}
                  {assistantMode === AssistantMode.GENERAL && "\"I am listening. How can I assist you?\""}
                </p>
                <div className="flex gap-4 mt-4">
                    <button 
                      className={`px-4 py-2 text-xs border font-mono transition-all duration-300
                        ${assistantMode === AssistantMode.HOMEWORK 
                          ? 'border-purple-500 text-purple-300 bg-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                          : 'border-gray-700 text-gray-400 opacity-50'}`}
                    >
                      HOMEWORK
                    </button>
                    <button 
                       className={`px-4 py-2 text-xs border font-mono transition-all duration-300
                        ${assistantMode === AssistantMode.GK_QUIZ 
                          ? 'border-amber-500 text-amber-300 bg-amber-900/20 shadow-[0_0_15px_rgba(251,191,36,0.4)]' 
                          : 'border-gray-700 text-gray-400 opacity-50'}`}
                    >
                      GK QUIZ
                    </button>
                    <button 
                       className={`px-4 py-2 text-xs border font-mono transition-all duration-300
                        ${assistantMode === AssistantMode.SCIENCE 
                          ? 'border-emerald-500 text-emerald-300 bg-emerald-900/20 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                          : 'border-gray-700 text-gray-400 opacity-50'}`}
                    >
                      SCIENCE
                    </button>
                </div>
                
                <button 
                  onClick={handleDisconnect}
                  className="mt-8 px-6 py-2 border border-red-500/30 text-red-400/80 hover:bg-red-900/20 hover:text-red-300 hover:border-red-500 transition-all font-mono text-sm tracking-widest"
                >
                  TERMINATE SESSION
                </button>
             </div>
          )}

          {connectionState === ConnectionState.ERROR && (
             <div className="text-red-400 border border-red-900/50 p-4 bg-red-900/10 rounded">
                <p className="font-mono font-bold">SYSTEM ERROR</p>
                <p className="text-sm mt-2">{errorMsg || "Unknown error occurred"}</p>
                <button 
                  onClick={() => {
                    setErrorMsg(null);
                    setConnectionState(ConnectionState.IDLE);
                  }}
                  className="mt-4 text-xs underline hover:text-red-200"
                >
                  REBOOT SYSTEM
                </button>
             </div>
          )}
        </div>
      </main>

      {/* Footer / HUD elements */}
      <footer className="absolute bottom-6 w-full px-10 flex justify-between text-[10px] text-cyan-900 font-mono">
         <div className="flex flex-col gap-1">
            <span>MEM: 64TB</span>
            <span>CPU: OPTIMAL</span>
            <span className={assistantMode === AssistantMode.HOMEWORK ? 'text-purple-500' : (assistantMode === AssistantMode.GK_QUIZ ? 'text-amber-500' : (assistantMode === AssistantMode.SCIENCE ? 'text-emerald-500' : ''))}>
                MODE: {assistantMode}
            </span>
         </div>
         <div className="flex flex-col gap-1 text-right">
            <span>LOC: 34.0522 N, 118.2437 W</span>
            <span>SECURE CHANNEL</span>
            <span className="text-cyan-700">DEV: ANSH RAJ</span>
         </div>
      </footer>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default App;