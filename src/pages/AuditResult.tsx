import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth, supabase } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { AuditRecord } from "../types";
import DashboardLayout from "../components/DashboardLayout";
import { generateAuditPDF } from "../utils/pdfExport";
import { openCheckout } from "../utils/lemonsqueezy";

// ==========================================
// SCORE CIRCLE COMPONENT
// ==========================================
const ScoreCircle = ({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) => {
  const safeScore = score || 0;
  const isLarge = size === "lg";
  const radius = isLarge ? 54 : 36;
  const strokeWidth = isLarge ? 8 : 6;
  const viewBox = isLarge ? 144 : 96;
  const center = viewBox / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 10) * circumference;
  
  let color = "#ef4444";
  if (safeScore >= 5) color = "#eab308";
  if (safeScore >= 8) color = "#22c55e";

  return (
    <div className={`relative ${isLarge ? 'w-36 h-36' : 'w-24 h-24'} flex items-center justify-center`}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${viewBox} ${viewBox}`}>
        <circle cx={center} cy={center} r={radius} stroke="#222" strokeWidth={strokeWidth} fill="transparent" />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute ${isLarge ? 'text-4xl' : 'text-2xl'} font-medium text-white`}>{safeScore}</span>
    </div>
  );
};

// ==========================================
// SCORE BAR COMPONENT
// ==========================================
const ScoreBar = ({ score, label }: { score: number; label: string }) => {
  let color = "bg-red-500";
  let textColor = "text-red-400";
  if (score >= 50) { color = "bg-yellow-500"; textColor = "text-yellow-400"; }
  if (score >= 70) { color = "bg-green-500"; textColor = "text-green-400"; }

  return (
    <div className="flex items-center gap-3">
      <span className="text-zinc-400 text-sm w-20">{label}</span>
      <div className="flex-1 h-2 bg-[#222] rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className={`${textColor} font-medium text-sm w-12 text-right`}>{score}%</span>
    </div>
  );
};

// ==========================================
// STATUS BADGE COMPONENT
// ==========================================
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    PASS: { bg: "bg-green-500/10", text: "text-green-400", icon: "fa-circle-check" },
    FAIL: { bg: "bg-red-500/10", text: "text-red-400", icon: "fa-circle-xmark" },
    WARN: { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: "fa-triangle-exclamation" },
  };
  const { bg, text, icon } = config[status] || config.WARN;

  return (
    <span className={`${bg} ${text} px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5`}>
      <i className={`fa-solid ${icon}`}></i>
      {status}
    </span>
  );
};

