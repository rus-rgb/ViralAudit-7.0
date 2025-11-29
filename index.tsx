import React, { useState, useEffect, useContext, createContext, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

// ==========================================
// 1. CONFIGURATION
// ==========================================
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

type UploadStatus = 'IDLE' | 'COMPRESSING' | 'UPLOADING' | 'ANALYZING' | 'SUCCESS' | 'ERROR';

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
// 3. VIDEO COMPRESSION UTILITY
// ==========================================
const compressVideo = async (
    file: File, 
    onProgress: (progress: number) => void,
    targetSizeMB: number = 15
): Promise<File> => {
    // If file is already small enough, skip compression
    if (file.size <= targetSizeMB * 1024 * 1024) {
        console.log("📦 File already optimized, skipping compression");
        onProgress(100);
        return file;
    }

    console.log(`🗜️ Compressing video from ${(file.size / 1024 / 1024).toFixed(1)}MB...`);
    
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.onloadedmetadata = async () => {
            // Calculate target dimensions (max 720p for speed)
            const maxHeight = 720;
            const scale = video.videoHeight > maxHeight ? maxHeight / video.videoHeight : 1;
            canvas.width = Math.floor(video.videoWidth * scale);
            canvas.height = Math.floor(video.videoHeight * scale);
            
            const duration = video.duration;
            const fps = 24; // Lower FPS for smaller file
            const totalFrames = Math.floor(duration * fps);
            
            // Use MediaRecorder for compression
            const stream = canvas.captureStream(fps);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp8',
                videoBitsPerSecond: 1000000 // 1 Mbps
            });
            
            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), {
                    type: 'video/webm'
                });
                console.log(`✅ Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
                onProgress(100);
                resolve(compressedFile);
            };
            
            mediaRecorder.onerror = () => reject(new Error('Compression failed'));
            
            mediaRecorder.start();
            
            // Process frames
            let currentFrame = 0;
            const frameInterval = 1 / fps;
            
            const processFrame = () => {
                if (currentFrame >= totalFrames) {
                    mediaRecorder.stop();
                    return;
                }
                
                video.currentTime = currentFrame * frameInterval;
            };
            
            video.onseeked = () => {
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                }
                currentFrame++;
                onProgress(Math.floor((currentFrame / totalFrames) * 90)); // 90% for compression
                
                if (currentFrame < totalFrames) {
                    requestAnimationFrame(processFrame);
                } else {
                    setTimeout(() => mediaRecorder.stop(), 100);
                }
            };
            
            processFrame();
        };
        
        video.onerror = () => reject(new Error('Failed to load video'));
        video.src = URL.createObjectURL(file);
    });
};

// ==========================================
// 4. AI SERVICE WITH PROGRESS
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
    { "label": "The Hook (0-3s)", "status": "PASS/FAIL/WARN", "details": "Analysis.", "fix": "Fix." },
    { "label": "Pacing & Retention", "status": "PASS/FAIL/WARN", "details": "Analysis.", "fix": "Fix." },
    { "label": "Storytelling", "status": "PASS/FAIL/WARN", "details": "Analysis.", "fix": "Fix." },
    { "label": "Call to Action", "status": "PASS/FAIL/WARN", "details": "Analysis.", "fix": "Fix." }
  ]
}
`;

const analyzeVideo = async (
    file: File, 
    email: string,
    onUploadProgress: (progress: number) => void
): Promise<AnalysisData> => {
    try {
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

        // Use XMLHttpRequest for upload progress
        const response = await new Promise<Response>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onUploadProgress(percent);
                }
            };
            
            xhr.onload = () => {
                const response = new Response(xhr.response, {
                    status: xhr.status,
                    statusText: xhr.statusText
                });
                resolve(response);
            };
            
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Request timeout'));
            
            xhr.open('POST', WORKER_URL);
            xhr.timeout = 180000; // 3 minute timeout
            xhr.send(formData);
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Worker Error:", response.status, errorText);
            throw new Error(`Worker returned ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        console.log("📥 Worker Response:", json);

        if (json.error) throw new Error(json.error.message || "Worker Error");
        if (!json.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("No analysis returned from AI");

        const text = json.candidates[0].content.parts[0].text;
        
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
// 5. UI COMPONENTS
// ==========================================

const ProgressBar = ({ progress, label }: { progress: number; label: string }) => (
    <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">{label}</span>
            <span className="text-[#00F2EA] font-mono">{progress}%</span>
        </div>
        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
            <motion.div 
                className="h-full bg-gradient-to-r from-[#00F2EA] to-[#00F2EA]/70"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
            />
        </div>
    </div>
);

const VideoPreview = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [duration, setDuration] = useState<string>('');

    useEffect(() => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            video.currentTime = 1; // Seek to 1 second for thumbnail
            const mins = Math.floor(video.duration / 60);
            const secs = Math.floor(video.duration % 60);
            setDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
        };
        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            setThumbnail(canvas.toDataURL());
        };
        video.src = URL.createObjectURL(file);
        
        return () => URL.revokeObjectURL(video.src);
    }, [file]);

    return (
        <div className="relative bg-[#1a1a1a] rounded-xl p-4 border border-[#333]">
            <div className="flex items-center gap-4">
                <div className="relative w-24 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0">
                    {thumbnail ? (
                        <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <i className="fa-solid fa-video text-gray-600"></i>
                        </div>
                    )}
                    {duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                            {duration}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.name}</p>
                    <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button 
                    onClick={onRemove}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                >
                    <i className="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    );
};

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
                <motion.circle 
                    cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="transparent" 
                    strokeDasharray={circumference} 
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    strokeLinecap="round" 
                />
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
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row gap-6 items-center bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-lg"
            >
                <ScoreCircle score={data.overallScore} />
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Creative Director's Verdict</h3>
                    <p className="text-xl md:text-2xl font-bold italic text-white leading-relaxed">"{data.verdict}"</p>
                </div>
            </motion.div>

            {/* Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: 'Visuals', icon: 'fa-eye', data: data.categories.visual },
                    { title: 'Audio', icon: 'fa-volume-high', data: data.categories.audio },
                    { title: 'Copy', icon: 'fa-pen-nib', data: data.categories.copy }
                ].map((pillar, idx) => (
                    <motion.div 
                        key={pillar.title} 
                        initial={{ opacity: 0, y: 20 }} 
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 flex flex-col h-full"
                    >
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2 font-bold text-lg text-white">
                                <i className={`fa-solid ${pillar.icon} text-gray-400`}></i> {pillar.title}
                            </div>
                            <span className={`font-mono font-bold ${(pillar.data?.score || 0) > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {pillar.data?.score || 0}%
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-4 leading-relaxed flex-grow">{pillar.data?.feedback || "No feedback."}</p>
                        {pillar.data?.fix && (
                            <div className="mt-auto pt-3 border-t border-white/5">
                                <p className="text-xs text-[#00F2EA] font-bold uppercase mb-1">Fix:</p>
                                <p className="text-sm text-white italic">{pillar.data.fix}</p>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Checks */}
            <div>
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-[#00F2EA]"></i> Diagnostic Checks
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(data.checks || []).map((check, idx) => (
                        <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-[#1a1a1a] p-5 rounded-xl border border-white/10"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{check.label}</span>
                                <StatusChip status={check.status} />
                            </div>
                            <p className="text-sm text-white mb-2">{check.details}</p>
                            {check.fix && <p className="text-xs text-[#00F2EA] mt-2 pt-2 border-t border-white/5">Fix: {check.fix}</p>}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 6. MAIN TOOL COMPONENT
// ==========================================

const ViralAuditTool = ({ isOpen, onClose, user, triggerUpgrade }: any) => {
    const { setShowAuthModal, setAuthView } = useContext(AuthContext);
    const [file, setFile] = useState<File | null>(null);
    const [processedFile, setProcessedFile] = useState<File | null>(null);
    const [status, setStatus] = useState<UploadStatus>('IDLE');
    const [result, setResult] = useState<AnalysisData | null>(null);
    const [auditCount, setAuditCount] = useState(0);
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const FREE_LIMIT = 3;

    const STAGE_LABELS: Record<UploadStatus, string> = {
        'IDLE': '',
        'COMPRESSING': 'Optimizing video...',
        'UPLOADING': 'Uploading to server...',
        'ANALYZING': 'AI analyzing your ad...',
        'SUCCESS': 'Complete!',
        'ERROR': 'Error'
    };

    useEffect(() => { 
        if(!isOpen) { 
            setFile(null); 
            setProcessedFile(null);
            setResult(null); 
            setStatus('IDLE'); 
            setProgress(0);
            setErrorMessage('');
        } else if (user && supabase) {
            loadUsage();
        }
    }, [isOpen, user]);

    const loadUsage = async () => {
        if(!user || !supabase) return;
        const { data } = await supabase.from('profiles').select('audit_count').eq('id', user.id).maybeSingle();
        if(data) setAuditCount(data.audit_count);
    };

    const reset = () => { 
        setFile(null); 
        setProcessedFile(null);
        setStatus('IDLE'); 
        setResult(null); 
        setProgress(0);
        setErrorMessage('');
    };

    const runAnalysis = async () => {
        if (!file || !user || auditCount >= FREE_LIMIT) return;
        
        // Validation
        const MAX_SIZE_MB = 100;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setErrorMessage(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
            setStatus('ERROR');
            return;
        }
        
        if (!file.type.startsWith('video/')) {
            setErrorMessage('Please upload a valid video file.');
            setStatus('ERROR');
            return;
        }
        
        try {
            // Stage 1: Compress (if needed)
            setStatus('COMPRESSING');
            setProgress(0);
            
            let fileToUpload = file;
            
            // Only compress if file is large
            if (file.size > 15 * 1024 * 1024) {
                try {
                    fileToUpload = await compressVideo(file, (p) => setProgress(p));
                    setProcessedFile(fileToUpload);
                } catch (e) {
                    console.warn("Compression failed, using original file:", e);
                    fileToUpload = file;
                }
            }
            setProgress(100);

            // Stage 2: Upload
            setStatus('UPLOADING');
            setProgress(0);
            
            // Stage 3: Analyze (progress continues from upload)
            const analysisPromise = analyzeVideo(fileToUpload, user.email, (p) => {
                setProgress(p);
                if (p === 100) {
                    setStatus('ANALYZING');
                    setProgress(0);
                }
            });

            // Simulate analysis progress while waiting
            setStatus('ANALYZING');
            let analysisProgress = 0;
            const progressInterval = setInterval(() => {
                analysisProgress += Math.random() * 15;
                if (analysisProgress > 90) analysisProgress = 90;
                setProgress(Math.floor(analysisProgress));
            }, 1000);

            const data = await analysisPromise;
            
            clearInterval(progressInterval);
            setProgress(100);
            
            setResult(data);
            setStatus('SUCCESS');

            const newCount = auditCount + 1;
            setAuditCount(newCount);
            if(supabase) await supabase.from('profiles').update({ audit_count: newCount }).eq('id', user.id);

        } catch (e: any) {
            console.error("FULL ERROR:", e);
            setErrorMessage(e.message || 'Analysis failed. Please try again.');
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
                            {/* Header */}
                            <div className="p-5 border-b border-[#222] flex justify-between items-center bg-[#161616]">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <span className="text-[#00F2EA]">ViralAudit</span>
                                    <span className="text-white">AI</span>
                                    {status !== 'IDLE' && status !== 'SUCCESS' && status !== 'ERROR' && (
                                        <span className="ml-2 px-2 py-0.5 bg-[#00F2EA]/10 text-[#00F2EA] text-xs rounded-full">
                                            {STAGE_LABELS[status]}
                                        </span>
                                    )}
                                </h2>
                                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                    <i className="fa-solid fa-xmark text-xl"></i>
                                </button>
                            </div>
                            
                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar relative min-h-[400px]">
                                {!user ? (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                                            <i className="fa-solid fa-lock text-2xl text-gray-500"></i>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Login Required</h3>
                                        <p className="text-gray-500 mb-6">Create a free account to analyze your video ads</p>
                                        <button onClick={() => { onClose(); setShowAuthModal(true); setAuthView('login'); }} className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors">
                                            Log In / Sign Up
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* IDLE State */}
                                        {status === 'IDLE' && (
                                            <>
                                                <div className="mb-6 flex justify-between items-center bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                                                    <span className="text-sm text-gray-400">
                                                        <i className="fa-solid fa-bolt text-[#00F2EA] mr-2"></i>
                                                        Free Audits: <span className="text-white font-bold">{remaining}</span> remaining
                                                    </span>
                                                    {remaining === 0 && (
                                                        <button onClick={triggerUpgrade} className="text-xs bg-gradient-to-r from-[#FF0050] to-[#FF0080] text-white px-3 py-1 rounded font-bold hover:opacity-90 transition-opacity">
                                                            UPGRADE
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {remaining > 0 ? (
                                                    <div className="space-y-6">
                                                        {!file ? (
                                                            <div 
                                                                className="border-2 border-dashed border-[#333] bg-[#1a1a1a] rounded-xl p-12 cursor-pointer hover:border-[#00F2EA] hover:bg-[#1a1a1a]/80 transition-all text-center"
                                                                onClick={() => document.getElementById('vid-up')?.click()}
                                                            >
                                                                <input id="vid-up" type="file" hidden accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                                                <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center mx-auto mb-4">
                                                                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-[#00F2EA]"></i>
                                                                </div>
                                                                <h4 className="text-white text-xl font-bold mb-2">Upload Video Ad</h4>
                                                                <p className="text-gray-500 text-sm">MP4, MOV, WebM • Max 100MB</p>
                                                            </div>
                                                        ) : (
                                                            <VideoPreview file={file} onRemove={() => setFile(null)} />
                                                        )}
                                                        
                                                        <button 
                                                            onClick={runAnalysis} 
                                                            disabled={!file} 
                                                            className="w-full bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                                        >
                                                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                                                            Run Deep Audit
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-20">
                                                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <i className="fa-solid fa-ban text-2xl text-red-500"></i>
                                                        </div>
                                                        <h3 className="text-white font-bold text-xl mb-2">Free Limit Reached</h3>
                                                        <p className="text-gray-500 mb-6">Upgrade to continue analyzing your ads</p>
                                                        <button onClick={triggerUpgrade} className="bg-gradient-to-r from-[#FF0050] to-[#FF0080] text-white px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity">
                                                            View Plans
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Processing States */}
                                        {(status === 'COMPRESSING' || status === 'UPLOADING' || status === 'ANALYZING') && (
                                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                                <div className="relative w-24 h-24 mb-8">
                                                    <div className="absolute inset-0 bg-[#00F2EA] rounded-full opacity-20 animate-ping"></div>
                                                    <div className="relative w-24 h-24 bg-[#161616] border-2 border-[#00F2EA] rounded-full flex items-center justify-center">
                                                        {status === 'COMPRESSING' && <i className="fa-solid fa-compress text-3xl text-[#00F2EA]"></i>}
                                                        {status === 'UPLOADING' && <i className="fa-solid fa-cloud-arrow-up text-3xl text-[#00F2EA]"></i>}
                                                        {status === 'ANALYZING' && <i className="fa-solid fa-brain text-3xl text-[#00F2EA] animate-pulse"></i>}
                                                    </div>
                                                </div>
                                                
                                                <h2 className="text-2xl font-bold text-white mb-4">{STAGE_LABELS[status]}</h2>
                                                
                                                <ProgressBar progress={progress} label={
                                                    status === 'COMPRESSING' ? 'Optimizing' :
                                                    status === 'UPLOADING' ? 'Uploading' : 'Analyzing'
                                                } />
                                                
                                                <p className="text-sm text-gray-500 mt-6">
                                                    {status === 'ANALYZING' ? 'Our AI is reviewing every frame...' : 'Please wait...'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Success State */}
                                        {status === 'SUCCESS' && result && (
                                            <div>
                                                <div className="flex justify-between items-center mb-6">
                                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                                        <i className="fa-solid fa-chart-line text-[#00F2EA]"></i>
                                                        Audit Report
                                                    </h2>
                                                    <button onClick={reset} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                                                        <i className="fa-solid fa-rotate-right"></i>
                                                        Audit Another
                                                    </button>
                                                </div>
                                                <AnalysisResult data={result} />
                                            </div>
                                        )}
                                        
                                        {/* Error State */}
                                        {status === 'ERROR' && (
                                            <div className="text-center py-16">
                                                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <i className="fa-solid fa-triangle-exclamation text-3xl text-red-500"></i>
                                                </div>
                                                <h3 className="text-red-500 font-bold text-xl mb-2">Analysis Failed</h3>
                                                <p className="text-gray-400 mb-6 max-w-md mx-auto">{errorMessage}</p>
                                                <button onClick={reset} className="bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors">
                                                    Try Again
                                                </button>
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
// 7. AUTH & SITE COMPONENTS
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
    const [email, setE] = useState(""); 
    const [pass, setP] = useState(""); 
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    
    if(!showAuthModal) return null;
    
    const handleSubmit = async () => {
        setLoading(true);
        setErr("");
        const res = authView === 'login' ? await login(email, pass) : await signup(email, pass);
        setLoading(false);
        if(res.error) setErr(res.error.message); 
        else { setShowAuthModal(false); setE(""); setP(""); }
    };
    
    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111] border border-[#333] p-8 rounded-2xl w-full max-w-md relative"
            >
                <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>
                <h2 className="text-2xl font-bold text-white mb-6">{authView === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <input 
                    className="w-full bg-[#0a0a0a] border border-[#333] p-3 rounded-lg mb-3 text-white focus:border-[#00F2EA] focus:outline-none transition-colors" 
                    placeholder="Email" 
                    type="email"
                    value={email} 
                    onChange={e => setE(e.target.value)} 
                />
                <input 
                    className="w-full bg-[#0a0a0a] border border-[#333] p-3 rounded-lg mb-3 text-white focus:border-[#00F2EA] focus:outline-none transition-colors" 
                    type="password" 
                    placeholder="Password" 
                    value={pass} 
                    onChange={e => setP(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                {err && <p className="text-red-500 text-sm mb-3 flex items-center gap-2"><i className="fa-solid fa-circle-exclamation"></i>{err}</p>}
                <button 
                    className="w-full bg-white text-black font-bold p-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2" 
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading && <i className="fa-solid fa-spinner animate-spin"></i>}
                    {authView === 'login' ? 'Log In' : 'Sign Up'}
                </button>
                <p className="text-center text-gray-500 text-sm mt-4 cursor-pointer hover:text-white transition-colors" onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}>
                    {authView === 'login' ? "Need an account? Sign up" : "Have an account? Log in"}
                </p>
            </motion.div>
        </div>
    )
}

const Navbar = () => {
    const { user, logout, setShowAuthModal, setAuthView } = useContext(AuthContext);
    return (
        <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10 py-4">
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <span className="font-bold text-xl text-white">ViralAudit</span>
                <div className="flex gap-4 items-center">
                    {user ? (
                        <>
                            <span className="text-sm text-gray-400 hidden sm:block">{user.email}</span>
                            <button onClick={logout} className="text-sm text-gray-300 hover:text-white transition-colors">Logout</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => { setAuthView('login'); setShowAuthModal(true); }} className="text-sm text-gray-300 hover:text-white transition-colors">Login</button>
                            <button onClick={() => { setAuthView('signup'); setShowAuthModal(true); }} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">Get Started</button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

const Hero = () => {
    const { openTool } = useContext(AuthContext);
    return (
        <section className="pt-40 pb-20 px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                    Stop Guessing.<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2EA] to-[#00D4D4]">Audit Your Ads Instantly.</span>
                </h1>
                <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10">Upload your video creative and let our AI analyze your hooks, pacing, and copy for viral potential.</p>
                <button onClick={openTool} className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,242,234,0.3)] flex items-center gap-2 mx-auto">
                    <i className="fa-solid fa-rocket"></i>
                    Launch Audit Tool
                </button>
            </motion.div>
        </section>
    );
}

const Pricing = () => {
    const { openTool } = useContext(AuthContext);
    return (
        <section id="pricing" className="py-20 border-t border-white/5">
            <div className="max-w-5xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold text-white mb-10">Simple Pricing</h2>
                <div className="inline-block p-4 mb-10 rounded-lg bg-[#1a1a1a] border border-[#333]">
                    <span className="text-xs font-bold text-[#00F2EA] uppercase mr-2">Free Plan</span>
                    <span className="text-sm text-gray-400">Includes 3 free audits per account.</span>
                </div>
                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    <div className="bg-[#0a0a0a] p-8 rounded-2xl border border-white/10 text-left hover:border-white/20 transition-colors">
                        <h3 className="text-xl font-bold text-white">Starter</h3>
                        <p className="text-4xl font-bold text-white my-4">$29<span className="text-sm text-gray-500">/mo</span></p>
                        <button onClick={openTool} className="w-full border border-white/20 text-white py-3 rounded-lg mb-6 hover:bg-white/5 transition-colors">Get Started</button>
                        <ul className="text-gray-400 space-y-2 text-sm">
                            <li><i className="fa-solid fa-check text-green-500 mr-2"></i>50 Audits/mo</li>
                            <li><i className="fa-solid fa-check text-green-500 mr-2"></i>Basic Analysis</li>
                        </ul>
                    </div>
                    <div className="bg-[#0f0f0f] p-8 rounded-2xl border border-[#00F2EA]/30 shadow-[0_0_30px_rgba(0,242,234,0.1)] relative text-left">
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">POPULAR</div>
                        <h3 className="text-xl font-bold text-white">Pro</h3>
                        <p className="text-4xl font-bold text-white my-4">$49<span className="text-sm text-gray-500">/mo</span></p>
                        <button onClick={openTool} className="w-full bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black py-3 rounded-lg mb-6 font-bold hover:opacity-90 transition-opacity">Start Pro Trial</button>
                        <ul className="text-gray-400 space-y-2 text-sm">
                            <li><i className="fa-solid fa-check text-green-500 mr-2"></i>500 Audits/mo</li>
                            <li><i className="fa-solid fa-check text-green-500 mr-2"></i>Deep Analysis</li>
                            <li><i className="fa-solid fa-check text-green-500 mr-2"></i>Script Rewrites</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

const Features = () => {
    const FeatureCard = ({ icon, title, desc }: any) => (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-colors"
        >
            <div className="w-12 h-12 bg-gradient-to-br from-[#00F2EA]/20 to-[#00F2EA]/5 rounded-xl flex items-center justify-center mb-6 text-xl text-[#00F2EA]">
                <i className={icon}></i>
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-gray-400 text-sm">{desc}</p>
        </motion.div>
    );
    return (
        <section id="features" className="py-20">
            <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
                <FeatureCard icon="fa-solid fa-list-check" title="Frame-by-Frame" desc="Detailed breakdown of your hook, body, and CTA with timestamp references." />
                <FeatureCard icon="fa-solid fa-wand-magic-sparkles" title="Actionable Fixes" desc="Don't just get a score. Get a specific 'Fix List' to improve ROAS." />
                <FeatureCard icon="fa-solid fa-shield-halved" title="Secure & Private" desc="Your creatives are analyzed and discarded. We never train on your data." />
            </div>
        </section>
    );
};

const Background = () => (
    <div className="fixed inset-0 z-[-1] bg-black">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00F2EA]/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full"></div>
    </div>
);

const App = () => {
    return (
        <AuthProvider>
            <div className="min-h-screen text-white font-sans selection:bg-[#00F2EA]/30">
                <Background />
                <Navbar />
                <Hero />
                <Features />
                <Pricing />
                <footer className="py-10 text-center text-gray-600 text-xs border-t border-white/5">
                    © 2025 ViralAudit Inc. All rights reserved.
                </footer>
            </div>
        </AuthProvider>
    );
};

const container = document.getElementById("root");
if (container) { createRoot(container).render(<App />); }

export default App;
