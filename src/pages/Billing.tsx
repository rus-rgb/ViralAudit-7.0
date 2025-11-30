import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import DashboardLayout from '../components/DashboardLayout';

const Billing = () => {
  const { user } = useAuth();
  const subscription = useSubscription();

  const openCustomerPortal = () => {
    // Lemon Squeezy provides a customer portal URL
    // You can get this from the subscription webhook data
    window.open('https://app.lemonsqueezy.com/my-orders', '_blank');
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Billing</h1>
        
        <div className="bg-[#111] border border-[#222] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Current Plan</h2>
          <p className="text-3xl font-bold text-[#00F2EA] capitalize">{subscription.plan}</p>
          <p className="text-gray-400 mt-2">
            Status: <span className="capitalize">{subscription.status}</span>
          </p>
          {subscription.renewsAt && (
            <p className="text-gray-400">
              Renews: {new Date(subscription.renewsAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={openCustomerPortal}
            className="bg-[#1a1a1a] border border-[#333] text-white px-6 py-3 rounded-lg"
          >
            Manage Subscription
          </button>
          {subscription.plan !== 'agency' && (
            <button
              onClick={() => openCheckout('agency', user!.id, user!.email || '')}
              className="bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black px-6 py-3 rounded-lg font-bold"
            >
              Upgrade Plan
            </button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
