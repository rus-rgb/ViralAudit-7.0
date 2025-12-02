// ==========================================
// SUBSCRIPTION CONTEXT
// Manages user subscription state and plan limits
// ==========================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth, supabase } from './AuthContext';

// ==========================================
// TYPES
// ==========================================
type PlanType = 'free' | 'solo' | 'pro' | 'agency';

interface SubscriptionState {
  // Current plan info
  plan: PlanType;
  status: 'free' | 'active' | 'cancelled' | 'past_due' | 'expired' | 'on_trial';
  
  // Dates
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  
  // Lemon Squeezy IDs (for API calls)
  customerId: string | null;
  subscriptionId: string | null;
  
  // Computed limits
  auditsPerMonth: number;
  auditsRemaining: number;
  canExportPdf: boolean;
  canAccessApi: boolean;
  hasWhiteLabel: boolean;
  hasScriptRewrites: boolean;
  hasCompetitorBreakdowns: boolean;
  hasPrioritySupport: boolean;
  teamSeats: number;
  
  // State
  loading: boolean;
  
  // Actions
  refresh: () => Promise<void>;
}

// ==========================================
// PLAN LIMITS
// ==========================================
const PLAN_LIMITS = {
  free: {
    auditsPerMonth: 3,
    canExportPdf: false,
    canAccessApi: false,
    hasWhiteLabel: false,
    hasScriptRewrites: false,
    hasCompetitorBreakdowns: false,
    hasPrioritySupport: false,
    teamSeats: 1,
  },
  solo: {
    auditsPerMonth: 30,
    canExportPdf: true,
    canAccessApi: false,
    hasWhiteLabel: false,
    hasScriptRewrites: false,
    hasCompetitorBreakdowns: false,
    hasPrioritySupport: false,
    teamSeats: 1,
  },
  pro: {
    auditsPerMonth: 100,
    canExportPdf: true,
    canAccessApi: false,
    hasWhiteLabel: false,
    hasScriptRewrites: true,
    hasCompetitorBreakdowns: true,
    hasPrioritySupport: true,
    teamSeats: 1,
  },
  agency: {
    auditsPerMonth: 999999, // Unlimited
    canExportPdf: true,
    canAccessApi: true,
    hasWhiteLabel: true,
    hasScriptRewrites: true,
    hasCompetitorBreakdowns: true,
    hasPrioritySupport: true,
    teamSeats: 5,
  },
};

// ==========================================
// DEFAULT STATE
// ==========================================
const DEFAULT_STATE: SubscriptionState = {
  plan: 'free',
  status: 'free',
  renewsAt: null,
  endsAt: null,
  trialEndsAt: null,
  customerId: null,
  subscriptionId: null,
  auditsPerMonth: 3,
  auditsRemaining: 3,
  loading: true,
  ...PLAN_LIMITS.free,
  refresh: async () => {},
};

// ==========================================
// CONTEXT
// ==========================================
const SubscriptionContext = createContext<SubscriptionState>(DEFAULT_STATE);

// ==========================================
// PROVIDER
// ==========================================
export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, stats } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_STATE);

  const fetchSubscription = useCallback(async () => {
    if (!user || !supabase) {
      setSubscription(prev => ({ 
        ...DEFAULT_STATE, 
        loading: false,
        refresh: fetchSubscription 
      }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Default to free plan
      let plan: PlanType = 'free';
      let status = 'free';
      let renewsAt = null;
      let endsAt = null;
      let customerId = null;
      let subscriptionId = null;

      // If we have data and the subscription columns exist, use them
      if (data && !error) {
        // Check both 'plan' and 'subscription_plan' columns (webhook updates both)
        plan = (data.plan || data.subscription_plan || 'free') as PlanType;
        status = data.subscription_status || 'free';
        renewsAt = data.subscription_renews_at || null;
        endsAt = data.subscription_ends_at || null;
        customerId = data.lemonsqueezy_customer_id || null;
        subscriptionId = data.lemonsqueezy_subscription_id || null;
      }

      // Get limits for this plan
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      
      // Calculate audits remaining
      const auditsUsedThisMonth = stats?.audits_this_month || 0;
      const auditsRemaining = Math.max(0, limits.auditsPerMonth - auditsUsedThisMonth);

      setSubscription({
        plan,
        status: status as SubscriptionState['status'],
        renewsAt,
        endsAt,
        trialEndsAt: null,
        customerId,
        subscriptionId,
        auditsPerMonth: limits.auditsPerMonth,
        auditsRemaining,
        loading: false,
        ...limits,
        refresh: fetchSubscription,
      });
    } catch (err) {
      console.warn('Error fetching subscription (columns may not exist yet):', err);
      // Fall back to free plan with default limits
      const limits = PLAN_LIMITS.free;
      const auditsUsedThisMonth = stats?.audits_this_month || 0;
      const auditsRemaining = Math.max(0, limits.auditsPerMonth - auditsUsedThisMonth);
      
      setSubscription({
        ...DEFAULT_STATE,
        auditsRemaining,
        loading: false,
        refresh: fetchSubscription,
      });
    }
  }, [user, stats]);

  // Fetch subscription on mount and when user changes
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// ==========================================
// HOOK
// ==========================================
export const useSubscription = (): SubscriptionState => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    // Return default state if used outside provider
    return DEFAULT_STATE;
  }
  return context;
};
