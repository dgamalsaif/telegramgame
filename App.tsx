
import React, { useState, useEffect, useRef } from 'react';
import { searchGlobalIntel, testConnection } from './services/geminiService';
import { IntelLink, SearchResult, SearchType, PlatformType } from './types';

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
    addLog("SYSTEM: INITIALIZING KERNEL...");
    addLog("API: VERIFYING HANDSHAKE WITH FLASH ENGINE...");
    
    const isOk = await testConnection();
    if (isOk) {
      setApiStatus('online');
      addLog("SUCCESS: CONNECTION ESTABLISHED. READY FOR RECON.");
    } else {
      setApiStatus('offline');
      addLog("CRITICAL: API_KEY_MISSING OR INVALID. PLEASE SELECT KEY.");
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
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      addLog("USER: TRIGGERING KEY SELECTION DIALOG...");
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success and re-check
      checkApi();
    } else {
      setError("وظيفة اختيار المفتاح غير متوفرة في هذه البيئة. يرجى التأكد من تعريف المفتاح يدوياً.");
    }
  };

  const handleSearch = async () => {
    if (apiStatus !== 'online') {
      setError("لا يمكن بدء البحث. يرجى ربط مفتاح API أولاً لتجنب قيود Google Cloud.");
      return;
    }
    if (!query.trim()) {
      setError("يرجى إدخال هدف البحث (Target Query).");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStep('جاري تنفيذ المسح الاستخباري...');

    try {
      addLog(`RECON: INITIATING SEARCH FOR "${query}"...`);
      const data = await searchGlobalIntel({
        query,
        location: location || 'Global',
        specialty,
        platforms: selectedPlatforms,
        searchType: 'deep-scan',
        filters: { activeOnly: true, privateOnly: false, minConfidence: 85 }
      });

      setResult(data);
      addLog(`SUCCESS: CAPTURED ${data.links.length} ACTIVE SIGNALS.`);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        addLog("FATAL: API KEY ERROR. RESETTING KEY...");
        setApiStatus('offline');
        handleOpenKeyDialog();
      } else {
        setError("فشل الاتصال بالمحرك. يرجى التأكد من صلاحية المفتاح أو استخدامه في بيئة المعاينة.");
        addLog(`ERROR: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010204] text-slate-200 font-['Cairo'] relative overflow-x-hidden" dir="rtl">
      
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,#1e1b4b_0%,#010204_80%)] opacity-40"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px'}}></div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl">
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
            <i className="fa-solid fa-satellite-dish text-6xl text-indigo-500 animate-pulse"></i>
          </div>
          <h2 className="mt-12 text-2xl font-black text-white uppercase tracking-widest">{loadingStep}</h2>
        </div>
      )}

      {/* Main UI */}
      <main className="relative z-10 max-w-7xl mx-auto p-6 lg:p-12 space-y-12 pt-24 pb-40">
        
        <header className="flex flex-col items-center text-center space-y-8">
          <div className={`inline-flex items-center gap-4 px-6 py-2 border rounded-full transition-colors ${apiStatus === 'online' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20 animate-pulse'}`}>
            <span className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'}`}></span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">
              {apiStatus === 'online' ? 'Engine Secure' : 'Action Required: Connect Key'}
            </span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-none">
            SCOUT<span className="text-indigo-600">OPS</span><span className="text-indigo-500 text-2xl font-black align-top mr-2">V7</span>
          </h1>
          <p className="text-slate-500 max-w-xl font-medium text-lg">
            نظام استخباراتي مفتوح المصدر للبحث عن المجتمعات والمجموعات الرقمية.
          </p>
          {apiStatus === 'offline' && (
            <button onClick={handleOpenKeyDialog} className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
              تفعيل المحرك باستخدام المفتاح الخاص بك
            </button>
          )}
        </header>

        {/* Control Center */}
        <section className="bg-white/[0.02] border border-white/5 rounded-[4rem] p-8 lg:p-14 backdrop-blur-3xl shadow-2xl space-y-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
            {availablePlatforms.map(p => (
              <button 
                key={p.name}
                onClick={() => setSelectedPlatforms(prev => prev.includes(p.name) ? prev.filter(x => x !== p.name) : [...prev, p.name])}
                className={`h-24 flex flex-col items-center justify-center gap-3 rounded-2xl border transition-all ${selectedPlatforms.includes(p.name) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-black/40 border-white/5 text-slate-600 hover:border-white/20'}`}
              >
                <i className={`${p.icon} text-2xl`}></i>
                <span className="text-[9px] font-black uppercase">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="relative group max-w-4xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-sky-600 rounded-[3rem] blur opacity-10 group-hover:opacity-30 transition"></div>
            <div className="relative flex bg-[#020305] rounded-[3rem] p-3 border border-white/10">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="ماذا تريد أن تجد اليوم؟ (مثلاً: أطباء الجلدية في دبي)..."
                className="flex-1 bg-transparent py-6 px-10 text-xl font-bold text-white focus:outline-none placeholder:text-slate-800"
              />
              <button onClick={handleSearch} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.5rem] px-12 py-6 font-black uppercase text-[10px] tracking-widest transition-all">
                {loading ? 'Recon...' : 'بدء المسح'}
              </button>
            </div>
          </div>
        </section>

        {/* Results & Logs */}
        {result && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-black/60 border border-white/5 rounded-3xl overflow-hidden font-mono text-[10px]">
              <div className="bg-white/5 px-6 py-3 border-b border-white/5 text-indigo-400 font-bold tracking-widest uppercase">System Output Monitor</div>
              <div ref={terminalRef} className="h-48 p-8 overflow-y-auto space-y-2 custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-slate-800">[{i}]</span>
                    <span className={log.includes('SUCCESS') ? 'text-emerald-500' : log.includes('CRITICAL') ? 'text-rose-500' : 'text-indigo-400/60'}>{log}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
              {result.links.map(link => (
                <div key={link.id} className="group bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500/40 transition-all">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-black border border-white/5 flex items-center justify-center text-3xl text-slate-600 group-hover:text-indigo-500 transition-colors">
                      <i className={`fa-brands fa-${link.platform.toLowerCase().replace('x', 'x-twitter')}`}></i>
                    </div>
                    <span className="px-4 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase">{link.confidence}% Confidence</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 line-clamp-1">{link.title}</h3>
                  <p className="text-xs text-slate-500 mb-8 line-clamp-2 leading-relaxed">{link.description}</p>
                  <button onClick={() => window.open(link.url, '_blank')} className="w-full py-4 bg-white/5 hover:bg-indigo-600 rounded-xl text-white font-black text-[10px] uppercase tracking-widest transition-all">
                    فتح الرابط المكتشف
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-xl mx-auto p-12 bg-rose-500/5 border border-rose-500/20 rounded-[3rem] text-center space-y-6">
            <i className="fa-solid fa-triangle-exclamation text-5xl text-rose-500"></i>
            <p className="text-rose-400 font-bold">{error}</p>
            <button onClick={handleOpenKeyDialog} className="px-8 py-3 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase">إعداد المفتاح يدوياً</button>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 flex justify-center pointer-events-none z-50">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 px-10 py-4 rounded-full flex items-center gap-8 shadow-3xl pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Flash Engine: {apiStatus}</span>
          </div>
          <div className="w-px h-4 bg-white/10"></div>
          <button onClick={handleOpenKeyDialog} className="text-[10px] font-black text-indigo-400 hover:text-white uppercase transition-colors">Config API</button>
        </div>
      </footer>
    </div>
  );
};

export default App;
