// Lemon Squeezy checkout utilities

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void;
      };
    };
  }
}

// Your checkout URLs (replace with your actual URLs)
const CHECKOUT_URLS = {
  solo: 'https://viralaudit.lemonsqueezy.com/checkout/buy/YOUR_SOLO_VARIANT?embed=1',
  pro: 'https://viralaudit.lemonsqueezy.com/checkout/buy/YOUR_PRO_VARIANT?embed=1',
  agency: 'https://viralaudit.lemonsqueezy.com/checkout/buy/YOUR_AGENCY_VARIANT?embed=1',
};

export const openCheckout = (plan: 'solo' | 'pro' | 'agency', userId: string, email: string) => {
  // Initialize Lemon Squeezy if needed
  if (window.createLemonSqueezy) {
    window.createLemonSqueezy();
  }

  // Build checkout URL with custom data
  const baseUrl = CHECKOUT_URLS[plan];
  const checkoutUrl = new URL(baseUrl);
  
  // Pass user data to webhook via checkout_data
  checkoutUrl.searchParams.set('checkout[custom][user_id]', userId);
  checkoutUrl.searchParams.set('checkout[email]', email);
  
  // Open the checkout overlay
  if (window.LemonSqueezy?.Url) {
    window.LemonSqueezy.Url.Open(checkoutUrl.toString());
  } else {
    // Fallback: open in new tab
    window.open(checkoutUrl.toString(), '_blank');
  }
};

export const getCheckoutUrl = (plan: 'solo' | 'pro' | 'agency', userId: string, email: string): string => {
  const baseUrl = CHECKOUT_URLS[plan];
  const checkoutUrl = new URL(baseUrl);
  checkoutUrl.searchParams.set('checkout[custom][user_id]', userId);
  checkoutUrl.searchParams.set('checkout[email]', email);
  return checkoutUrl.toString();
};
