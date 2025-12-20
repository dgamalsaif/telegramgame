
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
    const saved = localStorage.getItem('scout_v7.5_pro_history');
    if (saved) setHistory(JSON.parse(saved));
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 1400);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev.slice(-50), `[${timestamp}] ${msg}`]);
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
      setError("أدخل هدف البحث: معرف، تخصص، أو كلمة مفتاحية.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);
    setLoadingStep('Initializing Recon Engine v7.5 Ultra Pro...');

    addLog(`INITIATING ULTRA-PRECISE SCAN...`);
    
    try {
      setLoadingStep('Bypassing Network Firewall...');
      addLog(`Mode: ${searchType.toUpperCase()}`);
      addLog(`Target: ${finalQuery || 'Grid Search'}`);
      if (selectedPlatforms.length > 0) addLog(`Target Grids: ${selectedPlatforms.join(', ')}`);
      else addLog(`Target Grids: GLOBAL_ALL`);

      const data = await searchGlobalIntel({
        query: finalQuery,
        location: location || 'Global',
        town,
        hospital,
        specialty,
        platforms: selectedPlatforms,
        searchType,
        filters: { activeOnly: true, privateOnly: false, minConfidence: 90 }
      });

      setResult(data);
      addLog(`RECON SUCCESS: ${data.links.length} validated nodes intercepted.`);
      
      const newHistoryItem: SearchHistoryItem = {
        query: finalQuery || specialty || hospital,
        location, town, hospital,
        timestamp: new Date().toLocaleTimeString(),
        type: searchType
      };

      setHistory(prev => {
        const next = [newHistoryItem, ...prev.filter(i => i.query !== newHistoryItem.query)].slice(0, 15);
        localStorage.setItem('scout_v7.5_pro_history', JSON.stringify(next));
        return next;
      });

    } catch (err: any) {
      setError("فشل الاتصال بالشبكة الاستخباراتية. يرجى المحاولة لاحقاً.");
      addLog("CRITICAL ERROR: Matrix Synchronization Lost.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#010204] text-gray-200 font-cairo overflow-x-hidden selection:bg-indigo-600/50 relative">
      {/* Tactical Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,#010204_80%)] opacity-60"></div>
         <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#010204]/98 backdrop-blur-3xl animate-fadeIn">
           <div className="w-72 h-72 rounded-full border-2 border-indigo-500/10 flex items-center justify-center relative mb-12 shadow-[0_0_100px_rgba(79,70,229,0.2)]">
              <div className="absolute inset-0 rounded-full border-t-[4px] border-indigo-600 animate-spin"></div>
              <div className="absolute inset-6 rounded-full border-b-[4px] border-sky-400 animate-reverse-spin opacity-30"></div>
              <i className="fa-solid fa-satellite-dish text-7xl text-white animate-pulse"></i>
           </div>
           <h2 className="text-4xl lg:text-6xl font-black text-white uppercase tracking-[0.2em] leading-tight text-center px-4 drop-shadow-2xl">{loadingStep}</h2>
           <p className="text-indigo-400/50 font-mono text-[10px] uppercase tracking-widest mt-8 animate-pulse">Protocol Scout-Ops Ultra Pro v7.5</p>
        </div>
      )}

      {/* Link Confirmation Modal */}
      {confirmingLink && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-fadeIn">
          <div className="bg-[#080c14] border border-indigo-500/30 rounded-[3rem] p-12 max-w-lg w-full shadow-3xl space-y-8 relative overflow-hidden">
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
             <div className="text-center">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                   <i className={`fa-brands fa-${confirmingLink.platform.toLowerCase().replace('reddit', 'reddit-alien').replace('x', 'x-twitter')} text-4xl`}></i>
                </div>
                <h3 className="text-4xl font-black text-white uppercase tracking-tight">{confirmingLink.title}</h3>
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-[0.3em] mt-3 block">AUTHORIZED ACCESS GRANTED</span>
             </div>
             <div className="bg-black/80 p-6 rounded-2xl border border-white/5 font-mono text-xs text-indigo-300 break-all text-center select-all">
                {confirmingLink.url}
             </div>
             <div className="flex gap-4">
                <button onClick={() => setConfirmingLink(null)} className="flex-1 py-5 bg-white/5 rounded-2xl font-black text-[10px] uppercase text-gray-500 hover:text-white transition-all border border-transparent hover:border-white/10">Abort</button>
                <button onClick={() => { window.open(confirmingLink.url, '_blank'); setConfirmingLink(null); }} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:bg-indigo-500 transition-all">Establish Link</button>
             </div>
          </div>
        </div>
      )}

      {/* Terminal Sidebar */}
      <aside className={`fixed top-0 bottom-0 right-0 z-[120] bg-[#020408]/98 border-l border-white/5 transition-all duration-700 backdrop-blur-4xl shadow-2xl ${isSidebarOpen ? 'w-[400px]' : 'w-0 invisible translate-x-full'}`}>
        <div className="p-10 space-y-12 h-full overflow-y-auto flex flex-col no-scrollbar">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">COMMAND UNIT v7.5</span>
              <span className="text-[8px] font-bold text-gray-700 uppercase">OSINT ULTRA PRO ENGINE</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all border border-white/5"><i className="fa-solid fa-angles-right"></i></button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-6">
             <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-3">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               Live Intelligence Stream
             </label>
             <div ref={terminalRef} className="flex-1 bg-black/60 rounded-[2rem] border border-white/5 p-8 font-mono text-[11px] text-indigo-400/90 overflow-y-auto space-y-2 custom-scrollbar shadow-inner">
                {logs.length === 0 && <div className="opacity-10 italic">System ready. Awaiting reconnaissance parameters...</div>}
                {logs.map((log, i) => <div key={i} className="animate-fadeIn opacity-80 pl-4 border-l-2 border-indigo-500/20 leading-relaxed mb-2"> {log} </div>)}
             </div>
          </div>

          <div className="pt-8 border-t border-white/5">
             <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-6 block">Target History</label>
             <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setQuery(h.query); handleSearch(h.query); }} className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 text-[11px] font-black text-gray-500 hover:text-indigo-400 cursor-pointer truncate transition-all flex items-center gap-4 group">
                     <i className="fa-solid fa-history opacity-20 group-hover:opacity-100 transition-opacity"></i> {h.query}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </aside>

      {/* Main Grid */}
      <main className={`transition-all duration-700 p-6 lg:p-20 max-w-7xl mx-auto flex flex-col relative z-10 ${isSidebarOpen ? 'lg:mr-[400px]' : ''}`}>
        <header className="flex justify-between items-center mb-28">
           <div className="flex items-center gap-10">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="w-16 h-16 bg-[#080c14] border border-white/10 rounded-2xl text-indigo-500 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-3xl"><i className="fa-solid fa-bars-staggered text-xl"></i></button>
              )}
              <div className="flex flex-col">
                <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-none">SCOUT <span className="text-indigo-600">OPS</span></h1>
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-[1em] mt-4 flex items-center gap-4">
                   ULTRA PRO v7.5 ADVANCED
                </span>
              </div>
           </div>
        </header>

        {/* Tactical Control Hub */}
        <div className="max-w-5xl mx-auto w-full space-y-20 mb-40">
           <div className="text-center space-y-8">
              <h2 className="text-7xl lg:text-9xl font-black text-white leading-none tracking-tighter uppercase drop-shadow-2xl">PRECISION <span className="text-indigo-600">RECON</span></h2>
              <p className="text-gray-500 text-2xl lg:text-3xl italic font-medium leading-relaxed max-w-4xl mx-auto">
                النظام الاستقصائي المتطور v7.5 Pro: تتبع المجتمعات الطبية، الأكاديمية، والمهنية بدقة مطلقة عبر كافة منصات التواصل العالمية.
              </p>
           </div>

           {/* Enhanced Platform Hub */}
           <div className="flex flex-col gap-8 p-12 bg-[#080c14]/80 border border-white/5 rounded-[4rem] shadow-3xl backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="flex items-center justify-between mb-2">
                 <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">PLATFORM SELECTION GRID</label>
                 <div className="flex gap-4">
                    <button onClick={selectAllPlatforms} className="text-[9px] font-black text-indigo-400 uppercase hover:text-white transition-colors">Select All</button>
                    <span className="text-gray-800">/</span>
                    <button onClick={clearAllPlatforms} className="text-[9px] font-black text-rose-400 uppercase hover:text-white transition-colors">Clear All</button>
                 </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
                 {availablePlatforms.map(p => (
                    <button 
                      key={p.name}
                      onClick={() => togglePlatform(p.name as PlatformType)}
                      className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border transition-all group ${selectedPlatforms.includes(p.name as PlatformType) ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-105' : 'bg-white/[0.02] border-white/5 text-gray-800 hover:text-white hover:bg-white/5'}`}
                    >
                       <i className={`${p.icon} text-3xl group-hover:scale-110 transition-transform`}></i>
                       <span className="text-[9px] font-black uppercase tracking-tighter">{p.name}</span>
                    </button>
                 ))}
              </div>
           </div>

           {/* Operational Recon Modes */}
           <div className="flex justify-center gap-4 flex-wrap">
              {[
                { id: 'medical-recon', label: 'المجتمعات الطبية', icon: 'fa-hospital-user' },
                { id: 'mention-tracker', label: 'تتبع المنشورات', icon: 'fa-quote-left' },
                { id: 'specialty-hunt', label: 'تخصصات بورد/زمالة', icon: 'fa-user-graduate' },
                { id: 'user-id', label: 'معرفات المستخدمين', icon: 'fa-user-secret' },
                { id: 'signal-phone', label: 'تتبع رقم هاتف', icon: 'fa-phone-volume' },
                { id: 'deep-scan', label: 'مسح شامل وعميق', icon: 'fa-magnifying-glass-plus' }
              ].map(t => (
                <button key={t.id} onClick={() => { setSearchType(t.id as any); setResult(null); }} className={`px-10 py-6 rounded-[2.5rem] text-[11px] font-black uppercase border transition-all flex items-center gap-4 ${searchType === t.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-110' : 'bg-[#080c14] border-white/5 text-gray-700 hover:text-white hover:bg-white/5'}`}>
                   <i className={`fa-solid ${t.icon} text-lg`}></i> {t.label}
                </button>
              ))}
           </div>

           {/* Tactical Input Unit */}
           <div className="relative group">
              <div className="absolute -inset-6 bg-indigo-600/10 rounded-[5rem] blur-3xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000"></div>
              <div className="relative flex flex-col lg:flex-row bg-[#080c14] border border-white/10 rounded-[3rem] lg:rounded-full p-4 gap-4 shadow-3xl transition-all group-focus-within:border-indigo-500/50">
                 <div className="flex-1 flex items-center px-10 gap-10">
                    <i className="fa-solid fa-satellite-dish text-indigo-500 text-5xl"></i>
                    <input 
                      type="text" 
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder={searchType === 'mention-tracker' ? "أدخل الرابط أو الكلمة لتتبع ظهورها..." : "هدف البحث: موضوع، معرف، أو تخصص..."}
                      className="w-full bg-transparent py-6 lg:py-8 text-3xl lg:text-5xl font-black text-white focus:outline-none placeholder:text-gray-900 tracking-tighter"
                    />
                 </div>
                 <button onClick={() => handleSearch()} disabled={loading} className="px-20 py-8 rounded-full font-black text-base uppercase bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-2xl active:scale-95 flex items-center gap-4">
                   {loading ? <i className="fa-solid fa-sync animate-spin"></i> : <i className="fa-solid fa-crosshairs"></i>}
                   {loading ? 'EXECUTING...' : 'LAUNCH RECON'}
                 </button>
              </div>
           </div>

           {/* High-Scope Metadata Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { val: location, set: setLocation, ph: 'الدولة (عالمي)...', icon: 'fa-earth-americas' },
                { val: town, set: setTown, ph: 'المدينة/القطاع...', icon: 'fa-city' },
                { val: hospital, set: setHospital, ph: 'المرفق الطبي...', icon: 'fa-hospital' },
                { val: specialty, set: setSpecialty, ph: 'التخصص (Fellow, Board)...', icon: 'fa-stethoscope' }
              ].map((f, i) => (
                <div key={i} className="flex items-center bg-[#080c14]/60 border border-white/5 rounded-3xl px-10 py-7 group/input focus-within:border-indigo-500/30 transition-all shadow-sm backdrop-blur-md">
                   <i className={`fa-solid ${f.icon} text-indigo-500/20 group-hover/input:text-indigo-500 transition-colors mr-6 text-2xl`}></i>
                   <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="bg-transparent text-base font-black focus:outline-none w-full text-gray-400 placeholder:text-gray-800 tracking-tight" />
                </div>
              ))}
           </div>
        </div>

        {/* Intelligence Data Display */}
        {result && (
          <div className="space-y-32 animate-fadeIn pb-80">
             {/* Stats HUD */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
                {[
                  { label: 'Total Interceptions', val: result.stats.totalFound, icon: 'fa-bolt', color: 'text-indigo-400' },
                  { label: 'Validated Nodes', val: result.links.length, icon: 'fa-link', color: 'text-sky-400' },
                  { label: 'Medical Matches', val: result.stats.medicalMatches, icon: 'fa-heart-pulse', color: 'text-rose-400' },
                  { label: 'Signal Confidence', val: '99%', icon: 'fa-crosshairs', color: 'text-emerald-400' }
                ].map(s => (
                  <div key={s.label} className="bg-[#080c14] border border-white/5 p-14 rounded-[4rem] flex flex-col items-center text-center gap-6 hover:border-indigo-500/20 transition-all shadow-3xl group relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                     <i className={`fa-solid ${s.icon} ${s.color} text-3xl group-hover:scale-125 transition-transform drop-shadow-lg`}></i>
                     <span className="text-6xl font-black text-white tracking-tighter">{s.val}</span>
                     <span className="text-[10px] font-black text-gray-800 uppercase tracking-[0.4em]">{s.label}</span>
                  </div>
                ))}
             </div>

             {/* Tab Control */}
             <div className="flex justify-center border-b border-white/5 gap-20 lg:gap-40 overflow-x-auto no-scrollbar pb-8">
                {[
                  { id: 'links', label: 'Captured Communities', icon: 'fa-diagram-project' },
                  { id: 'chats', label: 'Message Echoes', icon: 'fa-comment-dots' },
                  { id: 'sources', label: 'Platform Verification', icon: 'fa-fingerprint' }
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-6 pb-6 text-sm font-black uppercase relative transition-all ${activeTab === t.id ? 'text-indigo-400 scale-110' : 'text-gray-600 hover:text-gray-400'}`}>
                    <i className={`fa-solid ${t.icon} text-lg`}></i> {t.label}
                    {activeTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_30px_rgba(99,102,241,1)]"></div>}
                  </button>
                ))}
             </div>

             {/* Viewport Content */}
             <div className="min-h-[600px]">
               {activeTab === 'links' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
                    {result.links.length === 0 ? (
                      <div className="col-span-full py-60 text-center opacity-10 italic font-black text-5xl uppercase tracking-[0.5em]">No Intelligence Logged</div>
                    ) : (
                      result.links.map(link => (
                        <div key={link.id} className="group bg-[#080c14] border border-white/5 rounded-[4rem] p-14 hover:border-indigo-500/40 transition-all shadow-4xl flex flex-col relative overflow-hidden animate-fadeIn backdrop-blur-md">
                           {link.isPrivate && <div className="absolute top-0 right-0 bg-indigo-700 text-white text-[9px] font-black px-10 py-3 rounded-bl-3xl uppercase tracking-widest shadow-2xl">SECURE NODE</div>}
                           <div className="flex justify-between items-start mb-12">
                              <div className="w-20 h-20 rounded-[2rem] bg-white/[0.03] flex items-center justify-center text-5xl border border-white/5 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-3xl">
                                 <i className={`fa-brands fa-${link.platform.toLowerCase().replace('reddit', 'reddit-alien').replace('x', 'x-twitter')}`}></i>
                              </div>
                              <div className="text-right">
                                <span className="text-3xl font-black text-white block tracking-tighter leading-none">{link.platform}</span>
                                <span className="text-[9px] font-black text-gray-800 uppercase tracking-widest mt-3 block">{link.confidence}% VALIDATION</span>
                              </div>
                           </div>
                           <h4 className="text-3xl font-black text-white mb-8 uppercase tracking-tight line-clamp-2 h-20 group-hover:text-indigo-400 transition-colors">{link.title}</h4>
                           <div className="flex flex-wrap gap-3 mb-10">
                              <span className="text-[10px] bg-white/[0.03] px-6 py-3 rounded-2xl text-indigo-300 font-black uppercase border border-white/5">{link.location.country || 'GLOBAL'}</span>
                              {link.location.specialty && <span className="text-[10px] bg-emerald-500/20 px-6 py-3 rounded-2xl text-emerald-400 font-black uppercase">🎓 {link.location.specialty}</span>}
                              {link.source.type === 'Mention' && <span className="text-[10px] bg-amber-500/20 px-6 py-3 rounded-2xl text-amber-400 font-black uppercase tracking-widest">MENTION DETECTED</span>}
                           </div>
                           <p className="text-gray-600 text-base italic mb-14 line-clamp-3 leading-relaxed font-medium">{link.description}</p>
                           {link.source.context && (
                             <div className="mb-12 p-6 bg-black/50 rounded-3xl border border-white/5 text-[11px] text-indigo-300 italic shadow-inner">
                               <span className="text-[9px] uppercase font-black block mb-3 opacity-50 tracking-widest">Signal Context:</span>
                               {link.source.context}
                             </div>
                           )}
                           <button onClick={() => setConfirmingLink(link)} className="mt-auto px-12 py-6 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase shadow-4xl transition-all active:scale-95">Establish Secure Link</button>
                        </div>
                      ))
                    )}
                  </div>
               )}

               {activeTab === 'chats' && (
                  <div className="max-w-5xl mx-auto space-y-12">
                     {result.messages.length === 0 ? (
                       <div className="py-60 text-center opacity-10 italic font-black text-5xl uppercase tracking-[0.5em]">No Signal Echoes Captured</div>
                     ) : (
                       result.messages.map((m, idx) => (
                        <div key={idx} className="bg-[#080c14] border border-white/5 rounded-[5rem] p-16 flex gap-14 items-start shadow-4xl group animate-fadeIn transition-all hover:bg-white/[0.01]">
                           <div className="w-20 h-20 bg-white/[0.03] rounded-3xl flex items-center justify-center text-indigo-500 font-black text-5xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-3xl">{(m.author || "U")[0]}</div>
                           <div className="flex-1">
                              <div className="flex justify-between items-center mb-10">
                                 <span className="text-4xl font-black text-white uppercase tracking-tight">{m.author}</span>
                                 <div className="flex items-center gap-6">
                                    <span className="text-[11px] bg-white/5 px-6 py-3 rounded-full text-gray-700 font-black uppercase">{m.platform}</span>
                                    <span className="text-indigo-400 font-black text-3xl tracking-tighter">{m.relevance}%</span>
                                 </div>
                              </div>
                              <p className="text-gray-400 text-3xl italic pr-14 border-r-8 border-indigo-600/30 leading-relaxed font-medium group-hover:text-gray-200 transition-all">{m.content}</p>
                           </div>
                        </div>
                       ))
                     )}
                  </div>
               )}

               {activeTab === 'sources' && (
                  <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
                     {result.sources.map((s, idx) => (
                       <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="bg-[#080c14] border border-white/5 p-14 rounded-[4rem] flex items-center justify-between group hover:bg-white/[0.03] transition-all shadow-3xl animate-fadeIn">
                          <div className="flex flex-col">
                             <span className="text-2xl font-black text-gray-300 group-hover:text-indigo-400 truncate max-w-[320px] uppercase tracking-tight transition-colors">{s.title}</span>
                             <span className="text-[9px] text-gray-800 font-black mt-3 uppercase tracking-widest">OFFICIAL DATA NODE</span>
                          </div>
                          <i className="fa-solid fa-arrow-up-right-from-square text-2xl text-gray-800 group-hover:text-white transition-all"></i>
                       </a>
                     ))}
                  </div>
               )}
             </div>
          </div>
        )}

        {/* Error Handling */}
        {error && (
          <div className="max-w-3xl mx-auto mt-28 p-24 bg-[#080c14] border border-rose-500/20 rounded-[6rem] text-center shadow-4xl animate-fadeIn">
             <i className="fa-solid fa-triangle-exclamation text-8xl text-rose-500 mb-12 animate-pulse"></i>
             <h3 className="text-6xl font-black text-white mb-10 uppercase tracking-tighter leading-none">Matrix Desync</h3>
             <p className="text-rose-400/60 mb-16 italic text-3xl font-medium leading-relaxed">{error}</p>
             <button onClick={() => { setQuery(''); setError(null); }} className="px-20 py-8 bg-white/5 text-white font-black rounded-3xl uppercase border border-white/10 hover:bg-white/10 transition-all tracking-[0.4em] text-[11px]">RESET NEURAL LINK</button>
          </div>
        )}
      </main>

      {/* Decorative OSINT Footer HUD */}
      <footer className="fixed bottom-0 left-0 right-0 p-14 text-center pointer-events-none opacity-20 z-0">
         <span className="text-[12px] font-black uppercase tracking-[2em] text-white">SCOUT OPS v7.5 ULTRA PRO • MEDICAL OSINT AUTHORITY • SECURED GRID NODE</span>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes reverse-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .animate-fadeIn { animation: fadeIn 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-reverse-spin { animation: reverse-spin 8s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e1b4b; border-radius: 20px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input::placeholder { color: #1a1e26; transition: 0.8s; font-weight: 900; }
        input:focus::placeholder { opacity: 0; transform: translateX(50px); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .backdrop-blur-4xl { backdrop-filter: blur(100px); }
      `}</style>
    </div>
  );
};

export default App;
