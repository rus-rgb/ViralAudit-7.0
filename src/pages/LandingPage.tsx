import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ==========================================
// BACKGROUND
// ==========================================
const Background = () => (
  <div className="fixed inset-0 z-[-1] bg-black">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px]"></div>
    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#00F2EA]/10 blur-[120px] rounded-full"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full"></div>
  </div>
);

// ==========================================
// NAVBAR
// ==========================================
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10 py-4">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="font-bold text-xl text-white">ViralAudit</Link>
        <div className="flex gap-4 items-center">
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <button onClick={logout} className="text-sm text-gray-300 hover:text-white transition-colors">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link to="/auth?mode=signup" className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// ==========================================
// HERO
// ==========================================
const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (user) {
      navigate('/audit/new');
    } else {
      navigate('/auth?mode=signup');
    }
  };

  return (
    <section className="pt-40 pb-20 px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Stop Guessing.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2EA] to-[#00D4D4]">
            Audit Your Ads Instantly.
          </span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10">
          Upload your video creative and let our AI analyze your hooks, pacing, and copy for viral potential.
        </p>
        <button
          onClick={handleCTA}
          className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,242,234,0.3)] inline-flex items-center gap-2"
        >
          <i className="fa-solid fa-rocket"></i>
          {user ? 'Start New Audit' : 'Get Started Free'}
        </button>
      </motion.div>
    </section>
  );
};

// ==========================================
// FEATURES
// ==========================================
const Features = () => {
  const FeatureCard = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-8 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-colors"
    >
      <div className="w-12 h-12 bg-gradient-to-br from-[#00F2EA]/20 to-[#00F2EA]/5 rounded-xl flex items-center justify-center mb-6 text-xl text-[#00F2EA]">
        <i className={icon}></i>
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </motion.div>
  );

  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-6">
        <FeatureCard icon="fa-solid fa-list-check" title="Frame-by-Frame" desc="Detailed breakdown of your hook, body, and CTA with timestamp references." />
        <FeatureCard icon="fa-solid fa-wand-magic-sparkles" title="Actionable Fixes" desc="Don't just get a score. Get a specific 'Fix List' to improve ROAS." />
        <FeatureCard icon="fa-solid fa-shield-halved" title="Secure & Private" desc="Your creatives are analyzed and discarded. We never train on your data." />
      </div>
    </section>
  );
};

// ==========================================
// PRICING
// ==========================================
const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (user) {
      navigate('/audit/new');
    } else {
      navigate('/auth?mode=signup');
    }
  };

  return (
    <section id="pricing" className="py-20 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-white mb-10">Simple Pricing</h2>
        <div className="inline-block p-4 mb-10 rounded-lg bg-[#1a1a1a] border border-[#333]">
          <span className="text-xs font-bold text-[#00F2EA] uppercase mr-2">Free Plan</span>
          <span className="text-sm text-gray-400">Includes 3 free audits per account.</span>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div className="bg-[#0a0a0a] p-8 rounded-2xl border border-white/10 text-left hover:border-white/20 transition-colors">
            <h3 className="text-xl font-bold text-white">Starter</h3>
            <p className="text-4xl font-bold text-white my-4">$29<span className="text-sm text-gray-500">/mo</span></p>
            <button onClick={handleCTA} className="w-full border border-white/20 text-white py-3 rounded-lg mb-6 hover:bg-white/5 transition-colors">
              Get Started
            </button>
            <ul className="text-gray-400 space-y-2 text-sm">
              <li><i className="fa-solid fa-check text-green-500 mr-2"></i>50 Audits/mo</li>
              <li><i className="fa-solid fa-check text-green-500 mr-2"></i>Basic Analysis</li>
            </ul>
          </div>
          <div className="bg-[#0f0f0f] p-8 rounded-2xl border border-[#00F2EA]/30 shadow-[0_0_30px_rgba(0,242,234,0.1)] relative text-left">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">POPULAR</div>
            <h3 className="text-xl font-bold text-white">Pro</h3>
            <p className="text-4xl font-bold text-white my-4">$49<span className="text-sm text-gray-500">/mo</span></p>
            <button onClick={handleCTA} className="w-full bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black py-3 rounded-lg mb-6 font-bold hover:opacity-90 transition-opacity">
              Start Pro Trial
            </button>
            <ul className="text-gray-400 space-y-2 text-sm">
              <li><i className="fa-solid fa-check text-green-500 mr-2"></i>500 Audits/mo</li>
              <li><i className="fa-solid fa-check text-green-500 mr-2"></i>Deep Analysis</li>
              <li><i className="fa-solid fa-check text-green-500 mr-2"></i>Script Rewrites</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

// ==========================================
// LANDING PAGE
// ==========================================
const LandingPage = () => {
  return (
    <div className="min-h-screen text-white font-sans selection:bg-[#00F2EA]/30">
      <Background />
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <footer className="py-10 text-center text-gray-600 text-xs border-t border-white/5">
        © 2025 ViralAudit Inc. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
