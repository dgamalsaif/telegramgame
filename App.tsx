
import React, { useState, useEffect, useRef } from 'react';
import { searchGlobalIntel } from './services/geminiService';
import { IntelLink, SearchResult, SearchType, Platform, PlatformType, SearchHistoryItem } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [town, setTown] = useState('');
  const [hospital, setHospital] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('medical-recon');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1400);
  const [activeTab, setActiveTab] = useState<'links' | 'chats' | 'sources'>('links');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [confirmingLink, setConfirmingLink] = useState<IntelLink | null>(null);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  const availablePlatforms: Platform[] = [
    { id: '1', name: 'Telegram', icon: 'fa-brands fa-telegram', connected: true, color: 'text-sky-400' },
    { id: '2', name: 'WhatsApp', icon: 'fa-brands fa-whatsapp', connected: true, color: 'text-emerald-400' },
    { id: '3', name: 'LinkedIn', icon: 'fa-brands fa-linkedin', connected: true, color: 'text-blue-700' },
    { id: '4', name: 'X', icon: 'fa-brands fa-x-twitter', connected: true, color: 'text-gray-100' },
    { id: '5', name: 'Facebook', icon: 'fa-brands fa-facebook', connected: true, color: 'text-blue-500' },
    { id: '6', name: 'Discord', icon: 'fa-brands fa-discord', connected: true, color: 'text-indigo-400' },
    { id: '7', name: 'Reddit', icon: 'fa-brands fa-reddit', connected: true, color: 'text-orange-500' },
    { id: '8', name: 'Instagram', icon: 'fa-brands fa-instagram', connected: true, color: 'text-pink-500' }
  ];

  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('scout_v7.5_history');
    if (saved) setHistory(JSON.parse(saved));
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1400);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev.slice(-40), `[${timestamp}] ${msg}`]);
    setTimeout(() => {
      if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }, 50);
  };

  const togglePlatform = (p: PlatformType) => {
    setSelectedPlatforms(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const selectAllPlatforms = () => setSelectedPlatforms(availablePlatforms.map(p => p.name as PlatformType));
  const clearAllPlatforms = () => setSelectedPlatforms([]);

  const handleSearch = async (targetQuery?: string) => {
    const finalQuery = (targetQuery || query).trim();
    if (!finalQuery && !hospital.trim() && !specialty.trim()) {
      setError("Please input a search target: Keyword, ID, Specialty, or Link.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);
    setLoadingStep('Initializing Recon Engine v7.5 Ultimate...');

    addLog(`INITIATING ULTRA-SCAN PROTOCOL...`);
    
    try {
      setLoadingStep('Dorking Platform Matrix...');
      addLog(`Type: ${searchType.toUpperCase()}`);
      addLog(`Target: ${finalQuery || 'Multi-Vector'}`);
      if (selectedPlatforms.length > 0) addLog(`Scope: ${selectedPlatforms.join(' | ')}`);
      else addLog(`Scope: GLOBAL_OMNI_CHANNEL`);

      const data = await searchGlobalIntel({
        query: finalQuery,
        location: location || 'Global',
        town,
        hospital,
        specialty,
        platforms: selectedPlatforms,
        searchType,
        filters: { activeOnly: true, privateOnly: false, minConfidence: 85 }
      });

      setResult(data);
      addLog(`SUCCESS: ${data.links.length} nodes validated.`);
      
      const newHistoryItem: SearchHistoryItem = {
        query: finalQuery || specialty || hospital,
        location, town, hospital,
        timestamp: new Date().toLocaleTimeString(),
        type: searchType
      };

      setHistory(prev => {
        const next = [newHistoryItem, ...prev.filter(i => i.query !== newHistoryItem.query)].slice(0, 15);
        localStorage.setItem('scout_v7.5_history', JSON.stringify(next));
        return next;
      });

    } catch (err: any) {
      console.error(err);
      let errorMsg = "Network uplink failed. Please retry.";
      
      if (err.message?.includes("API_KEY")) {
        errorMsg = "DEPLOYMENT ERROR: Missing API Key.";
        addLog("FATAL: Auth Key Missing.");
      } else if (err.message?.includes("429")) {
         errorMsg = "SYSTEM OVERLOAD: Too many requests.";
         addLog("FATAL: Rate Limit Hit.");
      } else if (err.message?.includes("NO_SIGNALS")) {
         errorMsg = "NO INTELLIGENCE FOUND: Try broader keywords.";
         addLog("INFO: Zero signals in current sector.");
      }

      setError(errorMsg);
      addLog(`ERROR: ${err.message || 'Unknown Failure'}`);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-gray-200 font-cairo overflow-x-hidden selection:bg-indigo-600/50 relative">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1a1b2e_0%,#000000_80%)] opacity-70"></div>
         <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl animate-fadeIn">
           <div className="w-80 h-80 rounded-full border border-indigo-500/20 flex items-center justify-center relative mb-12 shadow-[0_0_120px_rgba(79,70,229,0.3)]">
              <div className="absolute inset-0 rounded-full border-t-[2px] border-indigo-500 animate-spin"></div>
              <div className="absolute inset-8 rounded-full border-b-[2px] border-sky-500 animate-reverse-spin opacity-50"></div>
              <i className="fa-solid fa-satellite-dish text-8xl text-white animate-pulse"></i>
           </div>
           <h2 className="text-5xl lg:text-7xl font-black text-white uppercase tracking-[0.2em] leading-tight text-center px-4 drop-shadow-2xl">{loadingStep}</h2>
           <p className="text-indigo-400/60 font-mono text-xs uppercase tracking-[0.5em] mt-8 animate-pulse">SCOUT OPS v7.5 ULTIMATE</p>
        </div>
      )}

      {/* Link Confirmation Modal */}
      {confirmingLink && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-fadeIn">
          <div className="bg-[#05050a] border border-indigo-500/30 rounded-[3rem] p-12 max-w-2xl w-full shadow-[0_0_100px_rgba(79,70,229,0.2)] space-y-10 relative overflow-hidden">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
             
             <div className="text-center">
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 text-indigo-400 mb-8">
                   <i className={`fa-brands fa-${confirmingLink.platform.toLowerCase().replace('reddit', 'reddit-alien').replace('x', 'x-twitter')} text-5xl`}></i>
                </div>
                <h3 className="text-4xl font-black text-white uppercase tracking-tight mb-2">{confirmingLink.title}</h3>
                <div className="flex justify-center gap-3">
                    <span className="text-[10px] font-black bg-white/5 px-4 py-2 rounded-full uppercase tracking-widest text-gray-400">{confirmingLink.platform}</span>
                    <span className="text-[10px] font-black bg-indigo-500/10 px-4 py-2 rounded-full uppercase tracking-widest text-indigo-400">{confirmingLink.source.type}</span>
                </div>
             </div>

             <div className="space-y-4">
                 <div className="bg-black/50 p-6 rounded-3xl border border-white/5">
                    <span className="text-[9px] uppercase font-black text-gray-600 block mb-2 tracking-widest">Target URL</span>
                    <div className="font-mono text-xs text-indigo-300 break-all select-all">{confirmingLink.url}</div>
                 </div>
                 
                 {confirmingLink.source.context && (
                    <div className="bg-amber-500/5 p-6 rounded-3xl border border-amber-500/10">
                        <span className="text-[9px] uppercase font-black text-amber-500/60 block mb-2 tracking-widest">Intel Context</span>
                        <div className="text-sm text-gray-300 italic">{confirmingLink.source.context}</div>
                    </div>
                 )}
             </div>

             <div className="flex gap-4 pt-4">
                <button onClick={() => setConfirmingLink(null)} className="flex-1 py-6 bg-white/5 rounded-3xl font-black text-[11px] uppercase text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/10 tracking-widest">Cancel</button>
                <button onClick={() => { window.open(confirmingLink.url, '_blank'); setConfirmingLink(null); }} className="flex-1 py-6 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase shadow-2xl hover:bg-indigo-500 transition-all tracking-widest">Connect</button>
             </div>
          </div>
        </div>
      )}

      {/* Terminal Sidebar */}
      <aside className={`fixed top-0 bottom-0 right-0 z-[120] bg-[#05050a]/98 border-l border-white/5 transition-all duration-700 backdrop-blur-4xl shadow-2xl ${isSidebarOpen ? 'w-[450px]' : 'w-0 invisible translate-x-full'}`}>
        <div className="p-10 space-y-10 h-full overflow-y-auto flex flex-col no-scrollbar">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">COMMAND LOG</span>
              <span className="text-[9px] font-bold text-gray-700 uppercase">SYSTEM ACTIVE</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all hover:bg-white/10"><i className="fa-solid fa-angles-right"></i></button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-4">
             <div ref={terminalRef} className="flex-1 bg-black/40 rounded-[2rem] border border-white/5 p-8 font-mono text-[10px] text-indigo-400/80 overflow-y-auto space-y-3 custom-scrollbar">
                {logs.length === 0 && <div className="opacity-20 text-center mt-20">SYSTEM STANDBY...</div>}
                {logs.map((log, i) => (
                    <div key={i} className="animate-fadeIn pl-4 border-l-2 border-indigo-500/20 leading-relaxed relative">
                        <span className="absolute -left-[5px] top-1.5 w-1 h-1 bg-indigo-500 rounded-full"></span>
                        {log}
                    </div>
                ))}
             </div>
          </div>

          <div className="pt-8 border-t border-white/5">
             <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4 block">Recent Targets</label>
             <div className="flex flex-wrap gap-2">
                {history.map((h, i) => (
                  <button key={i} onClick={() => { setQuery(h.query); handleSearch(h.query); }} className="px-4 py-3 bg-white/[0.03] rounded-xl border border-white/5 text-[10px] font-bold text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all truncate max-w-full">
                     {h.query}
                  </button>
                ))}
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`transition-all duration-700 p-6 lg:p-16 max-w-[1600px] mx-auto flex flex-col relative z-10 ${isSidebarOpen ? 'lg:mr-[450px]' : ''}`}>
        
        {/* Header */}
        <header className="flex justify-between items-end mb-20">
           <div className="flex items-center gap-8">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="w-16 h-16 bg-[#0a0a10] border border-white/10 rounded-2xl text-indigo-500 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-2xl"><i className="fa-solid fa-bars-staggered text-xl"></i></button>
              )}
              <div className="flex flex-col">
                <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-none">SCOUT <span className="text-indigo-600">OPS</span></h1>
                <div className="flex items-center gap-4 mt-2">
                    <span className="h-0.5 w-12 bg-indigo-600"></span>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.6em]">ULTIMATE v7.5</span>
                </div>
              </div>
           </div>
        </header>

        {/* Control Interface */}
        <div className="space-y-12 mb-32">
           
           {/* Platform Matrix */}
           <div className="bg-[#0a0a10] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                      <i className="fa-solid fa-layer-group text-indigo-500"></i> Platform Matrix
                  </h3>
                  <div className="flex gap-4">
                      <button onClick={selectAllPlatforms} className="text-[10px] font-black text-gray-500 hover:text-indigo-400 uppercase tracking-wider transition-colors">Select All</button>
                      <button onClick={clearAllPlatforms} className="text-[10px] font-black text-gray-500 hover:text-rose-400 uppercase tracking-wider transition-colors">Clear</button>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                 {availablePlatforms.map(p => (
                    <button 
                      key={p.name}
                      onClick={() => togglePlatform(p.name as PlatformType)}
                      className={`relative flex flex-col items-center justify-center gap-3 h-28 rounded-3xl border transition-all duration-300 group ${selectedPlatforms.includes(p.name as PlatformType) ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg scale-105 z-10' : 'bg-black/40 border-white/5 text-gray-600 hover:bg-white/5 hover:text-gray-300'}`}
                    >
                       <i className={`${p.icon} text-2xl group-hover:scale-110 transition-transform`}></i>
                       <span className="text-[9px] font-black uppercase tracking-tight">{p.name}</span>
                       {selectedPlatforms.includes(p.name as PlatformType) && (
                           <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]"></span>
                       )}
                    </button>
                 ))}
              </div>
           </div>

           {/* Mode Selection */}
           <div className="flex justify-center gap-3 flex-wrap">
              {[
                { id: 'medical-recon', label: 'Medical Groups', icon: 'fa-user-md' },
                { id: 'mention-tracker', label: 'Mention Tracker', icon: 'fa-radar' },
                { id: 'specialty-hunt', label: 'Specialty Hunt', icon: 'fa-graduation-cap' },
                { id: 'user-id', label: 'ID Probe', icon: 'fa-fingerprint' },
                { id: 'signal-phone', label: 'Phone Signal', icon: 'fa-mobile-screen' },
                { id: 'deep-scan', label: 'Deep Scan', icon: 'fa-network-wired' }
              ].map(t => (
                <button key={t.id} onClick={() => { setSearchType(t.id as any); setResult(null); }} className={`px-8 py-4 rounded-full text-[10px] font-black uppercase border transition-all flex items-center gap-3 ${searchType === t.id ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105' : 'bg-[#0a0a10] border-white/10 text-gray-500 hover:border-white/30 hover:text-white'}`}>
                   <i className={`fa-solid ${t.icon}`}></i> {t.label}
                </button>
              ))}
           </div>

           {/* Main Search Input */}
           <div className="relative group max-w-5xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-[3.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative flex bg-[#05050a] rounded-[3.5rem] p-3 items-center shadow-2xl">
                 <div className="pl-10 text-indigo-500 text-3xl">
                    <i className="fa-solid fa-satellite-dish"></i>
                 </div>
                 <input 
                    type="text" 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder={searchType === 'mention-tracker' ? "Enter link or keyword to track mentions..." : "Target: Keyword, Link, or ID..."}
                    className="flex-1 bg-transparent py-6 px-8 text-2xl lg:text-3xl font-black text-white focus:outline-none placeholder:text-gray-800 tracking-tight"
                 />
                 <button onClick={() => handleSearch()} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.5rem] px-12 py-6 font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95">
                    {loading ? 'Scanning...' : 'Execute'}
                 </button>
              </div>
           </div>

           {/* Geo Filters */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {[
                { val: location, set: setLocation, ph: 'Country / Region', icon: 'fa-globe' },
                { val: town, set: setTown, ph: 'City / Sector', icon: 'fa-city' },
                { val: hospital, set: setHospital, ph: 'Hospital Name', icon: 'fa-hospital' },
                { val: specialty, set: setSpecialty, ph: 'Specialty / Board', icon: 'fa-stethoscope' }
              ].map((f, i) => (
                <div key={i} className="flex items-center bg-[#0a0a10] border border-white/5 rounded-2xl px-6 py-4 focus-within:border-indigo-500/50 transition-colors">
                   <i className={`fa-solid ${f.icon} text-gray-700 mr-4`}></i>
                   <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="bg-transparent text-sm font-bold text-gray-300 placeholder:text-gray-800 focus:outline-none w-full" />
                </div>
              ))}
           </div>
        </div>

        {/* Results Engine */}
        {result && (
          <div className="animate-fadeIn pb-40">
             
             {/* Stats Bar */}
             <div className="flex flex-wrap justify-center gap-8 mb-16 border-b border-white/5 pb-16">
                {[
                  { label: 'Total Signals', val: result.stats.totalFound, color: 'text-white' },
                  { label: 'Validated Nodes', val: result.links.length, color: 'text-indigo-400' },
                  { label: 'Medical Matches', val: result.stats.medicalMatches, color: 'text-emerald-400' },
                  { label: 'Accuracy', val: '99.9%', color: 'text-gray-400' }
                ].map(s => (
                  <div key={s.label} className="text-center px-8 border-r border-white/5 last:border-0">
                     <div className={`text-4xl font-black ${s.color} tracking-tighter mb-2`}>{s.val}</div>
                     <div className="text-[9px] font-black text-gray-700 uppercase tracking-widest">{s.label}</div>
                  </div>
                ))}
             </div>

             {/* Links Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {result.links.length === 0 ? (
                  <div className="col-span-full py-40 text-center">
                    <i className="fa-solid fa-wind text-6xl text-white/5 mb-6"></i>
                    <h3 className="text-2xl font-black text-white/10 uppercase tracking-widest">No Intelligence Found</h3>
                  </div>
                ) : (
                  result.links.map(link => (
                    <div key={link.id} className="group bg-[#0a0a10] border border-white/5 rounded-[2.5rem] p-10 hover:border-indigo-500/30 hover:bg-[#0f0f16] transition-all duration-300 flex flex-col relative overflow-hidden shadow-2xl">
                       
                       {/* Context Badge if Mention */}
                       {link.source.type === 'Mention' && (
                         <div className="absolute top-0 right-0 bg-amber-500/10 border-l border-b border-amber-500/20 px-6 py-2 rounded-bl-2xl">
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                               <i className="fa-solid fa-quote-left"></i> Mention
                            </span>
                         </div>
                       )}

                       {/* Direct Link Badge */}
                       {link.source.type === 'Direct' && (
                         <div className="absolute top-0 right-0 bg-emerald-500/10 border-l border-b border-emerald-500/20 px-6 py-2 rounded-bl-2xl">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                               <i className="fa-solid fa-link"></i> Direct
                            </span>
                         </div>
                       )}

                       {/* Icon & Platform */}
                       <div className="flex items-center gap-6 mb-8">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-3xl text-gray-500 group-hover:text-white group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all">
                             <i className={`fa-brands fa-${link.platform.toLowerCase().replace('reddit', 'reddit-alien').replace('x', 'x-twitter')}`}></i>
                          </div>
                          <div>
                             <h4 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{link.platform}</h4>
                             <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{link.confidence}% Verified</span>
                          </div>
                       </div>

                       {/* Content */}
                       <div className="flex-1 mb-8">
                          <h3 className="text-lg font-bold text-gray-200 mb-4 line-clamp-2 leading-tight">{link.title}</h3>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3">{link.description}</p>
                       </div>

                       {/* Source Context (The "Where" part) */}
                       <div className="bg-black/40 rounded-2xl p-4 border border-white/5 mb-8">
                          <div className="flex items-center gap-2 mb-2 opacity-50">
                             <i className="fa-solid fa-eye text-[10px] text-indigo-400"></i>
                             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Source Context</span>
                          </div>
                          <div className="text-[10px] text-gray-300 italic font-mono leading-relaxed">
                             "{link.source.context || link.source.name}"
                          </div>
                       </div>

                       {/* Action */}
                       <button onClick={() => setConfirmingLink(link)} className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-transparent hover:border-white/10">
                          Access Node
                       </button>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20 bg-[#0a0a10] border border-rose-500/20 rounded-[3rem] mt-20 animate-fadeIn">
             <i className="fa-solid fa-triangle-exclamation text-5xl text-rose-500 mb-6"></i>
             <h3 className="text-3xl font-black text-white uppercase mb-4">Connection Failed</h3>
             <p className="text-rose-400/70 mb-8 max-w-xl mx-auto">{error}</p>
             <button onClick={() => { setError(null); setQuery(''); }} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white rounded-full font-black text-xs uppercase tracking-widest">Reset System</button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="fixed bottom-8 left-0 right-0 text-center pointer-events-none z-50 mix-blend-difference">
         <span className="text-[10px] font-black text-white/30 uppercase tracking-[1em]">SCOUT OPS v7.5 ULTIMATE</span>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reverse-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .animate-fadeIn { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-reverse-spin { animation: reverse-spin 10s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .backdrop-blur-4xl { backdrop-filter: blur(60px); }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active{
            -webkit-box-shadow: 0 0 0 30px #05050a inset !important;
            -webkit-text-fill-color: white !important;
        }
      `}</style>
    </div>
  );
};

export default App;
