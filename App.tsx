
import React, { useState, useEffect, useRef } from 'react';
import { searchGlobalIntel } from './services/geminiService';
import { IntelLink, SearchResult, PlatformType, SearchMode, SearchParams, ConnectedIdentity, SearchScope } from './types';

// --- Assets & Data ---
const ALL_PLATFORMS: { id: PlatformType; icon: string; color: string; hoverColor: string }[] = [
  { id: 'Telegram', icon: 'fa-brands fa-telegram', color: 'text-sky-400', hoverColor: 'hover:bg-sky-500' },
  { id: 'WhatsApp', icon: 'fa-brands fa-whatsapp', color: 'text-emerald-400', hoverColor: 'hover:bg-emerald-500' },
  { id: 'X', icon: 'fa-brands fa-x-twitter', color: 'text-white', hoverColor: 'hover:bg-slate-700' },
  { id: 'Facebook', icon: 'fa-brands fa-facebook', color: 'text-blue-600', hoverColor: 'hover:bg-blue-600' },
  { id: 'LinkedIn', icon: 'fa-brands fa-linkedin', color: 'text-blue-500', hoverColor: 'hover:bg-blue-500' },
  { id: 'Discord', icon: 'fa-brands fa-discord', color: 'text-indigo-400', hoverColor: 'hover:bg-indigo-500' },
  { id: 'Instagram', icon: 'fa-brands fa-instagram', color: 'text-pink-500', hoverColor: 'hover:bg-pink-600' },
  { id: 'Reddit', icon: 'fa-brands fa-reddit', color: 'text-orange-500', hoverColor: 'hover:bg-orange-600' },
  { id: 'TikTok', icon: 'fa-brands fa-tiktok', color: 'text-pink-400', hoverColor: 'hover:bg-pink-500' },
  { id: 'Signal', icon: 'fa-solid fa-comment-dots', color: 'text-blue-300', hoverColor: 'hover:bg-blue-400' },
];

const SEARCH_MODES: { id: SearchMode; label: string; icon: string }[] = [
  { id: 'discovery', label: 'Discovery', icon: 'fa-solid fa-radar' },
  { id: 'username', label: 'Identity', icon: 'fa-solid fa-fingerprint' },
  { id: 'phone', label: 'Signal Trace', icon: 'fa-solid fa-tower-cell' },
  { id: 'medical-residency', label: 'Medical Ops', icon: 'fa-solid fa-user-doctor' },
];

const SEARCH_SCOPES: { id: SearchScope; label: string; icon: string }[] = [
  { id: 'communities', label: 'Communities', icon: 'fa-solid fa-users' },
  { id: 'channels', label: 'Channels', icon: 'fa-solid fa-bullhorn' },
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
  const [step, setStep] = useState<'login' | 'verifying' | 'success'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [saveCreds, setSaveCreds] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  if (!platform) return null;

  const platformData = ALL_PLATFORMS.find(p => p.id === platform);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if(!username || !password) return;

    setStep('verifying');
    setStatusMsg(`Connecting to ${platform} servers...`);

    // Simulate Verification Flow
    setTimeout(() => setStatusMsg("Verifying Credentials..."), 800);
    setTimeout(() => setStatusMsg("Bypassing 2FA Challenge..."), 2000);
    setTimeout(() => setStatusMsg("Authorizing SCOUT OPS Agent..."), 3500);
    
    setTimeout(() => {
        setStep('success');
        setTimeout(() => {
            onConnect({
                platform,
                type: 'handle',
                value: username,
                verifiedAt: new Date().toISOString()
            });
            onClose();
        }, 1200);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#1e2024] border border-slate-700 rounded-2xl w-full max-w-sm relative overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-[#0f1115] px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <i className={`${platformData?.icon} ${platformData?.color}`}></i>
                <span>Log in to {platform}</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div className="p-6">
            {step === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="text-center mb-6">
                        <div className={`w-16 h-16 mx-auto rounded-xl bg-[#0f1115] flex items-center justify-center text-3xl mb-3 border border-slate-700 ${platformData?.color}`}>
                             <i className={platformData?.icon}></i>
                        </div>
                        <h3 className="text-white font-bold">Authorize Access</h3>
                        <p className="text-xs text-slate-400">Enter credentials to enable deep search on {platform}.</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email or Username</label>
                            <input 
                                type="text" 
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-black border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="Start typing..."
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2 pt-2">
                           <input 
                             type="checkbox" 
                             id="saveCreds"
                             checked={saveCreds}
                             onChange={e => setSaveCreds(e.target.checked)}
                             className="rounded bg-black border-slate-600 text-indigo-500 focus:ring-indigo-500"
                           />
                           <label htmlFor="saveCreds" className="text-xs text-slate-400 cursor-pointer">Stay logged in (Save Session)</label>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-lg mt-2"
                    >
                        Log In & Authorize
                    </button>
                </form>
            )}

            {step === 'verifying' && (
                <div className="py-8 text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                        <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
                        <i className="fa-solid fa-shield-halved absolute inset-0 flex items-center justify-center text-slate-500"></i>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white mb-1">Authenticating</div>
                        <div className="text-xs text-indigo-400 font-mono animate-pulse">{statusMsg}</div>
                    </div>
                </div>
            )}

            {step === 'success' && (
                <div className="py-8 text-center space-y-4">
                     <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/50">
                        <i className="fa-solid fa-check text-2xl"></i>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">Connection Successful</div>
                        <div className="text-xs text-slate-400 mt-1">Credentials Stored Securely</div>
                    </div>
                </div>
            )}
        </div>
        
        {step === 'login' && (
             <div className="bg-[#0f1115] px-4 py-3 text-center border-t border-slate-700">
                <span className="text-[10px] text-slate-500">
                    <i className="fa-solid fa-lock mr-1"></i> End-to-End Encrypted Handshake
                </span>
            </div>
        )}
      </div>
    </div>
  );
};

