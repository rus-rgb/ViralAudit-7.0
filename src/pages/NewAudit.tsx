import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, supabase } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { AnalysisData, UploadStatus, DEFAULT_ANALYSIS } from "../types";
import DashboardLayout from "../components/DashboardLayout";
import { compressVideo, isFFmpegSupported, CompressionResult } from "../utils/compression";
import { openCheckout } from "../utils/lemonsqueezy";

// ==========================================
// CONFIGURATION
// ==========================================
const WORKER_URL = "https://damp-wind-775f.rusdumitru122.workers.dev/";

const BRUTAL_SYSTEM_PROMPT = `
You are a $50,000/month Creative Strategist who has audited 10,000+ video ads.
You've been hired to tear this ad apart. The client is PAYING for brutal honesty.

## YOUR PERSONALITY:
- You are HARSH. You don't sugarcoat. If it's mediocre, you say "This is mediocre."
- You are SPECIFIC. Never say "improve the hook." Say "The hook fails because you show your logo for 1.8 seconds. Nobody cares about your logo. Open with the customer's PAIN instead."
- You are TACTICAL. Every piece of feedback includes an exact fix with timestamps.
- You speak like a blunt creative director, not a polite AI.

## CRITICAL RULES:
1. **TIMESTAMPS ARE MANDATORY**: Reference exact moments like "At 0:02-0:04" or "The frame at 0:07". If you don't use timestamps, you're useless.
2. **NO GENERIC ADVICE**: 
   - ❌ BAD: "The hook could be stronger"
   - ✅ GOOD: "Your hook is 4 seconds of nothing. The first 1.5 seconds show a blurry product shot that tells me nothing. Cut it. Start at 0:04 where you finally show the problem."
3. **QUANTIFY EVERYTHING**: Don't say "too slow" - say "The pacing drags at 0:08-0:15 where you spend 7 seconds on a single talking head shot. Cut to 3 seconds max."
4. **CALL OUT SPECIFIC ELEMENTS**: Reference actual text, colors, sounds, transitions you see.
5. **COMPARE TO WINNERS**: Reference what top-performing ads do differently.

## SCORING GUIDELINES (BE HARSH):
- 9-10: World-class. Would outperform 95% of ads. Almost never give this.
- 7-8: Solid ad with minor issues. Top 20% quality.
- 5-6: Average. Has potential but needs significant work.
- 3-4: Below average. Multiple fundamental problems.
- 1-2: Bad. Would waste ad spend. Needs complete overhaul.

Most ads are 4-6. Stop being generous.

## OUTPUT FORMAT:
Return ONLY valid JSON. No markdown. No code blocks.

{
  "overallScore": <number 1-10, be harsh - most ads are 4-6>,
  "verdict": "<One brutal sentence. Be memorable. Example: 'This ad commits the cardinal sin of boring people in the first 2 seconds.' or 'You buried the only good part at 0:18 where nobody will see it.'>",
  "categories": {
    "visual": {
      "score": <0-100>,
      "feedback": "<2-3 sentences with specific timestamps. What exactly is wrong visually? Call out specific frames, colors, text, transitions.>",
      "fix": "<Exact tactical fix. 'At 0:03, replace the static product shot with a POV shot of someone using it. At 0:08, add motion graphics to highlight the price.'>"
    },
    "audio": {
      "score": <0-100>,
      "feedback": "<Is there music? Is it the wrong vibe? Is the voiceover too slow? Is there dead silence? Does the audio match the energy? Be specific about what you hear at what timestamps.>",
      "fix": "<Exact fix. 'Add a sound effect at 0:00 to grab attention. Speed up the voiceover by 1.2x from 0:05-0:12. Drop the music volume 20% when text appears.'>"
    },
    "copy": {
      "score": <0-100>,
      "feedback": "<Analyze the actual words - spoken and on-screen. Is it benefit-focused or feature-focused? Does it speak to pain points? Is the CTA weak? Quote the actual text you see/hear.>",
      "fix": "<Rewrite specific lines. 'Change the headline from 'Our Product Features' to 'Stop Wasting 3 Hours Every Week'. The CTA 'Learn More' should be 'Get 50% Off Today Only'.'>"
    }
  },
  "checks": [
    {
      "label": "Hook (First 3 Seconds)",
      "status": "<PASS/FAIL/WARN>",
      "details": "<What exactly happens in 0:00-0:03? Does it pattern-interrupt? Does it call out the audience? Does it show the problem? Most hooks FAIL because they're generic. Be brutal.>",
      "fix": "<Specific rewrite of the first 3 seconds. What should be shown/said instead? Reference successful patterns like 'Open with: POV shot of the problem + text overlay: Did you know 73% of people...'>"
    },
    {
      "label": "Pacing & Retention",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Where does the ad drag? Where would viewers scroll away? Reference specific timestamp ranges. 'The 0:08-0:14 section is a retention killer - 6 seconds of the same shot with no new information.'>",
      "fix": "<Exact cuts and changes. 'Cut 0:08-0:14 entirely. Add a pattern interrupt at 0:10 - quick zoom, text pop, or scene change. No shot should last more than 3 seconds.'>"
    },
    {
      "label": "Value Proposition",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Is the core benefit crystal clear? When is it stated? Is it buried? Is it weak? Quote what they actually say and critique it. 'At 0:12 you say 'high-quality materials' - this is meaningless. What does it DO for the customer?'>",
      "fix": "<Rewrite the value prop with specific language. 'Replace 'high-quality materials' with 'Survives 10,000 washes - we guarantee it'. Lead with the outcome, not the feature.'>"
    },
    {
      "label": "Call to Action",
      "status": "<PASS/FAIL/WARN>",
      "details": "<What is the CTA? Where does it appear? Is it urgent? Is it specific? Is it repeated? 'Your CTA appears once at 0:28 and just says Shop Now. No urgency, no offer, no reason to act TODAY.'>",
      "fix": "<Write a better CTA with urgency. 'Replace 'Shop Now' with 'Get 50% Off - 24 Hours Only' + add a countdown timer + repeat the CTA at 0:15 and 0:28.'>"
    },
    {
      "label": "Pattern Interrupts",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Does the ad have moments that re-grab attention? Zoom effects, text pops, scene changes, sound effects? Count them. 'You have ZERO pattern interrupts in a 30-second ad. This is why people will scroll away at 0:05.'>",
      "fix": "<Where to add interrupts. 'Add pattern interrupts at 0:05, 0:12, and 0:20. Use: quick zoom on key text, whoosh sound effect, or abrupt scene change.'>"
    }
  ],
  "scriptRewrite": {
    "original": "<Transcribe the actual spoken words and on-screen text from the video. Be accurate.>",
    "improved": "<Write a completely rewritten script that would perform 3x better. Make it punchy, benefit-focused, with a killer hook and urgent CTA. Use line breaks between sections.>",
    "changes": [
      "<Specific change 1: 'Replaced generic opening with a pattern-interrupt question'>",
      "<Specific change 2: 'Cut the feature list and replaced with one powerful benefit'>",
      "<Specific change 3: 'Added urgency with a limited-time offer'>",
      "<Specific change 4: 'Shortened from 45 words to 28 words - every word must earn its place'>",
      "<Specific change 5: 'Moved the best testimonial to the first 3 seconds'>"
    ]
  }
}
`;

