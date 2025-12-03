// ==========================================
// BILLING PAGE
// Manage subscription, view plan, upgrade/downgrade
// ==========================================

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { openCheckout, openCustomerPortal, PLAN_DETAILS, PlanType } from '../utils/lemonsqueezy';
import DashboardLayout from '../components/DashboardLayout';

// ==========================================
// PLAN CARD COMPONENT
// ==========================================
const PlanCard = ({
  plan,
  isCurrentPlan,
  onSelect,
}: {
  plan: PlanType;
  isCurrentPlan: boolean;
  onSelect: () => void;
}) => {
  const details = PLAN_DETAILS[plan];
  const isPaid = plan !== 'free';

  return (
    <div
      className={`relative bg-white/[0.02] border rounded-xl p-5 transition-all ${
        isCurrentPlan
          ? 'border-amber-500/50'
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3 left-4 bg-amber-500 text-black text-xs font-medium px-3 py-1 rounded-full">
          Current
        </div>
      )}

      <h3 className="text-lg font-medium text-white mb-1">{details.name}</h3>
      
      <div className="mb-4">
        <span className="text-2xl font-semibold text-white">${details.price}</span>
        {isPaid && <span className="text-zinc-500 text-sm">/mo</span>}
      </div>

      <ul className="space-y-2 mb-5">
        {details.features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-zinc-500 text-sm">
            <i className="fa-solid fa-check text-zinc-600 text-xs"></i>
            {feature}
          </li>
        ))}
      </ul>

      {!isCurrentPlan && isPaid && (
        <button
          onClick={onSelect}
          className="w-full bg-white text-black py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors text-sm"
        >
          Upgrade
        </button>
      )}

      {isCurrentPlan && isPaid && (
        <button
          onClick={openCustomerPortal}
          className="w-full bg-white/5 border border-white/10 text-white py-2 rounded-lg font-medium hover:bg-white/10 transition-colors text-sm"
        >
          Manage
        </button>
      )}
    </div>
  );
};

// ==========================================
// USAGE METER COMPONENT
// ==========================================
const UsageMeter = ({
  used,
  total,
  label,
}: {
  used: number;
  total: number;
  label: string;
}) => {
  const percentage = total === 999999 ? 0 : Math.min(100, (used / total) * 100);
  const isUnlimited = total === 999999;

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
      <div className="flex justify-between items-center mb-3">
        <span className="text-zinc-500 text-sm">{label}</span>
        <span className="text-white font-mono text-sm">
          {used} / {isUnlimited ? '∞' : total}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 90
              ? 'bg-red-500'
              : percentage > 70
              ? 'bg-amber-500'
              : 'bg-zinc-500'
          }`}
          style={{ width: `${isUnlimited ? 5 : percentage}%` }}
        />
      </div>
      {percentage > 80 && !isUnlimited && (
        <p className="text-amber-400 text-xs mt-2">
          Running low on audits
        </p>
      )}
    </div>
  );
};

// ==========================================
// BILLING PAGE
// ==========================================
const Billing = () => {
  const navigate = useNavigate();
  const { user, stats } = useAuth();
  const subscription = useSubscription();

  const handleSelectPlan = (plan: 'solo' | 'pro' | 'agency') => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }
    openCheckout(plan, user.id, user.email || '');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (subscription.loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Billing</h1>
          <p className="text-zinc-500">Manage your subscription and usage</p>
        </div>

        {/* Current Plan Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/5 rounded-xl p-5 mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-zinc-500 text-sm mb-1">Current Plan</p>
              <h2 className="text-2xl font-semibold text-white capitalize">{subscription.plan}</h2>
              <p className="text-zinc-500 text-sm mt-1">
                Status:{' '}
                <span
                  className={`capitalize ${
                    subscription.status === 'active'
                      ? 'text-green-400'
                      : subscription.status === 'cancelled'
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {subscription.status}
                </span>
              </p>
            </div>
            <div className="text-right">
              {subscription.renewsAt && subscription.status === 'active' && (
                <p className="text-zinc-500 text-sm">
                  Renews {formatDate(subscription.renewsAt)}
                </p>
              )}
              {subscription.endsAt && subscription.status === 'cancelled' && (
                <p className="text-amber-400 text-sm">
                  Access until {formatDate(subscription.endsAt)}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <UsageMeter
            used={stats?.audits_this_month || 0}
            total={subscription.auditsPerMonth}
            label="Audits This Month"
          />
          <UsageMeter
            used={stats?.total_audits || 0}
            total={999999}
            label="Total Audits (All Time)"
          />
        </div>

        {/* Plan Selection */}
        <div className="mb-8">
          <h3 className="text-base font-medium text-white mb-4">Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['solo', 'pro', 'agency'] as const).map((plan) => (
              <PlanCard
                key={plan}
                plan={plan}
                isCurrentPlan={subscription.plan === plan}
                onSelect={() => handleSelectPlan(plan)}
              />
            ))}
          </div>
        </div>

        {/* Billing Actions */}
        {subscription.plan !== 'free' && (
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={openCustomerPortal}
              className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-credit-card text-xs"></i>
              Update Payment
            </button>
            <button
              onClick={openCustomerPortal}
              className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-file-invoice text-xs"></i>
              View Invoices
            </button>
          </div>
        )}

        {/* FAQ */}
        <div>
          <h3 className="text-base font-medium text-white mb-4">FAQ</h3>
          <div className="space-y-3">
            {[
              {
                q: 'How do I cancel?',
                a: 'Click "Manage" on your plan to access the portal where you can cancel anytime.',
              },
              {
                q: 'What happens when I cancel?',
                a: "You keep access until the end of your billing period.",
              },
              {
                q: 'Can I get a refund?',
                a: '14-day money-back guarantee on all plans. Contact support.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-lg p-4">
                <h4 className="text-white text-sm font-medium mb-1">{faq.q}</h4>
                <p className="text-zinc-500 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
