import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { openCheckout } from "../utils/lemonsqueezy";

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
    <section className="pt-32 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#00F2EA]/10 border border-[#00F2EA]/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-[#00F2EA] rounded-full animate-pulse"></span>
              <span className="text-[#00F2EA] text-sm font-medium">Free: 3 audits, no credit card</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Your Ads Are Failing.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2EA] to-[#00D4D4]">
                Find Out Why in 60 Seconds.
              </span>
            </h1>
            
            <p className="text-gray-400 text-lg md:text-xl mb-8 leading-relaxed">
              Upload your video ad. Get brutal, timestamp-specific feedback on your hook, pacing, copy, and CTA. Know exactly what to fix.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <button
                onClick={handleCTA}
                className="bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,242,234,0.3)] inline-flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-bolt"></i>
                Get Your Free Audit
              </button>
              <a
                href="#demo"
                className="border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition-colors inline-flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-play"></i>
                See Example
              </a>
            </div>
            
            {/* Trust */}
            <p className="text-gray-500 text-sm">
              <i className="fa-solid fa-check text-green-500 mr-2"></i>
              Works with TikTok, Meta, YouTube ads
              <span className="mx-3">•</span>
              <i className="fa-solid fa-check text-green-500 mr-2"></i>
              Results in 60 seconds
            </p>
          </motion.div>
          
          {/* Right: Demo/Visual */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Actual Screenshot */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#222]">
              <img 
                src="/audit-example.png" 
                alt="ViralAudit analysis example showing a score of 5 with detailed feedback on visuals, audio, copy, and captions"
                className="w-full h-auto"
              />
              {/* Subtle gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/50 to-transparent"></div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#00F2EA]/20 blur-3xl rounded-full"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full"></div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// ==========================================
// HOW IT WORKS
// ==========================================
const HowItWorks = () => {
  const steps = [
    {
      num: "1",
      title: "Upload Your Ad",
      desc: "Drag and drop any video ad. We support MP4, MOV, WebM up to 500MB.",
      icon: "fa-cloud-arrow-up"
    },
    {
      num: "2", 
      title: "AI Analyzes Everything",
      desc: "Our AI watches your ad like a $50k/month creative strategist. Every frame, every word.",
      icon: "fa-brain"
    },
    {
      num: "3",
      title: "Get Brutal Feedback",
      desc: "Timestamp-specific fixes. Not 'improve your hook' but 'At 0:02, cut the logo and start with the problem.'",
      icon: "fa-list-check"
    }
  ];

  return (
    <section id="demo" className="py-20 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Get actionable feedback in 60 seconds. No fluff, no generic advice.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-[#00F2EA]/50 to-transparent"></div>
              )}
              
              <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-[#00F2EA]/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00F2EA] to-[#00D4D4] rounded-xl flex items-center justify-center text-black font-bold text-xl">
                    {step.num}
                  </div>
                  <div className="w-10 h-10 bg-[#111] rounded-lg flex items-center justify-center text-[#00F2EA]">
                    <i className={`fa-solid ${step.icon}`}></i>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ==========================================
// FEATURES
// ==========================================
const Features = () => {
  const features = [
    {
      icon: "fa-solid fa-clock",
      title: "60-Second Results", 
      desc: "Upload, wait a minute, get your full analysis. No scheduling calls, no waiting days."
    },
    {
      icon: "fa-solid fa-crosshairs",
      title: "Timestamp-Specific Fixes",
      desc: "'At 0:03, your text is unreadable.' Not vague advice - exact moments to fix."
    },
    {
      icon: "fa-solid fa-pen-nib",
      title: "Script Rewrites",
      desc: "Get an improved version of your script. See exactly what to change and why."
    },
    {
      icon: "fa-solid fa-closed-captioning",
      title: "Caption Analysis",
      desc: "85% watch on mute. We check if your captions are readable, timed right, and effective."
    },
    {
      icon: "fa-solid fa-file-pdf",
      title: "PDF Reports",
      desc: "Download professional reports to share with clients or your team."
    },
    {
      icon: "fa-solid fa-shield-halved",
      title: "100% Private",
      desc: "Your videos are analyzed and immediately deleted. We never store or train on your content."
    }
  ];

  return (
    <section id="features" className="py-20 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything You Need to Fix Bad Ads
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Stop guessing why your ads aren't working. Get specific, actionable fixes.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#00F2EA]/20 to-[#00F2EA]/5 rounded-xl flex items-center justify-center mb-4 text-xl text-[#00F2EA]">
                <i className={feature.icon}></i>
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
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

  // Handle subscription button click
  const handleSubscribe = (plan: 'solo' | 'pro' | 'agency') => {
    if (!user) {
      // Not logged in - send to signup first, then they can subscribe
      navigate(`/auth?mode=signup&redirect=/billing`);
      return;
    }
    
    // User is logged in - open Lemon Squeezy checkout overlay
    openCheckout(plan, user.id, user.email || '');
  };

  // Handle free trial (just go to signup or new audit)
  const handleFreeTrial = () => {
    if (user) {
      navigate('/audit/new');
    } else {
      navigate('/auth?mode=signup');
    }
  };

  const PricingCard = ({ 
    name, 
    price, 
    period = '/mo',
    description,
    features, 
    isPopular = false,
    buttonText = 'Get Started',
    buttonStyle = 'outline',
    planKey
  }: {
    name: string;
    price: string;
    period?: string;
    description: string;
    features: string[];
    isPopular?: boolean;
    buttonText?: string;
    buttonStyle?: 'outline' | 'solid';
    planKey: 'solo' | 'pro' | 'agency';
  }) => (
    <div className={`p-8 rounded-2xl text-left relative ${
      isPopular 
        ? 'bg-[#0f0f0f] border-2 border-[#00F2EA]/50 shadow-[0_0_40px_rgba(0,242,234,0.15)]' 
        : 'bg-[#0a0a0a] border border-white/10 hover:border-white/20'
    } transition-all`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black text-xs font-bold px-4 py-1 rounded-full">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-xl font-bold text-white">{name}</h3>
      <p className="text-gray-500 text-sm mt-1 mb-4">{description}</p>
      <p className="text-4xl font-bold text-white mb-6">
        {price}<span className="text-sm text-gray-500 font-normal">{period}</span>
      </p>
      <button 
        onClick={() => handleSubscribe(planKey)}
        className={`w-full py-3 rounded-lg mb-6 font-bold transition-all ${
          buttonStyle === 'solid'
            ? 'bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black hover:opacity-90'
            : 'border border-white/20 text-white hover:bg-white/5'
        }`}
      >
        {buttonText}
      </button>
      <ul className="space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="text-gray-400 text-sm flex items-start gap-2">
            <i className="fa-solid fa-check text-green-500 mt-0.5"></i>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section id="pricing" className="py-20 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Invest in Better Ads</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            One bad ad can waste thousands in ad spend. Our AI catches issues before you burn your budget.
          </p>
          <div className="inline-block mt-6 p-3 rounded-lg bg-[#1a1a1a] border border-[#333]">
            <span className="text-xs font-bold text-[#00F2EA] uppercase mr-2">✨ Free Trial</span>
            <span className="text-sm text-gray-400">Start with 3 free audits. No credit card required.</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <PricingCard
            name="Solo"
            price="$49"
            description="For freelancers & small brands"
            buttonText="Start Free Trial"
            planKey="solo"
            features={[
              "30 audits per month",
              "Full creative analysis",
              "Hook & CTA scoring",
              "Actionable fix lists",
              "Email support",
            ]}
          />
          <PricingCard
            name="Pro"
            price="$99"
            description="For growing brands & teams"
            isPopular={true}
            buttonText="Start Free Trial"
            buttonStyle="solid"
            planKey="pro"
            features={[
              "100 audits per month",
              "Everything in Solo, plus:",
              "PDF report exports",
              "Script rewrite suggestions",
              "Competitor ad breakdowns",
              "Priority support",
            ]}
          />
          <PricingCard
            name="Agency"
            price="$199"
            description="For agencies & heavy users"
            buttonText="Start Free Trial"
            planKey="agency"
            features={[
              "Unlimited audits",
              "Everything in Pro, plus:",
              "White-label reports",
              "Team collaboration (5 seats)",
              "API access",
              "Priority support",
            ]}
          />
        </div>

        {/* Feature Comparison */}
        <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-8">
          <h3 className="text-xl font-bold text-white mb-6 text-center">Everything You Get</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <FeatureItem 
              icon="fa-solid fa-microscope" 
              title="Deep Analysis" 
              desc="Frame-by-frame breakdown of visuals, audio, and copy"
            />
            <FeatureItem 
              icon="fa-solid fa-clock" 
              title="Hook Scoring" 
              desc="See if your first 3 seconds will stop the scroll"
            />
            <FeatureItem 
              icon="fa-solid fa-pen-to-square" 
              title="Fix Lists" 
              desc="Specific, actionable changes to improve performance"
            />
            <FeatureItem 
              icon="fa-solid fa-chart-line" 
              title="Score Tracking" 
              desc="Track improvement over time with your audit history"
            />
            <FeatureItem 
              icon="fa-solid fa-file-pdf" 
              title="PDF Reports" 
              desc="Export professional reports for clients or team"
            />
            <FeatureItem 
              icon="fa-solid fa-users" 
              title="Team Access" 
              desc="Collaborate with your creative team"
            />
            <FeatureItem 
              icon="fa-solid fa-bolt" 
              title="Fast Results" 
              desc="Get detailed analysis in under 60 seconds"
            />
            <FeatureItem 
              icon="fa-solid fa-lock" 
              title="100% Private" 
              desc="Your videos are analyzed and immediately deleted"
            />
          </div>
        </div>

        {/* ROI Calculator */}
        <div className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-r from-[#00F2EA]/10 to-purple-900/10 border border-[#00F2EA]/20">
          <h3 className="text-2xl font-bold text-white mb-3">The Math is Simple</h3>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            If you spend $5,000/month on ads and improve your creative performance by just 10%, 
            that's <span className="text-[#00F2EA] font-bold">$500 extra in returns</span>. 
            ViralAudit pays for itself many times over.
          </p>
          <button 
            onClick={handleFreeTrial}
            className="bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
          >
            Start Your Free Trial
          </button>
        </div>
      </div>
    </section>
  );
};

const FeatureItem = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
  <div className="text-center md:text-left">
    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#1a1a1a] text-[#00F2EA] mb-3">
      <i className={icon}></i>
    </div>
    <h4 className="text-white font-semibold mb-1">{title}</h4>
    <p className="text-gray-500 text-sm">{desc}</p>
  </div>
);

