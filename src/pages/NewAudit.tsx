import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth, supabase } from "../context/AuthContext";
import { AnalysisData, UploadStatus, DEFAULT_ANALYSIS } from "../types";
import DashboardLayout from "../components/DashboardLayout";

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
// VIDEO COMPRESSION
// ==========================================
const compressVideo = async (
  file: File,
  onProgress: (progress: number) => void
): Promise<File> => {
  if (file.size <= 15 * 1024 * 1024) {
    onProgress(100);
    return file;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.onloadedmetadata = async () => {
      const maxHeight = 720;
      const scale = video.videoHeight > maxHeight ? maxHeight / video.videoHeight : 1;
      canvas.width = Math.floor(video.videoWidth * scale);
      canvas.height = Math.floor(video.videoHeight * scale);

      const duration = video.duration;
      const fps = 24;
      const totalFrames = Math.floor(duration * fps);

      const stream = canvas.captureStream(fps);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8",
        videoBitsPerSecond: 1000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webm"), {
          type: "video/webm",
        });
        onProgress(100);
        resolve(compressedFile);
      };

      mediaRecorder.onerror = () => reject(new Error("Compression failed"));
      mediaRecorder.start();

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
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        currentFrame++;
        onProgress(Math.floor((currentFrame / totalFrames) * 90));
        if (currentFrame < totalFrames) {
          requestAnimationFrame(processFrame);
        } else {
          setTimeout(() => mediaRecorder.stop(), 100);
        }
      };

      processFrame();
    };

    video.onerror = () => reject(new Error("Failed to load video"));
    video.src = URL.createObjectURL(file);
  });
};

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
          <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
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
  const [errorMessage, setErrorMessage] = useState("");

  const STAGE_LABELS: Record<UploadStatus, string> = {
    IDLE: "",
    COMPRESSING: "Optimizing video...",
    UPLOADING: "Uploading to server...",
    ANALYZING: "AI analyzing your ad...",
    SUCCESS: "Complete!",
    ERROR: "Error",
  };

  const runAnalysis = async () => {
    if (!file || !user) return;

    const MAX_SIZE_MB = 100;
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
      // Compress
      setStatus("COMPRESSING");
      setProgress(0);

      let fileToUpload = file;
      if (file.size > 15 * 1024 * 1024) {
        try {
          fileToUpload = await compressVideo(file, setProgress);
        } catch {
          fileToUpload = file;
        }
      }
      setProgress(100);

      // Upload & Analyze
      setStatus("UPLOADING");
      setProgress(0);

      const analysisPromise = analyzeVideo(fileToUpload, user.email || "", (p) => {
        setProgress(p);
        if (p === 100) {
          setStatus("ANALYZING");
          setProgress(0);
        }
      });

      setStatus("ANALYZING");
      let analysisProgress = 0;
      const progressInterval = setInterval(() => {
        analysisProgress += Math.random() * 15;
        if (analysisProgress > 90) analysisProgress = 90;
        setProgress(Math.floor(analysisProgress));
      }, 1000);

      const data = await analysisPromise;
      clearInterval(progressInterval);
      setProgress(100);

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

        // Refresh stats and redirect to result
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
    setErrorMessage("");
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">New Audit</h1>
          <p className="text-gray-500">Upload a video ad to get AI-powered feedback</p>
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
          )}

          {/* Processing States */}
          {(status === "COMPRESSING" || status === "UPLOADING" || status === "ANALYZING") && (
            <div className="py-12 text-center">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-[#00F2EA] rounded-full opacity-20 animate-ping"></div>
                <div className="relative w-24 h-24 bg-[#161616] border-2 border-[#00F2EA] rounded-full flex items-center justify-center">
                  {status === "COMPRESSING" && <i className="fa-solid fa-compress text-3xl text-[#00F2EA]"></i>}
                  {status === "UPLOADING" && <i className="fa-solid fa-cloud-arrow-up text-3xl text-[#00F2EA]"></i>}
                  {status === "ANALYZING" && <i className="fa-solid fa-brain text-3xl text-[#00F2EA] animate-pulse"></i>}
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">{STAGE_LABELS[status]}</h2>

              <ProgressBar
                progress={progress}
                label={status === "COMPRESSING" ? "Optimizing" : status === "UPLOADING" ? "Uploading" : "Analyzing"}
              />

              <p className="text-sm text-gray-500 mt-6">
                {status === "ANALYZING" ? "Our AI is reviewing every frame..." : "Please wait..."}
              </p>
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
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>
            <i className="fa-solid fa-lightbulb text-yellow-500 mr-2"></i>
            Tip: Videos under 20MB analyze much faster
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewAudit;
