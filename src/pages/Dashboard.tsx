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
  subtext,
  color = "text-[#00F2EA]" 
}: { 
  icon: string; 
  label: string; 
  value: string | number; 
  subtext?: string;
  color?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#111] border border-[#222] rounded-xl p-6"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center ${color}`}>
        <i className={icon}></i>
      </div>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
    {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
  </motion.div>
);

// ==========================================
// SCORE BADGE COMPONENT
// ==========================================
const ScoreBadge = ({ score }: { score: number }) => {
  let color = "bg-red-500/20 text-red-400";
  if (score >= 5) color = "bg-yellow-500/20 text-yellow-400";
  if (score >= 8) color = "bg-green-500/20 text-green-400";

  return (
    <span className={`px-2 py-1 rounded-lg text-sm font-bold ${color}`}>
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
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-500">Welcome back! Here's your audit overview.</p>
          </div>
          <Link
            to="/audit/new"
            className="bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            New Audit
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon="fa-solid fa-chart-bar"
            label="Total Audits"
            value={stats?.total_audits || 0}
            subtext="All time"
          />
          <StatCard
            icon="fa-solid fa-star"
            label="Average Score"
            value={stats?.avg_score ? `${stats.avg_score}/10` : '-'}
            subtext="Across all audits"
            color="text-yellow-400"
          />
          <StatCard
            icon="fa-solid fa-trophy"
            label="Best Score"
            value={stats?.best_score ? `${stats.best_score}/10` : '-'}
            subtext="Your highest rated ad"
            color="text-green-400"
          />
          <StatCard
            icon="fa-solid fa-calendar-week"
            label="This Week"
            value={stats?.audits_this_week || 0}
            subtext="Audits completed"
            color="text-purple-400"
          />
        </div>

        {/* Recent Audits */}
        <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[#222] flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-gray-500"></i>
              Recent Audits
            </h2>
            {audits.length > 0 && (
              <span className="text-sm text-gray-500">{audits.length} audits</span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-[#333] border-t-[#00F2EA] rounded-full animate-spin mx-auto"></div>
            </div>
          ) : audits.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-video text-2xl text-gray-600"></i>
              </div>
              <h3 className="text-white font-bold mb-2">No audits yet</h3>
              <p className="text-gray-500 mb-4">Upload your first video to get started</p>
              <Link
                to="/audit/new"
                className="inline-flex items-center gap-2 text-[#00F2EA] hover:underline"
              >
                <i className="fa-solid fa-plus"></i>
                Create your first audit
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#222]">
              {audits.map((audit, idx) => (
                <motion.div
                  key={audit.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 hover:bg-[#1a1a1a] transition-colors flex items-center gap-4"
                >
                  {/* Video Icon */}
                  <div className="w-12 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-video text-gray-500"></i>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/audit/${audit.id}`}
                      className="text-white font-medium hover:text-[#00F2EA] transition-colors truncate block"
                    >
                      {audit.video_name}
                    </Link>
                    <p className="text-gray-500 text-sm">
                      {formatDate(audit.created_at)} • {audit.video_size_mb?.toFixed(1) || '?'}MB
                    </p>
                  </div>

                  {/* Score */}
                  <ScoreBadge score={audit.overall_score} />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/audit/${audit.id}`}
                      className="p-2 text-gray-500 hover:text-white transition-colors"
                      title="View Details"
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                    </Link>
                    <button
                      onClick={() => deleteAudit(audit.id)}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-gradient-to-r from-[#00F2EA]/10 to-transparent border border-[#00F2EA]/20 rounded-xl p-6">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <i className="fa-solid fa-lightbulb text-[#00F2EA]"></i>
            Pro Tips
          </h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Upload videos under 20MB for fastest analysis</li>
            <li>• The first 3 seconds of your ad are the most critical</li>
            <li>• Aim for a score of 7+ for high-performing creatives</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