// ==========================================
// SOCIAL PROOF (Honest version - no fake testimonials)
// ==========================================
const SocialProof = () => {
  return (
    <section className="py-16 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { value: "60s", label: "Average analysis time" },
            { value: "4", label: "Categories analyzed" },
            { value: "5", label: "Diagnostic checks" },
            { value: "100%", label: "Privacy guaranteed" },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center p-6 bg-[#0a0a0a] border border-white/10 rounded-2xl"
            >
              <p className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] mb-2">
                {stat.value}
              </p>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
        
        {/* Who it's for */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-6">Built for people who run ads</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "UGC Creators",
              "Media Buyers", 
              "DTC Brands",
              "Marketing Agencies",
              "Freelancers",
              "E-commerce Stores"
            ].map((item, idx) => (
              <span 
                key={idx}
                className="px-4 py-2 bg-[#111] border border-white/10 rounded-full text-gray-300 text-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ==========================================
// FAQ
// ==========================================
const FAQ = () => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const faqs = [
    {
      q: "How does ViralAudit analyze my videos?",
      a: "We use advanced AI to analyze every frame of your video, examining visual elements, pacing, hooks, copy, and call-to-actions. The AI has been trained on thousands of high-performing ads to identify what works and what doesn't."
    },
    {
      q: "Is my video content secure?",
      a: "Absolutely. Your videos are processed in real-time and immediately deleted after analysis. We never store your creative assets or use them for training. Your competitive advantage stays yours."
    },
    {
      q: "What makes ViralAudit different from other tools?",
      a: "Most tools give you generic advice. ViralAudit gives you timestamp-specific, actionable fixes. We tell you exactly what to change at 0:03 or why your CTA at 0:28 isn't working—not just 'make your hook better.'"
    },
    {
      q: "What video formats do you support?",
      a: "We support all major video formats including MP4, MOV, WebM, and more. Videos are automatically optimized for analysis, so even large files process quickly."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes! All plans are month-to-month with no long-term commitment. You can cancel anytime from your dashboard, and you'll retain access until the end of your billing period."
    },
    {
      q: "Do you offer refunds?",
      a: "We offer a 14-day money-back guarantee. If ViralAudit doesn't help improve your creative workflow, just reach out and we'll refund your payment—no questions asked."
    }
  ];

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-white text-center mb-4">Frequently Asked Questions</h2>
        <p className="text-gray-400 text-center mb-12">
          Everything you need to know about ViralAudit
        </p>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full p-5 text-left flex justify-between items-center hover:bg-white/5 transition-colors"
              >
                <span className="text-white font-medium pr-4">{faq.q}</span>
                <i className={`fa-solid fa-chevron-down text-gray-500 transition-transform ${openIndex === idx ? 'rotate-180' : ''}`}></i>
              </button>
              {openIndex === idx && (
                <div className="px-5 pb-5">
                  <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ==========================================
// FINAL CTA
// ==========================================
const FinalCTA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          Stop Wasting Ad Spend on<br />Creatives That Don't Convert
        </h2>
        <p className="text-gray-400 text-xl mb-8 max-w-2xl mx-auto">
          Get instant, AI-powered feedback on your video ads. Start with 3 free audits.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(user ? '/audit/new' : '/auth?mode=signup')}
            className="bg-gradient-to-r from-[#00F2EA] to-[#00D4D4] text-black px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(0,242,234,0.3)]"
          >
            Start Free Trial
          </button>
          <a
            href="#pricing"
            className="border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/5 transition-colors"
          >
            View Pricing
          </a>
        </div>
        <p className="text-gray-500 text-sm mt-6">
          <i className="fa-solid fa-shield-check mr-2"></i>
          No credit card required • Cancel anytime • 14-day money-back guarantee
        </p>
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
      <HowItWorks />
      <Features />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <footer className="py-10 text-center text-gray-600 text-xs border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <span>© 2025 ViralAudit. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="mailto:hello@viralauditai.com" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
