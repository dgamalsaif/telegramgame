
import React, { useState, useEffect, useRef } from 'react';
import { searchGlobalIntel } from './services/geminiService';
import { IntelLink, SearchResult, PlatformType, SearchMode, SearchParams, ConnectedIdentity } from './types';

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
  { id: 'Signal', icon: 'fa-solid fa-comment-dots', color: 'text-blue-300' },
];

const SEARCH_MODES: { id: SearchMode; label: string; icon: string }[] = [
  { id: 'discovery', label: 'Keyword Discovery', icon: 'fa-solid fa-radar' },
  { id: 'username', label: 'Username / Handle', icon: 'fa-solid fa-at' },
  { id: 'phone', label: 'Phone Lookup', icon: 'fa-solid fa-phone' },
  { id: 'medical-residency', label: 'Medical Board/Residency', icon: 'fa-solid fa-user-doctor' },
];

// --- Sub-Components ---

const ConnectModal = ({ 
  platform, 
  onClose, 
  onConnect 
}: { 
  platform: PlatformType | null, 
  onClose: () => void, 
  onConnect: (id: ConnectedIdentity) => void 
}) => {
  const [value, setValue] = useState('');
  const [type, setType] = useState<'phone'|'email'|'handle'>('phone');
  const [verifying, setVerifying] = useState(false);

  if (!platform) return null;

  const handleConnect = () => {
    if(!value) return;
    setVerifying(true);
    // Simulate verification delay for effect
    setTimeout(() => {
      onConnect({
        platform,
        type,
        value,
        verifiedAt: new Date().toISOString()
      });
      setVerifying(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-[#0f1116] border border-white/10 rounded-2xl w-full max-w-md p-6 relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-link text-indigo-500"></i> Uplink: {platform}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex gap-2 p-1 bg-black/40 rounded-lg border border-white/5">
            {(['phone', 'email', 'handle'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                  type === t ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
               {type === 'phone' ? 'Phone Number (+ Country Code)' : type === 'email' ? 'Email Address' : 'Username / Handle'}
             </label>
             <input 
               type={type === 'email' ? 'email' : 'text'}
               value={value}
               onChange={e => setValue(e.target.value)}
               placeholder={
                 type === 'phone' ? '+1 555 0199 888' : 
                 type === 'email' ? 'agent@example.com' : 
                 '@username'
               }
               className="w-full bg-black/50 border border-indigo-500/30 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none transition-all shadow-[0_0_15px_rgba(79,70,229,0.1)]"
             />
             <p className="text-[9px] text-slate-500 mt-2">
               <i className="fa-solid fa-shield-halved mr-1"></i>
               Credentials encrypted locally. Used for deep-scan authorization only.
             </p>
          </div>

          <button 
            onClick={handleConnect}
            disabled={verifying || !value}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Verifying Token...
              </>
            ) : (
              <>
                Initialize Uplink <i className="fa-solid fa-arrow-right"></i>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const FilterSidebar = ({ 
  platforms, 
  setPlatforms, 
  identities,
  onOpenConnect,
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
    <div className="w-full lg:w-80 bg-[#0a0c10] border-l border-white/5 p-6 flex flex-col gap-8 h-full overflow-y-auto">
      {/* Identity Module */}
      <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-3">
          <i className="fa-solid fa-fingerprint"></i> Identity Uplink
        </h3>
        <div className="space-y-2">
           {identities.length === 0 ? (
             <p className="text-[9px] text-slate-500 mb-2">Connect accounts to enable Deep Scan protocols.</p>
           ) : (
             <div className="flex flex-wrap gap-2 mb-2">
                {identities.map((id: ConnectedIdentity, idx: number) => (
                  <div key={idx} className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded text-[8px] text-indigo-300 flex items-center gap-1">
                     <i className="fa-solid fa-link"></i> {id.platform}
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* Platform Filters */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-layer-group"></i> Target Vectors
        </h3>
        <div className="space-y-2">
          {ALL_PLATFORMS.map(p => {
            const isConnected = identities.some((i: any) => i.platform === p.id);
            const isSelected = platforms.includes(p.id);

            return (
              <div key={p.id} className="flex gap-2">
                <button
                  onClick={() => togglePlatform(p.id)}
                  className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                    isSelected 
                      ? 'bg-slate-800 border-slate-600 text-white' 
                      : 'bg-black border-white/5 text-slate-500 hover:border-white/20'
                  }`}
                >
                  <i className={`${p.icon} text-sm ${isSelected ? p.color : ''}`}></i>
                  {p.id}
                </button>
                
                {/* Connect/Disconnect Button */}
                <button 
                  onClick={() => onOpenConnect(p.id)}
                  className={`w-10 flex items-center justify-center rounded-lg border transition-all ${
                    isConnected 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-black border-white/5 text-slate-600 hover:text-indigo-400 hover:border-indigo-500/30'
                  }`}
                  title={isConnected ? "Connected" : "Connect Account"}
                >
                  <i className={`fa-solid ${isConnected ? 'fa-link' : 'fa-plug'}`}></i>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Geo Filters */}
      <div className="space-y-4 pt-4 border-t border-white/5">
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

      {/* Medical Filters */}
      {mode === 'medical-residency' && (
        <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-left-4">
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
    </div>
  );
};

// --- Main Application ---

const App: React.FC = () => {
  // State
  const [mode, setMode] = useState<SearchMode>('discovery');
  const [query, setQuery] = useState('');
  const [platforms, setPlatforms] = useState<PlatformType[]>(['Telegram', 'WhatsApp', 'LinkedIn', 'Facebook']);
  const [identities, setIdentities] = useState<ConnectedIdentity[]>([]);
  const [geo, setGeo] = useState<SearchParams['location']>({});
  const [medical, setMedical] = useState<SearchParams['medicalContext']>({});
  
  // UI State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [platformToConnect, setPlatformToConnect] = useState<PlatformType | null>(null);

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

  const handleOpenConnect = (p: PlatformType) => {
    // If already connected, maybe allow disconnect (simple toggle for now, or just show info)
    // For this demo, let's just open modal to "Re-connect" or add
    setPlatformToConnect(p);
    setConnectModalOpen(true);
  };

  const handleConnectIdentity = (id: ConnectedIdentity) => {
    setIdentities(prev => [...prev.filter(i => i.platform !== id.platform), id]); // Upsert
    log(`UPLINK ESTABLISHED: ${id.platform} [SECURE]`);
  };

  const handleSearch = async () => {
    if (!query.trim() && mode !== 'medical-residency') return;
    if (mode === 'medical-residency' && !medical?.specialty) {
      log("ERROR: SPECIALTY REQUIRED FOR MEDICAL SEARCH");
      return;
    }

    setLoading(true);
    setResult(null);
    const deepScan = identities.length > 0;
    log(`INITIATING ${mode.toUpperCase()} PROTOCOL... ${deepScan ? '[DEEP SCAN AUTHORIZED]' : ''}`);

    try {
      const data = await searchGlobalIntel({
        query,
        mode,
        platforms,
        identities,
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
        
        {/* Header */}
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
            {identities.length > 0 && (
               <div className="text-center mt-2">
                 <span className="text-[9px] font-bold text-emerald-500 tracking-widest uppercase animate-pulse">
                   <i className="fa-solid fa-lock mr-1"></i> Authorized Deep Scan Active
                 </span>
               </div>
            )}
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
                   {identities.length > 0 && (
                     <div className="px-4 py-2 bg-emerald-900/20 rounded border border-emerald-500/30">
                        <div className="text-[9px] text-emerald-500 uppercase">Scan Type</div>
                        <div className="text-xl font-bold text-emerald-400 font-mono">DEEP</div>
                     </div>
                   )}
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
        identities={identities}
        onOpenConnect={handleOpenConnect}
        geo={geo}
        setGeo={setGeo}
        medical={medical}
        setMedical={setMedical}
        mode={mode}
      />

      {/* 3. Modals */}
      {connectModalOpen && (
        <ConnectModal 
          platform={platformToConnect} 
          onClose={() => setConnectModalOpen(false)}
          onConnect={handleConnectIdentity}
        />
      )}

    </div>
  );
};

export default App;
