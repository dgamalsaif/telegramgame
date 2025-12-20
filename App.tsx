
import React, { useState, useEffect, useRef } from 'react';
import { executeDeepRecon } from './services/geminiService';
import { IntelligenceSignal, SearchResult, Platform, PlatformType, SearchParams } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchParams['searchType']>('deep-scan');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [activeTab, setActiveTab] = useState<'signals' | 'sources'>('signals');
  const terminalRef = useRef<HTMLDivElement>(null);

  const [platforms, setPlatforms] = useState<Platform[]>([
    { id: 'tg', name: 'Telegram', icon: 'fa-brands fa-telegram', connected: true, color: 'text-sky-400' },
    { id: 'wa', name: 'WhatsApp', icon: 'fa-brands fa-whatsapp', connected: true, color: 'text-emerald-400' },
    { id: 'dc', name: 'Discord', icon: 'fa-brands fa-discord', connected: true, color: 'text-indigo-400' },
    { id: 'x', name: 'X', icon: 'fa-brands fa-x-twitter', connected: false, color: 'text-white' },
    { id: 'fb', name: 'Facebook', icon: 'fa-brands fa-facebook', connected: false, color: 'text-blue-600' },
    { id: 'li', name: 'LinkedIn', icon: 'fa-brands fa-linkedin', connected: false, color: 'text-blue-500' },
    { id: 'sl', name: 'Signal', icon: 'fa-solid fa-comment-dots', connected: false, color: 'text-blue-300' }
  ]);

  const activePlatformNames = platforms.filter(p => p.connected).map(p => p.name);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-20), `[${ts}] ${msg}`]);
  };

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    addLog("V13.0 QUANTUM COMMAND INITIATED.");
    addLog("LATENCY PROTECTION: ENABLED.");
  }, []);

  const handleSearch = async (overrideQuery?: string) => {
    const activeQuery = overrideQuery || query;
    if (!activeQuery.trim()) return;
    setLoading(true);
    setResult(null);
    addLog(`QUANTUM SCAN STARTED: ${activeQuery}`);
    addLog(`ENGAGING PARALLEL GROUNDING...`);

    const startTime = Date.now();

    try {
      const data = await executeDeepRecon({
        query: activeQuery,
        platforms: activePlatformNames,
        searchType,
        location: 'Global Intelligence Hub',
        identities: ['Operational Scout Quantum v13']
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      setResult(data);
      addLog(`RECON COMPLETED IN ${duration}s. ACCURACY: ${data.summary.signalStrength}%`);
    } catch (err: any) {
      addLog(`RECON ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // One search process test effectiveness
  const runOperationalTest = () => {
    const testQuery = "Medical Boards Exam Saudi Arabia 2024 Telegram Group";
    setQuery(testQuery);
    addLog("OPERATIONAL TEST INITIATED: Applying high-density search logic...");
    handleSearch(testQuery);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-300 font-cairo selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Hyper HUD Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-cyan-900/10 blur-[180px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/10 blur-[180px] rounded-full"></div>
      </div>

      {/* Matrix Scan Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,255,0.06),rgba(255,0,255,0.02),rgba(0,0,255,0.06))] bg-[length:100%_3px,4px_100%]" />
        <div className="absolute top-0 w-full h-1 bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,1)] animate-scan" />
      </div>

      {/* Command Sidebar */}
      <aside className={`fixed top-0 bottom-0 right-0 z-[60] bg-[#05070a]/95 border-l border-white/5 transition-all duration-500 backdrop-blur-3xl shadow-2xl ${isSidebarOpen ? 'w-80' : 'w-0 invisible'}`}>
        <div className="p-8 space-y-12 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-radar animate-pulse"></i> Platform Uplinks
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-600 hover:text-white transition-colors">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {platforms.map(p => (
              <button 
                key={p.id}
                onClick={() => setPlatforms(prev => prev.map(x => x.id === p.id ? {...x, connected: !x.connected} : x))}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group ${p.connected ? 'bg-cyan-600/10 border-cyan-500/30 text-white shadow-xl' : 'bg-transparent border-white/5 text-slate-700 hover:border-white/10'}`}
              >
                <i className={`${p.icon} text-xl transition-transform group-hover:scale-110 ${p.connected ? p.color : ''}`}></i>
                <span className="text-[9px] font-black uppercase tracking-tighter">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="pt-10 border-t border-white/5 space-y-6 flex-1">
            <h2 className="text-[9px] font-black text-slate-600 uppercase block tracking-widest">System Test</h2>
            <button 
              onClick={runOperationalTest}
              className="w-full bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              <i className="fa-solid fa-microchip"></i> EFFECTIVENESS TEST
            </button>
            <div className="bg-white/5 p-4 rounded-2xl space-y-3">
               <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-600 uppercase">Latency Mode</span>
                  <span className="text-[9px] font-mono text-cyan-400">QUANTUM</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-600 uppercase">Grounding</span>
                  <span className="text-[9px] font-mono text-emerald-400">BYPASS ACTIVE</span>
               </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[9px] text-slate-800 font-black uppercase tracking-[0.4em] mb-4">SCOUT OPS v13.0</p>
          </div>
        </div>
      </aside>

      <main className={`transition-all duration-700 p-6 lg:p-12 min-h-screen relative z-10 ${isSidebarOpen ? 'lg:mr-80' : ''}`}>
        <header className="flex justify-between items-center mb-16 max-w-6xl mx-auto">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="w-14 h-14 bg-cyan-600 text-white rounded-2xl shadow-[0_0_30px_rgba(8,145,178,0.3)] flex items-center justify-center hover:scale-105 transition-all group border border-cyan-400/20">
              <i className="fa-solid fa-satellite-dish group-hover:animate-ping text-xl"></i>
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter italic leading-none flex items-center gap-3">SCOUT <span className="text-cyan-500">OPS</span> <span className="text-[10px] not-italic text-slate-600 bg-white/5 px-2 py-1 rounded border border-white/10 uppercase tracking-widest">Quantum Recon</span></h1>
              <span className="text-[10px] font-mono text-slate-700 uppercase tracking-[0.5em] mt-2 block">Professional Intelligence v13.0</span>
            </div>
          </div>
          <div className="flex gap-8 items-center">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]"></span> Hyper-Recon Active
              </span>
              <span className="text-[10px] text-slate-700 font-mono">CONNECTION: ENCRYPTED</span>
            </div>
          </div>
        </header>

        <section className="max-w-5xl mx-auto mb-20 text-center">
          <div className="mb-14">
            <h2 className="text-7xl lg:text-9xl font-black text-white tracking-tighter mb-6 animate-fadeIn bg-gradient-to-b from-white to-slate-700 bg-clip-text text-transparent">QUANTUM RECON</h2>
            <p className="text-slate-500 text-base max-w-3xl mx-auto leading-relaxed font-light">
              نظام الاستخبارات الرقمي الأحدث للبحث عن المجتمعات والروابط الخاصة والمخفية عبر فهارس الويب العميقة باستخدام خوارزميات Quantum V13 فائقة السرعة.
            </p>
          </div>

          <div className="relative group mb-10 max-w-4xl mx-auto">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-600 rounded-[3rem] blur opacity-10 group-focus-within:opacity-30 transition-all duration-1000"></div>
            <div className="relative flex bg-[#05070a]/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-3 items-center shadow-2xl">
              <i className="fa-solid fa-fingerprint text-cyan-500 ml-8 mr-6 text-2xl"></i>
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Target Pattern / Identity / Group Topic..."
                className="flex-1 bg-transparent py-6 text-xl font-bold text-white focus:outline-none placeholder:text-slate-800 font-mono text-left"
                dir="ltr"
              />
              <button 
                onClick={() => handleSearch()}
                disabled={loading}
                className="bg-white text-black px-16 py-7 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.3em] hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-50 active:scale-95 flex items-center gap-4 shadow-3xl"
              >
                {loading ? <i className="fa-solid fa-sync fa-spin"></i> : <><i className="fa-solid fa-bolt-lightning"></i> EXECUTE SCAN</>}
              </button>
            </div>
          </div>

          {/* Live Terminal HUD */}
          <div className="bg-black/80 border border-white/5 rounded-3xl p-8 backdrop-blur-3xl h-40 relative overflow-hidden group hover:border-cyan-500/20 transition-all max-w-4xl mx-auto text-left">
             <div className="text-[10px] font-black text-cyan-500 mb-4 flex justify-between uppercase tracking-[0.4em] border-b border-white/5 pb-2">
                <span className="flex items-center gap-3"><div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]"></div> QUANTUM COMMAND STREAM</span>
                <span className="font-mono text-slate-700">{loading ? 'SCANNING AIRSPACE...' : 'READY'}</span>
             </div>
             <div ref={terminalRef} className="text-[11px] font-mono text-cyan-400/80 space-y-1.5 overflow-y-auto h-full custom-scrollbar pr-4 mt-2 leading-tight">
                {logs.length === 0 && <span className="opacity-20 italic uppercase tracking-widest">Awaiting target designation...</span>}
                {logs.map((log, i) => <div key={i} className="animate-fadeIn">{log}</div>)}
             </div>
          </div>
        </section>

        {result && (
          <div className="animate-fadeIn pb-40 max-w-7xl mx-auto">
             {/* Intelligence Summary Matrix */}
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-20">
                <div className="lg:col-span-3 bg-[#05070a]/90 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 relative overflow-hidden group shadow-3xl">
                   <div className="absolute top-0 left-0 w-2 h-full bg-cyan-600 opacity-20 group-hover:opacity-100 transition-all"></div>
                   <h3 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.6em] mb-10 border-b border-white/5 pb-4 inline-block">Strategic Analysis Brief</h3>
                   <div className="text-slate-200 text-lg leading-relaxed font-mono italic opacity-90 text-left" dir="ltr">
                      {result.analysis}
                   </div>
                </div>
                <div className="bg-cyan-600/5 border border-cyan-500/20 rounded-[3rem] p-12 flex flex-col justify-between backdrop-blur-3xl shadow-3xl relative overflow-hidden">
                   <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 blur-[80px] rounded-full"></div>
                   <div className="space-y-12 relative z-10">
                      <div className="flex justify-between items-end">
                         <span className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.2em]">SIGNALS</span>
                         <span className="text-6xl font-black text-white">{result.summary.totalDetected}</span>
                      </div>
                      <div className="flex justify-between items-end">
                         <span className="text-[11px] font-bold text-rose-500 uppercase tracking-[0.2em]">PRIVATE</span>
                         <span className="text-6xl font-black text-rose-500">{result.summary.privateSignals}</span>
                      </div>
                   </div>
                   <div className="mt-16">
                      <div className="flex justify-between text-[10px] font-black text-slate-600 mb-4 tracking-widest">
                        <span>SIGNAL STRENGTH</span>
                        <span>{result.summary.signalStrength}%</span>
                      </div>
                      <div className="h-2.5 bg-black/40 rounded-full overflow-hidden p-[2px] border border-white/5">
                         <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-[2000ms] ease-out" style={{width: `${result.summary.signalStrength}%`}}></div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="flex justify-center gap-16 border-b border-white/5 mb-16 pb-8">
                <button onClick={() => setActiveTab('signals')} className={`text-[13px] font-black uppercase tracking-[0.5em] relative pb-4 transition-all ${activeTab === 'signals' ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}>
                  INTERCEPTED SIGNALS {activeTab === 'signals' && <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,1)]"></div>}
                </button>
                <button onClick={() => setActiveTab('sources')} className={`text-[13px] font-black uppercase tracking-[0.5em] relative pb-4 transition-all ${activeTab === 'sources' ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}>
                  RECON SOURCES {activeTab === 'sources' && <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-500 rounded-full shadow-[0_0_20px_rgba(6,182,212,1)]"></div>}
                </button>
             </div>

             {activeTab === 'signals' && (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                 {result.signals.length === 0 ? (
                   <div className="col-span-full py-56 text-center bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[4rem]">
                      <i className="fa-solid fa-satellite-dish text-7xl text-slate-900 mb-10 animate-pulse"></i>
                      <p className="text-slate-700 uppercase font-black tracking-[0.8em] text-sm">NO SIGNALS INTERCEPTED IN CURRENT VECTOR.</p>
                      <button onClick={() => handleSearch()} className="mt-8 text-[12px] text-cyan-500 hover:text-cyan-400 transition-colors uppercase font-black tracking-widest border-b border-cyan-500/20 pb-2">REFRESH QUANTUM SCAN</button>
                   </div>
                 ) : (
                   result.signals.map((signal, idx) => {
                     const p = platforms.find(x => x.name === signal.platform);
                     return (
                       <div key={signal.id} className="bg-[#080a10]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 hover:border-cyan-500/50 hover:bg-[#0a0c16] transition-all group flex flex-col relative overflow-hidden animate-fadeIn shadow-2xl" style={{ animationDelay: `${idx * 60}ms` }}>
                          {signal.isPrivate && (
                            <div className="absolute -top-4 -right-4 bg-cyan-600 text-white text-[10px] font-black uppercase px-6 py-2.5 rounded rotate-45 animate-pulse shadow-2xl z-10 flex items-center gap-2 border border-cyan-400/30">
                               <i className="fa-solid fa-lock"></i> PRIVATE
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-10">
                             <div className="flex items-center gap-6">
                                <div className={`w-16 h-16 rounded-3xl bg-black border border-white/10 flex items-center justify-center text-3xl shadow-3xl ${p?.color || 'text-white'} transition-transform group-hover:scale-110`}><i className={p?.icon || 'fa-solid fa-globe'}></i></div>
                                <div className="text-left" dir="ltr">
                                   <div className="text-[11px] font-black text-slate-700 uppercase mb-1 tracking-widest">{signal.type}</div>
                                   <div className="text-[12px] font-bold text-cyan-400 truncate w-44 font-mono">{signal.location}</div>
                                </div>
                             </div>
                          </div>
                          <h4 className="text-xl font-black text-white mb-5 line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors text-left" dir="ltr">{signal.title}</h4>
                          <p className="text-[12px] text-slate-500 line-clamp-3 mb-10 font-mono leading-relaxed italic opacity-90 text-left" dir="ltr">"{signal.context || signal.description}"</p>
                          
                          <div className="bg-black/50 rounded-3xl p-6 mb-10 border border-white/5 space-y-5">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">SOURCE</span>
                                <span className="text-[11px] font-bold text-cyan-500 truncate max-w-[160px] font-mono text-left" dir="ltr">{signal.sharedBy || "Intelligence Matrix"}</span>
                             </div>
                             <div>
                                <div className="flex justify-between text-[10px] font-black text-slate-700 uppercase mb-3 tracking-widest">
                                  <span>INTEGRITY</span>
                                  <span>{signal.confidenceScore}%</span>
                                </div>
                                <div className="h-2 bg-slate-900/60 rounded-full overflow-hidden border border-white/5">
                                  <div className={`h-full rounded-full transition-all duration-[1200ms] ${signal.isPrivate ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-indigo-500'}`} style={{ width: `${signal.confidenceScore}%` }}></div>
                                </div>
                             </div>
                          </div>

                          <div className="flex gap-4 mt-auto">
                             <button onClick={() => window.open(signal.url, '_blank')} className={`flex-1 ${signal.isPrivate ? 'bg-cyan-900/40 hover:bg-cyan-600 text-cyan-50 shadow-cyan-900/20' : 'bg-white/5 hover:bg-cyan-600 text-slate-400 hover:text-white shadow-2xl'} py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 active:scale-95 border border-white/5`}>
                               {signal.isPrivate ? 'BYPASS & ACCESS' : 'ACCESS UPLINK'} <i className={`fa-solid ${signal.isPrivate ? 'fa-fingerprint' : 'fa-external-link'}`}></i>
                             </button>
                             <button onClick={() => { navigator.clipboard.writeText(signal.url); addLog(`UPLINK [${signal.title.substring(0,10)}...] BUFFERED.`); }} className="w-16 bg-[#05070a] border border-white/10 text-slate-600 hover:text-white rounded-[1.5rem] flex items-center justify-center transition-all hover:border-white/20 active:scale-95 shadow-2xl">
                               <i className="fa-regular fa-copy text-xl"></i>
                             </button>
                          </div>
                       </div>
                     )
                   })
                 )}
               </div>
             )}

             {activeTab === 'sources' && (
               <div className="max-w-5xl mx-auto space-y-5">
                  {result.groundingSources.length === 0 ? (
                     <div className="py-40 text-center text-slate-800 italic font-black uppercase tracking-[0.8em] text-sm">NO SOURCES GROUNDED IN THIS SESSION.</div>
                  ) : (
                    result.groundingSources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="bg-[#080a10]/80 backdrop-blur-3xl border border-white/10 p-8 rounded-[2rem] hover:bg-white/[0.04] hover:border-cyan-500/20 transition-all flex items-center justify-between group shadow-2xl">
                         <div className="flex flex-col gap-3 text-left" dir="ltr">
                            <span className="text-base font-black text-slate-200 group-hover:text-cyan-400 transition-colors truncate max-w-[600px]">{s.title}</span>
                            <span className="text-[11px] text-slate-700 font-mono truncate max-w-[600px]">{s.uri}</span>
                         </div>
                         <div className="w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center text-slate-800 group-hover:text-cyan-500 transition-all shadow-inner border border-white/5">
                            <i className="fa-solid fa-link text-xl"></i>
                         </div>
                      </a>
                    ))
                  )}
               </div>
             )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-12 text-center pointer-events-none z-0">
         <span className="text-[10px] font-black text-slate-900 uppercase tracking-[1em] opacity-30">SCOUT OPS QUANTUM RECON v13.0 • TACTICAL INTELLIGENCE COMMAND</span>
      </footer>

      <style>{`
        @keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
        .animate-scan { animation: scan 4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0891b2; border-radius: 20px; }
        .shadow-3xl { box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.9); }
      `}</style>
    </div>
  );
};

export default App;
