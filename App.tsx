
import React, { useState, useEffect, useRef } from 'react';
import { searchGlobalIntel, testConnection } from './services/geminiService';
import { IntelLink, SearchResult, SearchType, Platform, PlatformType } from './types';

const availablePlatforms: { name: PlatformType; icon: string }[] = [
  { name: 'Telegram', icon: 'fa-brands fa-telegram' },
  { name: 'WhatsApp', icon: 'fa-brands fa-whatsapp' },
  { name: 'Discord', icon: 'fa-brands fa-discord' },
  { name: 'X', icon: 'fa-brands fa-x-twitter' },
  { name: 'Facebook', icon: 'fa-brands fa-facebook' },
  { name: 'Instagram', icon: 'fa-brands fa-instagram' },
  { name: 'LinkedIn', icon: 'fa-brands fa-linkedin' },
  { name: 'Reddit', icon: 'fa-brands fa-reddit' },
  { name: 'TikTok', icon: 'fa-brands fa-tiktok' },
];

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('deep-scan');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(['Telegram', 'WhatsApp']);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeLink, setActiveLink] = useState<IntelLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'testing' | 'online' | 'offline'>('testing');

  const terminalRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    setLogs(prev => [...prev.slice(-50), `[${timestamp}] ${msg}`]);
  };

  const checkApi = async () => {
    setApiStatus('testing');
    addLog("SYSTEM: INITIALIZING KERNEL v7.5...");
    addLog("API: TESTING CONNECTION TO GOOGLE CLOUD...");
    
    const isOk = await testConnection();
    if (isOk) {
      setApiStatus('online');
      addLog("SUCCESS: API HANDSHAKE VERIFIED. ENGINE IS ONLINE.");
    } else {
      setApiStatus('offline');
      addLog("CRITICAL: API HANDSHAKE FAILED. CHECK YOUR API_KEY.");
    }
  };

  useEffect(() => {
    checkApi();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      addLog("USER: OPENING API KEY SELECTION DIALOG...");
      await window.aistudio.openSelectKey();
      // Proceed immediately as per instructions
      checkApi();
    } else {
      setError("وظيفة اختيار المفتاح غير متوفرة في هذه البيئة. يرجى التأكد من تعريف API_KEY في المتغيرات.");
    }
  };

  const togglePlatform = (p: PlatformType) => {
    setSelectedPlatforms(prev => 
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const handleSearch = async () => {
    if (apiStatus !== 'online') {
      setError("المحرك غير متصل. يرجى الضغط على زر 'ربط المحرك' في الأسفل.");
      return;
    }
    if (!query.trim() && !specialty.trim()) {
      setError("يرجى إدخال كلمة البحث الأساسية أو التخصص المطلوب.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] --- NEW SEARCH INITIATED ---`]);
    setLoadingStep('جاري تنفيذ بروتوكول الاستكشاف...');

    try {
      addLog(`RECON: البحث عن "${query || specialty}" باستخدام Flash Engine...`);
      const data = await searchGlobalIntel({
        query,
        location: location || 'Global',
        specialty,
        platforms: selectedPlatforms,
        searchType,
        filters: { activeOnly: true, privateOnly: false, minConfidence: 85 }
      });

      setResult(data);
      addLog(`SUCCESS: تم التقاط ${data.links.length} إشارة نشطة.`);
    } catch (err: any) {
      setError("فشل الاتصال. قد يكون مفتاح الـ API غير صالح أو المشروع يتطلب تفعيل الدفع.");
      addLog(`FATAL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010204] text-slate-200 font-['Cairo'] relative overflow-x-hidden" dir="rtl">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,#1e1b4b_0%,#010204_80%)] opacity-40"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>
      </div>

      {/* Loader */}
      {loading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl">
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
            <div className="text-center z-10">
              <i className="fa-solid fa-satellite-dish text-6xl text-indigo-500 animate-pulse mb-4"></i>
              <div className="text-[10px] font-black text-indigo-400 font-mono tracking-widest uppercase">Scanning</div>
            </div>
          </div>
          <h2 className="mt-12 text-3xl font-black text-white uppercase tracking-[0.2em]">{loadingStep}</h2>
        </div>
      )}

      {activeLink && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in zoom-in duration-300">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-[3rem] p-10 max-w-xl w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-indigo-600 to-transparent"></div>
            <div className="text-center space-y-8">
              <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl mx-auto text-indigo-500">
                <i className={`fa-brands fa-${activeLink.platform.toLowerCase().replace('x', 'x-twitter')}`}></i>
              </div>
              <h3 className="text-3xl font-black text-white leading-tight">{activeLink.title}</h3>
              <div className="p-6 bg-black rounded-2xl border border-white/5 font-mono text-[10px] break-all text-indigo-300/60 text-center">
                {activeLink.url}
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setActiveLink(null)} className="flex-1 py-5 bg-white/5 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-white border border-white/5">إغلاق</button>
                <button onClick={() => window.open(activeLink.url, '_blank')} className="flex-1 py-5 bg-indigo-600 rounded-2xl font-black text-[10px] uppercase text-white shadow-xl hover:bg-indigo-500 active:scale-95 transition-all">تفعيل الرابط</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-7xl mx-auto p-6 lg:p-12 space-y-12 pt-24 pb-40">
        
        <header className="flex flex-col items-center text-center space-y-10">
          <div className="inline-flex items-center gap-4 px-6 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            <span className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-emerald-500 animate-ping' : apiStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`}></span>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">
              {apiStatus === 'online' ? 'Flash Engine Online' : apiStatus === 'offline' ? 'Engine Connection Required' : 'Verifying Connectivity...'}
            </span>
          </div>
          <h1 className="text-7xl lg:text-9xl font-black tracking-tighter text-white uppercase leading-none">
            SCOUT<span className="text-indigo-600">OPS</span><span className="text-indigo-500 text-3xl font-black align-top mr-4">7.5</span>
          </h1>
          <p className="text-slate-500 max-w-3xl font-medium text-lg lg:text-2xl leading-relaxed">
            استكشاف ذكي للبيانات والروابط عبر الويب المفتوح باستخدام تقنية Flash لتجاوز قيود الدفع.
          </p>
          {apiStatus === 'offline' && (
            <button 
              onClick={handleOpenKeyDialog}
              className="px-8 py-4 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white animate-bounce shadow-xl shadow-indigo-600/20"
            >
              اضغط هنا لربط المحرك (API Key)
            </button>
          )}
        </header>

        <section className="bg-white/[0.02] border border-white/5 rounded-[4rem] p-8 lg:p-14 backdrop-blur-3xl shadow-2xl space-y-14">
          <div className="space-y-8">
            <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">مصفوفة المنصات المستهدفة</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {availablePlatforms.map(p => (
                <button 
                  key={p.name}
                  onClick={() => togglePlatform(p.name as PlatformType)}
                  className={`h-28 flex flex-col items-center justify-center gap-4 rounded-3xl border transition-all duration-500 ${selectedPlatforms.includes(p.name as PlatformType) ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-black/40 border-white/5 text-slate-600 hover:border-white/20'}`}
                >
                  <i className={`${p.icon} text-3xl`}></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-12">
            <div className="relative group max-w-5xl mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-600 rounded-[4rem] blur opacity-10 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative flex bg-[#020305] rounded-[4rem] p-3 items-center border border-white/10 shadow-3xl">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="أدخل كلمة البحث (مثلاً: أطباء امتياز، هندسة)..."
                  className="flex-1 bg-transparent py-8 px-10 text-2xl font-bold text-white focus:outline-none placeholder:text-slate-800"
                />
                <button onClick={() => handleSearch()} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-[3.5rem] px-14 py-8 font-black uppercase text-xs tracking-[0.2em] transition-all active:scale-95 shadow-2xl flex items-center gap-4">
                  {loading ? 'Recon...' : 'تنفيذ المسح'}
                  <i className="fa-solid fa-bolt-lightning"></i>
                </button>
              </div>
            </div>
          </div>
        </section>

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 space-y-16 pb-32">
            <div className="bg-[#050508] border border-white/10 rounded-[3rem] overflow-hidden shadow-3xl">
              <div className="bg-white/5 px-8 py-4 flex items-center justify-between border-b border-white/5">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">مراقب المخرجات اللحظي</span>
                <div className="text-[9px] font-mono text-slate-700">SCOUT_LOG_7.5</div>
              </div>
              <div ref={terminalRef} className="h-56 p-10 font-mono text-[11px] text-slate-500 overflow-y-auto space-y-3 scroll-smooth custom-scrollbar bg-[rgba(0,0,0,0.7)]">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <span className="text-indigo-900 shrink-0 select-none">[{i.toString().padStart(3, '0')}]</span>
                    <span className={`leading-relaxed ${log.includes('SUCCESS') ? 'text-emerald-400/80' : log.includes('CRITICAL') || log.includes('FATAL') ? 'text-rose-400/80' : 'text-indigo-400/60'}`}>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {result.links.map(link => (
                <div key={link.id} className="group bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 hover:border-indigo-500/40 hover:bg-white/[0.05] transition-all flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-10 py-4 rounded-bl-[2rem] text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border-l border-b border-white/5">ثقة {link.confidence}%</div>
                  <div className="flex items-center gap-8 mb-12">
                    <div className="w-20 h-20 rounded-[2rem] bg-black border border-white/5 flex items-center justify-center text-4xl text-slate-600 group-hover:text-indigo-500 transition-all">
                      <i className={`fa-brands fa-${link.platform.toLowerCase().replace('x', 'x-twitter')}`}></i>
                    </div>
                    <h4 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{link.platform}</h4>
                  </div>
                  <div className="flex-1 space-y-6 mb-12">
                    <h3 className="text-2xl font-bold text-slate-100 leading-tight">{link.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 font-medium">{link.description}</p>
                  </div>
                  <button onClick={() => setActiveLink(link)} className="w-full py-6 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-600/20 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] transition-all">إقامة اتصال (Link)</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto p-16 bg-rose-500/5 border border-rose-500/20 rounded-[4rem] text-center space-y-10">
            <i className="fa-solid fa-triangle-exclamation text-7xl text-rose-500"></i>
            <h3 className="text-3xl font-black text-white uppercase">فشل المحرك</h3>
            <p className="text-rose-400/80 text-md font-bold leading-relaxed">{error}</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setError(null)} className="px-14 py-5 bg-white/5 hover:bg-white/10 text-white rounded-full font-black text-[11px] uppercase transition-all">إعادة المحاولة</button>
              <button onClick={handleOpenKeyDialog} className="px-14 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-black text-[11px] uppercase transition-all shadow-xl">ربط المحرك</button>
            </div>
          </div>
        )}

      </main>

      <footer className="fixed bottom-10 left-0 right-0 flex justify-center pointer-events-none z-[100]">
        <div className="bg-black/90 backdrop-blur-3xl border border-white/10 px-12 py-5 rounded-full flex items-center gap-12 shadow-3xl pointer-events-auto">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shadow-lg ${apiStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Status: <span className={apiStatus === 'online' ? 'text-white' : 'text-rose-500'}>{apiStatus.toUpperCase()}</span></span>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Engine: <span className="text-sky-400">G-3 FLASH</span></span>
          <div className="h-6 w-px bg-white/10"></div>
          <button onClick={handleOpenKeyDialog} className="text-[11px] font-black text-indigo-400 hover:text-white uppercase tracking-[0.4em] transition-colors">Setup API Key</button>
        </div>
      </footer>
    </div>
  );
};

export default App;
