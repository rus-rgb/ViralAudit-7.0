// ==========================================
// TIKTOK PIXEL TRACKING
// ==========================================

declare global {
  interface Window {
    ttq: {
      track: (event: string, params?: Record<string, any>) => void;
      identify: (params: Record<string, any>) => void;
      page: () => void;
    };
  }
}

// SHA-256 hash function for PII data
async function hashSHA256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Identify user (call before events when you have user data)
export const identifyUser = async (email?: string, externalId?: string) => {
  if (typeof window !== 'undefined' && window.ttq && (email || externalId)) {
    const identifyData: Record<string, string> = {};
    
    if (email) {
      identifyData.email = await hashSHA256(email.toLowerCase());
    }
    if (externalId) {
      identifyData.external_id = await hashSHA256(externalId);
    }
    
    window.ttq.identify(identifyData);
    console.log('🎯 TikTok: User identified');
  }
};

// Track CompleteRegistration (Sign Up)
export const trackSignUp = (email?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    // Identify user first
    if (email) {
      identifyUser(email);
    }
    
    window.ttq.track('CompleteRegistration', {
      contents: [
        {
          content_id: 'signup',
          content_type: 'product',
          content_name: 'ViralAudit Account'
        }
      ],
      value: 0,
      currency: 'USD'
    });
    
    console.log('🎯 TikTok: CompleteRegistration tracked');
  }
};

// Track InitiateCheckout (Click upgrade button)
export const trackInitiateCheckout = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('InitiateCheckout', {
      contents: [
        {
          content_id: plan,
          content_type: 'product',
          content_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`
        }
      ],
      value: value,
      currency: 'USD'
    });
    
    console.log('🎯 TikTok: InitiateCheckout tracked', { plan, value });
  }
};

// Track Subscribe (when subscription is activated)
export const trackSubscribe = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('Subscribe', {
      contents: [
        {
          content_id: plan,
          content_type: 'product',
          content_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`
        }
      ],
      value: value,
      currency: 'USD'
    });
    
    console.log('🎯 TikTok: Subscribe tracked', { plan, value });
  }
};

// Track Purchase (payment completed)
export const trackPurchase = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('Purchase', {
      contents: [
        {
          content_id: plan,
          content_type: 'product',
          content_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`
        }
      ],
      value: value,
      currency: 'USD'
    });
    
    console.log('🎯 TikTok: Purchase tracked', { plan, value });
  }
};

// Track ViewContent (View pricing/plan details)
export const trackViewContent = (contentId: string, contentName: string, value?: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('ViewContent', {
      contents: [
        {
          content_id: contentId,
          content_type: 'product',
          content_name: contentName
        }
      ],
      value: value || 0,
      currency: 'USD'
    });
    
    console.log('🎯 TikTok: ViewContent tracked', contentName);
  }
};

// Track ClickButton (CTA clicks)
export const trackClickButton = (buttonName: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('ClickButton', {
      contents: [
        {
          content_id: buttonName,
          content_type: 'product',
          content_name: buttonName
        }
      ],
      value: 0,
      currency: 'USD'
    });
    
    console.log('🎯 TikTok: ClickButton tracked', buttonName);
  }
};

// Track StartTrial (first audit)
export const trackStartTrial = () => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('StartTrial', {
      contents: [
        {
          content_id: 'free_audit',
          content_type: 'product',
          content_name: 'Free Audit Trial'
        }
      ],
      value: 0,
      currency: 'USD'
    });
    
    console.log('🎯 TikTok: StartTrial tracked');
  }
};
