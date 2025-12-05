import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, supabase } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { AnalysisData, UploadStatus, DEFAULT_ANALYSIS, TechnicalAnalysis } from "../types";
import DashboardLayout from "../components/DashboardLayout";
import { compressVideo, isFFmpegSupported, CompressionResult } from "../utils/compression";
import { openCheckout } from "../utils/lemonsqueezy";
import { runTechnicalAnalysis, calculateTechnicalScore, countIssues } from "../utils/technicalAnalysis";

// ==========================================
// CONFIGURATION
// ==========================================
const STANDARD_WORKER_URL = "https://damp-wind-775f.rusdumitru122.workers.dev/";
const MULTIMODEL_WORKER_URL = "https://viralaudit-6specialist.rusdumitru122.workers.dev/"; // 6-specialist deep analysis

const BRUTAL_SYSTEM_PROMPT = `
You are a brutally honest video ad expert who has watched 10,000+ ads. You've seen it all. You don't sugarcoat anything.

## HOW TO WRITE YOUR FEEDBACK:
- Be **BRUTAL**. If the ad sucks, say it sucks. Don't be nice.
- Use **simple words** a 5th grader could understand. No jargon.
- Be **specific with timestamps**. Say "at 0:05" so they know exactly where the problem is.
- Give **exact fixes**. Don't just say what's wrong - tell them exactly how to fix it.
- Keep sentences **short and punchy**.

## SIMPLE WORDS TO USE:
- Say "boring" not "lacks engagement"
- Say "confusing" not "unclear value proposition"  
- Say "too slow" not "pacing issues"
- Say "people will scroll away" not "retention risk"
- Say "grab attention" not "pattern interrupt"
- Say "what's in it for me" not "value proposition"

## BE HARSH - EXAMPLES:
- ❌ WEAK: "The opening could be improved"
- ✅ BRUTAL: "The first 3 seconds are a waste. You show your logo while everyone scrolls away. Nobody cares about your logo."

- ❌ WEAK: "Consider adding more energy"
- ✅ BRUTAL: "This is boring. At 0:08-0:15, nothing happens for 7 seconds. That's death on social media."

- ❌ WEAK: "The message could be clearer"
- ✅ BRUTAL: "I watched the whole thing and I still don't know what you're selling or why I should care."

## SCORING (BE HARSH - MOST ADS ARE BAD):
- 9-10: Amazing. Top 1%. Almost never give this.
- 7-8: Good with small problems. Top 20%.
- 5-6: Average. Needs real work.
- 3-4: Bad. Multiple big problems.
- 1-2: Terrible. Start over completely.

**Most ads deserve a 4-6. Stop being generous. If you give above a 7, it better be genuinely good.**

## OUTPUT FORMAT:
Return ONLY valid JSON. No markdown. No code blocks.

{
  "overallScore": <number 1-10, be harsh - most ads are 4-6>,
  "verdict": "<One brutal sentence. Hit them with the truth. Examples: 'You buried the only good part at 0:18 where nobody will ever see it.' or 'This ad is 30 seconds of nothing happening.' or 'I was bored by second 2 and so will everyone else.'>",
  "categories": {
    "visual": {
      "score": <0-100>,
      "feedback": "<Be brutal. What looks bad? What's boring? What's confusing? Use timestamps. Example: 'At 0:02, your text is tiny and impossible to read on a phone. At 0:08-0:12, it's the same boring shot for 4 seconds. People are gone by then.'>",
      "fix": "<Exact fix with timestamps. Example: 'At 0:02, make the text 3x bigger. At 0:08, cut to a new scene. Never show the same thing for more than 2 seconds.'>"
    },
    "audio": {
      "score": <0-100>,
      "feedback": "<Be brutal about what you hear. Example: 'The first 3 seconds are silent - that's a disaster. At 0:10, the music is so loud I can't hear what you're saying. At 0:20, the voice sounds bored and boring.'>",
      "fix": "<Exact fix. Example: 'Add a sound effect at 0:00 to grab attention. Lower the music 50% when someone talks. Re-record the voiceover with more energy.'>"
    },
    "copy": {
      "score": <0-100>,
      "feedback": "<Be brutal about the words. Example: 'You say premium quality but that means nothing. You list 5 features but never tell me why I should care. Your CTA is just Learn More - that's the laziest CTA ever.'>",
      "fix": "<Give them better words. Example: 'Don't say premium quality - say Lasts 10 years guaranteed. Don't say Learn More - say Get 50% Off Today Only.'>"
    },
    "captions": {
      "score": <0-100>,
      "feedback": "<Be brutal about the captions/subtitles. If there are NO captions, this is a MAJOR problem - 85% of people watch on mute! If there ARE captions, check: Can you read them? Too small? Wrong color? Bad timing? Examples: 'No captions at all. 85% of people watch on mute. You just lost most of your audience.' or 'The captions at 0:05 are white text on a light background - impossible to read on a phone.'>",
      "fix": "<Exact fix. If no captions: 'Add captions to EVERY word spoken. Use big, bold white text with a black outline. This is not optional - it's essential.' If bad captions: 'Make the text 2x bigger. Add a dark outline or background. Make sure captions appear slightly BEFORE the words are spoken.'>"
    }
  },
  "checks": [
    {
      "label": "First 3 Seconds",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Be brutal. Most hooks are terrible. Example: 'Your first 2 seconds show a logo fade-in. That's instant death. Nobody on earth cares about your logo. They're already scrolling.' or 'You open with Hey guys - the most generic, boring opening possible.'>",
      "fix": "<Give a specific better opening. Example: 'Delete the logo. Start with: Tired of ads that don't work? + show someone frustrated. You have 1 second to hook them - make it count.'>"
    },
    {
      "label": "Does It Keep You Watching?",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Be brutal about where it gets boring. Example: 'At 0:06, I wanted to scroll away. By 0:10, I was mentally checked out. The 0:08-0:15 section is painfully slow - same shot, same voice, nothing new.'>",
      "fix": "<Exact fixes. Example: 'Cut 0:08-0:12 completely - it adds nothing. Add a zoom or scene change every 2-3 seconds. Speed up the voiceover 1.2x.'>"
    },
    {
      "label": "What's In It For Me?",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Be brutal. Example: 'I watched the whole ad and I still don't know what problem this solves. You talk about yourself for 25 seconds before mentioning the customer. Nobody cares about your company story.'>",
      "fix": "<Make it about the customer. Example: 'Lead with the problem: Wasting 3 hours a week on X? Then show how you fix it. Talk about THEM, not you.'>"
    },
    {
      "label": "Call to Action",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Be brutal about the CTA. Example: 'Your CTA is Shop Now at 0:28. That's weak. No reason to click. No urgency. No offer. Why would anyone act TODAY?' or 'You don't even have a CTA. You just... end. What am I supposed to do?'>",
      "fix": "<Write a better CTA. Example: 'Replace Shop Now with Get 50% Off - Ends Tonight + add a countdown timer + show it twice (at 0:15 and 0:28).'>"
    },
    {
      "label": "Attention Grabbers",
      "status": "<PASS/FAIL/WARN>",
      "details": "<Be brutal. Example: 'This is 30 seconds of the same energy. No zooms. No surprises. No scene changes. Nothing to wake me up. I'm half asleep by 0:10.' or 'You have exactly ZERO moments that re-grab attention.'>",
      "fix": "<Where to add them. Example: 'At 0:05, add a quick zoom on the key text. At 0:12, add a whoosh sound. At 0:18, change scenes abruptly. Keep people awake.'>"
    }
  ],
  "scriptRewrite": {
    "original": "<Write out exactly what is said in the video, word for word. Include on-screen text too.>",
    "improved": "<Write a better script that would actually work. Make it short, punchy, and about the CUSTOMER not the product. Start with a hook that grabs attention. End with urgency.>",
    "changes": [
      "<What you changed and why. Be specific. Example: 'Cut the boring company intro - nobody cares'>",
      "<Another change. Example: 'Changed 5 features into 1 clear benefit that matters to the customer'>",
      "<Another change. Example: 'Added urgency: limited time offer instead of weak Shop Now'>",
      "<Another change. Example: 'Cut from 45 words to 22 - every extra word loses viewers'>",
      "<Another change. Example: 'Moved the best moment to the first 2 seconds instead of burying it at 0:20'>"
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
  onUploadProgress: (progress: number) => void,
  useDeepAnalysis: boolean = false
): Promise<AnalysisData> => {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("mimeType", file.type);
  formData.append("licenseKey", email);
  
  // Choose worker based on analysis mode
  const workerUrl = useDeepAnalysis ? MULTIMODEL_WORKER_URL : STANDARD_WORKER_URL;
  
  if (useDeepAnalysis) {
    formData.append("mode", "deep");
  } else {
    formData.append("systemPrompt", BRUTAL_SYSTEM_PROMPT);
  }

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

    xhr.open("POST", workerUrl);
    xhr.timeout = 300000; // 5 minutes for deep analysis
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
      <span className="text-zinc-400">{label}</span>
      <span className="text-white font-mono">{progress}%</span>
    </div>
    <div className="h-3 bg-[#222] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-white"
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
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0">
          {thumbnail ? (
            <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i className="fa-solid fa-video text-zinc-600"></i>
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
          <p className="text-zinc-500 text-sm">
            {(file.size / 1024 / 1024).toFixed(1)} MB
            {needsCompression && (
              <span className="text-yellow-500 ml-2">
                <i className="fa-solid fa-compress mr-1"></i>
                Will be compressed
              </span>
            )}
          </p>
        </div>
        <button onClick={onRemove} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
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
  const [technicalAnalysis, setTechnicalAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [useDeepAnalysis, setUseDeepAnalysis] = useState(false);

  const ffmpegSupported = isFFmpegSupported();

  // Deep analysis available for Pro and Agency plans
  const canUseDeepAnalysis = subscription.plan === 'pro' || subscription.plan === 'agency';
  
  // Check if user has audits remaining
  const hasAuditsRemaining = subscription.auditsRemaining > 0;

  // Log FFmpeg support on mount
  useEffect(() => {
    console.log(`🔧 FFmpeg.wasm supported: ${ffmpegSupported}`);
  }, []);

  // Run technical analysis when file is selected
  useEffect(() => {
    if (file) {
      runTechnicalAnalysis(file)
        .then(setTechnicalAnalysis)
        .catch(console.error);
    } else {
      setTechnicalAnalysis(null);
    }
  }, [file]);

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
      // Stage 0: Technical Analysis (if not already done)
      let techAnalysis = technicalAnalysis;
      if (!techAnalysis) {
        setStatusMessage("Analyzing video specs...");
        techAnalysis = await runTechnicalAnalysis(file);
        setTechnicalAnalysis(techAnalysis);
      }

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
            setStatusMessage(useDeepAnalysis ? "Deep AI analysis in progress..." : "AI analyzing your ad...");
          }
        }
      }, useDeepAnalysis);

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

      // Add technical analysis to the data
      data.technicalAnalysis = techAnalysis;

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
            technical_analysis: techAnalysis || null,
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
        return { text: 'Unknown', color: 'text-zinc-400 bg-gray-400/10', icon: 'fa-solid fa-question' };
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
                <h3 className="text-lg font-medium text-white mb-1">
                  You've used all your audits this month
                </h3>
                <p className="text-zinc-400 text-sm mb-4">
                  {subscription.plan === 'free' 
                    ? `Your free plan includes ${subscription.auditsPerMonth} audits per month.`
                    : `Your ${subscription.plan} plan includes ${subscription.auditsPerMonth} audits per month.`
                  }
                  {' '}Upgrade to get more audits and unlock premium features.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => user && openCheckout('pro', user.id, user.email || '')}
                    className="bg-white text-black px-5 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
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
              <h1 className="text-2xl font-medium text-white mb-2">New Audit</h1>
              <p className="text-zinc-500">
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
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8">
          {/* IDLE State */}
          {status === "IDLE" && (
            <div className="space-y-6">
              {!file ? (
                <div
                  className="border-2 border-dashed border-white/10 bg-white/[0.03] rounded-xl p-12 cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-all text-center"
                  onClick={() => document.getElementById("vid-upload")?.click()}
                >
                  <input
                    id="vid-upload"
                    type="file"
                    hidden
                    accept="video/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-white"></i>
                  </div>
                  <h4 className="text-white text-xl font-medium mb-2">Upload Video Ad</h4>
                  <p className="text-zinc-500 text-sm">MP4, MOV, WebM • Up to 500MB</p>
                  <p className="text-zinc-600 text-xs mt-2">
                    Large files will be automatically compressed
                  </p>
                </div>
              ) : (
                <>
                  <VideoPreview file={file} onRemove={() => setFile(null)} />
                  
                  {/* Technical Specs Preview */}
                  {technicalAnalysis && (
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-gear text-white"></i>
                          <span className="text-white font-medium">Technical Specs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const issues = countIssues(technicalAnalysis);
                            if (issues.fails > 0) {
                              return (
                                <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
                                  {issues.fails} issue{issues.fails > 1 ? 's' : ''} found
                                </span>
                              );
                            } else if (issues.warns > 0) {
                              return (
                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-medium">
                                  {issues.warns} warning{issues.warns > 1 ? 's' : ''}
                                </span>
                              );
                            } else {
                              return (
                                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
                                  All checks passed
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(technicalAnalysis).map(([key, check]) => (
                          <div 
                            key={key}
                            className={`p-3 rounded-lg border ${
                              check.status === 'FAIL' 
                                ? 'bg-red-500/5 border-red-500/20' 
                                : check.status === 'WARN'
                                  ? 'bg-yellow-500/5 border-yellow-500/20'
                                  : 'bg-green-500/5 border-green-500/20'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <i className={`fa-solid ${
                                check.status === 'FAIL' ? 'fa-xmark text-red-400' :
                                check.status === 'WARN' ? 'fa-exclamation text-yellow-400' :
                                'fa-check text-green-400'
                              } text-xs`}></i>
                              <span className="text-zinc-400 text-xs">{check.label}</span>
                            </div>
                            <p className={`text-sm font-medium ${
                              check.status === 'FAIL' ? 'text-red-400' :
                              check.status === 'WARN' ? 'text-yellow-400' :
                              'text-white'
                            }`}>{check.value}</p>
                          </div>
                        ))}
                      </div>
                      
                      {/* Show critical issues */}
                      {(() => {
                        const criticalIssues = Object.values(technicalAnalysis).filter(c => c.status === 'FAIL');
                        if (criticalIssues.length > 0) {
                          return (
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-red-400 text-sm font-medium mb-2">
                                <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                                Critical Issues Detected
                              </p>
                              {criticalIssues.map((issue, idx) => (
                                <p key={idx} className="text-gray-300 text-sm mb-1">
                                  <span className="text-red-400 font-medium">{issue.label}:</span> {issue.fix}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </>
              )}

              {/* Deep Analysis Toggle - Pro/Agency only */}
              {file && canUseDeepAnalysis && (
                <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-brain text-amber-400"></i>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Multi-Model Deep Analysis</p>
                      <p className="text-zinc-500 text-xs">Uses multiple AI specialists for more accurate feedback</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseDeepAnalysis(!useDeepAnalysis)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      useDeepAnalysis ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      useDeepAnalysis ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              )}
              
              {/* Show badge if deep analysis not available */}
              {file && !canUseDeepAnalysis && (
                <div className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg mb-4">
                  <i className="fa-solid fa-lock text-zinc-500 text-xs"></i>
                  <p className="text-zinc-500 text-xs">
                    Multi-Model Deep Analysis available on Pro & Agency plans
                  </p>
                </div>
              )}

              <button
                onClick={runAnalysis}
                disabled={!file || !hasAuditsRemaining}
                className="w-full bg-white text-black font-medium py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {hasAuditsRemaining ? (
                  <>
                    <i className={`fa-solid ${useDeepAnalysis ? 'fa-brain' : 'fa-wand-magic-sparkles'}`}></i>
                    {useDeepAnalysis ? 'Run Deep Analysis' : 'Run Audit'}
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
                <div className="absolute inset-0 bg-white/30 rounded-full opacity-20 animate-ping"></div>
                <div className="relative w-24 h-24 bg-zinc-900 border-2 border-white/20 rounded-full flex items-center justify-center">
                  <i className={`${getStatusIcon()} text-3xl text-white ${status === "ANALYZING" ? "animate-pulse" : ""}`}></i>
                </div>
              </div>

              <h2 className="text-2xl font-medium text-white mb-2">
                {status === "COMPRESSING" && "Compressing Video"}
                {status === "UPLOADING" && "Uploading"}
                {status === "ANALYZING" && "Analyzing"}
              </h2>
              
              <p className="text-zinc-400 mb-6">{statusMessage}</p>

              <ProgressBar
                progress={progress}
                label={
                  status === "COMPRESSING" ? "Compression Progress" :
                  status === "UPLOADING" ? "Upload Progress" : 
                  "Analysis Progress"
                }
              />

              {status === "COMPRESSING" && (
                <p className="text-sm text-zinc-500 mt-6">
                  <i className={`${ffmpegSupported ? 'fa-solid fa-bolt text-green-500' : 'fa-solid fa-palette text-yellow-500'} mr-2`}></i>
                  {ffmpegSupported 
                    ? "Using FFmpeg.wasm (fast)"
                    : "Using Canvas fallback (slower)"}
                </p>
              )}

              {compressionResult && status !== "COMPRESSING" && compressionResult.method !== 'skipped' && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg inline-block">
                  <div className="flex items-center gap-3 mb-2">
                    {(() => {
                      const badge = getMethodBadge(compressionResult.method);
                      return (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
                          <i className={`${badge.icon} mr-1`}></i>
                          {badge.text}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-green-400">
                    <i className="fa-solid fa-check mr-2"></i>
                    {(compressionResult.originalSize / 1024 / 1024).toFixed(1)}MB → {(compressionResult.compressedSize / 1024 / 1024).toFixed(1)}MB
                    <span className="text-zinc-500 ml-2">
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
              <h3 className="text-red-500 font-medium text-xl mb-2">Analysis Failed</h3>
              <p className="text-zinc-400 mb-6 max-w-md mx-auto">{errorMessage}</p>
              <button
                onClick={reset}
                className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
            <i className="fa-solid fa-lightbulb text-yellow-500"></i>
            Tips for faster analysis
          </h4>
          <ul className="text-zinc-500 text-sm space-y-1">
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
