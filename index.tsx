import React, { useState, useEffect, useContext, createContext } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

// ==========================================
// 1. CONFIGURATION
// ==========================================
// 🔴 Your Worker URL
const WORKER_URL = "https://damp-wind-775f.rusdumitru122.workers.dev/"; 

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ==========================================
// 2. DATA TYPES
// ==========================================
interface AuditCategory {
    score: number;
    feedback: string;
    fix?: string;
}

interface CheckItem {
    label: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    details: string;
    fix?: string;
}

interface AnalysisData {
    overallScore: number;
    verdict: string;
    categories: {
        visual: AuditCategory;
        audio: AuditCategory;
        copy: AuditCategory;
    };
    checks: CheckItem[];
}

// 🛡️ Safe Default
const DEFAULT_ANALYSIS: AnalysisData = {
    overallScore: 0,
    verdict: "Analysis failed to load.",
    categories: {
        visual: { score: 0, feedback: "N/A", fix: "" },
        audio: { score: 0, feedback: "N/A", fix: "" },
        copy: { score: 0, feedback: "N/A", fix: "" }
    },
    checks: []
};

// ==========================================
// 3. AI SERVICE (Optimized for Speed)
// ==========================================
const BRUTAL_SYSTEM_PROMPT = `
You are a world-class Direct Response Creative Strategist.
Your job is to audit video ads with extreme scrutiny.

CRITICAL INSTRUCTIONS:
1. **BE BRUTAL:** Do not use fluff. If it sucks, say it sucks and say WHY.
2. **USE TIMESTAMPS:** You MUST reference specific moments (e.g., "At 0:03, the pacing dies.").
3. **NO GENERIC ADVICE:** Do not say "make it better." Say "Cut the first 2 seconds" or "Change the font."
4. **8th GRADE LEVEL:** Use short, punchy sentences. No marketing jargon.

OUTPUT FORMAT:
Return ONLY a valid JSON object. No markdown.

Structure:
{
  "overallScore": number (0-10, be harsh),
  "verdict": "One distinct, brutal sentence summarizing the creative potential.",
  "categories": {
    "visual": { 
      "score": number (0-100), 
      "feedback": "Analyze scroll-stop and pacing. Mention specific shots.", 
      "fix": "Direct instruction on what to cut or change." 
    },
    "audio": { 
      "score": number (0-100), 
      "feedback": "Analyze voiceover tone and music. Is it annoying?", 
      "fix": "Direct instruction on audio mixing." 
    },
    "copy": { 
      "score": number (0-100), 
      "feedback": "Analyze the hook and pain points.", 
      "fix": "Rewrite the main hook to be punchier." 
    }
  },
  "checks": [
    { 
      "label": "The Hook (0-3s)", 
      "status": "PASS/FAIL/WARN", 
      "details": "Does it stop the scroll? Analyze the first 3 seconds.", 
      "fix": "How to make the intro explosive." 
    },
    { 
      "label": "Pacing & Retention", 
      "status": "PASS/FAIL/WARN", 
      "details": "Where does it drag? Reference timestamps.", 
      "fix": "Where to trim the fat." 
    },
    { 
      "label": "Storytelling", 
      "status": "PASS/FAIL/WARN", 
      "details": "Does it agitate a problem and solve it?", 
      "fix": "Sharpen the narrative arc." 
    },
    { 
      "label": "Call to Action", 
      "status": "PASS/FAIL/WARN", 
      "details": "Is the offer clear?", 
      "fix": "A stronger, direct command." 
    }
  ]
}
`;

