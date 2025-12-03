import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";

// ==========================================
// SIDEBAR NAV ITEM
// ==========================================
const NavItem = ({
  to,
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  to?: string;
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: string;
}) => {
  const baseClasses =
    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium";
  const activeClasses = "bg-white/5 text-white";
  const inactiveClasses = "text-zinc-500 hover:text-white hover:bg-white/5";

  const content = (
    <>
      <i className={`${icon} w-5 text-center`}></i>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="bg-amber-500 text-black text-xs font-medium px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} ${inactiveClasses} w-full`}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to || "/"} className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}>
      {content}
    </Link>
  );
};

// ==========================================
// DASHBOARD LAYOUT
// ==========================================
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout, stats } = useAuth();
  const subscription = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navItems = [
    { to: "/dashboard", icon: "fa-solid fa-grid-2", label: "Overview" },
    { to: "/audit/new", icon: "fa-solid fa-plus", label: "New Audit" },
    { to: "/billing", icon: "fa-solid fa-receipt", label: "Billing" },
  ];

  // Plan display name
  const planName = subscription.loading ? 'Loading...' :
    subscription.plan === 'free' ? 'Free' : 
    subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);

  const isPaidPlan = subscription.plan !== 'free';

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-semibold text-xl text-white tracking-tight">ViralAudit</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}
        </nav>

        {/* Usage Stats */}
        <div className="mx-4 mb-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-zinc-500 font-medium">Monthly Usage</p>
            <p className="text-xs text-zinc-600">
              {stats?.audits_this_month || 0}/{subscription.auditsPerMonth === 999999 ? '∞' : subscription.auditsPerMonth}
            </p>
          </div>
          {/* Usage bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-3">
            <div 
              className={`h-full rounded-full transition-all ${
                subscription.auditsRemaining <= 0 ? 'bg-red-500' : 
                subscription.auditsRemaining <= 3 ? 'bg-amber-500' : 'bg-zinc-500'
              }`}
              style={{ 
                width: subscription.auditsPerMonth === 999999 ? '5%' : 
                  `${Math.min(100, ((stats?.audits_this_month || 0) / subscription.auditsPerMonth) * 100)}%` 
              }}
            />
          </div>
          {subscription.plan === 'free' && subscription.auditsRemaining <= 1 && (
            <Link to="/billing" className="text-amber-400 text-xs hover:underline">
              Upgrade for more →
            </Link>
          )}
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-medium text-sm">
              {user?.email?.[0].toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.email}</p>
              <p className={`text-xs ${isPaidPlan ? 'text-amber-400' : 'text-zinc-600'}`}>
                {planName} Plan
              </p>
            </div>
          </div>
          <NavItem onClick={handleLogout} icon="fa-solid fa-arrow-right-from-bracket" label="Sign Out" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#0a0a0a] border-b border-white/5 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-zinc-400 hover:text-white"
          >
            <i className="fa-solid fa-bars text-xl"></i>
          </button>
          <span className="font-semibold text-white">ViralAudit</span>
          <div className="w-10"></div>
        </header>

        {/* Page Content */}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
