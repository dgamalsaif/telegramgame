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

  const [profile, setProfile] = useState<UserProfile>({
    agentName: '',
    telegramHandle: '',
    operationalId: '',
    isRegistered: false
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [country, setCountry] = useState('السعودية');
  const [category, setCategory] = useState('تقنية');
  const [language, setLanguage] = useState('العربية');

  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('scout_v4_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedProfile = localStorage.getItem('scout_v4_profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));
    else setIsEditingProfile(true);
  }, []);

  const saveProfile = () => {
    if (!profile.agentName.trim()) return;
    const opId = profile.operationalId || `AG-${Math.floor(Math.random() * 9000) + 1000}`;
    const updated = { ...profile, operationalId: opId, isRegistered: true };
    setProfile(updated);
    localStorage.setItem('scout_v4_profile', JSON.stringify(updated));
    setIsEditingProfile(false);
    addLog(`تم تأكيد هوية العميل: ${profile.agentName}`);
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
      "تفعيل بروتوكول المسح الشامل...",
      `تتبع أصل الإشارات في ${country}...`,
      "البحث عن الروابط في المنشورات العامة...",
      "تحديد اتجاهات البيانات (Origin Tracking)...",
      "فك تشفير الوجهات الاستخباراتية...",
      "تحليل جودة الروابط المكتشفة..."
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
        platforms: ['X', 'LinkedIn', 'Facebook', 'TikTok', 'GitHub'], 
        mode: 'deep', 
        searchType: searchType,
        agentContext: profile
      });
      setResult(data);
      addLog("اكتملت العملية. تم تحديد جميع الروابط والمصادر.");
      const newItem = { query: finalQuery, timestamp: new Date().toLocaleTimeString('ar-EG'), type: searchType };
      setHistory(prev => [newItem, ...prev.filter(i => i.query !== finalQuery)].slice(0, 10));
    } catch (err: any) {
      setError(err.message || "خطأ في تتبع الإشارة.");
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

      <aside className={`fixed top-0 bottom-0 right-0 z-50 bg-[#080a10]/98 backdrop-blur-3xl border-l border-white/5 transition-all duration-500 shadow-2xl overflow-y-auto ${isSidebarOpen ? 'w-80' : 'w-0 invisible'}`}>
        <div className="p-8 flex flex-col min-h-full">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[10px] font-black tracking-[0.4em] text-indigo-500 uppercase">Mission Console</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-600 hover:text-white transition-colors"><i className="fa-solid fa-chevron-right"></i></button>
          </div>

          <div className="mb-10 p-5 bg-white/5 border border-white/10 rounded-3xl relative overflow-hidden transition-all hover:bg-white/[0.08]">
            <div className={`absolute top-0 left-0 w-1 h-full ${profile.isRegistered ? 'bg-indigo-500' : 'bg-amber-500 animate-pulse'}`}></div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Agent Profile</span>
              <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-[9px] text-indigo-400 font-bold hover:text-white transition-colors">
                {isEditingProfile ? 'CANCEL' : (profile.isRegistered ? 'UPDATE' : 'SETUP')}
              </button>
            </div>
            {isEditingProfile ? (
              <div className="space-y-4">
                <input type="text" placeholder="الاسم الرمزي للعميل" value={profile.agentName} onChange={e => setProfile({...profile, agentName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold focus:outline-none focus:border-indigo-500" />
                <button onClick={saveProfile} className="w-full bg-indigo-600 text-[10px] font-black py-3 rounded-xl hover:bg-indigo-500 transition-all">CONNECT</button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 text-xl"><i className="fa-solid fa-id-badge"></i></div>
                <div><div className="text-[12px] font-black text-white">{profile.agentName}</div><div className="text-[8px] text-gray-500 font-black uppercase mt-0.5">ID: {profile.operationalId}</div></div>
              </div>
            )}
          </div>

          <div className="space-y-8 flex-1">
            <div>
              <label className="text-[9px] font-black text-gray-600 uppercase mb-4 block tracking-widest">Operation Mode</label>
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                <button onClick={() => setSearchType('topic')} className={`py-2 text-[10px] font-black rounded-lg transition-all ${searchType === 'topic' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>TOPIC</button>
                <button onClick={() => setSearchType('user')} className={`py-2 text-[10px] font-black rounded-lg transition-all ${searchType === 'user' ? 'bg-rose-600 text-white' : 'text-gray-500'}`}>ENTITY</button>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-gray-600 uppercase mb-3 block tracking-widest">Sector</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none">
                  <option value="السعودية">المملكة العربية السعودية</option>
                  <option value="مصر">جمهورية مصر العربية</option>
                  <option value="الإمارات">الإمارات</option>
                  <option value="عالمي">Global Node</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-600 uppercase mb-3 block tracking-widest">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none">
                  <option value="تقنية">التقنية والذكاء</option>
                  <option value="تجارة">المال والأعمال</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-600 uppercase mb-4 block tracking-widest">Recent Activity</label>
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <div key={idx} onClick={() => handleSearch(item.query)} className="bg-white/5 border border-white/5 p-4 rounded-xl cursor-pointer hover:border-indigo-500/40">
                    <div className="text-[11px] font-bold text-gray-400 truncate">{item.query}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className={`transition-all duration-500 relative z-10 ${isSidebarOpen ? 'mr-80' : 'mr-0'} p-6 lg:p-12 max-w-[1500px] mx-auto`}>
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-6">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500"><i className="fa-solid fa-bars"></i></button>
            )}
            <h1 className="text-3xl font-black uppercase tracking-tighter"><span className="text-indigo-500">SCOUT</span> OPS <span className="text-xs bg-indigo-500/10 px-3 py-1 rounded-full text-indigo-400 font-bold border border-indigo-500/20 ml-2">v4.5 PRO</span></h1>
          </div>
        </header>

        <div className="max-w-4xl mx-auto mb-20">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col md:flex-row items-center bg-[#080a10] border border-white/10 rounded-[2.5rem] p-4 shadow-2xl focus-within:border-indigo-500/50 transition-all">
             <div className="flex-1 flex items-center px-6 py-4 gap-6 w-full">
                <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : (searchType === 'user' ? 'fa-fingerprint text-rose-500' : 'fa-radar text-indigo-500')} text-2xl`}></i>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={searchType === 'user' ? "أدخل المعرف الرقمي للمسح..." : "ما هو هدف البحث اليوم؟"} className="w-full bg-transparent text-xl font-bold focus:outline-none placeholder:text-gray-700" />
             </div>
             <button disabled={loading} className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${searchType === 'user' ? 'bg-rose-600' : 'bg-indigo-600'} shadow-xl`}>{loading ? 'SCANNING...' : 'EXECUTE'}</button>
          </form>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {['All', 'WhatsApp', 'Telegram', 'X', 'LinkedIn'].map(p => (
              <button key={p} onClick={() => setActivePlatform(p)} className={`px-6 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${activePlatform === p ? 'bg-indigo-600 border-indigo-500' : 'border-white/5 text-gray-500 hover:text-white'}`}>{p}</button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="max-w-2xl mx-auto mb-16 bg-black/60 border border-indigo-500/20 rounded-[2rem] p-8 font-mono text-[10px] text-indigo-400 shadow-2xl overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500 animate-[scan_2s_linear_infinite]"></div>
             <div className="flex items-center gap-3 mb-4 text-gray-600 border-b border-white/5 pb-3 font-black"><i className="fa-solid fa-satellite animate-pulse"></i> system.recon.live</div>
             {logs.map((log, i) => <div key={i} className="mb-2 opacity-80 animate-fadeIn">{log}</div>)}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-12 animate-fadeIn pb-40">
            <div className="bg-[#0a0c14] border border-white/5 rounded-[3rem] p-12 shadow-2xl">
               <h3 className="text-sm font-black uppercase mb-8 flex items-center gap-4 text-gray-500 tracking-widest"><i className="fa-solid fa-microchip text-indigo-500"></i> Summary Report</h3>
               <p className="text-gray-300 leading-relaxed text-xl italic whitespace-pre-wrap">{result.text}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {filteredResults.map(group => (
                 <div key={group.id} className="group bg-[#0b0e15] border border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500/30 transition-all flex flex-col relative overflow-hidden shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black border uppercase ${group.linkType === 'WhatsApp' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>{group.linkType}</span>
                       <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{group.platformSource}</span>
                    </div>
                    <div className="flex-1">
                       <h4 className="text-xl font-black mb-3 line-clamp-1 group-hover:text-indigo-400">{group.title}</h4>
                       <p className="text-gray-500 text-[11px] leading-relaxed line-clamp-2 mb-6 italic">{group.description}</p>
                    </div>
                    <div className="space-y-4 pt-6 border-t border-white/5">
                       <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-black text-gray-700 uppercase">Direction / Source Post:</span>
                          <a href={group.sourcePostUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 font-bold hover:underline truncate block"><i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> {group.sourcePostUrl}</a>
                       </div>
                       <div className="flex items-center justify-between mt-4">
                          <button onClick={() => { navigator.clipboard.writeText(group.url); setCopiedId(group.id); setTimeout(() => setCopiedId(null), 2000); }} className="text-gray-500 hover:text-white transition-all"><i className={`fa-solid ${copiedId === group.id ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i></button>
                          <a href={group.url} target="_blank" rel="noopener noreferrer" className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase ${group.linkType === 'WhatsApp' ? 'bg-emerald-600' : 'bg-indigo-600'} shadow-lg`}>ACCESS NODE</a>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scan { from { top: -100%; } to { top: 200%; } }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234b5563'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: left 1rem center; background-size: 1.2em; }
      `}</style>
    </div>
  );
};

export default App;