// ==========================================
// CATEGORY CARD COMPONENT (Expanded)
// ==========================================
const CategoryCard = ({ 
  title, 
  icon, 
  score, 
  feedback, 
  fix,
  delay = 0 
}: { 
  title: string; 
  icon: string; 
  score: number; 
  feedback: string; 
  fix: string;
  delay?: number;
}) => {
  let scoreColor = "text-red-400";
  let scoreBg = "bg-red-500/10";
  let borderColor = "border-red-500/20";
  if (score >= 50) { scoreColor = "text-yellow-400"; scoreBg = "bg-yellow-500/10"; borderColor = "border-yellow-500/20"; }
  if (score >= 70) { scoreColor = "text-green-400"; scoreBg = "bg-green-500/10"; borderColor = "border-green-500/20"; }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className={`p-5 border-b border-[#1a1a1a] flex justify-between items-center`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${scoreBg} flex items-center justify-center`}>
            <i className={`fa-solid ${icon} ${scoreColor}`}></i>
          </div>
          <span className="font-medium text-white">{title}</span>
        </div>
        <div className={`${scoreBg} ${scoreColor} px-4 py-2 rounded-xl font-medium text-lg`}>
          {score}%
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5">
        <p className="text-gray-300 text-sm leading-relaxed mb-5">
          {feedback}
        </p>
        
        {/* Fix Box */}
        {fix && (
          <div className={`bg-white/[0.02] border ${borderColor} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-wrench text-white text-xs"></i>
              <span className="text-white text-xs font-medium uppercase">How to Fix</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{fix}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ==========================================
// AUDIT RESULT PAGE
// ==========================================
const AuditResult = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const subscription = useSubscription();
  const navigate = useNavigate();
  
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAudit();
  }, [id, user]);

  const loadAudit = async () => {
    if (!supabase || !user || !id) {
      setError("Unable to load audit");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Audit not found");

      setAudit(data);
    } catch (e: any) {
      setError(e.message || "Failed to load audit");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to get category data with fallbacks
  const getCategoryData = (title: string, data: any) => {
    let feedback = data?.feedback || "";
    let fix = data?.fix || "";
    
    // Special handling for captions with no/minimal feedback
    if (title === "Captions" && (!feedback || feedback === "No feedback." || feedback === "No feedback" || feedback === "No feedback available." || feedback.length < 30)) {
      feedback = "No captions detected. 85% of people watch videos on mute. Without captions, you're invisible to most of your audience.";
      fix = "Add captions to every word spoken in the video. Use big, bold white text with a black outline so it's readable on any background.";
    }
    
    // Default fallback for any empty feedback
    if (!feedback) {
      feedback = "No feedback available.";
    }
    
    return { feedback, fix, score: data?.score || 0 };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/10 border-t-[white] rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !audit) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation text-2xl text-red-500"></i>
            </div>
            <h2 className="text-xl font-medium text-white mb-2">Audit Not Found</h2>
            <p className="text-zinc-500 mb-4">{error || "This audit doesn't exist or you don't have access."}</p>
            <Link to="/dashboard" className="text-white hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const failedChecks = (audit.checks || []).filter(c => c.status === 'FAIL');
  const warnChecks = (audit.checks || []).filter(c => c.status === 'WARN');

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        
        {/* ==================== HEADER ==================== */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <Link to="/dashboard" className="text-zinc-500 hover:text-white text-sm mb-2 inline-flex items-center gap-2 transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-medium text-white truncate max-w-md">{audit.video_name}</h1>
            <p className="text-zinc-500 text-sm mt-1">{formatDate(audit.created_at)}</p>
          </div>
          <div className="flex gap-3">
            {subscription.canExportPdf ? (
              <button
                onClick={() => generateAuditPDF(audit)}
                className="bg-white/[0.02] border border-white/5 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-file-pdf"></i>
                Export PDF
              </button>
            ) : (
              <button
                onClick={() => user && openCheckout('solo', user.id, user.email || '')}
                className="bg-white/[0.02] border border-white/5 text-zinc-400 px-5 py-2.5 rounded-xl font-medium hover:bg-white/5 transition-colors flex items-center gap-2 group"
              >
                <i className="fa-solid fa-lock group-hover:hidden"></i>
                <i className="fa-solid fa-unlock hidden group-hover:inline"></i>
                <span>Export PDF</span>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">PRO</span>
              </button>
            )}
            <Link
              to="/audit/new"
              className="bg-white text-black px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              New Audit
            </Link>
          </div>
        </div>

        {/* ==================== VERDICT + SCORES ==================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#0d0d0d] to-[#111] border border-[#1a1a1a] rounded-3xl p-6 lg:p-8 mb-8"
        >
          <div className="grid lg:grid-cols-[auto_1fr] gap-8 items-center">
            {/* Score Circle */}
            <div className="flex flex-col items-center lg:items-start">
              <ScoreCircle score={audit.overall_score} />
              <p className="text-zinc-500 text-xs uppercase tracking-widest mt-3 text-center">Overall Score</p>
            </div>
            
            {/* Verdict + Score Bars */}
            <div className="space-y-6">
              {/* Verdict */}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">
                  Creative Director's Verdict
                </p>
                <p className="text-xl lg:text-2xl font-medium text-white leading-relaxed">
                  "{audit.verdict}"
                </p>
              </div>
              
              {/* Score Bars */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <ScoreBar score={audit.categories?.visual?.score || 0} label="Visuals" />
                <ScoreBar score={audit.categories?.audio?.score || 0} label="Audio" />
                <ScoreBar score={audit.categories?.copy?.score || 0} label="Copy" />
                <ScoreBar score={audit.categories?.captions?.score || 0} label="Captions" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ==================== PRIORITY FIXES ==================== */}
        {failedChecks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-red-500/5 to-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-fire text-red-400"></i>
              </div>
              <div>
                <h3 className="text-white font-medium">Priority Fixes</h3>
                <p className="text-red-400 text-xs">Fix these first for maximum impact</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {failedChecks.slice(0, 3).map((check, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm mb-1">{check.label}</p>
                    <p className="text-zinc-400 text-sm leading-relaxed">{check.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ==================== TECHNICAL SPECS ==================== */}
        {audit.technical_analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-[#0d0d0d] to-[#111] border border-[#1a1a1a] rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-gear text-white"></i>
              </div>
              <div>
                <h3 className="text-white font-medium">Technical Specs</h3>
                <p className="text-zinc-500 text-xs">Platform compatibility checks</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(audit.technical_analysis).map(([key, check]: [string, any]) => (
                <div 
                  key={key}
                  className={`p-4 rounded-xl border ${
                    check.status === 'FAIL' 
                      ? 'bg-red-500/5 border-red-500/20' 
                      : check.status === 'WARN'
                        ? 'bg-yellow-500/5 border-yellow-500/20'
                        : 'bg-green-500/5 border-green-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <i className={`fa-solid ${
                      check.status === 'FAIL' ? 'fa-xmark text-red-400' :
                      check.status === 'WARN' ? 'fa-exclamation text-yellow-400' :
                      'fa-check text-green-400'
                    } text-xs`}></i>
                    <span className="text-zinc-400 text-xs font-medium">{check.label}</span>
                  </div>
                  <p className={`text-sm font-medium ${
                    check.status === 'FAIL' ? 'text-red-400' :
                    check.status === 'WARN' ? 'text-yellow-400' :
                    'text-white'
                  }`}>{check.value}</p>
                </div>
              ))}
            </div>
            
            {/* Show issues with fixes */}
            {(() => {
              const issues = Object.values(audit.technical_analysis).filter((c: any) => c.status !== 'PASS' && c.fix);
              if (issues.length > 0) {
                return (
                  <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                    {issues.map((issue: any, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${
                        issue.status === 'FAIL' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
                      }`}>
                        <div className="flex items-start gap-3">
                          <i className={`fa-solid ${
                            issue.status === 'FAIL' ? 'fa-xmark text-red-400' : 'fa-exclamation text-yellow-400'
                          } mt-1`}></i>
                          <div>
                            <p className={`font-medium text-sm mb-1 ${
                              issue.status === 'FAIL' ? 'text-red-400' : 'text-yellow-400'
                            }`}>{issue.label}: {issue.value}</p>
                            <p className="text-gray-300 text-sm">{issue.details}</p>
                            {issue.fix && (
                              <p className="text-zinc-400 text-sm mt-2">
                                <span className="text-white font-medium">Fix: </span>
                                {issue.fix}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            })()}
          </motion.div>
        )}

        {/* ==================== CATEGORY BREAKDOWN ==================== */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-white mb-5 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-white"></i>
            Category Breakdown
          </h2>
          
          <div className="grid md:grid-cols-2 gap-5">
            {[
              { title: "Visuals", icon: "fa-eye", data: audit.categories?.visual },
              { title: "Audio", icon: "fa-volume-high", data: audit.categories?.audio },
              { title: "Copy", icon: "fa-pen-nib", data: audit.categories?.copy },
              { title: "Captions", icon: "fa-closed-captioning", data: audit.categories?.captions },
            ].map((cat, idx) => {
              const { feedback, fix, score } = getCategoryData(cat.title, cat.data);
              return (
                <CategoryCard
                  key={cat.title}
                  title={cat.title}
                  icon={cat.icon}
                  score={score}
                  feedback={feedback}
                  fix={fix}
                  delay={idx * 0.05}
                />
              );
            })}
          </div>
        </div>

        {/* ==================== DIAGNOSTIC CHECKS ==================== */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-white mb-5 flex items-center gap-2">
            <i className="fa-solid fa-clipboard-check text-white"></i>
            Diagnostic Checks
          </h2>
          
          <div className="space-y-4">
            {(audit.checks || []).map((check, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden"
              >
                {/* Check Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a1a1a]">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    {check.status === 'PASS' && <i className="fa-solid fa-circle-check text-green-500"></i>}
                    {check.status === 'WARN' && <i className="fa-solid fa-triangle-exclamation text-yellow-500"></i>}
                    {check.status === 'FAIL' && <i className="fa-solid fa-circle-xmark text-red-500"></i>}
                    {check.label}
                  </h3>
                  <StatusBadge status={check.status} />
                </div>
                
                {/* Check Content */}
                <div className="p-5">
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">{check.details}</p>
                  
                  {check.fix && (
                    <div className="bg-white/5 border border-[white]/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fa-solid fa-lightbulb text-white text-sm"></i>
                        <span className="text-white text-xs font-medium uppercase">How to Fix</span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{check.fix}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ==================== SCRIPT REWRITE ==================== */}
        {audit.script_rewrite && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-lg font-medium text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles text-purple-400"></i>
              Script Rewrite
            </h2>
            
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl overflow-hidden">
              {/* Side by Side Scripts */}
              <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#1a1a1a]">
                {/* Original */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gray-500/10 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-file-lines text-zinc-400 text-sm"></i>
                    </div>
                    <span className="text-zinc-400 font-medium text-sm uppercase">Original Script</span>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{audit.script_rewrite.original}</p>
                  </div>
                </div>
                
                {/* Improved */}
                <div className="p-6 bg-green-500/[0.02]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                      <i className="fa-solid fa-sparkles text-green-400 text-sm"></i>
                    </div>
                    <span className="text-green-400 font-medium text-sm uppercase">Improved Script</span>
                  </div>
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                    <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{audit.script_rewrite.improved}</p>
                  </div>
                </div>
              </div>
              
              {/* Key Changes */}
              {audit.script_rewrite.changes && audit.script_rewrite.changes.length > 0 && (
                <div className="p-6 border-t border-[#1a1a1a] bg-white/[0.03]">
                  <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-check-double text-white"></i>
                    <span className="text-white font-medium text-sm uppercase">Key Changes</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {audit.script_rewrite.changes.map((change, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <i className="fa-solid fa-check text-green-400 mt-1 text-xs"></i>
                        <span className="text-gray-300 text-sm">{change}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ==================== BOTTOM ACTIONS ==================== */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            to="/audit/new"
            className="bg-white/[0.02] border border-white/5 text-white px-8 py-4 rounded-xl font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-rotate-right"></i>
            Audit Another Video
          </Link>
          <Link
            to="/dashboard"
            className="bg-white/[0.02] border border-white/5 text-white px-8 py-4 rounded-xl font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-chart-bar"></i>
            View All Audits
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditResult;
