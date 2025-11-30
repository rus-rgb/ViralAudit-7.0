import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth, supabase } from "../context/AuthContext";
import { AnalysisData, UploadStatus, DEFAULT_ANALYSIS } from "../types";
import DashboardLayout from "../components/DashboardLayout";
import { compressVideo, isFFmpegSupported } from "../utils/compression";

// ==========================================
// CONFIGURATION
// ==========================================
const WORKER_URL = "https://damp-wind-775f.rusdumitru122.workers.dev/";

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
    "visual": { "score": number (0-100), "feedback": "Analysis.", "fix": "Fix." },
    "audio": { "score": number (0-100), "feedback": "Analysis.", "fix": "Fix." },
    "copy": { "score": number (0-100), "feedback": "Analysis.", "fix": "Fix." }
  },
  "checks": [
    { "label": "The Hook (0-3s)", "status": "PASS/FAIL/WARN", "details": "Analysis.", "fix": "Fix." },
    { "label": "Pacing & Retention", "status": "PASS/FAIL/WARN", "details": "Analysis.", "fix": "Fix." },
    { "label": "Storytelling", "status": "PASS/FAIL/WARN", "details": "Analysis.", "fix": "Fix." },
    { "label": "Call to Action", "status": "PASS/FAIL/WARN", "details": "Analysis.", "fix": "Fix." }
  ]
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

  const needsCompression = file.size > 15 * 1024 * 1024;

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
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("IDLE");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [compressionStats, setCompressionStats] = useState<{
    original: number;
    compressed: number;
  } | null>(null);

  const ffmpegSupported = isFFmpegSupported();

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

      const originalSize = file.size;
      let fileToUpload = file;

      if (file.size > 15 * 1024 * 1024) {
        fileToUpload = await compressVideo(file, (p, msg) => {
          setProgress(p);
          setStatusMessage(msg);
        });
        
        setCompressionStats({
          original: originalSize / 1024 / 1024,
          compressed: fileToUpload.size / 1024 / 1024
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
    setCompressionStats(null);
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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">New Audit</h1>
          <p className="text-gray-500">
            Upload a video ad to get AI-powered feedback
            {ffmpegSupported && (
              <span className="ml-2 text-green-500 text-xs">
                <i className="fa-solid fa-bolt mr-1"></i>
                Fast compression enabled
              </span>
            )}
          </p>
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
                disabled={!file}
                className="w-full bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                Run Deep Audit
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
                  <i className="fa-solid fa-bolt text-yellow-500 mr-2"></i>
                  {ffmpegSupported 
                    ? "Using hardware-accelerated compression"
                    : "Using browser compression"}
                </p>
              )}

              {compressionStats && status !== "COMPRESSING" && (
                <p className="text-sm text-green-500 mt-4">
                  <i className="fa-solid fa-check mr-2"></i>
                  Compressed: {compressionStats.original.toFixed(1)}MB → {compressionStats.compressed.toFixed(1)}MB
                  ({((1 - compressionStats.compressed / compressionStats.original) * 100).toFixed(0)}% smaller)
                </p>
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
            <li>• Videos under 15MB skip compression entirely</li>
            <li>• MP4 format processes fastest</li>
            <li>• 720p resolution is optimal for analysis</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewAudit;
