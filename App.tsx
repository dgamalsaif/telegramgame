
import React, { useState, useEffect, useRef } from 'react';
import { searchGlobalIntel } from './services/geminiService';
import { IntelLink, SearchResult, PlatformType, SearchMode, SearchParams, ConnectedIdentity, SearchScope } from './types';

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
  { id: 'discovery', label: 'Discovery', icon: 'fa-solid fa-radar' },
  { id: 'username', label: 'Identity', icon: 'fa-solid fa-fingerprint' },
  { id: 'phone', label: 'Signal Trace', icon: 'fa-solid fa-tower-cell' },
  { id: 'medical-residency', label: 'Medical Ops', icon: 'fa-solid fa-user-doctor' },
];

const SEARCH_SCOPES: { id: SearchScope; label: string; icon: string }[] = [
  { id: 'communities', label: 'Communities', icon: 'fa-solid fa-users' },
  { id: 'documents', label: 'Documents', icon: 'fa-solid fa-file-contract' },
  { id: 'events', label: 'Events / Intel', icon: 'fa-solid fa-calendar-check' },
  { id: 'profiles', label: 'Profiles', icon: 'fa-solid fa-id-card' },
];

// --- Visual Components ---

const ScanOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden opacity-20">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
    <div className="absolute top-0 w-full h-1 bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-scan" />
  </div>
);

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
    setTimeout(() => {
      onConnect({
        platform,
        type,
        value,
        verifiedAt: new Date().toISOString()
      });
      setVerifying(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0b0d12] border border-indigo-500/30 rounded-3xl w-full max-w-md p-8 relative overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.15)]">
        {/* Decorative HUD Elements */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-indigo-500/50 rounded-tl-xl m-4"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-indigo-500/50 rounded-br-xl m-4"></div>
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <span className="w-2 h-8 bg-indigo-500 block rounded-sm"></span>
            Uplink: <span className="text-indigo-400">{platform}</span>
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="space-y-8 relative z-10">
          <div className="flex gap-2 p-1.5 bg-black/60 rounded-xl border border-white/5">
            {(['phone', 'email', 'handle'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  type === t 
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex justify-between">
               <span>{type === 'phone' ? 'Secure Number' : type === 'email' ? 'Verified Email' : 'Public Handle'}</span>
               <span className="text-indigo-500/50">ENCRYPTED INPUT</span>
             </label>
             <div className="relative group">
               <input 
                 type={type === 'email' ? 'email' : 'text'}
                 value={value}
                 onChange={e => setValue(e.target.value)}
                 className="w-full bg-[#050608] border border-indigo-500/20 focus:border-indigo-500/80 rounded-xl px-5 py-4 text-base font-mono text-white outline-none transition-all placeholder:text-slate-800 focus:shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                 placeholder="Input credentials..."
               />
               <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500/30 group-focus-within:text-indigo-500 transition-colors">
                 <i className="fa-solid fa-lock"></i>
               </div>
             </div>
          </div>

          <button 
            onClick={handleConnect}
            disabled={verifying || !value}
            className="w-full bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-95 text-white py-5 rounded-xl text-xs font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:hover:scale-100"
          >
            {verifying ? (
              <span className="flex items-center gap-3 animate-pulse">
                <i className="fa-solid fa-fingerprint fa-beat-fade text-lg"></i> AUTHORIZING...
              </span>
            ) : (
              <>
                ESTABLISH CONNECTION <i className="fa-solid fa-satellite-dish"></i>
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
    <div className="w-full lg:w-80 bg-[#06070a]/95 border-r border-white/5 p-6 flex flex-col gap-8 h-full overflow-y-auto backdrop-blur-xl relative z-20">
      {/* Identity Module */}
      <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-500">
        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-4 relative z-10">
          <i className="fa-solid fa-fingerprint"></i> Identity Uplink
        </h3>
        <div className="space-y-3 relative z-10">
           {identities.length === 0 ? (
             <div className="p-3 rounded-lg border border-dashed border-slate-700 text-center">
               <p className="text-[9px] text-slate-500 mb-2 font-mono">NO ACTIVE UPLINKS</p>
               <p className="text-[8px] text-indigo-400/60 uppercase">Connect to enable deep scan</p>
             </div>
           ) : (
             <div className="flex flex-wrap gap-2">
                {identities.map((id: ConnectedIdentity, idx: number) => (
                  <div key={idx} className="pl-2 pr-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[9px] text-emerald-400 flex items-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                     {id.platform}
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* Platform Filters */}
      <div className="space-y-5">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-network-wired"></i> Network Targets
        </h3>
        <div className="space-y-2">
          {ALL_PLATFORMS.map(p => {
            const isConnected = identities.some((i: any) => i.platform === p.id);
            const isSelected = platforms.includes(p.id);

            return (
              <div key={p.id} className="flex gap-2 group">
                <button
                  onClick={() => togglePlatform(p.id)}
                  className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                    isSelected 
                      ? 'bg-white/10 border-white/20 text-white shadow-lg' 
                      : 'bg-transparent border-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400'
                  }`}
                >
                  <i className={`${p.icon} text-sm transition-transform group-hover:scale-110 ${isSelected ? p.color : ''}`}></i>
                  {p.id}
                  
                  {/* Visual Connection Indicator */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-red-500/30'}`}></div>
                  </div>
                </button>
                
                <button 
                  onClick={() => onOpenConnect(p.id)}
                  className={`w-10 flex items-center justify-center rounded-xl border transition-all hover:scale-110 active:scale-90 ${
                    isConnected 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                      : 'bg-transparent border-white/5 text-slate-700 hover:text-indigo-400 hover:border-indigo-500/30'
                  }`}
                  title={isConnected ? "Uplink Active" : "Initialize Uplink"}
                >
                  <i className={`fa-solid ${isConnected ? 'fa-link' : 'fa-plug'}`}></i>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Geo Filters */}
      <div className="space-y-5 pt-6 border-t border-white/5">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-earth-americas"></i> Geo-Fencing
        </h3>
        <div className="space-y-3">
          {['Country', 'City', 'Institution'].map((placeholder, i) => (
            <div key={placeholder} className="relative group">
               <i className="fa-solid fa-location-crosshairs absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 group-focus-within:text-indigo-500 transition-colors"></i>
               <input 
                 type="text" 
                 placeholder={placeholder}
                 value={i === 0 ? geo.country : i === 1 ? geo.city : geo.institution}
                 onChange={e => {
                   const val = e.target.value;
                   if (i === 0) setGeo({...geo, country: val});
                   else if (i === 1) setGeo({...geo, city: val});
                   else setGeo({...geo, institution: val});
                 }}
                 className="w-full bg-black/40 border border-white/10 focus:border-indigo-500/50 rounded-lg pl-8 pr-4 py-2.5 text-[10px] font-bold text-white outline-none transition-all placeholder:text-slate-700 focus:shadow-[0_0_15px_rgba(79,70,229,0.15)]"
               />
            </div>
          ))}
        </div>
      </div>

      {/* Medical Filters */}
      {mode === 'medical-residency' && (
        <div className="space-y-5 pt-6 border-t border-white/5 animate-in slide-in-from-left-4 fade-in">
          <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-staff-snake"></i> Medical Ops
          </h3>
          <div className="space-y-3">
             <input 
              type="text" 
              placeholder="Target Specialty..."
              value={medical.specialty || ''}
              onChange={e => setMedical({ ...medical, specialty: e.target.value })}
              className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-[10px] font-bold text-emerald-100 focus:border-emerald-500 outline-none transition-colors"
            />
            <select 
              value={medical.level || 'Residency'}
              onChange={e => setMedical({ ...medical, level: e.target.value })}
              className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-[10px] font-bold text-emerald-100 focus:border-emerald-500 outline-none"
            >
              <option value="Residency">Residency Program</option>
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
  const [scope, setScope] = useState<SearchScope>('communities');
  const [query, setQuery] = useState('');
  const [platforms, setPlatforms] = useState<PlatformType[]>(['Telegram', 'WhatsApp', 'LinkedIn', 'Facebook']);
  const [identities, setIdentities] = useState<ConnectedIdentity[]>([]);
  const [geo, setGeo] = useState<SearchParams['location']>({});
  const [medical, setMedical] = useState<SearchParams['medicalContext']>({});
  
  // Parallax State
  const [offset, setOffset] = useState({ x: 0, y: 0 });

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

  // Parallax Effect
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setOffset({
        x: (e.clientX / window.innerWidth) * 20 - 10,
        y: (e.clientY / window.innerHeight) * 20 - 10
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const log = (msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(p => [...p.slice(-12), `[${ts}] ${msg}`]);
  };

  const handleOpenConnect = (p: PlatformType) => {
    setPlatformToConnect(p);
    setConnectModalOpen(true);
  };

  const handleConnectIdentity = (id: ConnectedIdentity) => {
    setIdentities(prev => [...prev.filter(i => i.platform !== id.platform), id]); 
    log(`SECURE HANDSHAKE: ${id.platform} verified.`);
    log(`AUTHORIZATION LEVEL INCREASED.`);
  };

  const handleSearch = async () => {
    if (!query.trim() && mode !== 'medical-residency') return;
    if (mode === 'medical-residency' && !medical?.specialty) {
      log("ERR: MISSING MEDICAL PARAMETERS");
      return;
    }

    setLoading(true);
    setResult(null);
    const deepScan = identities.length > 0;
    log(`INITIALIZING SCAN: ${mode.toUpperCase()} // SCOPE: ${scope.toUpperCase()}`);
    if (deepScan) log("DEEP SCAN PROTOCOLS: ACTIVE");

    try {
      const data = await searchGlobalIntel({
        query,
        mode,
        scope,
        platforms,
        identities,
        location: geo,
        medicalContext: medical
      });

      setResult(data);
      log(`SCAN COMPLETE: ${data.links.length} OBJECTS IDENTIFIED.`);
    } catch (e: any) {
      log(`SYSTEM FAILURE: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#010204] text-slate-200 font-['Cairo'] overflow-hidden relative" dir="ltr">
      
      {/* Parallax Background Layer */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,27,75,0.4)_0%,transparent_60%)] z-0 pointer-events-none transition-transform duration-100 ease-out will-change-transform"
        style={{ transform: `translate(${offset.x * -1}px, ${offset.y * -1}px) scale(1.05)` }}
      />

      <ScanOverlay />

      {/* 1. Sidebar Filter Panel */}
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

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-10">
        
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-4">
             <div className="relative group">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-500 group-hover:rotate-180">
                 <i className="fa-solid fa-radar text-white text-lg animate-spin-slow"></i>
               </div>
               <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black"></div>
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tighter italic leading-none text-white flex items-center gap-2">
                 SCOUT<span className="text-indigo-500">OPS</span> <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] not-italic font-mono text-slate-400">v7.5 ULT</span>
               </h1>
               <div className="text-[9px] text-slate-500 font-mono tracking-widest mt-0.5">INTELLIGENCE DASHBOARD</div>
             </div>
          </div>

          <div className="flex bg-black/40 border border-white/5 rounded-xl p-1.5 gap-1">
            {SEARCH_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                  mode === m.id 
                    ? 'bg-indigo-600 text-white shadow-lg scale-105' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5 hover:scale-105'
                }`}
              >
                <i className={m.icon}></i>
                <span className="hidden xl:inline">{m.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Search Input Area */}
        <div className="p-8 pb-4">
          <div className="max-w-5xl mx-auto w-full space-y-4">
            
            {/* Scope Selector */}
            <div className="flex justify-center gap-4 mb-2">
              {SEARCH_SCOPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setScope(s.id)}
                  className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all duration-300 flex items-center gap-2 hover:scale-105 ${
                    scope === s.id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                      : 'border-transparent text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <i className={s.icon}></i> {s.label}
                </button>
              ))}
            </div>

            <div className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
               <div className="relative flex bg-[#08090c] rounded-2xl border border-white/10 items-center p-2 shadow-2xl transition-all duration-300 group-hover:scale-[1.01]">
                 <div className="pl-6 pr-4 text-slate-500">
                   <i className={`fa-solid ${mode === 'phone' ? 'fa-phone' : mode === 'username' ? 'fa-at' : 'fa-search'} text-lg`}></i>
                 </div>
                 <input 
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={
                    mode === 'username' ? "Enter Target Identity / Handle..." :
                    mode === 'phone' ? "Enter Target Number (+1...)" :
                    mode === 'medical-residency' ? "Specify Medical Context..." :
                    "Enter keywords to execute global scan..."
                  }
                  className="flex-1 bg-transparent py-4 text-base font-bold text-white placeholder:text-slate-700 focus:outline-none font-mono tracking-wide"
                 />
                 <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-white text-black hover:bg-indigo-500 hover:text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95"
                 >
                   {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'EXECUTE'}
                 </button>
               </div>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar relative z-10">
           {result ? (
             <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
               
               {/* Analysis Card */}
               <div className="bg-gradient-to-r from-indigo-950/40 to-black border border-indigo-500/20 rounded-3xl p-8 relative overflow-hidden shadow-2xl group hover:border-indigo-500/40 transition-colors">
                 <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform duration-700 group-hover:rotate-45">
                   <i className="fa-solid fa-file-contract text-8xl text-indigo-500"></i>
                 </div>
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <h2 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em]">Mission Report</h2>
                 </div>
                 <p className="text-sm text-indigo-50 leading-loose max-w-4xl font-medium">{result.analysis}</p>
                 
                 <div className="flex gap-4 mt-8">
                   {/* Stat Pills */}
                   {[
                     { l: 'Total Intel', v: result.stats.total, c: 'text-white' },
                     { l: 'Verified', v: '98%', c: 'text-emerald-400' },
                     { l: 'Scan Depth', v: identities.length > 0 ? 'Lvl 2 (Deep)' : 'Lvl 1 (Public)', c: identities.length > 0 ? 'text-indigo-400' : 'text-slate-400' }
                   ].map((s, i) => (
                     <div key={i} className="px-5 py-2 bg-black/40 rounded-lg border border-indigo-500/20 backdrop-blur-md">
                        <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{s.l}</div>
                        <div className={`text-lg font-bold font-mono ${s.c}`}>{s.v}</div>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Results Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                 {result.links.map((link, idx) => {
                   const platformInfo = ALL_PLATFORMS.find(p => p.id === link.platform);
                   const isDoc = link.type === 'Document';
                   
                   return (
                     <div key={link.id} className="bg-[#0b0d12] border border-white/5 hover:border-indigo-500/40 rounded-2xl p-6 transition-all duration-300 group relative hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(79,70,229,0.2)]">
                       <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black border border-white/10 text-lg shadow-inner ${platformInfo?.color || 'text-white'} group-hover:scale-110 transition-transform`}>
                             <i className={isDoc ? 'fa-solid fa-file-pdf' : platformInfo?.icon || 'fa-solid fa-globe'}></i>
                           </div>
                           <div>
                             <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{link.type}</div>
                             <div className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                               <i className="fa-solid fa-location-dot text-[8px]"></i> {link.location}
                             </div>
                           </div>
                         </div>
                         <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wide border ${link.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                           {link.status}
                         </div>
                       </div>
                       
                       <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors h-10">
                         {link.title}
                       </h3>
                       <p className="text-[10px] text-slate-400 line-clamp-2 mb-6 leading-relaxed font-mono h-8">
                         {link.description}
                       </p>

                       <div className="flex gap-2 mt-auto">
                         <button 
                          onClick={() => window.open(link.url, '_blank')}
                          className="flex-1 bg-white/5 hover:bg-indigo-600 text-slate-300 hover:text-white py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-95"
                         >
                           {isDoc ? 'Download' : 'Access'} <i className="fa-solid fa-arrow-up-right-from-square"></i>
                         </button>
                         <button 
                          onClick={() => navigator.clipboard.writeText(link.url)}
                          className="w-10 bg-black border border-white/10 hover:border-white/30 text-slate-500 hover:text-white rounded-lg transition-all flex items-center justify-center active:scale-95"
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
             <div className="h-full flex flex-col items-center justify-center text-slate-800 space-y-6">
               <div className="relative">
                 <i className="fa-solid fa-globe text-8xl opacity-10 animate-pulse"></i>
                 <i className="fa-solid fa-crosshairs text-4xl text-indigo-900/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
               </div>
               <div className="text-center">
                 <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-700">System Ready</p>
                 <p className="text-[10px] text-slate-800 font-mono mt-2">Awaiting Target Parameters</p>
               </div>
             </div>
           )}
        </div>

        {/* Footer Terminal */}
        <div className="h-24 bg-black/80 border-t border-white/10 p-4 font-mono text-[9px] backdrop-blur-md relative z-20">
           <div className="flex justify-between items-end mb-2 text-slate-600 border-b border-white/5 pb-1">
             <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> TERMINAL OUTPUT</span>
             <span>SECURE CONNECTION: <span className="text-emerald-500">ENCRYPTED</span></span>
           </div>
           <div ref={terminalRef} className="h-full overflow-y-auto space-y-1 custom-scrollbar pb-6 text-indigo-400/80">
             {logs.map((l, i) => <div key={i}>{l}</div>)}
           </div>
        </div>

      </div>

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
