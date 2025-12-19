import React, { useState, useEffect, useMemo, useRef } from 'react';
import { searchTelegramGroups } from './services/geminiService';
import { TelegramGroup, SearchResult, SearchType, SearchHistoryItem, UserProfile } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('topic');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState('All');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // User Profile State
  const [profile, setProfile] = useState<UserProfile>({
    agentName: '',
    telegramHandle: '',
    operationalId: '',
    isRegistered: false
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Targeting Params
  const [country, setCountry] = useState('السعودية');
  const [category, setCategory] = useState('تقنية');
  const [language, setLanguage] = useState('العربية');

  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('scout_v4_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedProfile = localStorage.getItem('scout_v4_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));
  }, []);

  useEffect(() => {
    localStorage.setItem('scout_v4_history', JSON.stringify(history));
  }, [history]);

  const saveProfile = () => {
    const updated = { ...profile, isRegistered: !!profile.agentName };
    setProfile(updated);
    localStorage.setItem('scout_v4_profile', JSON.stringify(updated));
    setIsEditingProfile(false);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleSearch = async (targetQuery?: string) => {
    const finalQuery = targetQuery || query;
    if (!finalQuery.trim()) return;
    
    setLoading(true);
    setResult(null);
    setError(null);
    setLogs([]);
    if (targetQuery) setQuery(targetQuery);

    const steps = [
      "تأمين قناة الاتصال المشفرة...",
      `مصادقة العميل: ${profile.agentName || 'GUEST'}...`,
      `مسح قطاع ${country}...`,
      `تحليل بصمة: ${finalQuery}...`,
      "اعتراض حزم البيانات النشطة...",
      "تصفية الضجيج الاستخباراتي..."
    ];

    let stepIdx = 0;
    logIntervalRef.current = setInterval(() => {
      if (stepIdx < steps.length) {
        addLog(steps[stepIdx]);
        stepIdx++;
      }
    }, 700);

    try {
      const data = await searchTelegramGroups({ 
        query: finalQuery, 
        country, 
        language, 
        category, 
        platforms: ['LinkedIn', 'X', 'TikTok', 'GitHub'], 
        mode: 'deep', 
        searchType: searchType,
        agentContext: profile
      });
      setResult(data);
      addLog("نجاح العملية. تم العثور على أهداف.");
      const newItem = { query: finalQuery, timestamp: new Date().toLocaleTimeString('ar-EG'), type: searchType };
      setHistory(prev => [newItem, ...prev.filter(i => i.query !== finalQuery)].slice(0, 10));
    } catch (err: any) {
      setError(err.message || "فشل الاتصال بمركز المعلومات.");
    } finally {
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    let groups = result?.parsedGroups.filter(g => g.confidenceScore >= confidenceThreshold) || [];
    if (activePlatform !== 'All') {
      groups = groups.filter(g => 
        g.platformSource.toLowerCase().includes(activePlatform.toLowerCase()) || 
        g.linkType.toLowerCase() === activePlatform.toLowerCase()
      );
    }
    return groups;
  }, [result, confidenceThreshold, activePlatform]);

  return (
    <div className="min-h-screen bg-[#020408] text-gray-200 font-cairo selection:bg-indigo-500/40 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.1),transparent)]"></div>
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,24,38,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.3)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      {/* Sidebar: Profile, Config & Socials */}
      <aside className={`fixed top-0 bottom-0 right-0 z-50 bg-[#080a10]/98 backdrop-blur-3xl border-l border-white/5 transition-all duration-500 shadow-2xl overflow-y-auto ${isSidebarOpen ? 'w-80' : 'w-0 invisible'}`}>
        <div className="p-8 flex flex-col min-h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[10px] font-black tracking-[0.3em] text-indigo-500 uppercase">System Console</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-600 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
          </div>

          {/* User Account / Profile Section */}
          <div className="mb-10 p-5 bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Agent Profile</span>
              <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-[9px] text-indigo-400 font-bold hover:underline">
                {isEditingProfile ? 'CANCEL' : 'UPDATE'}
              </button>
            </div>
            
            {isEditingProfile ? (
              <div className="space-y-3">
                <input 
                  type="text" placeholder="Agent Name" 
                  value={profile.agentName} onChange={e => setProfile({...profile, agentName: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-indigo-500"
                />
                <input 
                  type="text" placeholder="TG @Username" 
                  value={profile.telegramHandle} onChange={e => setProfile({...profile, telegramHandle: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:border-indigo-500"
                />
                <button onClick={saveProfile} className="w-full bg-indigo-600 text-[10px] font-black py-2 rounded-lg hover:bg-indigo-500">SAVE PROTOCOL</button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                  <i className="fa-solid fa-user-secret"></i>
                </div>
                <div>
                  <div className="text-[11px] font-black text-white">{profile.agentName || 'UNIDENTIFIED AGENT'}</div>
                  <div className="text-[8px] text-gray-500 font-bold uppercase">{profile.telegramHandle || '@NoHandle'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Tactical Settings */}
          <div className="space-y-8 flex-1">
            <div>
              <label className="text-[9px] font-black text-gray-600 uppercase mb-4 block tracking-widest">Operation Mode</label>
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                <button onClick={() => setSearchType('topic')} className={`py-2 text-[10px] font-black rounded-lg transition-all ${searchType === 'topic' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300'}`}>GENERAL</button>
                <button onClick={() => setSearchType('user')} className={`py-2 text-[10px] font-black rounded-lg transition-all ${searchType === 'user' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'text-gray-500 hover:text-gray-300'}`}>IDENTIFIER</button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-gray-600 uppercase mb-3 block tracking-widest">Sector</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-indigo-500">
                  <option value="السعودية">المملكة العربية السعودية</option>
                  <option value="مصر">مصر</option>
                  <option value="الإمارات">الإمارات</option>
                  <option value="عالمي">Global Node</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black text-gray-600 uppercase mb-3 block tracking-widest">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-indigo-500">
                  <option value="تقنية">التقنية والذكاء</option>
                  <option value="تجارة">المال والأعمال</option>
                  <option value="ترفيه">الترفيه والألعاب</option>
                </select>
              </div>
            </div>

            {/* History Feed */}
            <div>
              <label className="text-[9px] font-black text-gray-600 uppercase mb-4 block tracking-widest">Recent Intercepts</label>
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <div key={idx} onClick={() => handleSearch(item.query)} className="group bg-white/5 border border-white/5 p-4 rounded-xl hover:border-indigo-500/50 cursor-pointer transition-all">
                    <div className="text-[11px] font-bold text-gray-400 truncate group-hover:text-indigo-400">{item.query}</div>
                    <div className="flex justify-between mt-2 text-[8px] uppercase text-gray-700 font-bold tracking-tighter">
                      <span>{item.timestamp}</span>
                      <span className={item.type === 'user' ? 'text-rose-500' : 'text-indigo-500'}>{item.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Social Uplinks */}
          <div className="mt-12 pt-8 border-t border-white/5 pb-8">
            <label className="text-[9px] font-black text-gray-600 uppercase mb-6 block tracking-widest">Operational Uplinks</label>
            <div className="grid grid-cols-1 gap-3">
              <a href="https://twitter.com/scoutops" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all group">
                <i className="fa-brands fa-x-twitter text-lg text-gray-500 group-hover:text-white"></i>
                <div className="flex-1">
                  <div className="text-[10px] font-black text-white uppercase">Twitter</div>
                  <div className="text-[8px] text-gray-600 uppercase font-bold">@scout_hq</div>
                </div>
              </a>
              <a href="https://linkedin.com/company/scoutops" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#0077b5]/40 hover:bg-[#0077b5]/10 transition-all group">
                <i className="fa-brands fa-linkedin-in text-lg text-gray-500 group-hover:text-[#0077b5]"></i>
                <div className="flex-1">
                  <div className="text-[10px] font-black text-white uppercase">LinkedIn</div>
                  <div className="text-[8px] text-gray-600 uppercase font-bold">SCOUT OPS</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Main UI */}
      <main className={`transition-all duration-500 relative z-10 ${isSidebarOpen ? 'mr-80' : 'mr-0'} p-6 lg:p-12 max-w-[1500px] mx-auto`}>
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-6">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all">
                <i className="fa-solid fa-bars-staggered"></i>
              </button>
            )}
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-4">
                <span className="text-indigo-500">SCOUT</span> OPS <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 font-bold">FINAL v4.0</span>
              </h1>
              <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-600 font-black tracking-[0.2em] uppercase">
                <span className="flex items-center gap-1.5 text-emerald-500"><i className="fa-solid fa-circle text-[6px] animate-pulse"></i> STATUS: OPERATIONAL</span>
              </div>
            </div>
          </div>
        </header>

        {/* Input Interface */}
        <div className="max-w-4xl mx-auto mb-20">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative flex flex-col md:flex-row items-center bg-[#080a10] border border-white/10 rounded-[2.5rem] p-4 shadow-2xl focus-within:border-indigo-500/50 transition-all">
             <div className="flex-1 flex items-center px-6 py-4 gap-6 w-full">
                <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : (searchType === 'user' ? 'fa-fingerprint' : 'fa-radar')} text-2xl text-indigo-500`}></i>
                <input 
                  type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={searchType === 'user' ? "أدخل اسم العميل، معرف التليجرام أو المعرف الرقمي..." : "أدخل كلمات البحث أو المواضيع المستهدفة..."}
                  className="w-full bg-transparent text-xl font-bold focus:outline-none placeholder:text-gray-700"
                />
             </div>
             <button disabled={loading} className="w-full md:w-auto px-12 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-900/20">
                {loading ? 'ANALYZING...' : 'INITIATE SCAN'}
             </button>
          </form>

          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {['All', 'WhatsApp', 'Telegram', 'X', 'LinkedIn'].map(p => (
              <button key={p} onClick={() => setActivePlatform(p)} className={`px-6 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${activePlatform === p ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'border-white/5 text-gray-500 hover:text-white hover:bg-white/5'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tactical Logs */}
        {loading && (
          <div className="max-w-2xl mx-auto mb-16 bg-black/60 border border-indigo-500/20 rounded-3xl p-8 font-mono text-[10px] text-indigo-400/90 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500 animate-[scan_2s_linear_infinite]"></div>
             <div className="flex items-center gap-3 mb-4 text-gray-600 border-b border-white/5 pb-3 uppercase tracking-widest font-black">
              <i className="fa-solid fa-satellite animate-pulse"></i> recon.system.active
            </div>
            {logs.map((log, i) => <div key={i} className="mb-2 opacity-80 animate-fadeIn">{log}</div>)}
            <div className="w-1.5 h-3 bg-indigo-500 inline-block animate-bounce ml-1"></div>
          </div>
        )}

        {/* Intelligence Report */}
        {result && !loading && (
          <div className="space-y-12 animate-fadeIn pb-40">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-[#0a0c14] border border-white/5 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden">
                 <h3 className="text-sm font-black uppercase mb-8 flex items-center gap-4 text-gray-500 tracking-widest">
                   <i className="fa-solid fa-microchip text-indigo-500"></i> Signal Analysis
                 </h3>
                 <p className="text-gray-300 leading-relaxed text-xl italic pr-8 border-r-2 border-indigo-500/20 whitespace-pre-wrap font-medium">
                   {result.text}
                 </p>
                 
                 {result.sources.length > 0 && (
                   <div className="mt-12 pt-8 border-t border-white/5">
                      <div className="flex flex-wrap gap-4">
                        {result.sources.map((s, i) => (
                          <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/40 text-[10px] text-gray-400 hover:text-indigo-400 transition-all font-bold group flex items-center gap-3">
                            <i className="fa-solid fa-satellite-dish text-[8px]"></i> {s.title}
                          </a>
                        ))}
                      </div>
                   </div>
                 )}
              </div>
              
              <div className="bg-[#0a0c14] border border-white/5 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center shadow-2xl relative">
                 <div className="absolute top-5 left-5 text-[8px] font-black text-gray-700 tracking-widest">THREAT_LEVEL</div>
                 <div className={`px-8 py-2 rounded-full text-[10px] font-black uppercase border-2 mb-8 ${result.summary?.riskLevel === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                   {result.summary?.riskLevel || 'Low'}
                 </div>
                 <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="80" cy="80" r="75" stroke="#111827" strokeWidth="6" fill="transparent" />
                      <circle cx="80" cy="80" r="75" stroke="#6366f1" strokeWidth="6" fill="transparent" strokeDasharray="471" strokeDashoffset={471 - (471 * (Math.min(result.parsedGroups.length, 10) / 10))} className="transition-all duration-[2s]" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black text-white">{result.parsedGroups.length}</span>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Targets</span>
                    </div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
               {filteredResults.map(group => (
                 <div key={group.id} className="group bg-[#0b0e15] border border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500/30 transition-all flex flex-col relative overflow-hidden hover:-translate-y-2">
                    <div className="flex justify-between items-start mb-8">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black border uppercase tracking-wider ${group.linkType === 'WhatsApp' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                         {group.linkType}
                       </span>
                       <button onClick={() => { navigator.clipboard.writeText(group.url); setCopiedId(group.id); setTimeout(() => setCopiedId(null), 2000); }} className="text-gray-600 hover:text-white transition-all">
                         <i className={`fa-solid ${copiedId === group.id ? 'fa-check text-emerald-500' : 'fa-copy'} text-xs`}></i>
                       </button>
                    </div>

                    <div className="flex-1">
                       <h4 className="text-xl font-black mb-3 line-clamp-1 group-hover:text-indigo-400 transition-colors">{group.title}</h4>
                       <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 mb-8 italic">{group.description || 'No detailed data profile available...'}</p>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                       <div className="text-[9px] font-black text-gray-700 uppercase">
                         Fidelity: <span className="text-indigo-500">{group.confidenceScore}%</span>
                       </div>
                       <a href={group.url} target="_blank" rel="noopener noreferrer" className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all active:scale-95 ${group.linkType === 'WhatsApp' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                         ACCESS
                       </a>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scan { from { top: 0; } to { top: 100%; } }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
        select { 
          appearance: none; 
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234b5563'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); 
          background-repeat: no-repeat; background-position: left 1rem center; background-size: 1.2em; 
        }
      `}</style>
    </div>
  );
};

export default App;