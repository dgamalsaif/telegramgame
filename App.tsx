
import React, { useState, useEffect, useRef } from 'react';
import { searchGlobalIntel } from './services/geminiService';
import { IntelLink, SearchResult, PlatformType, SearchMode, SearchParams } from './types';

// --- Assets & Data ---
const ALL_PLATFORMS: { id: PlatformType; icon: string; color: string }[] = [
  { id: 'Telegram', icon: 'fa-brands fa-telegram', color: 'text-sky-400' },
  { id: 'WhatsApp', icon: 'fa-brands fa-whatsapp', color: 'text-emerald-400' },
  { id: 'Discord', icon: 'fa-brands fa-discord', color: 'text-indigo-400' },
  { id: 'LinkedIn', icon: 'fa-brands fa-linkedin', color: 'text-blue-500' },
  { id: 'X', icon: 'fa-brands fa-x-twitter', color: 'text-white' },
  { id: 'Facebook', icon: 'fa-brands fa-facebook', color: 'text-blue-600' },
  { id: 'Instagram', icon: 'fa-brands fa-instagram', color: 'text-pink-500' },
  { id: 'Reddit', icon: 'fa-brands fa-reddit', color: 'text-orange-500' },
  { id: 'TikTok', icon: 'fa-brands fa-tiktok', color: 'text-pink-400' },
];

const SEARCH_MODES: { id: SearchMode; label: string; icon: string }[] = [
  { id: 'discovery', label: 'Keyword Discovery', icon: 'fa-solid fa-radar' },
  { id: 'username', label: 'Username / Handle', icon: 'fa-solid fa-at' },
  { id: 'phone', label: 'Phone Lookup', icon: 'fa-solid fa-phone' },
  { id: 'medical-residency', label: 'Medical Board/Residency', icon: 'fa-solid fa-user-doctor' },
];

// --- Components ---

