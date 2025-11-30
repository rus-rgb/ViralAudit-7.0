import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth, supabase } from './AuthContext';

interface SubscriptionState {
  plan: 'free' | 'solo' | 'pro' | 'agency';
  status: 'free' | 'active' | 'cancelled' | 'past_due' | 'expired';
  renewsAt: string | null;
  endsAt: string | null;
  loading: boolean;
  // Limits based on plan
  auditsPerMonth: number;
  canExportPdf: boolean;
  canAccessApi: boolean;
  hasWhiteLabel: boolean;
}

const PLAN_LIMITS = {
  free: { auditsPerMonth: 3, canExportPdf: false, canAccessApi: false, hasWhiteLabel: false },
  solo: { auditsPerMonth: 30, canExportPdf: true, canAccessApi: false, hasWhiteLabel: false },
  pro: { auditsPerMonth: 100, canExportPdf: true, canAccessApi: false, hasWhiteLabel: false },
  agency: { auditsPerMonth: 999999, canExportPdf: true, canAccessApi: true, hasWhiteLabel: true },
};

const SubscriptionContext = createContext<SubscriptionState | null>(null);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>({
    plan: 'free',
    status: 'free',
    renewsAt: null,
    endsAt: null,
    loading: true,
    ...PLAN_LIMITS.free,
  });

  useEffect(() => {
    if (!user || !supabase) {
      setSubscription(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan, subscription_renews_at, subscription_ends_at')
        .eq('id', user.id)
        .single();

      if (data) {
        const plan = (data.subscription_plan || 'free') as keyof typeof PLAN_LIMITS;
        setSubscription({
          plan,
          status: data.subscription_status || 'free',
          renewsAt: data.subscription_renews_at,
          endsAt: data.subscription_ends_at,
          loading: false,
          ...PLAN_LIMITS[plan],
        });
      } else {
        setSubscription(prev => ({ ...prev, loading: false }));
      }
    };

    fetchSubscription();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, fetchSubscription)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
