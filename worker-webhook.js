// Lemon Squeezy Webhook Handler
// Deploy this as a separate Cloudflare Worker

import { createClient } from '@supabase/supabase-js';

const WEBHOOK_SECRET = 'YOUR_WEBHOOK_SECRET'; // Set in environment

// Verify webhook signature
async function verifySignature(payload, signature, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return signature === expectedSignature;
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = request.headers.get('X-Signature');
    const payload = await request.text();
    
    // Verify signature
    const isValid = await verifySignature(payload, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const data = JSON.parse(payload);
    const eventName = data.meta.event_name;
    const customData = data.meta.custom_data || {};
    const subscriptionData = data.data.attributes;

    // Initialize Supabase
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

    // Get user ID from custom data (passed during checkout)
    const userId = customData.user_id;
    
    if (!userId) {
      console.error('No user_id in webhook custom_data');
      return new Response('OK', { status: 200 });
    }

    // Handle different events
    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
        await supabase.from('profiles').update({
          subscription_status: subscriptionData.status, // 'active', 'cancelled', 'expired', etc.
          subscription_plan: getPlanFromVariant(subscriptionData.variant_id),
          lemonsqueezy_customer_id: subscriptionData.customer_id.toString(),
          lemonsqueezy_subscription_id: data.data.id,
          subscription_renews_at: subscriptionData.renews_at,
          subscription_ends_at: subscriptionData.ends_at,
        }).eq('id', userId);
        break;

      case 'subscription_cancelled':
        await supabase.from('profiles').update({
          subscription_status: 'cancelled',
          subscription_ends_at: subscriptionData.ends_at,
        }).eq('id', userId);
        break;

      case 'subscription_payment_failed':
        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('id', userId);
        break;

      case 'subscription_expired':
        await supabase.from('profiles').update({
          subscription_status: 'expired',
          subscription_plan: null,
        }).eq('id', userId);
        break;
    }

    return new Response('OK', { status: 200 });
  }
};

function getPlanFromVariant(variantId) {
  const plans = {
    'SOLO_VARIANT_ID': 'solo',
    'PRO_VARIANT_ID': 'pro',
    'AGENCY_VARIANT_ID': 'agency',
  };
  return plans[variantId] || 'unknown';
}
