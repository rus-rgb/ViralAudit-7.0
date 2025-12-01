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
const ScoreCircle = ({ score }: { score: number }) => {
  const safeScore = score || 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 10) * circumference;
  
  let color = "#ef4444";
  if (safeScore >= 5) color = "#eab308";
  if (safeScore >= 8) color = "#22c55e";

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="72" cy="72" r={radius} stroke="#222" strokeWidth="8" fill="transparent" />
        <motion.circle
          cx="72"
          cy="72"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-4xl font-bold text-white">{safeScore}</span>
    </div>
  );
};

// ==========================================
// STATUS CHIP COMPONENT
// ==========================================
const StatusChip = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    PASS: "bg-green-500/10 text-green-500 border-green-500/20",
    FAIL: "bg-red-500/10 text-red-500 border-red-500/20",
    WARN: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  };
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${styles[status] || styles.WARN}`}>
      {status || "WARN"}
    </span>
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#333] border-t-[#00F2EA] rounded-full animate-spin"></div>
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
            <h2 className="text-xl font-bold text-white mb-2">Audit Not Found</h2>
            <p className="text-gray-500 mb-4">{error || "This audit doesn't exist or you don't have access."}</p>
            <Link to="/dashboard" className="text-[#00F2EA] hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <Link to="/dashboard" className="text-gray-500 hover:text-white text-sm mb-2 inline-flex items-center gap-2">
              <i className="fa-solid fa-arrow-left"></i>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white truncate max-w-md">{audit.video_name}</h1>
            <p className="text-gray-500 text-sm">{formatDate(audit.created_at)}</p>
          </div>
          <div className="flex gap-3">
            {subscription.canExportPdf ? (
              <button
                onClick={() => generateAuditPDF(audit)}
                className="bg-[#1a1a1a] border border-[#333] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#222] transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-file-pdf"></i>
                Export PDF
              </button>
            ) : (
              <button
                onClick={() => user && openCheckout('solo', user.id, user.email || '')}
                className="bg-[#1a1a1a] border border-[#333] text-gray-400 px-5 py-2.5 rounded-lg font-medium hover:bg-[#222] transition-colors flex items-center gap-2 group"
              >
                <i className="fa-solid fa-lock group-hover:hidden"></i>
                <i className="fa-solid fa-unlock hidden group-hover:inline"></i>
                <span>Export PDF</span>
                <span className="text-xs bg-[#00F2EA]/20 text-[#00F2EA] px-2 py-0.5 rounded-full">PRO</span>
              </button>
            )}
            <Link
              to="/audit/new"
              className="bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black px-5 py-2.5 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              New Audit
            </Link>
          </div>
        </div>

        {/* Verdict Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111] border border-[#222] rounded-2xl p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreCircle score={audit.overall_score} />
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                Creative Director's Verdict
              </h3>
              <p className="text-2xl font-bold italic text-white leading-relaxed">
                "{audit.verdict}"
              </p>
            </div>
          </div>
        </motion.div>

        {/* Priority Fixes - Quick Wins */}
        {audit.checks && audit.checks.filter(c => c.status === 'FAIL').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mb-6"
          >
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-fire"></i>
              Priority Fixes (Do These First)
            </h3>
            <div className="space-y-3">
              {audit.checks.filter(c => c.status === 'FAIL').slice(0, 3).map((check, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-white font-semibold text-sm">{check.label}:</span>
                    <span className="text-gray-400 text-sm ml-1">{check.fix}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { title: "Visuals", icon: "fa-eye", data: audit.categories.visual },
            { title: "Audio", icon: "fa-volume-high", data: audit.categories.audio },
            { title: "Copy", icon: "fa-pen-nib", data: audit.categories.copy },
            { title: "Captions", icon: "fa-closed-captioning", data: audit.categories.captions },
          ].map((pillar, idx) => {
            const score = pillar.data?.score || 0;
            let scoreColor = "text-red-400";
            let scoreBg = "bg-red-500/10";
            if (score >= 50) { scoreColor = "text-yellow-400"; scoreBg = "bg-yellow-500/10"; }
            if (score >= 70) { scoreColor = "text-green-400"; scoreBg = "bg-green-500/10"; }
            
            // Better fallback for captions with no feedback
            let feedback = pillar.data?.feedback || "No feedback.";
            let fix = pillar.data?.fix || "";
            if (pillar.title === "Captions" && (feedback === "No feedback." || feedback === "No feedback" || feedback.length < 10)) {
              feedback = "No captions detected. 85% of people watch videos on mute. Without captions, you're invisible to most of your audience.";
              fix = "Add captions to every word spoken in the video. Use big, bold white text with a black outline so it's readable on any background.";
            }
            
            return (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#111] border border-[#222] rounded-xl p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#222]">
                <div className="flex items-center gap-2 font-bold text-white">
                  <i className={`fa-solid ${pillar.icon} text-gray-500`}></i>
                  {pillar.title}
                </div>
                <span className={`font-mono font-bold px-3 py-1 rounded-full ${scoreColor} ${scoreBg}`}>
                  {score}%
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-4 flex-grow leading-relaxed">
                {feedback}
              </p>
              {fix && (
                <div className="bg-[#00F2EA]/5 border border-[#00F2EA]/20 rounded-lg p-4 mt-auto">
                  <p className="text-xs text-[#00F2EA] font-bold uppercase mb-2 flex items-center gap-1">
                    <i className="fa-solid fa-wrench"></i>
                    How to Fix
                  </p>
                  <p className="text-sm text-gray-300 leading-relaxed">{fix}</p>
                </div>
              )}
            </motion.div>
          )})}
        </div>

        {/* Diagnostic Checks */}
        <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#222]">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-list-check text-[#00F2EA]"></i>
              Diagnostic Checks
            </h2>
          </div>
          <div className="divide-y divide-[#222]">
            {(audit.checks || []).map((check, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    {check.status === 'PASS' && <i className="fa-solid fa-circle-check text-green-500"></i>}
                    {check.status === 'WARN' && <i className="fa-solid fa-triangle-exclamation text-yellow-500"></i>}
                    {check.status === 'FAIL' && <i className="fa-solid fa-circle-xmark text-red-500"></i>}
                    {check.label}
                  </span>
                  <StatusChip status={check.status} />
                </div>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">{check.details}</p>
                {check.fix && (
                  <div className="bg-[#00F2EA]/5 border border-[#00F2EA]/20 rounded-lg p-4">
                    <p className="text-[#00F2EA] text-sm">
                      <span className="font-bold flex items-center gap-2 mb-2">
                        <i className="fa-solid fa-wrench"></i>
                        How to Fix:
                      </span>
                      <span className="text-gray-300 leading-relaxed">{check.fix}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Script Rewrite Section */}
        {audit.script_rewrite && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden mt-6"
          >
            <div className="p-6 border-b border-[#222]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-pen-fancy text-purple-400"></i>
                Script Rewrite Suggestion
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Original Script */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Original Script
                </h3>
                <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{audit.script_rewrite.original}</p>
                </div>
              </div>

              {/* Improved Script */}
              <div>
                <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-arrow-up"></i>
                  Improved Script
                </h3>
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                  <p className="text-white text-sm whitespace-pre-wrap">{audit.script_rewrite.improved}</p>
                </div>
              </div>

              {/* Changes Made */}
              {audit.script_rewrite.changes && audit.script_rewrite.changes.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-[#00F2EA] uppercase tracking-wider mb-3">
                    Key Changes
                  </h3>
                  <ul className="space-y-2">
                    {audit.script_rewrite.changes.map((change, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-400 text-sm">
                        <i className="fa-solid fa-check text-[#00F2EA] mt-1"></i>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Bottom Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/audit/new"
            className="bg-[#1a1a1a] border border-[#333] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#222] transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-rotate-right"></i>
            Audit Another Video
          </Link>
          <Link
            to="/dashboard"
            className="bg-[#1a1a1a] border border-[#333] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#222] transition-colors flex items-center justify-center gap-2"
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
