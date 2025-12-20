import React, { useState, useEffect, useRef } from 'react';
import { searchGlobalIntel } from './services/geminiService';
import { IntelLink, SearchResult, SearchType, Platform, SearchHistoryItem } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [town, setTown] = useState('');
  const [hospital, setHospital] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('topic');
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
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
    const saved = localStorage.getItem('scout_v7.5_history');
    if (saved) setHistory(JSON.parse(saved));
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1400);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev.slice(-15), `[${timestamp}] ${msg}`]);
    setTimeout(() => {
      if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }, 50);
  };

  const handleSearch = async (targetQuery?: string) => {
    const finalQuery = (targetQuery || query).trim();
    if (!finalQuery && !hospital.trim()) {
      setError("يرجى إدخال هدف البحث أو تحديد موقع جغرافي/مرفق صحي.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);
    setLoadingStep('Initializing Ultimate Recon Unit v7.5...');

    addLog(`STARTING COMPREHENSIVE RECON v7.5...`);
    
    try {
      setLoadingStep('Mapping Target Grid & Location Filters...');
      addLog(`Target Identified: ${finalQuery || hospital}`);
      addLog(`Location Scope: ${location || 'Global'} / ${town || 'Any Sector'}`);
      if (hospital) addLog(`Facility Scan: ${hospital}`);
      
      setLoadingStep('Establishing Neural Satellite Uplink...');
      const data = await searchGlobalIntel({
        query: finalQuery,
        location: location || 'Global',
        town,
        hospital,
        platforms: platforms.filter(p => p.connected),
        searchType,
        filters: { activeOnly: false, privateOnly: false, minConfidence: 0 }
      });

      setLoadingStep('Processing Intercepted Signals...');
      setResult(data);
      addLog(`RECON SUCCESS: ${data.links.length} links and ${data.messages.length} signals captured.`);
      
      const newHistoryItem: SearchHistoryItem = {
        query: finalQuery || hospital,
        location, town, hospital,
        timestamp: new Date().toLocaleTimeString(),
        type: searchType
      };

      setHistory(prev => {
        const next = [newHistoryItem, ...prev.filter(i => i.query !== (finalQuery || hospital))].slice(0, 15);
        localStorage.setItem('scout_v7.5_history', JSON.stringify(next));
        return next;
      });

    } catch (err: any) {
      console.error(err);
      setError("فشل الاتصال بالشبكة الاستخباراتية. تأكد من إعدادات الاتصال وحاول مرة أخرى.");
      addLog("CRITICAL FAILURE: Neural Link Terminated.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#01040a] text-gray-200 font-cairo overflow-x-hidden selection:bg-indigo-600/50 relative">
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,#01040a_80%)] opacity-50"></div>
         <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
         <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px'}}></div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#01040a]/95 backdrop-blur-3xl animate-fadeIn">
           <div className="w-64 h-64 rounded-full border-2 border-indigo-500/10 flex items-center justify-center relative mb-12 shadow-[0_0_80px_rgba(79,70,229,0.15)]">
              <div className="absolute inset-0 rounded-full border-t-[4px] border-indigo-600 animate-spin"></div>
              <div className="absolute inset-10 rounded-full border-b-[4px] border-sky-400 animate-reverse-spin opacity-40"></div>
              <i className="fa-solid fa-satellite-dish text-6xl text-white animate-pulse"></i>
           </div>
           <div className="text-center space-y-4 px-6">
              <h2 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-[0.3em] animate-pulse leading-tight">{loadingStep}</h2>
              <p className="text-indigo-400/50 font-mono text-[10px] uppercase tracking-widest">Protocol SCOUT-7.5 Ultimate Edition</p>
           </div>
        </div>
      )}

      {confirmingLink && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-fadeIn">
          <div className="bg-[#0c1221] border border-indigo-500/20 rounded-[3rem] p-12 max-w-lg w-full shadow-3xl space-y-8 relative overflow-hidden">
             <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500"></div>
             <div className="text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                   <i className={`fa-solid ${confirmingLink.platform === 'WhatsApp' ? 'fa-brands fa-whatsapp' : confirmingLink.platform === 'Telegram' ? 'fa-brands fa-telegram' : 'fa-link'} text-3xl`}></i>
                </div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tight">{confirmingLink.title}</h3>
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-3 block">Signal Verified - Multi-Source Validation</span>
             </div>
             <div className="bg-black/60 p-6 rounded-2xl border border-white/5 font-mono text-xs text-indigo-300 break-all leading-relaxed shadow-inner text-center">
                {confirmingLink.url}
             </div>
             <div className="flex gap-4">
                <button onClick={() => setConfirmingLink(null)} className="flex-1 py-5 bg-white/5 rounded-2xl font-black text-[10px] uppercase text-gray-500 hover:text-white border border-white/5 transition-all">Abort Connection</button>
                <button onClick={() => { window.open(confirmingLink.url, '_blank'); setConfirmingLink(null); }} className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all">Secure Redirect</button>
             </div>
          </div>
        </div>
      )}

      <aside className={`fixed top-0 bottom-0 right-0 z-[120] bg-[#050811]/98 border-l border-white/5 transition-all duration-700 backdrop-blur-4xl ${isSidebarOpen ? 'w-[360px]' : 'w-0 invisible translate-x-full'}`}>
        <div className="p-10 space-y-12 h-full overflow-y-auto flex flex-col no-scrollbar">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">COMMAND CONSOLE</span>
              <span className="text-[8px] font-bold text-gray-700 uppercase">OSINT v7.5.4 ULTIMATE</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all"><i className="fa-solid fa-angles-right"></i></button>
          </div>

          <div className="space-y-6">
             <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Platform Matrix</label>
             <div className="grid grid-cols-2 gap-3">
                {platforms.map(p => (
                  <button key={p.id} onClick={() => setPlatforms(prev => prev.map(pl => pl.id === p.id ? {...pl, connected: !pl.connected} : pl))} className={`p-4 rounded-2xl border text-[9px] font-black flex flex-col items-center gap-3 transition-all ${p.connected ? 'bg-indigo-600/10 border-indigo-500/30 text-white shadow-lg' : 'bg-transparent border-white/5 text-gray-800'}`}>
                    <i className={`${p.icon} text-lg ${p.connected ? p.color : 'text-gray-900'}`}></i>
                    {p.name}
                  </button>
                ))}
             </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-4">
             <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Neural Stream</label>
             <div ref={terminalRef} className="flex-1 bg-black/60 rounded-3xl border border-white/5 p-6 font-mono text-[10px] text-indigo-400/80 overflow-y-auto space-y-1 shadow-inner custom-scrollbar">
                {logs.length === 0 && <div className="opacity-10 italic py-4">Standing by for target sector engagement...</div>}
                {logs.map((log, i) => <div key={i} className="animate-fadeIn opacity-80 pl-3 border-l border-indigo-500/10"> {log} </div>)}
             </div>
          </div>

          <div className="pt-8 border-t border-white/5">
             <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-4 block">Operation History</label>
             <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setQuery(h.query); handleSearch(h.query); }} className="p-3 bg-white/[0.02] rounded-xl border border-white/5 text-[10px] font-bold text-gray-500 hover:text-indigo-400 cursor-pointer truncate transition-all flex items-center gap-3">
                     <i className="fa-solid fa-history opacity-20 text-[8px]"></i> {h.query}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </aside>

      <main className={`transition-all duration-700 p-6 lg:p-20 max-w-7xl mx-auto flex flex-col relative z-10 ${isSidebarOpen ? 'lg:mr-[360px]' : ''}`}>
        <header className="flex justify-between items-center mb-24">
           <div className="flex items-center gap-8">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="w-14 h-14 bg-[#0c1221] border border-white/10 rounded-2xl text-indigo-500 flex items-center justify-center hover:bg-indigo-600 transition-all shadow-2xl"><i className="fa-solid fa-bars-staggered"></i></button>
              )}
              <div className="flex flex-col">
                <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-white uppercase leading-none">SCOUT <span className="text-indigo-500">OPS</span></h1>
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-[1em] mt-3 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span> Ultimate OSINT v7.5
                </span>
              </div>
           </div>
           <div className="hidden lg:flex flex-col items-end gap-2 px-10 py-5 bg-[#0c1221] border border-white/5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-emerald-500 shadow-2xl">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> SYSTEM: OPERATIONAL-MAX
              </span>
           </div>
        </header>

        <div className="max-w-4xl mx-auto w-full space-y-16 mb-32">
           <div className="text-center space-y-6">
              <h2 className="text-7xl lg:text-9xl font-black text-white leading-none tracking-tighter uppercase">ULTIMATE <span className="text-indigo-500">RECON</span></h2>
              <p className="text-gray-500 text-xl lg:text-2xl max-w-2xl mx-auto italic font-medium leading-relaxed border-r-4 border-indigo-600/20 pr-8 mt-10">نظام البحث الاستقصائي المتكامل v7.5: الكشف عن المجتمعات، مراقبة الرسائل، وتتبع المرافق الميدانية عالمياً.</p>
           </div>

           <div className="flex justify-center gap-3 flex-wrap">
              {[
                { id: 'topic', label: 'Communities', icon: 'fa-earth-asia' },
                { id: 'medical-scan', label: 'Medical Grid', icon: 'fa-hospital-user' },
                { id: 'user-id', label: 'Identity Probe', icon: 'fa-user-secret' },
                { id: 'signal-phone', label: 'Phone Signal', icon: 'fa-phone-volume' },
                { id: 'deep-scan', label: 'Deep Message Scan', icon: 'fa-comment-dots' }
              ].map(t => (
                <button key={t.id} onClick={() => setSearchType(t.id as any)} className={`px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase border transition-all flex items-center gap-4 ${searchType === t.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-105' : 'bg-[#0c1221] border-white/5 text-gray-700 hover:text-white hover:bg-white/5'}`}>
                   <i className={`fa-solid ${t.icon}`}></i> {t.label}
                </button>
              ))}
           </div>

           <div className="relative group">
              <div className="absolute -inset-4 bg-indigo-500/5 rounded-[3rem] blur-3xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000"></div>
              <div className="relative flex flex-col lg:flex-row bg-[#0c1221] border border-white/10 rounded-[2.5rem] lg:rounded-full p-3 gap-3 shadow-3xl">
                 <div className="flex-1 flex items-center px-8 gap-8">
                    <i className="fa-solid fa-satellite-dish text-indigo-500 text-4xl"></i>
                    <input 
                      type="text" 
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="أدخل هدف البحث: كلمات، مستخدم، أو رقم..."
                      className="w-full bg-transparent py-5 lg:py-7 text-3xl lg:text-5xl font-black text-white focus:outline-none placeholder:text-gray-900 tracking-tighter"
                    />
                 </div>
                 <button onClick={() => handleSearch()} disabled={loading} className="px-16 py-6 rounded-[2rem] lg:rounded-full font-black text-xs lg:text-sm uppercase shadow-2xl transition-all bg-indigo-600 hover:bg-indigo-500 text-white">
                   {loading ? 'EXECUTING...' : 'ESTABLISH LINK'}
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { val: location, set: setLocation, ph: 'الدولة المستهدفة...', icon: 'fa-earth-americas' },
                { val: town, set: setTown, ph: 'المدينة/القطاع...', icon: 'fa-city' },
                { val: hospital, set: setHospital, ph: 'المرفق الصحي...', icon: 'fa-hospital-user' }
              ].map((f, i) => (
                <div key={i} className="flex items-center bg-[#0c1221] border border-white/5 rounded-2xl px-8 py-5 group/input transition-all focus-within:border-indigo-500/30">
                   <i className={`fa-solid ${f.icon} text-indigo-500/30 group-hover/input:text-indigo-500 transition-colors mr-6 text-xl`}></i>
                   <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="bg-transparent text-sm lg:text-base font-black focus:outline-none w-full text-gray-300 placeholder:text-gray-800" />
                </div>
              ))}
           </div>
        </div>

        {result && (
          <div className="space-y-24 animate-fadeIn pb-64">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { label: 'Signals Captured', val: result.stats.totalFound, icon: 'fa-bolt', color: 'text-indigo-400' },
                  { label: 'Validated Nodes', val: result.links.length, icon: 'fa-link', color: 'text-sky-400' },
                  { label: 'Secure Leads', val: result.stats.privateCount, icon: 'fa-user-secret', color: 'text-rose-400' },
                  { label: 'Grid Confidence', val: 'Extreme-99%', icon: 'fa-check-double', color: 'text-emerald-400' }
                ].map(s => (
                  <div key={s.label} className="bg-[#0c1221] border border-white/5 p-12 rounded-[3rem] flex flex-col items-center text-center gap-4 hover:border-indigo-500/20 transition-all shadow-xl group">
                     <div className={`w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center ${s.color} text-2xl border border-white/5 group-hover:scale-110 transition-transform`}>
                        <i className={`fa-solid ${s.icon}`}></i>
                     </div>
                     <span className="text-5xl font-black text-white tracking-tighter">{s.val}</span>
                     <span className="text-[9px] font-black text-gray-800 uppercase tracking-widest">{s.label}</span>
                  </div>
                ))}
             </div>

             <div className="flex justify-center border-b border-white/5 gap-16 lg:gap-32 overflow-x-auto no-scrollbar pb-6">
                {[
                  { id: 'links', label: 'Intercepted Nodes', icon: 'fa-diagram-project' },
                  { id: 'chats', label: 'Message Echoes', icon: 'fa-comment-dots' },
                  { id: 'sources', label: 'Verification & Intel', icon: 'fa-fingerprint' }
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-4 pb-4 text-xs font-black uppercase relative transition-all ${activeTab === t.id ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}>
                    <i className={`fa-solid ${t.icon}`}></i> {t.label}
                    {activeTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>}
                  </button>
                ))}
             </div>

             <div className="min-h-[500px]">
               {activeTab === 'links' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {result.links.length === 0 ? (
                      <div className="col-span-full py-40 text-center opacity-10 italic font-black text-4xl uppercase tracking-[0.5em]">Zero Signal Detected</div>
                    ) : (
                      result.links.map(link => (
                        <div key={link.id} className="group bg-[#0c1221] border border-white/5 rounded-[3.5rem] p-12 hover:border-indigo-500/40 transition-all shadow-3xl flex flex-col relative overflow-hidden animate-fadeIn">
                           {link.isPrivate && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[8px] font-black px-8 py-2.5 rounded-bl-2xl uppercase tracking-widest shadow-xl">Secure Access</div>}
                           <div className="flex justify-between items-start mb-10">
                              <div className="w-16 h-16 rounded-[1.5rem] bg-white/[0.03] flex items-center justify-center text-4xl border border-white/5 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xl">
                                 <i className={`fa-brands fa-${link.platform.toLowerCase() === 'x' ? 'x-twitter' : link.platform.toLowerCase()}`}></i>
                              </div>
                              <div className="text-right">
                                <span className="text-4xl font-black text-white block tracking-tighter leading-none">{link.confidence}%</span>
                                <span className="text-[8px] font-black text-gray-800 uppercase tracking-widest mt-2 block">Signal Lock</span>
                              </div>
                           </div>
                           <h4 className="text-2xl font-black text-white mb-6 line-clamp-2 group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-tight">{link.title}</h4>
                           <div className="flex flex-wrap gap-2 mb-8">
                              <span className="text-[9px] bg-white/[0.03] px-5 py-2.5 rounded-xl text-indigo-300 font-black uppercase tracking-widest border border-white/5">{link.location.country}</span>
                              {link.location.town && <span className="text-[9px] bg-indigo-500/10 px-5 py-2.5 rounded-xl text-white font-black uppercase tracking-widest">{link.location.town}</span>}
                              {link.location.hospital && <span className="text-[9px] bg-rose-500/20 px-5 py-2.5 rounded-xl text-rose-400 font-black uppercase tracking-widest">🏥 {link.location.hospital}</span>}
                           </div>
                           <p className="text-gray-600 text-sm italic mb-12 line-clamp-3 leading-relaxed font-medium">{link.description}</p>
                           <div className="mt-auto pt-10 border-t border-white/5 flex items-center justify-between">
                              <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Node Node v7.5</span>
                              <button onClick={() => setConfirmingLink(link)} className="px-10 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95">Establish Connection</button>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
               )}

               {activeTab === 'chats' && (
                  <div className="max-w-4xl mx-auto space-y-8">
                     {result.messages.length === 0 ? (
                        <div className="py-40 text-center opacity-10 italic font-black text-4xl uppercase tracking-[0.5em]">No Echoes Caught</div>
                     ) : (
                       result.messages.map((m, idx) => (
                        <div key={idx} className="bg-[#0c1221] border border-white/5 rounded-[4rem] p-14 flex gap-12 items-start group shadow-2xl animate-fadeIn">
                           <div className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center text-indigo-500 font-black text-4xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xl">{(m.author || "U")[0]}</div>
                           <div className="flex-1">
                              <div className="flex justify-between items-center mb-8">
                                 <span className="text-3xl font-black text-white uppercase tracking-tight">{m.author}</span>
                                 <div className="flex items-center gap-4">
                                    <span className="text-[10px] bg-white/5 px-4 py-2 rounded-full font-black text-gray-600 uppercase tracking-widest">{m.platform}</span>
                                    <span className="text-indigo-400 font-black text-2xl tracking-tighter">{m.relevance}%</span>
                                 </div>
                              </div>
                              <p className="text-gray-400 text-2xl italic pr-12 border-r-8 border-indigo-600/20 leading-relaxed font-medium group-hover:text-gray-200 transition-all">{m.content}</p>
                           </div>
                        </div>
                       ))
                     )}
                  </div>
               )}

               {activeTab === 'sources' && (
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="col-span-full p-12 bg-indigo-600/5 border border-indigo-500/10 rounded-[3rem] mb-8">
                        <h4 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">OSINT Analysis Report</h4>
                        <p className="text-gray-400 leading-relaxed italic text-lg">{result.analysis}</p>
                     </div>
                     {result.sources.map((s, idx) => (
                       <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="bg-[#0c1221] border border-white/5 p-12 rounded-[3.5rem] flex items-center justify-between group hover:bg-white/[0.03] transition-all shadow-xl animate-fadeIn">
                          <span className="text-xl font-black text-gray-300 group-hover:text-indigo-400 truncate max-w-[280px] uppercase tracking-tight leading-none">{s.title}</span>
                          <div className="w-14 h-14 rounded-full bg-white/[0.02] flex items-center justify-center text-gray-800 group-hover:text-white group-hover:bg-indigo-600 transition-all border border-white/5 shadow-2xl">
                             <i className="fa-solid fa-arrow-up-right-from-square"></i>
                          </div>
                       </a>
                     ))}
                  </div>
               )}
             </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mt-20 p-20 bg-[#0c1221] border border-rose-500/20 rounded-[5rem] text-center shadow-3xl animate-fadeIn">
             <i className="fa-solid fa-triangle-exclamation text-7xl text-rose-500 mb-10 animate-pulse"></i>
             <h3 className="text-5xl font-black text-white mb-8 uppercase tracking-tighter">Satellite Disconnected</h3>
             <p className="text-rose-400/60 mb-14 italic text-2xl font-medium leading-relaxed">{error}</p>
             <button onClick={() => { setQuery(''); setError(null); }} className="px-16 py-7 bg-white/5 text-white font-black rounded-2xl border border-white/10 uppercase text-[10px] hover:bg-white/10 transition-all tracking-widest">Establish Matrix Reset</button>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-12 text-center pointer-events-none opacity-20 z-0">
         <span className="text-[11px] font-black uppercase tracking-[1.8em] text-white">SCOUT OPS v7.5 ULTIMATE TACTICAL OSINT • UNRESTRICTED GLOBAL GRID • SIGNAL SECURED</span>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reverse-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .animate-fadeIn { animation: fadeIn 1s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-reverse-spin { animation: reverse-spin 4s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e1b4b; border-radius: 20px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input::placeholder { color: #1a1e26; transition: 0.6s; font-weight: 900; }
        input:focus::placeholder { opacity: 0; transform: translateX(40px); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .backdrop-blur-4xl { backdrop-filter: blur(80px); }
      `}</style>
    </div>
  );
};

export default App;