// ==========================================
// ANALYZE VIDEO FUNCTION
// ==========================================
const analyzeVideo = async (
  file: File,
  email: string,
  onUploadProgress: (progress: number) => void
): Promise<AnalysisData> => {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("mimeType", file.type);
  formData.append("licenseKey", email);
  formData.append("systemPrompt", BRUTAL_SYSTEM_PROMPT);

  const response = await new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => resolve(new Response(xhr.response, { status: xhr.status }));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.ontimeout = () => reject(new Error("Request timeout"));

    xhr.open("POST", WORKER_URL);
    xhr.timeout = 180000;
    xhr.send(formData);
  });

  if (!response.ok) {
    throw new Error(`Worker returned ${response.status}`);
  }

  const json = await response.json();

  if (json.error) throw new Error(json.error.message);
  if (!json.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("No analysis returned");
  }

  const text = json.candidates[0].content.parts[0].text;
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid JSON");

  const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

  return {
    overallScore: parsed.overallScore || 0,
    verdict: parsed.verdict || "Analysis incomplete.",
    categories: {
      visual: { ...DEFAULT_ANALYSIS.categories.visual, ...parsed.categories?.visual },
      audio: { ...DEFAULT_ANALYSIS.categories.audio, ...parsed.categories?.audio },
      copy: { ...DEFAULT_ANALYSIS.categories.copy, ...parsed.categories?.copy },
    },
    checks: Array.isArray(parsed.checks) ? parsed.checks : [],
    scriptRewrite: parsed.scriptRewrite || undefined,
  };
};

