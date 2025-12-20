
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { searchGlobalIntel } from './services/geminiService';
import { IntelLink, IntelMessage, SearchResult, SearchType, Platform, PlatformType, SearchHistoryItem } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [town, setTown] = useState('');
  const [hospital, setHospital] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('topic');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1400);
  const [activeTab, setActiveTab] = useState<'links' | 'chats' | 'sources'>('links');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [confirmingLink, setConfirmingLink] = useState<IntelLink | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const [platforms, setPlatforms] = useState<Platform[]>([
    { id: '1', name: 'X', icon: 'fa-brands fa-x-twitter', connected: true, color: 'text-gray-100' },
    { id: '2', name: 'Telegram', icon: 'fa-brands fa-telegram', connected: true, color: 'text-sky-400' },
    { id: '3', name: 'WhatsApp', icon: 'fa-brands fa-whatsapp', connected: true, color: 'text-emerald-400' },
    { id: '4', name: 'Discord', icon: 'fa-brands fa-discord', connected: true, color: 'text-indigo-400' },
    { id: '5', name: 'Facebook', icon: 'fa-brands fa-facebook', connected: true, color: 'text-blue-500' },
    { id: '6', name: 'Instagram', icon: 'fa-brands fa-instagram', connected: true, color: 'text-pink-500' },
    { id: '7', name: 'TikTok', icon: 'fa-brands fa-tiktok', connected: true, color: 'text-cyan-400' },
    { id: '8', name: 'LinkedIn', icon: 'fa-brands fa-linkedin', connected: true, color: 'text-blue-700' }
  ]);

  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('scout_v16_history');
    if (saved) setHistory(JSON.parse(saved));
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1400);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev.slice(-15), `[${timestamp}] ${msg}`]);
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 10);
  };

  const handleSearch = async (targetQuery?: string) => {
    const finalQuery = targetQuery || query;
    if (!finalQuery.trim() && !hospital.trim()) {
      setError("يرجى إدخال كلمات بحث أو اختيار مرفق طبي للبدء.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setLogs([]);

    addLog(`INITIALIZING NEURAL RECON v16.0...`);
    addLog(`Sector Lock: ${location || 'Global Territory'}`);
    if (finalQuery) addLog(`Target Matrix: ${finalQuery}`);
    addLog(`Establishing Parallel Search Vectors...`);
    
    try {
      const data = await searchGlobalIntel({
        query: finalQuery,
        location: location || 'Global',
        town,
        hospital,
        platforms: platforms.filter(p => p.connected),
        searchType,
        filters: { activeOnly: false, privateOnly: false, minConfidence: 0 }
      });

      setResult(data);
      addLog(`RECON SUCCESS: ${data.links.length} nodes intercepted and verified.`);
      
      const newHistoryItem: SearchHistoryItem = {
        query: finalQuery || hospital,
        location, town, hospital,
        timestamp: new Date().toLocaleTimeString(),
        type: searchType
      };

      setHistory(prev => {
        const next = [newHistoryItem, ...prev.filter(i => i.query !== (finalQuery || hospital))].slice(0, 20);
        localStorage.setItem('scout_v16_history', JSON.stringify(next));
        return next;
      });

    } catch (err: any) {
      setError(err.message || "فشل الاتصال بالشبكة العصبية نتيجة تشويش في الإشارة.");
      addLog("FAILURE: Recon sequence aborted.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010309] text-gray-200 font-cairo overflow-x-hidden selection:bg-indigo-600/50">
      
      {/* Hyper-Visual Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e1b4b_0%,#010309_100%)] opacity-40"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04]"></div>
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:40px_40px] opacity-20"></div>
      </div>

      {/* Dynamic Scan Line */}
      <div className={`fixed top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent z-[110] transition-all duration-1000 ${loading ? 'opacity-100 translate-y-[100vh]' : 'opacity-0 translate-y-0'}`} style={{transitionProperty: 'transform, opacity', transitionTimingFunction: 'linear'}}></div>

      {/* Signal Verification Modal */}
      {confirmingLink && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn">
          <div className="bg-[#0c1221] border border-white/10 rounded-[3rem] p-12 max-w-lg w-full shadow-[0_0_100px_rgba(79,70,229,0.15)] space-y-8 border-t-indigo-500/50 group">
             <div className="text-center relative">
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-2xl transition-transform group-hover:scale-110`}>
                   <i className={`fa-solid ${confirmingLink.platform === 'WhatsApp' ? 'fa-brands fa-whatsapp' : 'fa-satellite'} text-4xl`}></i>
                </div>
                <h3 className="text-3xl font-black text-white leading-tight tracking-tight uppercase">{confirmingLink.title}</h3>
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.6em] mt-3 block">Signal Verified & Locked</span>
             </div>
             <div className="bg-black/60 p-6 rounded-2xl border border-white/5 font-mono text-[11px] text-indigo-300 break-all leading-relaxed shadow-inner max-h-32 overflow-y-auto custom-scrollbar">
                {confirmingLink.url}
             </div>
             <div className="flex gap-4 pt-4">
                <button onClick={() => setConfirmingLink(null)} className="flex-1 py-5 bg-white/5 rounded-2xl font-black text-xs uppercase text-gray-500 hover:text-white transition-all border border-white/5 active:scale-95">Abort Link</button>
                <button onClick={() => { window.open(confirmingLink.url, '_blank'); setConfirmingLink(null); }} className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase shadow-2xl transition-all active:scale-95 border border-indigo-400/30">Establish Connection</button>
             </div>
          </div>
        </div>
      )}

      {/* Side Control Console v16.0 */}
      <aside className={`fixed top-0 bottom-0 right-0 z-[120] bg-[#050811]/98 border-l border-white/5 transition-all duration-700 backdrop-blur-4xl ${isSidebarOpen ? 'w-[400px]' : 'w-0 invisible translate-x-full'}`}>
        <div className="p-10 space-y-12 h-full overflow-y-auto flex flex-col no-scrollbar">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">RECON CONSOLE</span>
              <span className="text-[8px] font-bold text-gray-700 uppercase">Version 16.0 Neural</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all border border-white/5"><i className="fa-solid fa-angles-right"></i></button>
          </div>

          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Active Search Matrix</label>
                <button onClick={() => setPlatforms(platforms.map(p => ({...p, connected: true})))} className="text-[8px] font-black text-indigo-500 uppercase hover:text-indigo-400">Sync All</button>
             </div>
             <div className="grid grid-cols-2 gap-4">
                {platforms.map(p => (
                  <button key={p.id} onClick={() => setPlatforms(prev => prev.map(pl => pl.id === p.id ? {...pl, connected: !pl.connected} : pl))} className={`p-5 rounded-3xl border text-[10px] font-black flex flex-col items-center gap-3 transition-all relative overflow-hidden group ${p.connected ? 'bg-indigo-600/10 border-indigo-500/30 text-white shadow-xl' : 'bg-transparent border-white/5 text-gray-800'}`}>
                    {p.connected && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full m-2 animate-pulse"></div>}
                    <i className={`${p.icon} text-2xl ${p.connected ? p.color : 'text-gray-900'} transition-transform group-hover:scale-110`}></i>
                    {p.name}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-6">
             <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Digital Footprint Logs</label>
             <div ref={terminalRef} className="flex-1 bg-black/60 rounded-3xl border border-white/5 p-6 font-mono text-[11px] text-indigo-400/80 overflow-y-auto space-y-2 shadow-inner custom-scrollbar scroll-smooth">
                {logs.length === 0 && <div className="opacity-10 italic text-center py-10 uppercase tracking-widest text-[9px]">Standing by for neural probe...</div>}
                {logs.map((log, i) => <div key={i} className="animate-in slide-in-from-right-2 duration-300 border-l-2 border-indigo-500/10 pl-4 py-0.5"> {log} </div>)}
             </div>
          </div>

          <div className="pt-8 border-t border-white/5 space-y-6">
             <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Recon History</label>
             <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                {history.length === 0 && <div className="text-[9px] text-gray-900 uppercase text-center py-4">History Clear</div>}
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setQuery(h.query); handleSearch(h.query); }} className="p-5 bg-white/[0.02] rounded-3xl border border-white/5 text-[11px] font-bold text-gray-600 hover:text-indigo-400 cursor-pointer truncate transition-all flex items-center gap-4 group hover:bg-white/[0.04]">
                     <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-800 group-hover:text-indigo-500 transition-all"><i className="fa-solid fa-clock-rotate-left text-[10px]"></i></div>
                     <div className="flex flex-col min-w-0">
                        <span className="truncate group-hover:text-white transition-colors uppercase tracking-tight">{h.query}</span>
                        <span className="text-[7px] text-gray-800 font-black mt-1">{h.timestamp} • {h.location}</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </aside>

      {/* Main Command Center Layout v16.0 */}
      <main className={`transition-all duration-700 p-6 lg:p-24 max-w-7xl mx-auto flex flex-col relative z-10 ${isSidebarOpen ? 'lg:mr-[400px]' : ''}`}>
        
        <header className="flex justify-between items-center mb-24 lg:mb-32">
           <div className="flex items-center gap-10">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="w-16 h-16 bg-[#0c1221] border border-white/10 rounded-3xl text-indigo-500 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-3xl hover:shadow-indigo-500/20 active:scale-95"><i className="fa-solid fa-terminal text-xl"></i></button>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-4">
                  <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-none">SCOUT <span className="text-indigo-500">OPS</span></h1>
                  <div className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-lg shadow-2xl h-fit uppercase">v16.0</div>
                </div>
                <span className="text-[11px] font-black text-gray-700 uppercase tracking-[1em] mt-5 flex items-center gap-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span> Deep Neural Intel Grid
                </span>
              </div>
           </div>
           <div className="hidden xl:flex flex-col items-end gap-3 px-12 py-6 bg-[#0c1221] border border-white/5 rounded-[2.5rem] shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="text-[9px] font-black text-gray-800 uppercase tracking-widest relative">Neural Connectivity</span>
              <span className="text-sm font-black text-emerald-500 uppercase tracking-widest relative flex items-center gap-3">
                 Online <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
              </span>
           </div>
        </header>

        {/* Tactical Search Interface */}
        <div className="max-w-5xl mx-auto w-full space-y-24 mb-32">
           <div className="text-center space-y-8">
              <h2 className="text-8xl lg:text-[12rem] font-black text-white leading-[0.8] tracking-tighter uppercase relative inline-block animate-in fade-in slide-in-from-bottom-5 duration-1000">
                UNMATCHED
                <div className="absolute -bottom-6 right-0 left-0 h-8 bg-indigo-600/20 blur-[60px]"></div>
              </h2>
              <div className="text-6xl lg:text-9xl font-black text-indigo-500 tracking-tighter uppercase mt-[-1rem] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">INTELLIGENCE</div>
              <p className="text-gray-500 text-xl lg:text-3xl max-w-2xl mx-auto font-medium leading-relaxed italic border-r-8 border-indigo-600/10 pr-10 mt-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-400">نظام الاستقصاء العصبي الأكثر تقدماً للوصول إلى أدق البيانات والمجتمعات الرقمية.</p>
           </div>

           <div className="flex justify-center gap-4 flex-wrap animate-in fade-in duration-700 delay-500">
              {[
                { id: 'topic', label: 'Neural Search', icon: 'fa-brain' },
                { id: 'medical-scan', label: 'Hospital Map', icon: 'fa-hospital-user' },
                { id: 'user', label: 'Entity Probe', icon: 'fa-user-secret' },
                { id: 'deep-scan', label: 'Specialized Scan', icon: 'fa-microchip' }
              ].map(t => (
                <button key={t.id} onClick={() => setSearchType(t.id as any)} className={`px-10 py-6 rounded-[2.2rem] text-[11px] font-black uppercase border transition-all flex items-center gap-5 ${searchType === t.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_40px_rgba(79,70,229,0.3)] scale-105' : 'bg-[#0c1221] border-white/5 text-gray-700 hover:text-gray-300 hover:bg-[#11192d]'}`}>
                   <i className={`fa-solid ${t.icon} ${searchType === t.id ? 'animate-pulse' : ''}`}></i> {t.label}
                </button>
              ))}
           </div>

           <div className="relative group/input animate-in zoom-in duration-700 delay-600">
              <div className="absolute -inset-6 bg-indigo-500/10 rounded-[5rem] blur-[80px] opacity-0 group-focus-within/input:opacity-100 transition-all duration-1000"></div>
              <div className="relative flex flex-col lg:flex-row bg-[#0c1221] border border-white/10 rounded-[3rem] lg:rounded-full p-4 lg:p-5 gap-5 shadow-3xl">
                 <div className="flex-1 flex items-center px-10 gap-10">
                    <i className={`fa-solid ${loading ? 'fa-spinner-third fa-spin' : 'fa-satellite-dish'} text-indigo-500 text-5xl lg:text-6xl`}></i>
                    <input 
                      type="text" 
                      autoFocus
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="أدخل كلمات البحث، المجموعات، أو المواضيع الاستقصائية..."
                      className="w-full bg-transparent py-8 lg:py-10 text-4xl lg:text-6xl font-black text-white focus:outline-none placeholder:text-gray-900 tracking-tighter"
                    />
                 </div>
                 <button onClick={() => handleSearch()} disabled={loading} className={`px-20 lg:px-32 py-7 rounded-[2.5rem] lg:rounded-full font-black text-sm lg:text-base uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40 border border-indigo-400/20`}>
                   {loading ? 'Executing Recon...' : 'Establish Search'}
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-4 duration-1000 delay-700">
              {[
                { val: location, set: setLocation, ph: 'نطاق الدولة...', icon: 'fa-earth-americas' },
                { val: town, set: setTown, ph: 'المدينة/المنطقة...', icon: 'fa-city' },
                { val: hospital, set: setHospital, ph: 'المنشأة الطبية المستهدفة...', icon: 'fa-hospital-user' }
              ].map((f, i) => (
                <div key={i} className="flex items-center bg-[#0c1221] border border-white/5 rounded-[2.5rem] px-12 py-8 hover:border-indigo-500/40 transition-all group/field shadow-2xl hover:bg-[#11192d]">
                   <i className={`fa-solid ${f.icon} text-indigo-500/30 group-hover/field:text-indigo-500 transition-colors mr-8 text-2xl`}></i>
                   <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="bg-transparent text-lg lg:text-xl font-black focus:outline-none w-full text-gray-300 placeholder:text-gray-800" />
                </div>
              ))}
           </div>
        </div>

        {/* Enhanced Results Dashboard v16.0 */}
        {result && (
          <div className="space-y-24 animate-in fade-in slide-in-from-bottom-10 duration-1000 pb-80">
             
             {/* Dynamic Stats Grid - High Visual */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
                {[
                  { label: 'Signals Captured', val: result.stats.totalFound, icon: 'fa-tower-broadcast', color: 'text-indigo-400', bg: 'bg-indigo-500/5' },
                  { label: 'Live Network Links', val: result.links.length, icon: 'fa-link', color: 'text-sky-400', bg: 'bg-sky-500/5' },
                  { label: 'Restricted Leads', val: result.stats.privateCount, icon: 'fa-shield-halved', color: 'text-rose-400', bg: 'bg-rose-500/5' },
                  { label: 'Neural Confidence', val: '99.8%', icon: 'fa-brain', color: 'text-emerald-400', bg: 'bg-emerald-500/5' }
                ].map(s => (
                  <div key={s.label} className="bg-[#0c1221] border border-white/5 p-12 rounded-[3.5rem] flex flex-col items-center text-center gap-5 hover:border-indigo-500/30 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:translate-y-[-8px] group">
                     <div className={`w-20 h-20 rounded-3xl ${s.bg} flex items-center justify-center ${s.color} text-3xl border border-white/5 transition-transform group-hover:scale-110`}>
                        <i className={`fa-solid ${s.icon}`}></i>
                     </div>
                     <span className="text-5xl font-black text-white tracking-tighter leading-none">{s.val}</span>
                     <span className="text-[10px] font-black text-gray-800 uppercase tracking-[0.4em]">{s.label}</span>
                  </div>
                ))}
             </div>

             <div className="flex justify-center border-b border-white/5 gap-20 lg:gap-40 overflow-x-auto no-scrollbar pb-10">
                {[
                  { id: 'links', label: 'Intercepted Nodes', icon: 'fa-diagram-project' },
                  { id: 'chats', label: 'Neural Echoes', icon: 'fa-microchip' },
                  { id: 'sources', label: 'Source Verification', icon: 'fa-fingerprint' }
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-6 pb-5 text-base font-black uppercase relative transition-all group whitespace-nowrap ${activeTab === t.id ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}>
                    <i className={`fa-solid ${t.icon} ${activeTab === t.id ? 'scale-125' : ''} transition-transform`}></i> {t.label}
                    {activeTab === t.id && <div className="absolute -bottom-10 left-0 right-0 h-2 bg-indigo-500 rounded-full shadow-[0_0_30px_rgba(79,70,229,0.8)] animate-pulse"></div>}
                  </button>
                ))}
             </div>

             <div className="min-h-[600px]">
               {activeTab === 'links' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {result.links.length === 0 ? (
                      <div className="col-span-full py-60 text-center bg-white/[0.01] rounded-[5rem] border border-dashed border-white/5 flex flex-col items-center gap-10">
                         <div className="w-40 h-40 rounded-full bg-white/[0.02] flex items-center justify-center text-gray-900 text-8xl mb-4 border border-white/5">
                            <i className="fa-solid fa-ghost"></i>
                         </div>
                         <p className="text-gray-700 font-black text-4xl uppercase tracking-widest italic leading-none">Signal Void Detected.</p>
                         <p className="text-gray-900 font-bold uppercase text-xs tracking-[0.6em] max-w-lg mx-auto">لم يتم العثور على إشارات رقمية ضمن هذا النطاق. يرجى تعديل معايير البحث.</p>
                      </div>
                    ) : (
                      result.links.map((link, idx) => (
                        <div key={link.id} style={{animationDelay: `${idx * 100}ms`}} className={`group bg-[#0c1221] border border-white/5 rounded-[4rem] p-12 hover:border-indigo-500/50 transition-all duration-700 shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 hover:-translate-y-4`}>
                           {link.isPrivate && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black px-10 py-4 rounded-bl-[2.5rem] uppercase tracking-tighter shadow-xl">Private Signal</div>}
                           <div className="flex justify-between items-start mb-14">
                              <div className={`w-20 h-20 rounded-[2rem] bg-white/[0.03] flex items-center justify-center text-4xl border border-white/5 text-indigo-400 transition-colors group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-500/30`}>
                                 <i className={`fa-brands fa-${link.platform.toLowerCase() === 'x' ? 'x-twitter' : link.platform.toLowerCase()}`}></i>
                              </div>
                              <div className="text-right">
                                <span className="text-3xl font-black text-white block tracking-tighter leading-none">{link.confidence}%</span>
                                <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest mt-2 block">Certainty</span>
                              </div>
                           </div>
                           <h4 className="text-3xl font-black text-white mb-8 line-clamp-2 group-hover:text-indigo-400 transition-colors leading-tight uppercase tracking-tight">{link.title}</h4>
                           <div className="flex flex-wrap gap-3 mb-10">
                              <span className="text-[10px] bg-white/[0.03] px-5 py-2.5 rounded-2xl text-gray-600 font-black uppercase tracking-widest border border-white/5">{link.location.country}</span>
                              {link.location.hospital && <span className="text-[10px] bg-emerald-500/5 px-5 py-2.5 rounded-2xl text-emerald-500 font-black uppercase tracking-widest border border-emerald-500/10">Hospital Node</span>}
                           </div>
                           <p className="text-gray-500 text-base italic mb-14 leading-relaxed font-medium line-clamp-3 group-hover:text-gray-300 transition-colors">{link.description}</p>
                           <div className="mt-auto pt-12 border-t border-white/5 flex items-center justify-between">
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black text-gray-800 uppercase tracking-[0.4em]">Node ID: {link.id.split('-')[2]}</span>
                              </div>
                              <button onClick={() => setConfirmingLink(link)} className={`px-14 py-6 rounded-[2.2rem] font-black text-xs uppercase shadow-2xl transition-all active:scale-95 ${link.platform === 'WhatsApp' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40'} text-white border border-white/5`}>Establish Link</button>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
               )}

               {activeTab === 'chats' && (
                  <div className="max-w-5xl mx-auto space-y-12">
                     {result.messages.length === 0 ? (
                       <div className="py-60 text-center text-gray-900 font-black text-3xl uppercase italic tracking-widest opacity-20">No Neural Intercepts.</div>
                     ) : (
                       result.messages.map((m, idx) => (
                         <div key={idx} style={{animationDelay: `${idx * 150}ms`}} className="bg-[#0c1221] border border-white/5 rounded-[4.5rem] p-14 flex flex-col md:flex-row gap-12 items-start group shadow-3xl hover:border-indigo-500/30 transition-all animate-in slide-in-from-right-10">
                            <div className="w-24 h-24 bg-indigo-600/5 rounded-[2.5rem] flex items-center justify-center text-indigo-500 font-black text-4xl border border-white/5 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xl">{m.author[0].toUpperCase()}</div>
                            <div className="flex-1">
                               <div className="flex justify-between items-center mb-10">
                                  <div className="flex flex-col">
                                     <span className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{m.author}</span>
                                     <span className="text-[11px] text-gray-700 font-black uppercase tracking-[0.6em] mt-3">{m.platform} Digital Footprint</span>
                                  </div>
                                  <div className="text-right">
                                     <span className="text-4xl font-black text-indigo-400 block tracking-tighter leading-none">{m.relevance}%</span>
                                     <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest mt-2 block">Correlation Score</span>
                                  </div>
                               </div>
                               <p className="text-gray-400 text-3xl italic pr-14 border-r-8 border-indigo-600/20 leading-relaxed font-medium group-hover:text-gray-200 transition-all">{m.content}</p>
                            </div>
                         </div>
                       ))}
                  </div>
               )}

               {activeTab === 'sources' && (
                  <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
                     {result.sources.map((s, idx) => (
                       <a key={idx} href={s.uri} target="_blank" className="bg-[#0c1221] border border-white/5 p-14 rounded-[4rem] flex items-center justify-between group hover:bg-white/[0.05] transition-all shadow-3xl relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-3 h-full bg-indigo-600 group-hover:w-5 transition-all"></div>
                          <div className="flex flex-col gap-5">
                             <span className="text-3xl font-black text-white group-hover:text-indigo-400 transition-colors truncate max-w-[320px] tracking-tighter uppercase">{s.title}</span>
                             <span className="text-xs text-gray-800 font-mono italic truncate max-w-[320px] opacity-40">{s.uri}</span>
                          </div>
                          <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center text-gray-800 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all border border-white/5 shadow-xl">
                             <i className="fa-solid fa-arrow-up-right-from-square text-3xl transition-all group-hover:rotate-12"></i>
                          </div>
                       </a>
                     ))}
                  </div>
               )}
             </div>
          </div>
        )}

        {/* Tactical Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto mt-20 p-24 bg-[#0c1221] border border-rose-500/20 rounded-[6rem] text-center shadow-[0_0_150px_rgba(244,63,94,0.15)] animate-in zoom-in duration-500">
             <div className="w-40 h-40 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-14 text-rose-500 border border-rose-500/20 relative">
                <i className="fa-solid fa-radiation text-7xl animate-pulse"></i>
                <div className="absolute inset-0 rounded-full border border-rose-500/30 animate-ping"></div>
             </div>
             <h3 className="text-6xl font-black text-white mb-10 uppercase tracking-tighter leading-none">SIGNAL BREACH</h3>
             <p className="text-rose-400/50 text-3xl mb-16 leading-relaxed italic max-w-2xl mx-auto font-medium">{error}</p>
             <button onClick={() => { setQuery(''); setError(null); }} className="px-32 py-8 bg-white/5 text-white font-black rounded-[2.5rem] border border-white/10 uppercase text-sm shadow-2xl hover:bg-white/10 transition-all active:scale-95">Reset Matrix</button>
          </div>
        )}

        {/* Hyper Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-[#010309]/98 backdrop-blur-4xl animate-fadeIn">
             <div className="w-80 h-80 rounded-full border-[3px] border-indigo-500/10 flex items-center justify-center relative mb-20">
                <div className="absolute inset-0 rounded-full border-t-[8px] border-indigo-600 animate-spin shadow-[0_0_40px_rgba(79,70,229,0.5)]"></div>
                <div className="absolute inset-14 rounded-full border-b-[8px] border-sky-600 animate-reverse-spin opacity-40"></div>
                <div className="absolute inset-24 rounded-full border-l-[8px] border-emerald-600 animate-spin opacity-20"></div>
                <i className="fa-solid fa-satellite-dish text-8xl text-white animate-pulse"></i>
             </div>
             <div className="text-center space-y-6">
                <h2 className="text-6xl font-black text-white uppercase tracking-[0.6em] animate-pulse leading-none">NEURAL SCANNING</h2>
                <div className="text-indigo-400/60 font-black text-xs uppercase tracking-[1em] mt-4">Intercepting Global Digital Signatures</div>
             </div>
             <div className="mt-16 flex gap-6">
                <span className="w-5 h-5 rounded-full bg-indigo-600 animate-bounce" style={{animationDelay: '0ms'}}></span>
                <span className="w-5 h-5 rounded-full bg-indigo-600 animate-bounce" style={{animationDelay: '200ms'}}></span>
                <span className="w-5 h-5 rounded-full bg-indigo-600 animate-bounce" style={{animationDelay: '400ms'}}></span>
             </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-16 text-center pointer-events-none opacity-20 z-0">
         <span className="text-[11px] font-black uppercase tracking-[2em] text-white">v16.0 ADVANCED NEURAL RECON • QUANTUM OSINT GRID • SIGNAL SECURED</span>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reverse-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .animate-fadeIn { animation: fadeIn 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-reverse-spin { animation: reverse-spin 5s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #312e81; border-radius: 20px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input::placeholder { color: #161c2b; transition: 0.7s; font-weight: 900; }
        input:focus::placeholder { opacity: 0; transform: translateX(50px); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .backdrop-blur-4xl { backdrop-filter: blur(80px); }
      `}</style>
    </div>
  );
};

export default App;