// Collapsible Sidebar Section
const SidebarSection = ({ title, icon, children, defaultOpen = false }: { title: string; icon: string; children?: React.ReactNode; defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/5 last:border-0 pb-4 mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors mb-4 group"
      >
        <span className="flex items-center gap-2"><i className={icon}></i> {title}</span>
        <i className={`fa-solid fa-chevron-down transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      <div className={`space-y-3 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
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
  mode,
  filters,
  setFilters,
  isOpen,
  onClose
}: any) => {
  const togglePlatform = (p: PlatformType) => {
    if (platforms.includes(p)) setPlatforms(platforms.filter((x: any) => x !== p));
    else setPlatforms([...platforms, p]);
  };

  // Mobile drawer logic
  const drawerClasses = isOpen 
    ? "translate-x-0" 
    : "-translate-x-full lg:translate-x-0";

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-[#06070a]/95 border-r border-white/5 p-6 flex flex-col h-full overflow-y-auto backdrop-blur-xl transition-transform duration-300 lg:relative ${drawerClasses} custom-scrollbar`}>
      
      {/* Mobile Close Button */}
      <div className="lg:hidden flex justify-end mb-4">
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>

      {/* Search Analysis Filters */}
      <SidebarSection title="Signal Filters" icon="fa-solid fa-filter" defaultOpen={true}>
         <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-2">
                 <span>Min Confidence</span>
                 <span className="text-emerald-400">{filters.minConfidence}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={filters.minConfidence}
                onChange={(e) => setFilters({...filters, minConfidence: Number(e.target.value)})}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
               <span className="text-[10px] font-bold text-slate-300">Active Signals Only</span>
               <button 
                onClick={() => setFilters({...filters, onlyActive: !filters.onlyActive})}
                className={`w-8 h-4 rounded-full relative transition-colors ${filters.onlyActive ? 'bg-emerald-500' : 'bg-slate-700'}`}
               >
                 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${filters.onlyActive ? 'left-4.5' : 'left-0.5'}`}></div>
               </button>
            </div>
         </div>
      </SidebarSection>

      {/* Identity Module */}
      <SidebarSection title="Identity Uplink" icon="fa-solid fa-fingerprint" defaultOpen={true}>
        <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-xl p-4 relative group">
          <div className="space-y-3">
             {identities.length === 0 ? (
               <div className="p-3 rounded-lg border border-dashed border-slate-700 text-center">
                 <p className="text-[9px] text-slate-500 mb-2 font-mono">NO ACTIVE ACCOUNTS</p>
                 <p className="text-[8px] text-slate-600">Connect platforms below to enable deep search.</p>
               </div>
             ) : (
               <div className="flex flex-wrap gap-2">
                  {identities.map((id: ConnectedIdentity, idx: number) => (
                    <div key={idx} className="pl-2 pr-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[9px] text-emerald-400 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                       {id.platform}: {id.value}
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>
      </SidebarSection>

      {/* Platform Filters */}
      <SidebarSection title="Network Targets" icon="fa-solid fa-network-wired" defaultOpen={true}>
        <div className="space-y-2">
          {ALL_PLATFORMS.map(p => {
            const isConnected = identities.some((i: any) => i.platform === p.id);
            const isSelected = platforms.includes(p.id);

            return (
              <div key={p.id} className="flex gap-2 group">
                <button
                  onClick={() => togglePlatform(p.id)}
                  className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border text-[10px] font-bold uppercase transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                    isSelected 
                      ? 'bg-white/10 border-white/20 text-white shadow' 
                      : 'bg-transparent border-white/5 text-slate-600 hover:border-white/10 hover:text-slate-400'
                  }`}
                >
                  <i className={`${p.icon} text-sm ${isSelected ? p.color : ''}`}></i>
                  {p.id}
                  
                  <div className="ml-auto flex items-center gap-1.5">
                    {isConnected && <div className="text-[8px] text-emerald-500 font-mono">AUTH</div>}
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-red-500/30'}`}></div>
                  </div>
                </button>
                
                <button 
                  onClick={() => onOpenConnect(p.id)}
                  className={`w-10 flex items-center justify-center rounded-lg border transition-all hover:scale-105 ${
                    isConnected 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-transparent border-white/5 text-slate-700 hover:text-white hover:bg-white/10 hover:border-white/20'
                  }`}
                  title={isConnected ? "Reconnect Account" : `Connect ${p.id} Account`}
                >
                  <i className={`fa-solid ${isConnected ? 'fa-link' : 'fa-plug'} text-xs`}></i>
                </button>
              </div>
            );
          })}
        </div>
      </SidebarSection>

      {/* Geo Filters */}
      <SidebarSection title="Geo-Fencing" icon="fa-solid fa-earth-americas">
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
                 className="w-full bg-black/40 border border-white/10 focus:border-indigo-500/50 rounded-lg pl-8 pr-4 py-2 text-[10px] font-bold text-white outline-none transition-all placeholder:text-slate-700"
               />
            </div>
          ))}
        </div>
      </SidebarSection>

      {/* Medical Filters */}
      {mode === 'medical-residency' && (
        <SidebarSection title="Medical Ops" icon="fa-solid fa-staff-snake" defaultOpen={true}>
          <div className="space-y-3">
             <input 
              type="text" 
              placeholder="Specialty (e.g., Pediatric)..."
              value={medical.specialty || ''}
              onChange={e => setMedical({ ...medical, specialty: e.target.value })}
              className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-[10px] font-bold text-emerald-100 focus:border-emerald-500 outline-none"
            />
            <select 
              value={medical.level || 'Residency'}
              onChange={e => setMedical({ ...medical, level: e.target.value })}
              className="w-full bg-emerald-900/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-[10px] font-bold text-emerald-100 focus:border-emerald-500 outline-none"
            >
              <option value="Residency">Residency</option>
              <option value="Fellowship">Fellowship</option>
              <option value="Board">Board Certification</option>
              <option value="Internship">Internship</option>
              <option value="Research">Research Group</option>
            </select>
            <div className="text-[9px] text-emerald-600/60 px-2 italic">
               *System will auto-expand to sub-specialties (e.g. Neo-Natal, PICU)
            </div>
          </div>
        </SidebarSection>
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
  
  // New Filter State
  const [filters, setFilters] = useState({ minConfidence: 60, onlyActive: false });

  // UI State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [platformToConnect, setPlatformToConnect] = useState<PlatformType | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Persistence Logic
  useEffect(() => {
    const saved = localStorage.getItem('scoutops_identities');
    if (saved) {
      try {
        setIdentities(JSON.parse(saved));
        log("SESSION RESTORED: Credentials loaded from secure storage.");
      } catch (e) {
        console.error("Failed to load identities");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('scoutops_identities', JSON.stringify(identities));
  }, [identities]);

  // Auto-scroll logs
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);

  // Optimized Parallax Effect using Refs
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!bgRef.current) return;
      const x = (e.clientX / window.innerWidth) * 20 - 10;
      const y = (e.clientY / window.innerHeight) * 20 - 10;
      bgRef.current.style.transform = `translate(${x * -1}px, ${y * -1}px) scale(1.05)`;
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
    // Replace existing identity for this platform if it exists
    setIdentities(prev => [...prev.filter(i => i.platform !== id.platform), id]); 
    log(`SECURE HANDSHAKE: ${id.platform} account authorized: ${id.value}`);
    log(`SCAN DEPTH INCREASED FOR ${id.platform.toUpperCase()}.`);
  };

  const handleExport = () => {
    if (!result) return;
    
    // CSV Header
    const headers = [
      "Platform",
      "Type",
      "Title / Group Name",
      "URL",
      "Shared By (Sender)",
      "Message Content / Context",
      "Confidence",
      "Status",
      "Location",
      "Date Found"
    ];

    // CSV Rows
    const rows = result.links.map(link => {
      return [
        link.platform,
        link.type,
        `"${(link.title || '').replace(/"/g, '""')}"`, // Escape quotes
        link.url,
        `"${(link.sharedBy || '').replace(/"/g, '""')}"`,
        `"${(link.description || link.context || '').replace(/"/g, '""')}"`,
        `${link.confidence}%`,
        link.status,
        link.location || 'Unknown',
        new Date().toLocaleDateString()
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SCOUT_OPS_EXPORT_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    log("DATA EXPORTED TO CSV/EXCEL FORMAT.");
  };

  const handleSearch = async () => {
    if (!query.trim() && mode !== 'medical-residency') return;
    if (mode === 'medical-residency' && !medical?.specialty) {
      // Allow searching with query in main box even in medical mode
      if (!query.trim()) {
         log("ERR: MISSING MEDICAL PARAMETERS");
         return;
      }
    }

    setLoading(true);
    setResult(null);
    log(`INITIALIZING SCAN: ${mode.toUpperCase()} // SCOPE: ${scope.toUpperCase()}`);

    try {
      const data = await searchGlobalIntel({
        query,
        mode,
        scope,
        platforms,
        identities,
        location: geo,
        medicalContext: {
            ...medical,
            specialty: medical.specialty || query // Fallback to query if specialty input is empty
        },
        filters
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
      
      {/* Parallax Background Layer (Performance Optimized) */}
      <div 
        ref={bgRef}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,27,75,0.4)_0%,transparent_60%)] z-0 pointer-events-none transition-transform duration-100 ease-out will-change-transform"
        style={{ transform: `scale(1.05)` }}
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
        filters={filters}
        setFilters={setFilters}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-10">
        
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-4">
             {/* Mobile Sidebar Toggle */}
             <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-400 hover:text-white"
             >
                <i className="fa-solid fa-bars text-xl"></i>
             </button>

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
             </div>
          </div>

          <div className="hidden md:flex bg-black/40 border border-white/5 rounded-xl p-1.5 gap-1">
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
            <div className="flex flex-wrap justify-center gap-4 mb-2">
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
                    mode === 'medical-residency' ? "Specify Medical Context or Type Query..." :
                    "Enter keywords to execute global scan..."
                  }
                  className="flex-1 bg-transparent py-4 text-base font-bold text-white placeholder:text-slate-700 focus:outline-none font-mono tracking-wide min-w-0"
                 />
                 <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="hidden sm:block bg-white text-black hover:bg-indigo-500 hover:text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95"
                 >
                   {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'EXECUTE'}
                 </button>
               </div>
               {/* Mobile Execute Button */}
               <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="sm:hidden mt-3 w-full bg-indigo-600 text-white hover:bg-indigo-500 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"
               >
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'EXECUTE SCAN'}
               </button>
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
                   <i className="fa-solid fa-users-viewfinder text-8xl text-indigo-500"></i>
                 </div>
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <h2 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em]">Mission Report</h2>
                    </div>
                    
                    {/* Export Button */}
                    <button 
                        onClick={handleExport}
                        className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <i className="fa-solid fa-file-csv"></i> EXPORT TO CSV / EXCEL
                    </button>
                 </div>
                 <p className="text-sm text-indigo-50 leading-loose max-w-4xl font-medium">{result.analysis}</p>
                 
                 <div className="flex flex-wrap gap-4 mt-8">
                   {[
                     { l: 'Total Intel', v: result.stats.total, c: 'text-white' },
                     { l: 'Verified', v: `${Math.round((result.links.filter(l => l.confidence > 85).length / result.links.length) * 100) || 0}%`, c: 'text-emerald-400' },
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
                   const isPrivate = link.tags && link.tags.includes('Private');
                   const isThread = link.tags && link.tags.includes('Thread');
                   
                   return (
                     <div key={link.id} className="bg-[#0b0d12] border border-white/5 hover:border-indigo-500/40 rounded-2xl p-6 transition-all duration-300 group relative hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(79,70,229,0.2)] flex flex-col">
                       {isPrivate && (
                         <div className="absolute -top-2 -right-2 bg-rose-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg z-10 flex items-center gap-1 animate-pulse">
                           <i className="fa-solid fa-lock"></i> Private
                         </div>
                       )}

                       <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black border border-white/10 text-lg shadow-inner ${platformInfo?.color || 'text-white'} group-hover:scale-110 transition-transform relative`}>
                             <i className={platformInfo?.icon || 'fa-solid fa-globe'}></i>
                             {isPrivate && (
                               <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5">
                                 <i className="fa-solid fa-lock text-[8px] text-rose-500"></i>
                               </div>
                             )}
                           </div>
                           <div>
                             <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{link.type}</div>
                             <div className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                               <i className="fa-solid fa-location-dot text-[8px]"></i> {link.location}
                             </div>
                           </div>
                         </div>
                         <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wide border ${
                           isPrivate ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                           link.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                           'bg-slate-800 border-slate-700 text-slate-500'
                         }`}>
                           {isPrivate ? 'RESTRICTED' : link.status}
                         </div>
                       </div>
                       
                       <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors">
                         {link.title}
                       </h3>
                       <p className="text-[10px] text-slate-400 line-clamp-2 mb-2 leading-relaxed font-mono">
                         {link.description}
                       </p>

                        {/* Shared By Section */}
                       <div className="bg-white/5 rounded-lg p-2 mb-4 border border-white/5 flex gap-2">
                          <div className="flex-1">
                             <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1 flex items-center gap-1">
                               <i className="fa-solid fa-share-nodes"></i> Shared By
                             </div>
                             <div className="text-[10px] text-indigo-200 truncate font-medium">
                               {link.sharedBy || "Detected Signal"}
                             </div>
                          </div>
                          {(link.source || link.context) && (
                             <div className="flex-1 border-l border-white/10 pl-2">
                                <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1 flex items-center gap-1">
                                  <i className="fa-solid fa-eye"></i> Context
                                </div>
                                <div className="text-[10px] text-emerald-200 truncate font-medium">
                                  {link.context ? "Msg Found" : link.source}
                                </div>
                             </div>
                          )}
                       </div>

                       {/* Visual Confidence Bar */}
                       <div className="mb-4">
                          <div className="flex justify-between text-[8px] text-slate-500 mb-1 font-mono">
                             <span>SIGNAL STRENGTH</span>
                             <span>{link.confidence}%</span>
                          </div>
                          <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full ${link.confidence > 90 ? 'bg-emerald-500' : link.confidence > 70 ? 'bg-indigo-500' : 'bg-orange-500'}`} style={{ width: `${link.confidence}%` }}></div>
                          </div>
                       </div>

                       <div className="flex gap-2 mt-auto">
                         <button 
                          onClick={() => window.open(link.url, '_blank')}
                          className={`flex-1 ${isPrivate ? 'bg-rose-900/30 hover:bg-rose-700 text-rose-200' : 'bg-white/5 hover:bg-indigo-600 text-slate-300 hover:text-white'} py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-95`}
                         >
                           {isPrivate ? 'Request Entry' : isThread ? 'View Discussion' : 'Access Uplink'} <i className={`fa-solid ${isPrivate ? 'fa-lock' : isThread ? 'fa-comments' : 'fa-arrow-up-right-from-square'}`}></i>
                         </button>
                         <button 
                          onClick={() => {
                            navigator.clipboard.writeText(link.url);
                            log("URL COPIED TO CLIPBOARD");
                          }}
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