// 🚀 UPDATED: Now accepts raw File object (Binary)
const analyzeVideo = async (file: File, email: string): Promise<AnalysisData> => {
    try {
        // 🚀 SPEED BOOST: Send FormData (Binary) instead of JSON (Base64)
        // This avoids the 33% size overhead of Base64 encoding
        const formData = new FormData();
        formData.append('video', file);
        formData.append('mimeType', file.type);
        formData.append('licenseKey', email);
        formData.append('systemPrompt', BRUTAL_SYSTEM_PROMPT);

        console.log("📤 Sending to Worker:", { 
            fileName: file.name, 
            fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            mimeType: file.type 
        });

        const response = await fetch(WORKER_URL, {
            method: "POST",
            body: formData // Browser handles headers automatically for FormData
        });

        // Check if response is OK before parsing
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Worker Error Response:", response.status, errorText);
            throw new Error(`Worker returned ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        console.log("📥 Worker Response:", json);

        if (json.error) throw new Error(json.error.message || "Worker Error");
        if (!json.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("No analysis returned from AI");

        const text = json.candidates[0].content.parts[0].text;
        
        // Robust JSON Extraction
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid JSON from AI");

        const cleanJson = text.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(cleanJson);

        return {
            overallScore: parsed.overallScore || 0,
            verdict: parsed.verdict || "Analysis incomplete.",
            categories: {
                visual: { ...DEFAULT_ANALYSIS.categories.visual, ...parsed.categories?.visual },
                audio: { ...DEFAULT_ANALYSIS.categories.audio, ...parsed.categories?.audio },
                copy: { ...DEFAULT_ANALYSIS.categories.copy, ...parsed.categories?.copy }
            },
            checks: Array.isArray(parsed.checks) ? parsed.checks : []
        };

    } catch (error) {
        console.error("❌ Analysis Failed:", error);
        throw error;
    }
};

// ==========================================
// 4. DASHBOARD UI COMPONENTS
// ==========================================

const ScoreCircle = ({ score }: { score: number }) => {
    const safeScore = score || 0;
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (safeScore / 10) * circumference;
    let color = '#ef4444'; 
    if (safeScore >= 5) color = '#eab308'; 
    if (safeScore >= 8) color = '#22c55e'; 

    return (
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r={radius} stroke="#333" strokeWidth="6" fill="transparent" />
                <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <span className="absolute text-2xl font-bold text-white">{safeScore}/10</span>
        </div>
    );
};

const StatusChip = ({ status }: { status: string }) => {
    const styles: any = {
        PASS: 'bg-green-500/10 text-green-500 border-green-500/20',
        FAIL: 'bg-red-500/10 text-red-500 border-red-500/20',
        WARN: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status] || styles.WARN}`}>{status || "WARN"}</span>;
};

const AnalysisResult = ({ data }: { data: AnalysisData }) => {
    if (!data || !data.categories) {
        return (
            <div className="p-4 bg-red-900/20 border border-red-500 rounded text-center">
                <h3 className="text-red-500 font-bold">Display Error</h3>
                <p className="text-gray-400 text-sm">Data structure invalid. Please try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in pb-10">
            {/* Verdict */}
            <div className="flex flex-col md:flex-row gap-6 items-center bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-lg">
                <ScoreCircle score={data.overallScore} />
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Creative Director's Verdict</h3>
                    <p className="text-xl md:text-2xl font-bold italic text-white leading-relaxed">"{data.verdict}"</p>
                </div>
            </div>

            {/* Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: 'Visuals', icon: '👁️', data: data.categories.visual },
                    { title: 'Audio', icon: '🔊', data: data.categories.audio },
                    { title: 'Copy', icon: '✒️', data: data.categories.copy }
                ].map((pillar) => (
                    <div key={pillar.title} className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2 font-bold text-lg text-white"><span>{pillar.icon}</span> {pillar.title}</div>
                            <span className={`font-mono font-bold ${(pillar.data?.score || 0) > 70 ? 'text-green-400' : 'text-yellow-400'}`}>{pillar.data?.score || 0}%</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 leading-relaxed flex-grow">{pillar.data?.feedback || "No feedback."}</p>
                        {pillar.data?.fix && (
                            <div className="mt-auto pt-3 border-t border-white/5">
                                <p className="text-xs text-[#00F2EA] font-bold uppercase mb-1">Fix:</p>
                                <p className="text-sm text-white italic">{pillar.data.fix}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Checks */}
            <div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">Diagnostic Checks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(data.checks || []).map((check, idx) => (
                        <div key={idx} className="bg-[#1a1a1a] p-5 rounded-xl border border-white/10">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{check.label}</span>
                                <StatusChip status={check.status} />
                            </div>
                            <p className="text-sm text-white mb-2">{check.details}</p>
                            {check.fix && <p className="text-xs text-[#00F2EA] mt-2 pt-2 border-t border-white/5">Fix: {check.fix}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 5. MAIN LOGIC (Auth + Upload + Modal)
// ==========================================

const ViralAuditTool = ({ isOpen, onClose, user, triggerUpgrade }: any) => {
    const { setShowAuthModal, setAuthView } = useContext(AuthContext);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'ANALYZING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [result, setResult] = useState<AnalysisData | null>(null);
    const [auditCount, setAuditCount] = useState(0);
    const [loadingMsg, setLoadingMsg] = useState("Initializing...");
    const FREE_LIMIT = 3;

    const LOADING_MESSAGES = [
        "Analyzing hook retention...", "Judging your font choices...", "Calculating viral coefficient...",
        "Scanning for boring intros...", "Reviewing color grading...", "Checking for 'umms' and 'ahhs'...",
        "Comparing to top 1% of ads...", "Preparing brutal feedback...", "Checking pacing...", "Writing the roast..."
    ];

    useEffect(() => { 
        if(!isOpen) { 
            setFile(null); setResult(null); setStatus('IDLE'); 
        } else if (user && supabase) {
            loadUsage();
        }
    }, [isOpen, user]);

    useEffect(() => {
        let interval: any;
        if (status === 'ANALYZING') {
            let i = 0; setLoadingMsg(LOADING_MESSAGES[0]);
            interval = setInterval(() => {
                i = (i + 1) % LOADING_MESSAGES.length;
                setLoadingMsg(LOADING_MESSAGES[i]);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [status]);

    const loadUsage = async () => {
        if(!user || !supabase) return;
        // 🛡️ Fix 406 Error: use maybeSingle instead of single
        const { data } = await supabase.from('profiles').select('audit_count').eq('id', user.id).maybeSingle();
        if(data) setAuditCount(data.audit_count);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) { setFile(e.target.files[0]); }
    };

    const reset = () => { setFile(null); setStatus('IDLE'); setResult(null); };

    const runAnalysis = async () => {
        if (!file || !user || auditCount >= FREE_LIMIT) return;
        
        // Validate file before upload
        const MAX_SIZE_MB = 100;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            alert(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
            return;
        }
        
        if (!file.type.startsWith('video/')) {
            alert('Please upload a valid video file.');
            return;
        }
        
        try {
            setStatus('UPLOADING');
            // 🚀 FAST PATH: No base64 conversion here anymore
            
            setStatus('ANALYZING'); 
            // 🚀 FAST PATH: Send raw file directly to worker
            const data = await analyzeVideo(file, user.email);
            
            setResult(data);
            setStatus('SUCCESS');

            const newCount = auditCount + 1;
            setAuditCount(newCount);
            if(supabase) await supabase.from('profiles').update({ audit_count: newCount }).eq('id', user.id);

        } catch (e) {
            console.error("FULL ERROR:", e);
            setStatus('ERROR');
        }
    };

    const remaining = Math.max(0, FREE_LIMIT - auditCount);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150]" />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-[151] flex items-center justify-center p-4 pointer-events-none">
                        <div className="bg-[#111] border border-[#333] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
                            <div className="p-5 border-b border-[#222] flex justify-between items-center bg-[#161616]">
                                <h2 className="text-xl font-bold flex items-center gap-2"><span className="text-[#00F2EA]">ViralAudit AI</span></h2>
                                <button onClick={onClose} className="text-gray-500 hover:text-white"><i className="fa-solid fa-xmark text-xl"></i></button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar relative min-h-[400px]">
                                {!user ? (
                                    <div className="text-center py-20">
                                        <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
                                        <button onClick={() => { onClose(); setShowAuthModal(true); setAuthView('login'); }} className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 mt-4">Log In / Sign Up</button>
                                    </div>
                                ) : (
                                    <>
                                        {status === 'IDLE' && (
                                            <>
                                                <div className="mb-6 flex justify-between bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                                                    <span className="text-sm text-gray-400">Free Audits: {remaining} left</span>
                                                    {remaining === 0 && <button onClick={triggerUpgrade} className="text-xs bg-[#FF0050] text-white px-3 py-1 rounded font-bold">UPGRADE</button>}
                                                </div>
                                                {remaining > 0 ? (
                                                    <div className="text-center py-10">
                                                        <div className="border-2 border-dashed border-[#333] bg-[#1a1a1a] rounded-xl p-12 cursor-pointer hover:border-[#00F2EA]" onClick={() => document.getElementById('vid-up')?.click()}>
                                                            <input id="vid-up" type="file" hidden accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                                            <i className="fa-solid fa-cloud-arrow-up text-5xl text-gray-500 mb-4"></i>
                                                            <h4 className="text-white text-xl">{file ? file.name : "Upload Video Ad"}</h4>
                                                        </div>
                                                        <button onClick={runAnalysis} disabled={!file} className="w-full mt-6 bg-[#00F2EA] text-black font-bold py-4 rounded-xl disabled:opacity-50">Run Deep Audit</button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-20"><h3 className="text-white font-bold">Limit Reached</h3><button onClick={triggerUpgrade} className="mt-4 bg-[#FF0050] text-white px-6 py-3 rounded-lg font-bold">View Plans</button></div>
                                                )}
                                            </>
                                        )}

                                        {status === 'UPLOADING' && (
                                            <div className="flex flex-col items-center justify-center py-24">
                                                <div className="w-16 h-16 border-4 border-[#333] border-t-[#00F2EA] rounded-full animate-spin mb-6"></div>
                                                <h2 className="text-2xl font-bold text-white animate-pulse">Uploading Video...</h2>
                                            </div>
                                        )}

                                        {status === 'ANALYZING' && (
                                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                                <div className="relative w-20 h-20 mb-8">
                                                    <div className="absolute inset-0 bg-[#00F2EA] rounded-full opacity-20 animate-ping"></div>
                                                    <div className="relative w-20 h-20 bg-[#161616] border-2 border-[#00F2EA] rounded-full flex items-center justify-center"><i className="fa-solid fa-eye text-3xl text-[#00F2EA] animate-pulse"></i></div>
                                                </div>
                                                <AnimatePresence mode='wait'>
                                                    <motion.h2 key={loadingMsg} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="text-2xl font-bold text-white mb-2">{loadingMsg}</motion.h2>
                                                </AnimatePresence>
                                                <p className="text-sm text-gray-500 mt-2">This usually takes about 30 seconds.</p>
                                            </div>
                                        )}

                                        {status === 'SUCCESS' && result && (
                                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                                <div className="flex justify-between mb-6">
                                                    <h2 className="text-2xl font-bold text-white">Audit Report</h2>
                                                    <button onClick={reset} className="text-gray-400 hover:text-white underline">Audit Another</button>
                                                </div>
                                                <AnalysisResult data={result} />
                                            </div>
                                        )}
                                        
                                        {status === 'ERROR' && (
                                            <div className="text-center py-20">
                                                <h3 className="text-red-500 font-bold mb-2">Analysis Failed</h3>
                                                <button onClick={reset} className="bg-white text-black px-6 py-3 rounded-lg font-bold">Try Again</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// ==========================================
// 6. SITE COMPONENTS (Landing Page)
// ==========================================

const AuthContext = createContext<any>(null);
const AuthProvider = ({ children }: any) => {
    const [user, setUser] = useState<any>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showToolModal, setShowToolModal] = useState(false);
    const [authView, setAuthView] = useState('login');

    useEffect(() => {
        if(supabase) {
            supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
            supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));
        }
    }, []);

    const login = async (e: string, p: string) => supabase ? supabase.auth.signInWithPassword({ email: e, password: p }) : { error: { message: "No Supabase" } };
    const signup = async (e: string, p: string) => supabase ? supabase.auth.signUp({ email: e, password: p }) : { error: { message: "No Supabase" } };
    const logout = async () => supabase?.auth.signOut();
    const triggerUpgrade = () => { setShowToolModal(false); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); };

    return (
        <AuthContext.Provider value={{ user, showAuthModal, setShowAuthModal, authView, setAuthView, login, signup, logout, openTool: () => setShowToolModal(true), triggerUpgrade }}>
            {children}
            <ViralAuditTool isOpen={showToolModal} onClose={() => setShowToolModal(false)} user={user} triggerUpgrade={triggerUpgrade} />
            <AuthModal />
        </AuthContext.Provider>
    );
};

const AuthModal = () => {
    const { showAuthModal, setShowAuthModal, login, signup, authView, setAuthView } = useContext(AuthContext);
    const [email, setE] = useState(""); const [pass, setP] = useState(""); const [err, setErr] = useState("");
    if(!showAuthModal) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#333] p-8 rounded-2xl w-full max-w-md relative">
                <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-500">✕</button>
                <h2 className="text-xl font-bold text-white mb-6">{authView === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <input className="w-full bg-[#0a0a0a] border border-[#333] p-3 rounded mb-3 text-white" placeholder="Email" value={email} onChange={e => setE(e.target.value)} />
                <input className="w-full bg-[#0a0a0a] border border-[#333] p-3 rounded mb-3 text-white" type="password" placeholder="Password" value={pass} onChange={e => setP(e.target.value)} />
                {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
                <button className="w-full bg-white text-black font-bold p-3 rounded" onClick={async () => {
                    const res = authView === 'login' ? await login(email, pass) : await signup(email, pass);
                    if(res.error) setErr(res.error.message); else setShowAuthModal(false);
                }}>{authView === 'login' ? 'Log In' : 'Sign Up'}</button>
                <p className="text-center text-gray-500 text-sm mt-4 cursor-pointer" onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}>
                    {authView === 'login' ? "Need an account? Sign up" : "Have an account? Log in"}
                </p>
            </div>
        </div>
    )
}

const Navbar = () => {
    const { user, logout, setShowAuthModal, setAuthView } = useContext(AuthContext);
    return (
        <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10 py-4">
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <span className="font-bold text-xl text-white">ViralAudit</span>
                <div className="flex gap-4">
                    {user ? <button onClick={logout} className="text-sm text-gray-300">Logout</button> : 
                    <><button onClick={() => { setAuthView('login'); setShowAuthModal(true); }} className="text-sm text-gray-300">Login</button>
                    <button onClick={() => { setAuthView('signup'); setShowAuthModal(true); }} className="bg-white text-black px-4 py-2 rounded text-sm font-bold">Get Started</button></>}
                </div>
            </div>
        </nav>
    );
}

const Hero = () => {
    const { openTool } = useContext(AuthContext);
    return (
        <section className="pt-40 pb-20 px-6 text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">Stop Guessing.<br/>Audit Your Ads Instantly.</h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10">Upload your video creative and let our AI analyze your hooks, pacing, and copy for viral potential.</p>
            <button onClick={openTool} className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]">Launch Audit Tool</button>
        </section>
    );
}

const Pricing = () => {
    const { openTool } = useContext(AuthContext);
    return (
        <section id="pricing" className="py-20 border-t border-white/5">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold text-white mb-10">Simple Pricing</h2>
                <div className="inline-block p-4 mb-10 rounded-lg bg-[#1a1a1a] border border-[#333]"><span className="text-xs font-bold text-[#00F2EA] uppercase mr-2">Free Plan</span><span className="text-sm text-gray-400">Includes 3 free audits per account.</span></div>
                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    <div className="bg-[#0a0a0a] p-8 rounded-2xl border border-white/10 text-left">
                        <h3 className="text-xl font-bold text-white">Starter</h3>
                        <p className="text-4xl font-bold text-white my-4">$29<span className="text-sm text-gray-500">/mo</span></p>
                        <button onClick={openTool} className="w-full border border-white/20 text-white py-3 rounded-lg mb-6">Get Started</button>
                        <ul className="text-gray-400 space-y-2 text-sm"><li>✓ 50 Audits/mo</li><li>✓ Basic Analysis</li></ul>
                    </div>
                    <div className="bg-[#0f0f0f] p-8 rounded-2xl border border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.05)] relative text-left">
                        <div className="absolute top-0 right-0 bg-white text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">POPULAR</div>
                        <h3 className="text-xl font-bold text-white">Pro</h3>
                        <p className="text-4xl font-bold text-white my-4">$49<span className="text-sm text-gray-500">/mo</span></p>
                        <button onClick={openTool} className="w-full bg-white text-black py-3 rounded-lg mb-6 font-bold">Start Pro Trial</button>
                        <ul className="text-gray-400 space-y-2 text-sm"><li>✓ 500 Audits/mo</li><li>✓ Deep Analysis</li><li>✓ Script Rewrites</li></ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

const Features = () => {
    const FeatureCard = ({ icon, title, desc }: any) => (
        <div className="p-8 rounded-2xl bg-[#0a0a0a] border border-white/10">
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-xl"><i className={icon}></i></div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-400 text-sm">{desc}</p>
        </div>
    );
    return (
        <section id="features" className="py-20">
            <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
                <FeatureCard icon="fa-solid fa-list-check" title="Frame-by-Frame" desc="Detailed breakdown of your hook, body, and CTA." />
                <FeatureCard icon="fa-solid fa-wand-magic-sparkles" title="Actionable Fixes" desc="Don't just get a score. Get a 'Fix List' to improve ROAS." />
                <FeatureCard icon="fa-solid fa-shield-halved" title="Secure & Private" desc="Your creatives are analyzed and discarded. We don't train on your data." />
            </div>
        </section>
    );
};

const Background = () => (
    <div className="fixed inset-0 z-[-1] bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full"></div>
    </div>
);

const App = () => {
    return (
        <AuthProvider>
            <div className="min-h-screen text-white font-sans selection:bg-pink-500/30">
                <Background />
                <Navbar />
                <Hero />
                <Features />
                <Pricing />
                <footer className="py-10 text-center text-gray-600 text-xs border-t border-white/5">© 2025 ViralAudit Inc.</footer>
            </div>
        </AuthProvider>
    );
};

const container = document.getElementById("root");
if (container) { createRoot(container).render(<App />); }

export default App;
