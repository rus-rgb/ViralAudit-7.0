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
You are a video ad expert who has watched 10,000+ ads. Your job is to help people make better ads.

## HOW TO WRITE YOUR FEEDBACK:
- Use **simple words** a 5th grader could understand. No jargon.
- Be **direct and honest**. If something is bad, say it's bad.
- Be **specific**. Tell them exactly what's wrong and how to fix it.
- Use **timestamps** like "at 0:05" so they know exactly where to look.
- Keep sentences **short**. One idea per sentence.

## SIMPLE WORDS TO USE:
- Say "boring" not "lacks engagement"
- Say "confusing" not "unclear value proposition"  
- Say "too slow" not "pacing issues"
- Say "people will scroll away" not "retention risk"
- Say "grab attention" not "pattern interrupt"
- Say "what's in it for me" not "value proposition"

## SCORING (BE HONEST):
- 9-10: Amazing! One of the best ads ever. Very rare.
- 7-8: Good ad with small problems.
- 5-6: Okay ad. Needs work.
- 3-4: Not good. Has big problems.
- 1-2: Bad. Start over.

Most ads score 4-6. Don't be too nice.

## OUTPUT FORMAT:
Return ONLY valid JSON. No markdown. No code blocks.

{
  "overallScore": <number 1-10, most ads are 4-6>,
  "verdict": "<One short sentence that sums it up. Example: 'The first 3 seconds are boring, so most people will never see the good stuff.' Keep it simple.>",
  "categories": {
    "visual": {
      "score": <0-100>,
      "feedback": "<What do you see? Is it boring? Hard to read? Bad colors? Tell them exactly what's wrong at what time. Example: 'At 0:02, the text is too small to read on a phone.'>",
      "fix": "<Tell them exactly what to change. Example: 'Make the text 2x bigger at 0:02. Add movement at 0:05 to keep people watching.'>"
    },
    "audio": {
      "score": <0-100>,
      "feedback": "<What do you hear? Is there music? Is the voice too quiet? Too fast? Is there awkward silence? Example: 'At 0:00-0:03, there's no sound at all. This feels broken.'>",
      "fix": "<Tell them what to add or change. Example: 'Add upbeat music from the start. Make the voice louder at 0:05.'>"
    },
    "copy": {
      "score": <0-100>,
      "feedback": "<What words do they use? Do they talk about what the customer gets? Or just boring features? Example: 'You say your product is high-quality but you never say WHY that matters to me.'>",
      "fix": "<Give them better words to use. Example: 'Instead of saying high-quality, say Lasts 10 years - we guarantee it.'>"
    }
  },
  "checks": [
    {
      "label": "First 3 Seconds",
      "status": "<PASS/FAIL/WARN>",
      "details": "<What happens right at the start? Does it grab attention? Or is it boring? Example: 'The first 2 seconds just show a logo. Nobody cares about your logo. They'll scroll away.'>",
      "fix": "<How to fix the opening. Example: 'Start with a question like: Tired of wasting money on ads that don't work?'>"
    },
    {
      "label": "Does It Keep You Watching?",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Where does it get boring? Where would people stop watching? Example: 'At 0:08-0:14, it's the same shot for 6 seconds. That's way too long. People will leave.'>",
      "fix": "<How to keep it interesting. Example: 'Never show the same thing for more than 3 seconds. At 0:10, change the scene or zoom in.'>"
    },
    {
      "label": "What's In It For Me?",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Does the ad clearly show what the customer gets? Example: 'You talk about features but never say how it helps me. I still don't know why I should care.'>",
      "fix": "<How to show the benefit. Example: 'Instead of listing features, say: This saves you 3 hours every week.'>"
    },
    {
      "label": "Call to Action",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Does it tell people what to do? Is there a reason to act NOW? Example: 'You just say Shop Now at the end. That's weak. Give me a reason to click today.'>",
      "fix": "<A better call to action. Example: 'Say: Get 50% off today only. Then show a countdown timer.'>"
    },
    {
      "label": "Attention Grabbers",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Does the ad have moments that wake you up? Quick zooms, sound effects, text popping up? Example: 'This is 30 seconds of the same energy. Nothing surprises me. I'll get bored and leave.'>",
      "fix": "<Where to add surprises. Example: 'At 0:05 and 0:15, add a quick zoom or a pop sound to keep people awake.'>"
    }
  ],
  "scriptRewrite": {
    "original": "<Write out exactly what is said in the video, word for word.>",
    "improved": "<Write a better version of the script. Make it short, punchy, and focused on what the customer gets. Start with something that grabs attention.>",
    "changes": [
      "<What you changed and why. Example: 'Made the opening a question to grab attention'>",
      "<Another change. Example: 'Cut out boring feature list and focused on one big benefit'>",
      "<Another change. Example: 'Added a reason to buy today (limited time offer)'>",
      "<Another change. Example: 'Made it shorter - 28 words instead of 45'>",
      "<Another change. Example: 'Put the best part first instead of burying it at the end'>"
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