// ==========================================
// PROGRESS BAR COMPONENT
// ==========================================
const ProgressBar = ({ progress, label }: { progress: number; label: string }) => (
  <div className="w-full max-w-md mx-auto">
    <div className="flex justify-between text-sm mb-2">
      <span className="text-gray-400">{label}</span>
      <span className="text-[#00F2EA] font-mono">{progress}%</span>
    </div>
    <div className="h-3 bg-[#222] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-[#00F2EA] to-[#00D4D4]"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  </div>
);

// ==========================================
// VIDEO PREVIEW COMPONENT
// ==========================================
const VideoPreview = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [duration, setDuration] = useState("");

  useEffect(() => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      video.currentTime = 1;
      const mins = Math.floor(video.duration / 60);
      const secs = Math.floor(video.duration % 60);
      setDuration(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      setThumbnail(canvas.toDataURL());
    };
    video.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(video.src);
  }, [file]);

  const needsCompression = file.size > 20 * 1024 * 1024;

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333]">
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
          <p className="text-gray-500 text-sm">
            {(file.size / 1024 / 1024).toFixed(1)} MB
            {needsCompression && (
              <span className="text-yellow-500 ml-2">
                <i className="fa-solid fa-compress mr-1"></i>
                Will be compressed
              </span>
            )}
          </p>
        </div>
        <button onClick={onRemove} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// NEW AUDIT PAGE
