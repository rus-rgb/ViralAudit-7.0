// ==========================================
// TIKTOK PIXEL HELPER
// ==========================================

declare global {
  interface Window {
    ttq: any;
  }
}

/**
 * Track a TikTok Pixel event
 */
export const trackTikTokEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track(eventName, params);
    console.log(`[TikTok Pixel] Tracked: ${eventName}`, params);
  }
};

/**
 * Track signup/registration
 */
export const trackSignup = (email?: string) => {
  trackTikTokEvent('CompleteRegistration', {
    content_name: 'signup',
    email: email,
  });
};

/**
 * Track when user starts an audit
 */
export const trackStartAudit = () => {
  trackTikTokEvent('InitiateCheckout', {
    content_name: 'start_audit',
  });
};

/**
 * Track when audit is completed
 */
export const trackAuditComplete = (score: number) => {
  trackTikTokEvent('ViewContent', {
    content_name: 'audit_complete',
    content_id: 'audit',
    value: score,
  });
};

/**
 * Track subscription purchase
 */
export const trackPurchase = (plan: string, price: number) => {
  trackTikTokEvent('CompletePayment', {
    content_name: plan,
    content_type: 'subscription',
    value: price,
    currency: 'USD',
  });
};

/**
 * Track button clicks
 */
export const trackButtonClick = (buttonName: string) => {
  trackTikTokEvent('ClickButton', {
    content_name: buttonName,
  });
};