const FilterSidebar = ({ 
  platforms, 
  setPlatforms, 
  geo, 
  setGeo, 
  medical, 
  setMedical,
  mode 
}: any) => {
  const togglePlatform = (p: PlatformType) => {
    if (platforms.includes(p)) setPlatforms(platforms.filter((x: any) => x !== p));
    else setPlatforms([...platforms, p]);
  };

  return (
    <div className="w-full lg:w-72 bg-[#0a0c10] border-l border-white/5 p-6 flex flex-col gap-8 h-full overflow-y-auto">
      {/* Geo Filters */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-globe"></i> Geography
        </h3>
        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="Country (e.g. Egypt, USA)"
            value={geo.country || ''}
            onChange={e => setGeo({ ...geo, country: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-colors"
          />
          <input 
            type="text" 
            placeholder="City / Town"
            value={geo.city || ''}
            onChange={e => setGeo({ ...geo, city: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-colors"
          />
          <input 
            type="text" 
            placeholder="Institution / Hospital"
            value={geo.institution || ''}
            onChange={e => setGeo({ ...geo, institution: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Medical Filters (Conditional) */}
      {mode === 'medical-residency' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
          <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-stethoscope"></i> Medical Scope
          </h3>
          <div className="space-y-3">
             <input 
              type="text" 
              placeholder="Specialty (e.g. Cardiology)"
              value={medical.specialty || ''}
              onChange={e => setMedical({ ...medical, specialty: e.target.value })}
              className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-xs font-bold text-emerald-100 focus:border-emerald-500 outline-none transition-colors"
            />
            <select 
              value={medical.level || 'Residency'}
              onChange={e => setMedical({ ...medical, level: e.target.value })}
              className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-xs font-bold text-emerald-100 focus:border-emerald-500 outline-none"
            >
              <option value="Residency">Residency</option>
              <option value="Fellowship">Fellowship</option>
              <option value="Board">Board Certification</option>
              <option value="Internship">Internship</option>
              <option value="Research">Research Group</option>
            </select>
          </div>
        </div>
      )}

      {/* Platform Filters */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-layer-group"></i> Target Vectors
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => togglePlatform(p.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${
                platforms.includes(p.id) 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-black border-white/5 text-slate-500 hover:border-white/20'
              }`}
            >
              <i className={p.icon}></i>
              {p.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---

const App: React.FC = () => {
  // State
  const [mode, setMode] = useState<SearchMode>('discovery');
  const [query, setQuery] = useState('');
  const [platforms, setPlatforms] = useState<PlatformType[]>(['Telegram', 'WhatsApp', 'LinkedIn', 'Facebook']);
  const [geo, setGeo] = useState<SearchParams['location']>({});
  const [medical, setMedical] = useState<SearchParams['medicalContext']>({});
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);

  // Logging Helper
  const log = (msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(p => [...p.slice(-10), `[${ts}] ${msg}`]);
  };

  const handleSearch = async () => {
    if (!query.trim() && mode !== 'medical-residency') return;
    if (mode === 'medical-residency' && !medical?.specialty) {
      log("ERROR: SPECIALTY REQUIRED FOR MEDICAL SEARCH");
      return;
    }

    setLoading(true);
    setResult(null);
    log(`INITIATING ${mode.toUpperCase()} PROTOCOL...`);

    try {
      const data = await searchGlobalIntel({
        query,
        mode,
        platforms,
        location: geo,
        medicalContext: medical
      });

      setResult(data);
      log(`SUCCESS: ${data.links.length} SIGNALS INTERCEPTED.`);
    } catch (e: any) {
      log(`CRITICAL FAILURE: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#010204] text-slate-200 font-['Cairo'] overflow-hidden" dir="ltr">
      
      {/* 1. Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Header / Mode Switcher */}
        <header className="h-16 bg-black/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
               <i className="fa-solid fa-radar text-white text-sm"></i>
             </div>
             <div>
               <h1 className="text-lg font-black tracking-tighter italic leading-none text-white">
                 SCOUT<span className="text-indigo-500">OPS</span> <span className="text-[10px] text-slate-500 not-italic font-mono">v7.5 ULT</span>
               </h1>
             </div>
          </div>

          <div className="flex bg-white/5 rounded-lg p-1 gap-1">
            {SEARCH_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide transition-all ${
                  mode === m.id 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <i className={`${m.icon} mr-2`}></i>
                {m.label}
              </button>
            ))}
          </div>
        </header>

        {/* Search Input Area */}
        <div className="p-8 pb-0">
          <div className="max-w-4xl mx-auto w-full">
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
               <div className="relative flex bg-[#0a0c10] rounded-xl border border-white/10 items-center p-2">
                 <div className="px-4 text-slate-500">
                   <i className={`fa-solid ${mode === 'phone' ? 'fa-phone' : mode === 'username' ? 'fa-at' : 'fa-search'}`}></i>
                 </div>
                 <input 
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={
                    mode === 'username' ? "Enter username (e.g. 'john_doe')" :
                    mode === 'phone' ? "Enter phone number with country code (e.g. +1...)" :
                    mode === 'medical-residency' ? "Add extra context (Optional)" :
                    "Enter keywords to track..."
                  }
                  className="flex-1 bg-transparent py-3 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none font-mono"
                 />
                 <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                 >
                   {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'ENGAGE'}
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           {result ? (
             <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
               
               {/* Analysis Card */}
               <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <i className="fa-solid fa-microchip text-6xl text-indigo-500"></i>
                 </div>
                 <h2 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Intel Summary</h2>
                 <p className="text-sm text-indigo-100/80 leading-relaxed max-w-3xl">{result.analysis}</p>
                 
                 <div className="flex gap-4 mt-6">
                   <div className="px-4 py-2 bg-black/40 rounded border border-indigo-500/30">
                      <div className="text-[9px] text-slate-500 uppercase">Total Hits</div>
                      <div className="text-xl font-bold text-white font-mono">{result.stats.total}</div>
                   </div>
                   <div className="px-4 py-2 bg-black/40 rounded border border-indigo-500/30">
                      <div className="text-[9px] text-slate-500 uppercase">Confidence</div>
                      <div className="text-xl font-bold text-emerald-400 font-mono">High</div>
                   </div>
                 </div>
               </div>

               {/* Grid Results */}
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                 {result.links.map((link) => {
                   const platformInfo = ALL_PLATFORMS.find(p => p.id === link.platform);
                   return (
                     <div key={link.id} className="bg-[#0f1116] border border-white/5 hover:border-indigo-500/50 rounded-xl p-5 transition-all group relative">
                       <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black border border-white/10 text-lg ${platformInfo?.color}`}>
                             <i className={platformInfo?.icon}></i>
                           </div>
                           <div>
                             <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{link.type}</div>
                             <div className="text-[10px] font-bold text-indigo-400">{link.location}</div>
                           </div>
                         </div>
                         <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-bold text-emerald-400 uppercase">
                           {link.status}
                         </div>
                       </div>
                       
                       <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                         {link.title}
                       </h3>
                       <p className="text-[10px] text-slate-400 line-clamp-2 mb-4 leading-relaxed font-mono">
                         {link.description}
                       </p>

                       <div className="flex gap-2">
                         <button 
                          onClick={() => window.open(link.url, '_blank')}
                          className="flex-1 bg-white/5 hover:bg-indigo-600 text-slate-300 hover:text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                         >
                           Access Node
                         </button>
                         <button 
                          onClick={() => navigator.clipboard.writeText(link.url)}
                          className="px-3 bg-black border border-white/10 hover:border-white/30 text-slate-400 hover:text-white rounded-lg transition-all"
                         >
                           <i className="fa-regular fa-copy text-xs"></i>
                         </button>
                       </div>
                     </div>
                   );
                 })}
               </div>

             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4">
               <i className="fa-solid fa-satellite-dish text-6xl opacity-20 animate-pulse"></i>
               <p className="text-xs font-bold uppercase tracking-widest">Awaiting Targets</p>
             </div>
           )}
        </div>

        {/* Footer Terminal */}
        <div className="h-32 bg-black border-t border-white/10 p-4 font-mono text-[9px]">
           <div className="flex justify-between items-end mb-2 text-slate-600">
             <span>TERMINAL OUTPUT</span>
             <span>SECURE CONNECTION</span>
           </div>
           <div ref={terminalRef} className="h-full overflow-y-auto space-y-1 custom-scrollbar pb-6 text-indigo-500/80">
             {logs.map((l, i) => <div key={i}>{l}</div>)}
           </div>
        </div>

      </div>

      {/* 2. Sidebar Filter Panel */}
      <FilterSidebar 
        platforms={platforms} 
        setPlatforms={setPlatforms}
        geo={geo}
        setGeo={setGeo}
        medical={medical}
        setMedical={setMedical}
        mode={mode}
      />

    </div>
  );
};

export default App;