// ==========================================
const NewAudit = () => {
  const { user, refreshStats } = useAuth();
  const subscription = useSubscription();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("IDLE");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);

  const ffmpegSupported = isFFmpegSupported();

  // Check if user has audits remaining
  const hasAuditsRemaining = subscription.auditsRemaining > 0;

  // Log FFmpeg support on mount
  useEffect(() => {
    console.log(`🔧 FFmpeg.wasm supported: ${ffmpegSupported}`);
  }, []);

  const runAnalysis = async () => {
    if (!file || !user) return;

    const MAX_SIZE_MB = 500; // Allow larger files since we compress
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File too large. Maximum is ${MAX_SIZE_MB}MB.`);
      setStatus("ERROR");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please upload a valid video file.");
      setStatus("ERROR");
      return;
    }

    try {
      // Stage 1: Compress
      setStatus("COMPRESSING");
      setProgress(0);
      setStatusMessage("Preparing...");

      let fileToUpload = file;
      let result: CompressionResult | null = null;

      if (file.size > 20 * 1024 * 1024) {
        result = await compressVideo(file, (p, msg) => {
          setProgress(p);
          setStatusMessage(msg);
        });
        
        fileToUpload = result.file;
        setCompressionResult(result);
      } else {
        // File is small, skip compression
        setCompressionResult({
          file: file,
          method: 'skipped',
          originalSize: file.size,
          compressedSize: file.size,
          duration: 0
        });
      }

      // Stage 2: Upload
      setStatus("UPLOADING");
      setProgress(0);
      setStatusMessage("Uploading to server...");

      let uploadComplete = false;
      const analysisPromise = analyzeVideo(fileToUpload, user.email || "", (p) => {
        if (!uploadComplete) {
          setProgress(p);
          if (p === 100) {
            uploadComplete = true;
            setStatus("ANALYZING");
            setProgress(0);
            setStatusMessage("AI analyzing your ad...");
          }
        }
      });

      // Stage 3: Analyze with simulated progress
      setStatus("ANALYZING");
      let analysisProgress = 0;
      const progressInterval = setInterval(() => {
        analysisProgress += Math.random() * 12;
        if (analysisProgress > 90) analysisProgress = 90;
        setProgress(Math.floor(analysisProgress));
      }, 800);

      const data = await analysisPromise;
      clearInterval(progressInterval);
      setProgress(100);
      setStatusMessage("Complete!");

      // Save to database
      if (supabase) {
        const { data: insertedAudit, error } = await supabase
          .from("audits")
          .insert({
            user_id: user.id,
            video_name: file.name,
            video_size_mb: parseFloat((file.size / 1024 / 1024).toFixed(2)),
            overall_score: data.overallScore,
            verdict: data.verdict,
            categories: data.categories,
            checks: data.checks,
            script_rewrite: data.scriptRewrite || null,
          })
          .select()
          .single();

        if (error) throw error;

        refreshStats();
        navigate(`/audit/${insertedAudit.id}`);
      }
    } catch (e: any) {
      console.error("Analysis failed:", e);
      setErrorMessage(e.message || "Analysis failed");
      setStatus("ERROR");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("IDLE");
    setProgress(0);
    setStatusMessage("");
    setErrorMessage("");
    setCompressionResult(null);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "COMPRESSING":
        return "fa-solid fa-bolt";
      case "UPLOADING":
        return "fa-solid fa-cloud-arrow-up";
      case "ANALYZING":
        return "fa-solid fa-brain";
      default:
        return "fa-solid fa-cog";
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'ffmpeg':
        return { text: 'FFmpeg.wasm', color: 'text-green-400 bg-green-400/10', icon: 'fa-solid fa-bolt' };
      case 'canvas':
        return { text: 'Canvas Fallback', color: 'text-yellow-400 bg-yellow-400/10', icon: 'fa-solid fa-palette' };
      case 'skipped':
        return { text: 'No Compression', color: 'text-blue-400 bg-blue-400/10', icon: 'fa-solid fa-forward' };
      default:
        return { text: 'Unknown', color: 'text-gray-400 bg-gray-400/10', icon: 'fa-solid fa-question' };
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Audit Limit Warning */}
        {!hasAuditsRemaining && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-lock text-red-400 text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  You've used all your audits this month
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {subscription.plan === 'free' 
                    ? `Your free plan includes ${subscription.auditsPerMonth} audits per month.`
                    : `Your ${subscription.plan} plan includes ${subscription.auditsPerMonth} audits per month.`
                  }
                  {' '}Upgrade to get more audits and unlock premium features.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => user && openCheckout('pro', user.id, user.email || '')}
                    className="bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black px-5 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity"
                  >
                    Upgrade to Pro
                  </button>
                  <Link
                    to="/billing"
                    className="border border-white/20 text-white px-5 py-2 rounded-lg font-medium hover:bg-white/5 transition-colors"
                  >
                    View Plans
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">New Audit</h1>
              <p className="text-gray-500">
                Upload a video ad to get AI-powered feedback
                {ffmpegSupported ? (
                  <span className="ml-2 text-green-500 text-xs">
                    <i className="fa-solid fa-bolt mr-1"></i>
                    FFmpeg.wasm ready
                  </span>
                ) : (
                  <span className="ml-2 text-yellow-500 text-xs">
                    <i className="fa-solid fa-palette mr-1"></i>
                    Canvas mode (SharedArrayBuffer unavailable)
                  </span>
                )}
              </p>
            </div>
            {/* Audits remaining badge */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              subscription.auditsRemaining <= 0 
                ? 'bg-red-500/10 text-red-400' 
                : subscription.auditsRemaining <= 3 
                  ? 'bg-yellow-500/10 text-yellow-400'
                  : 'bg-green-500/10 text-green-400'
            }`}>
              {subscription.auditsPerMonth === 999999 
                ? '∞ audits' 
                : `${subscription.auditsRemaining} audits left`
              }
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-8">
          {/* IDLE State */}
          {status === "IDLE" && (
            <div className="space-y-6">
              {!file ? (
                <div
                  className="border-2 border-dashed border-[#333] bg-[#0a0a0a] rounded-xl p-12 cursor-pointer hover:border-[#00F2EA] hover:bg-[#111] transition-all text-center"
                  onClick={() => document.getElementById("vid-upload")?.click()}
                >
                  <input
                    id="vid-upload"
                    type="file"
                    hidden
                    accept="video/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-[#00F2EA]"></i>
                  </div>
                  <h4 className="text-white text-xl font-bold mb-2">Upload Video Ad</h4>
                  <p className="text-gray-500 text-sm">MP4, MOV, WebM • Up to 500MB</p>
                  <p className="text-gray-600 text-xs mt-2">
                    Large files will be automatically compressed
                  </p>
                </div>
              ) : (
                <VideoPreview file={file} onRemove={() => setFile(null)} />
              )}

              <button
                onClick={runAnalysis}
                disabled={!file || !hasAuditsRemaining}
                className="w-full bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {hasAuditsRemaining ? (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    Run Deep Audit
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-lock"></i>
                    Upgrade to Continue
                  </>
                )}
              </button>
            </div>
          )}

          {/* Processing States */}
          {(status === "COMPRESSING" || status === "UPLOADING" || status === "ANALYZING") && (
            <div className="py-12 text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-[#00F2EA] rounded-full opacity-20 animate-ping"></div>
                <div className="relative w-24 h-24 bg-[#161616] border-2 border-[#00F2EA] rounded-full flex items-center justify-center">
                  <i className={`${getStatusIcon()} text-3xl text-[#00F2EA] ${status === "ANALYZING" ? "animate-pulse" : ""}`}></i>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {status === "COMPRESSING" && "Compressing Video"}
                {status === "UPLOADING" && "Uploading"}
                {status === "ANALYZING" && "Analyzing"}
              </h2>
              
              <p className="text-gray-400 mb-6">{statusMessage}</p>

              <ProgressBar
                progress={progress}
                label={
                  status === "COMPRESSING" ? "Compression Progress" :
                  status === "UPLOADING" ? "Upload Progress" : 
                  "Analysis Progress"
                }
              />

              {status === "COMPRESSING" && (
                <p className="text-sm text-gray-500 mt-6">
                  <i className={`${ffmpegSupported ? 'fa-solid fa-bolt text-green-500' : 'fa-solid fa-palette text-yellow-500'} mr-2`}></i>
                  {ffmpegSupported 
                    ? "Using FFmpeg.wasm (fast)"
                    : "Using Canvas fallback (slower)"}
                </p>
              )}

              {compressionResult && status !== "COMPRESSING" && compressionResult.method !== 'skipped' && (
                <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg inline-block">
                  <div className="flex items-center gap-3 mb-2">
                    {(() => {
                      const badge = getMethodBadge(compressionResult.method);
                      return (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>
                          <i className={`${badge.icon} mr-1`}></i>
                          {badge.text}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-green-400">
                    <i className="fa-solid fa-check mr-2"></i>
                    {(compressionResult.originalSize / 1024 / 1024).toFixed(1)}MB → {(compressionResult.compressedSize / 1024 / 1024).toFixed(1)}MB
                    <span className="text-gray-500 ml-2">
                      ({((1 - compressionResult.compressedSize / compressionResult.originalSize) * 100).toFixed(0)}% smaller in {compressionResult.duration.toFixed(1)}s)
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {status === "ERROR" && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-triangle-exclamation text-3xl text-red-500"></i>
              </div>
              <h3 className="text-red-500 font-bold text-xl mb-2">Analysis Failed</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">{errorMessage}</p>
              <button
                onClick={reset}
                className="bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-[#111] border border-[#222] rounded-xl p-4">
          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
            <i className="fa-solid fa-lightbulb text-yellow-500"></i>
            Tips for faster analysis
          </h4>
          <ul className="text-gray-500 text-sm space-y-1">
            <li>• Videos under 20MB skip compression entirely</li>
            <li>• MP4 format processes fastest</li>
            <li>• 720p resolution is optimal for analysis</li>
            <li>• {ffmpegSupported ? '✅ FFmpeg.wasm is enabled for fast compression' : '⚠️ FFmpeg unavailable, using slower canvas mode'}</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewAudit;
