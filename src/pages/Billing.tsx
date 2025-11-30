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
      className={`relative bg-[#111] border rounded-xl p-6 transition-all ${
        isCurrentPlan
          ? 'border-[#00F2EA] shadow-[0_0_20px_rgba(0,242,234,0.1)]'
          : 'border-[#222] hover:border-[#333]'
      }`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-3 left-4 bg-[#00F2EA] text-black text-xs font-bold px-3 py-1 rounded-full">
          CURRENT PLAN
        </div>
      )}

      <h3 className="text-xl font-bold text-white mb-2">{details.name}</h3>
      
      <div className="mb-4">
        <span className="text-3xl font-bold text-white">${details.price}</span>
        {isPaid && <span className="text-gray-500">/month</span>}
      </div>

      <ul className="space-y-2 mb-6">
        {details.features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-gray-400 text-sm">
            <i className="fa-solid fa-check text-green-500"></i>
            {feature}
          </li>
        ))}
      </ul>

      {!isCurrentPlan && isPaid && (
        <button
          onClick={onSelect}
          className="w-full bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black py-2 rounded-lg font-bold hover:opacity-90 transition-opacity"
        >
          {plan === 'free' ? 'Downgrade' : 'Upgrade'}
        </button>
      )}

      {isCurrentPlan && isPaid && (
        <button
          onClick={openCustomerPortal}
          className="w-full bg-[#1a1a1a] border border-[#333] text-white py-2 rounded-lg font-medium hover:bg-[#222] transition-colors"
        >
          Manage Subscription
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
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <span className="text-white font-mono">
          {used} / {isUnlimited ? '∞' : total}
        </span>
      </div>
      <div className="h-2 bg-[#222] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 90
              ? 'bg-red-500'
              : percentage > 70
              ? 'bg-yellow-500'
              : 'bg-[#00F2EA]'
          }`}
          style={{ width: `${isUnlimited ? 5 : percentage}%` }}
        />
      </div>
      {percentage > 80 && !isUnlimited && (
        <p className="text-yellow-500 text-xs mt-2">
          ⚠️ You're running low on audits
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
          <div className="w-12 h-12 border-4 border-[#333] border-t-[#00F2EA] rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Billing & Subscription</h1>
          <p className="text-gray-500">Manage your plan and view usage</p>
        </div>

        {/* Current Plan Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#00F2EA]/10 to-purple-900/10 border border-[#00F2EA]/20 rounded-2xl p-6 mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Plan</p>
              <h2 className="text-3xl font-bold text-white capitalize">{subscription.plan}</h2>
              <p className="text-gray-400 mt-1">
                Status:{' '}
                <span
                  className={`capitalize ${
                    subscription.status === 'active'
                      ? 'text-green-400'
                      : subscription.status === 'cancelled'
                      ? 'text-yellow-400'
                      : 'text-gray-400'
                  }`}
                >
                  {subscription.status}
                </span>
              </p>
            </div>
            <div className="text-right">
              {subscription.renewsAt && subscription.status === 'active' && (
                <p className="text-gray-400 text-sm">
                  Renews on {formatDate(subscription.renewsAt)}
                </p>
              )}
              {subscription.endsAt && subscription.status === 'cancelled' && (
                <p className="text-yellow-400 text-sm">
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
          <h3 className="text-lg font-bold text-white mb-4">Choose Your Plan</h3>
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

        {/* Feature Access */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Your Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'PDF Export', enabled: subscription.canExportPdf },
              { label: 'Script Rewrites', enabled: subscription.hasScriptRewrites },
              { label: 'Competitor Analysis', enabled: subscription.hasCompetitorBreakdowns },
              { label: 'Priority Support', enabled: subscription.hasPrioritySupport },
              { label: 'API Access', enabled: subscription.canAccessApi },
              { label: 'White Label', enabled: subscription.hasWhiteLabel },
              { label: 'Team Seats', enabled: subscription.teamSeats > 1, value: subscription.teamSeats },
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  feature.enabled
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-[#1a1a1a] border border-[#333]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <i
                    className={`fa-solid ${
                      feature.enabled ? 'fa-check text-green-500' : 'fa-lock text-gray-500'
                    }`}
                  ></i>
                  <span className={feature.enabled ? 'text-white' : 'text-gray-500'}>
                    {feature.label}
                    {feature.value && ` (${feature.value})`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Actions */}
        <div className="flex flex-wrap gap-4">
          {subscription.plan !== 'free' && (
            <>
              <button
                onClick={openCustomerPortal}
                className="bg-[#1a1a1a] border border-[#333] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#222] transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-credit-card"></i>
                Update Payment Method
              </button>
              <button
                onClick={openCustomerPortal}
                className="bg-[#1a1a1a] border border-[#333] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#222] transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-file-invoice"></i>
                View Invoices
              </button>
            </>
          )}
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <h3 className="text-lg font-bold text-white mb-4">Billing FAQ</h3>
          <div className="space-y-4">
            {[
              {
                q: 'How do I cancel my subscription?',
                a: 'Click "Manage Subscription" above to access the customer portal where you can cancel anytime.',
              },
              {
                q: 'What happens when I cancel?',
                a: "You'll keep access until the end of your billing period. Your data is never deleted.",
              },
              {
                q: 'Can I get a refund?',
                a: 'We offer a 14-day money-back guarantee. Contact support for refunds.',
              },
              {
                q: 'How do I upgrade my plan?',
                a: "Click on the plan you want above. You'll only be charged the prorated difference.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-[#111] border border-[#222] rounded-lg p-4">
                <h4 className="text-white font-medium mb-1">{faq.q}</h4>
                <p className="text-gray-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
