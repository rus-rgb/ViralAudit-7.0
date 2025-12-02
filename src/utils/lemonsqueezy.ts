// ==========================================
// LEMON SQUEEZY CHECKOUT UTILITIES
// ==========================================

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void;
      };
      Setup: (options: { eventHandler: (event: LemonSqueezyEvent) => void }) => void;
    };
  }
}

interface LemonSqueezyEvent {
  event: 'Checkout.Success' | 'Checkout.Close' | 'PaymentMethodUpdate.Close';
  data?: any;
}

// ==========================================
// CONFIGURATION
// ==========================================

// Store is approved and ready
const STORE_IS_READY = true;

// Lemon Squeezy checkout URLs
const CHECKOUT_URLS: Record<string, string> = {
  solo: 'https://viralaudit-ai.lemonsqueezy.com/buy/ef67a047-4604-42b4-b8f1-3e640c9268e8',
  pro: 'https://viralaudit-ai.lemonsqueezy.com/buy/e95826a6-eef0-4384-832c-00b301196937',
  agency: 'https://viralaudit-ai.lemonsqueezy.com/buy/ffee3f7c-2894-45c4-914b-07ada34bc2d2',
};

// Plan details for display
export const PLAN_DETAILS = {
  free: {
    name: 'Free',
    price: 0,
    auditsPerMonth: 3,
    features: ['3 audits per month', 'Basic analysis', 'Community support'],
  },
  solo: {
    name: 'Solo',
    price: 49,
    auditsPerMonth: 30,
    features: ['30 audits per month', 'Full creative analysis', 'Hook & CTA scoring', 'PDF exports', 'Email support'],
  },
  pro: {
    name: 'Pro',
    price: 99,
    auditsPerMonth: 100,
    features: ['100 audits per month', 'Everything in Solo', 'Script rewrites', 'Competitor breakdowns', 'Priority support'],
  },
  agency: {
    name: 'Agency',
    price: 199,
    auditsPerMonth: 999999, // Unlimited
    features: ['Unlimited audits', 'Everything in Pro', 'White-label reports', 'Team collaboration', 'API access', 'Priority support'],
  },
};

export type PlanType = keyof typeof PLAN_DETAILS;

// ==========================================
// INITIALIZE LEMON SQUEEZY
// Call this once when your app loads
// ==========================================
export const initLemonSqueezy = (onSuccess?: () => void) => {
  // Initialize Lemon Squeezy
  if (window.createLemonSqueezy) {
    window.createLemonSqueezy();
  }

  // Set up event handlers
  if (window.LemonSqueezy?.Setup) {
    window.LemonSqueezy.Setup({
      eventHandler: (event: LemonSqueezyEvent) => {
        switch (event.event) {
          case 'Checkout.Success':
            console.log('🎉 Checkout successful!', event.data);
            onSuccess?.();
            break;
          case 'Checkout.Close':
            console.log('Checkout closed');
            break;
          case 'PaymentMethodUpdate.Close':
            console.log('Payment method update closed');
            break;
        }
      },
    });
  }
};

// ==========================================
// OPEN CHECKOUT
// ==========================================
export const openCheckout = (
  plan: 'solo' | 'pro' | 'agency',
  userId: string,
  email: string,
  options?: {
    name?: string;
    discountCode?: string;
  }
) => {
  const baseUrl = CHECKOUT_URLS[plan];
  
  if (!baseUrl || baseUrl.includes('REPLACE_')) {
    console.error('⚠️ Checkout URL not configured for plan:', plan);
    alert('Payment not configured yet. Please contact support.');
    return;
  }

  // Build checkout URL with custom data
  const checkoutUrl = new URL(baseUrl);
  
  // Pass user data that will be included in webhooks
  checkoutUrl.searchParams.set('checkout[custom][user_id]', userId);
  checkoutUrl.searchParams.set('checkout[email]', email);
  
  // Optional: pre-fill customer name
  if (options?.name) {
    checkoutUrl.searchParams.set('checkout[name]', options.name);
  }
  
  // Optional: apply discount code
  if (options?.discountCode) {
    checkoutUrl.searchParams.set('checkout[discount_code]', options.discountCode);
  }

  console.log('🍋 Opening Lemon Squeezy checkout:', checkoutUrl.toString());

  // Open in new tab (more reliable than overlay)
  window.open(checkoutUrl.toString(), '_blank');
};

// ==========================================
// GET CHECKOUT URL (for custom implementations)
// ==========================================
export const getCheckoutUrl = (
  plan: 'solo' | 'pro' | 'agency',
  userId: string,
  email: string
): string => {
  const baseUrl = CHECKOUT_URLS[plan];
  const checkoutUrl = new URL(baseUrl);
  
  checkoutUrl.searchParams.set('embed', '1');
  checkoutUrl.searchParams.set('checkout[custom][user_id]', userId);
  checkoutUrl.searchParams.set('checkout[email]', email);
  
  return checkoutUrl.toString();
};

// ==========================================
// OPEN CUSTOMER PORTAL
// For managing subscriptions, updating payment, viewing invoices
// ==========================================
export const openCustomerPortal = () => {
  window.open('https://app.lemonsqueezy.com/my-orders', '_blank');
};

// ==========================================
// HELPER: Check if Lemon Squeezy is loaded
// ==========================================
export const isLemonSqueezyReady = (): boolean => {
  return typeof window.LemonSqueezy !== 'undefined';
};
