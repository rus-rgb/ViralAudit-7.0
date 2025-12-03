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

// Track CompleteRegistration (Sign Up)
export const trackSignUp = (email?: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('CompleteRegistration', {
      content_name: 'signup',
      status: 'success',
    });
    
    // Identify user by email if available
    if (email) {
      window.ttq.identify({
        email: email,
      });
    }
    
    console.log('🎯 TikTok: CompleteRegistration tracked');
  }
};

// Track InitiateCheckout (Click upgrade button)
export const trackInitiateCheckout = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('InitiateCheckout', {
      content_type: 'product',
      content_id: plan,
      content_name: `${plan} Plan`,
      value: value,
      currency: 'USD',
    });
    
    console.log('🎯 TikTok: InitiateCheckout tracked', { plan, value });
  }
};

// Track AddToCart (Optional - when user shows interest)
export const trackAddToCart = (plan: string, value: number) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('AddToCart', {
      content_type: 'product',
      content_id: plan,
      content_name: `${plan} Plan`,
      value: value,
      currency: 'USD',
    });
    
    console.log('🎯 TikTok: AddToCart tracked', { plan, value });
  }
};

// Track ViewContent (View pricing/plan details)
export const trackViewContent = (contentName: string) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('ViewContent', {
      content_name: contentName,
    });
    
    console.log('🎯 TikTok: ViewContent tracked', contentName);
  }
};

// Track SubmitForm (Start first audit)
export const trackSubmitForm = () => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track('SubmitForm', {
      content_name: 'new_audit',
    });
    
    console.log('🎯 TikTok: SubmitForm tracked');
  }
};

// Track custom event
export const trackCustomEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track(eventName, params);
    console.log(`🎯 TikTok: ${eventName} tracked`, params);
  }
};
