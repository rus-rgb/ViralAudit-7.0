// ==========================================
// TIKTOK PIXEL HELPER
// ==========================================

declare global {
  interface Window {
    ttq: any;
  }
}

/**
 * Hash a string using SHA-256 (for PII data)
 */
const hashSHA256 = async (str: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(str.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Identify user with hashed PII data
 */
export const identifyUser = async (email?: string, userId?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    const identifyData: Record<string, string> = {};
    
    if (email) {
      identifyData.email = await hashSHA256(email);
    }
    if (userId) {
      identifyData.external_id = await hashSHA256(userId);
    }
    
    if (Object.keys(identifyData).length > 0) {
      window.ttq.identify(identifyData);
      console.log('[TikTok Pixel] Identified user');
    }
  }
};

/**
 * Track ViewContent - when user views audit results
 */
export const trackViewContent = (contentName: string, value?: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('ViewContent', {
      contents: [
        {
          content_id: 'audit_result',
          content_type: 'product',
          content_name: contentName,
        }
      ],
      value: value || 0,
      currency: 'USD',
    });
    console.log('[TikTok Pixel] ViewContent:', contentName);
  }
};

/**
 * Track InitiateCheckout - when user starts an audit or clicks pricing
 */
export const trackInitiateCheckout = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('InitiateCheckout', {
      contents: [
        {
          content_id: plan,
          content_type: 'product',
          content_name: `ViralAudit ${plan} Plan`,
        }
      ],
      value: value,
      currency: 'USD',
    });
    console.log('[TikTok Pixel] InitiateCheckout:', plan, value);
  }
};

/**
 * Track CompleteRegistration - when user signs up
 */
export const trackCompleteRegistration = () => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('CompleteRegistration', {
      contents: [
        {
          content_id: 'signup',
          content_type: 'product',
          content_name: 'ViralAudit Account',
        }
      ],
      value: 0,
      currency: 'USD',
    });
    console.log('[TikTok Pixel] CompleteRegistration');
  }
};

/**
 * Track AddToCart - when user selects a plan
 */
export const trackAddToCart = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('AddToCart', {
      contents: [
        {
          content_id: plan,
          content_type: 'product',
          content_name: `ViralAudit ${plan} Plan`,
        }
      ],
      value: value,
      currency: 'USD',
    });
    console.log('[TikTok Pixel] AddToCart:', plan, value);
  }
};

/**
 * Track Purchase - when user completes subscription
 */
export const trackPurchase = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('Purchase', {
      contents: [
        {
          content_id: plan,
          content_type: 'product',
          content_name: `ViralAudit ${plan} Plan`,
        }
      ],
      value: value,
      currency: 'USD',
    });
    console.log('[TikTok Pixel] Purchase:', plan, value);
  }
};

/**
 * Track PlaceAnOrder - when user clicks subscribe button
 */
export const trackPlaceAnOrder = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('PlaceAnOrder', {
      contents: [
        {
          content_id: plan,
          content_type: 'product',
          content_name: `ViralAudit ${plan} Plan`,
        }
      ],
      value: value,
      currency: 'USD',
    });
    console.log('[TikTok Pixel] PlaceAnOrder:', plan, value);
  }
};

/**
 * Track AddPaymentInfo - when user enters payment details
 */
export const trackAddPaymentInfo = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('AddPaymentInfo', {
      contents: [
        {
          content_id: plan,
          content_type: 'product',
          content_name: `ViralAudit ${plan} Plan`,
        }
      ],
      value: value,
      currency: 'USD',
    });
    console.log('[TikTok Pixel] AddPaymentInfo:', plan, value);
  }
};
