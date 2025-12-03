import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, supabase } from "../context/AuthContext";
import { AuditRecord } from "../types";
import DashboardLayout from "../components/DashboardLayout";

// ==========================================
// STAT CARD COMPONENT
// ==========================================
const StatCard = ({ 
  icon, 
  label, 
  value, 
  subtext 
}: { 
  icon: string; 
  label: string; 
  value: string | number; 
  subtext?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/[0.02] border border-white/5 rounded-xl p-5"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500">
        <i className={icon}></i>
      </div>
      <span className="text-zinc-500 text-sm">{label}</span>
    </div>
    <p className="text-2xl font-semibold text-white">{value}</p>
    {subtext && <p className="text-zinc-600 text-xs mt-1">{subtext}</p>}
  </motion.div>
);

// ==========================================
// SCORE BADGE COMPONENT
// ==========================================
const ScoreBadge = ({ score }: { score: number }) => {
  let color = "bg-red-500/10 text-red-400 border-red-500/20";
  if (score >= 5) color = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (score >= 8) color = "bg-green-500/10 text-green-400 border-green-500/20";

  return (
    <span className={`px-2.5 py-1 rounded-lg text-sm font-medium border ${color}`}>
      {score}/10
    </span>
  );
};

// ==========================================
// DASHBOARD PAGE
// ==========================================
const Dashboard = () => {
  const { user, stats, refreshStats } = useAuth();
  const navigate = useNavigate();
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Load recent audits
  useEffect(() => {
    loadAudits();
  }, [user]);

  const loadAudits = async () => {
    if (!supabase || !user) return;

    try {
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAudits(data || []);
    } catch (e) {
      console.error("Failed to load audits:", e);
    } finally {
      setLoading(false);
    }
  };

  const deleteAudit = async (id: string) => {
    if (!supabase || !confirm("Delete this audit?")) return;

    try {
      await supabase.from('audits').delete().eq('id', id);
      setAudits(audits.filter(a => a.id !== id));
      refreshStats();
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Overview</h1>
            <p className="text-zinc-500">Your audit performance at a glance</p>
          </div>
          <Link
            to="/audit/new"
            className="bg-white text-black px-5 py-2.5 rounded-lg font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-plus text-sm"></i>
            New Audit
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="fa-solid fa-chart-simple"
            label="Total Audits"
            value={stats?.total_audits || 0}
            subtext="All time"
          />
          <StatCard
            icon="fa-solid fa-star"
            label="Average Score"
            value={stats?.avg_score ? `${stats.avg_score}/10` : '-'}
            subtext="Across all audits"
          />
          <StatCard
            icon="fa-solid fa-trophy"
            label="Best Score"
            value={stats?.best_score ? `${stats.best_score}/10` : '-'}
            subtext="Your highest rated"
          />
          <StatCard
            icon="fa-solid fa-calendar"
            label="This Week"
            value={stats?.audits_this_week || 0}
            subtext="Audits completed"
          />
        </div>

        {/* Recent Audits */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-base font-medium text-white">
              Recent Audits
            </h2>
            {audits.length > 0 && (
              <span className="text-sm text-zinc-600">{audits.length} total</span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : audits.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-video text-xl text-zinc-600"></i>
              </div>
              <h3 className="text-white font-medium mb-2">No audits yet</h3>
              <p className="text-zinc-500 text-sm mb-4">Upload your first video to get started</p>
              <Link
                to="/audit/new"
                className="inline-flex items-center gap-2 text-white text-sm hover:underline"
              >
                <i className="fa-solid fa-plus"></i>
                Create your first audit
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {audits.map((audit, idx) => (
                <motion.div
                  key={audit.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 hover:bg-white/[0.02] transition-colors flex items-center gap-4"
                >
                  {/* Video Icon */}
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-video text-zinc-600 text-sm"></i>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/audit/${audit.id}`}
                      className="text-white font-medium hover:underline transition-colors truncate block text-sm"
                    >
                      {audit.video_name}
                    </Link>
                    <p className="text-zinc-600 text-xs">
                      {formatDate(audit.created_at)} • {audit.video_size_mb?.toFixed(1) || '?'}MB
                    </p>
                  </div>

                  {/* Score */}
                  <ScoreBadge score={audit.overall_score} />

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/audit/${audit.id}`}
                      className="p-2 text-zinc-600 hover:text-white transition-colors"
                      title="View Details"
                    >
                      <i className="fa-solid fa-arrow-right text-sm"></i>
                    </Link>
                    <button
                      onClick={() => deleteAudit(audit.id)}
                      className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <i className="fa-solid fa-trash text-sm"></i>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 p-5 bg-white/[0.02] border border-white/5 rounded-xl">
          <h3 className="text-white font-medium mb-3 text-sm">Quick Tips</h3>
          <ul className="text-zinc-500 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-circle text-[4px] mt-2 text-zinc-600"></i>
              Upload videos under 20MB for fastest analysis
            </li>
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-circle text-[4px] mt-2 text-zinc-600"></i>
              The first 3 seconds of your ad are most critical for stopping the scroll
            </li>
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-circle text-[4px] mt-2 text-zinc-600"></i>
              Aim for a score of 7+ before scaling ad spend
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
