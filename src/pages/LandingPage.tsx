import React from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { openCheckout } from "../utils/lemonsqueezy";

// Screenshots
const screenshotMain = "/screenshot-main.png";

// ==========================================
// BACKGROUND - Clean, minimal
// ==========================================
const Background = () => (
  <div className="fixed inset-0 z-[-1] bg-[#0a0a0a]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]"></div>
  </div>
);

// ==========================================
// NAVBAR
// ==========================================
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="fixed w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 py-4">
      <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="font-semibold text-xl text-white tracking-tight">
          ViralAudit
        </Link>
        <div className="flex gap-6 items-center">
          <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">
            Features
          </a>
          <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors hidden md:block">
            Pricing
          </a>
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <button onClick={logout} className="text-sm text-zinc-400 hover:text-white transition-colors">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/auth?mode=signup" className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                Start Free
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
    navigate(user ? '/audit/new' : '/auth?mode=signup');
  };

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="text-amber-400 text-sm font-medium">Built for ecommerce brands & agencies</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
            Stop guessing why your
            <br />
            <span className="text-zinc-500">video ads don't convert</span>
          </h1>
          
          <p className="text-zinc-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Get instant, actionable feedback on your product videos. Know exactly what to fix before you waste another dollar on ads that don't sell.
          </p>
          
          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={handleCTA}
              className="bg-white text-black px-8 py-4 rounded-xl font-medium text-lg hover:bg-zinc-100 transition-colors inline-flex items-center justify-center gap-2"
            >
              Analyze Your First Ad Free
              <i className="fa-solid fa-arrow-right text-sm"></i>
            </button>
          </div>
          
          {/* Trust */}
          <p className="text-zinc-600 text-sm">
            No credit card required • Results in 60 seconds • 3 free audits
          </p>
        </motion.div>
        
        {/* Screenshot */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
            <img 
              src={screenshotMain} 
              alt="ViralAudit analysis showing score, verdict, and priority fixes"
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ==========================================
// PROBLEM SECTION
// ==========================================
const Problem = () => {
  const problems = [
    "You're spending $500+/day on ads with inconsistent ROAS",
    "Your creative team keeps making the same mistakes",
    "You don't know if an ad will flop until after you've spent money",
    "Scaling means testing more creatives, but each test costs money"
  ];

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-semibold text-white mb-6 leading-tight">
              Most ecommerce brands waste 40% of their ad spend on bad creatives
            </h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              You already know video ads drive sales. The problem isn't your product or your offer—it's knowing which creatives will convert before you spend money testing them.
            </p>
            <ul className="space-y-3">
              {problems.map((problem, idx) => (
                <li key={idx} className="flex items-start gap-3 text-zinc-400">
                  <i className="fa-solid fa-xmark text-red-400 mt-1"></i>
                  <span>{problem}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-8">
            <div className="text-center">
              <div className="text-6xl font-semibold text-white mb-2">40%</div>
              <p className="text-zinc-500 text-sm">Average ad spend wasted on underperforming creatives</p>
            </div>
            <div className="h-px bg-white/10 my-6"></div>
            <div className="text-center">
              <div className="text-6xl font-semibold text-amber-400 mb-2">$0</div>
              <p className="text-zinc-500 text-sm">Cost to identify problems with ViralAudit (3 free audits)</p>
            </div>
          </div>
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
      num: "01",
      title: "Upload your video ad",
      desc: "Drop any product video, UGC clip, or ad creative. We support all formats up to 500MB."
    },
    {
      num: "02", 
      title: "AI analyzes every frame",
      desc: "Our system reviews your hook, product showcase, social proof, pacing, and call-to-action."
    },
    {
      num: "03",
      title: "Get specific fixes",
      desc: "Not generic advice. Exact timestamps with what's wrong and how to fix it."
    }
  ];

  return (
    <section id="features" className="py-20 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold text-white mb-4">
            How it works
          </h2>
          <p className="text-zinc-400 text-lg">
            From upload to actionable insights in under 60 seconds
          </p>
        </div>
        
        <div className="space-y-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="flex gap-6 items-start"
            >
              <div className="text-3xl font-semibold text-zinc-700 w-16 shrink-0">
                {step.num}
              </div>
              <div className="flex-1 pb-8 border-b border-white/5">
                <h3 className="text-xl font-medium text-white mb-2">{step.title}</h3>
                <p className="text-zinc-400">{step.desc}</p>
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
      title: "Hook Analysis",
      desc: "Is your first 3 seconds stopping the scroll? We analyze attention patterns and tell you exactly how to open stronger.",
      icon: "fa-bolt"
    },
    {
      title: "Product Showcase",
      desc: "Are you showing benefits or just features? Get feedback on how to position your product for maximum desire.",
      icon: "fa-box"
    },
    {
      title: "Pacing & Flow",
      desc: "Modern attention spans need modern pacing. We identify where viewers drop off and why.",
      icon: "fa-gauge-high"
    },
    {
      title: "Call-to-Action",
      desc: "Your CTA makes or breaks conversion. Learn if yours is clear, compelling, and positioned correctly.",
      icon: "fa-bullseye"
    },
    {
      title: "Audio & Music",
      desc: "Sound drives emotion. We analyze if your audio supports your message or distracts from it.",
      icon: "fa-volume-high"
    },
    {
      title: "Script Rewrite",
      desc: "Get a rewritten version of your script with improvements applied. Copy, paste, re-record.",
      icon: "fa-pen"
    }
  ];

  return (
    <section className="py-20 border-t border-white/5 bg-zinc-900/30">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Everything you need to fix your creatives
          </h2>
          <p className="text-zinc-400 text-lg">
            Comprehensive analysis across every element that affects conversion
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors"
            >
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mb-4">
                <i className={`fa-solid ${feature.icon} text-zinc-400`}></i>
              </div>
              <h3 className="text-white font-medium mb-2">{feature.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ==========================================
// SOCIAL PROOF
// ==========================================
const SocialProof = () => {
  const stats = [
    { value: "2,400+", label: "Videos analyzed" },
    { value: "60s", label: "Average analysis time" },
    { value: "23%", label: "Avg. ROAS improvement" }
  ];

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-3xl md:text-4xl font-semibold text-white mb-1">{stat.value}</div>
              <div className="text-zinc-500 text-sm">{stat.label}</div>
            </div>
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

  const handleSubscribe = (plan: 'solo' | 'pro' | 'agency') => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }
    openCheckout(plan, user.id, user.email || '');
  };

  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      desc: "For solo operators testing creatives",
      audits: "30 audits/month",
      features: [
        "Full creative analysis",
        "Timestamp-specific feedback",
        "Hook & CTA scoring",
        "PDF exports",
        "Email support"
      ],
      planKey: "solo" as const,
      popular: false
    },
    {
      name: "Pro",
      price: "$99",
      period: "/month",
      desc: "For brands scaling ad spend",
      audits: "100 audits/month",
      features: [
        "Everything in Starter",
        "Script rewrites",
        "Priority analysis",
        "Competitor insights",
        "Priority support"
      ],
      planKey: "pro" as const,
      popular: true
    },
    {
      name: "Agency",
      price: "$199",
      period: "/month",
      desc: "For agencies & high-volume teams",
      audits: "Unlimited audits",
      features: [
        "Everything in Pro",
        "White-label reports",
        "Team collaboration",
        "API access",
        "Dedicated support"
      ],
      planKey: "agency" as const,
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-zinc-400 text-lg">
            Start free. Upgrade when you're ready to scale.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`relative bg-[#0a0a0a] border rounded-2xl p-6 ${
                plan.popular ? 'border-amber-500/50' : 'border-white/5'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-medium text-white mb-1">{plan.name}</h3>
                <p className="text-zinc-500 text-sm">{plan.desc}</p>
              </div>
              
              <div className="mb-6">
                <span className="text-4xl font-semibold text-white">{plan.price}</span>
                <span className="text-zinc-500">{plan.period}</span>
              </div>
              
              <div className="text-sm text-amber-400 mb-6">{plan.audits}</div>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-2 text-sm text-zinc-400">
                    <i className="fa-solid fa-check text-zinc-600 text-xs"></i>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleSubscribe(plan.planKey)}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  plan.popular 
                    ? 'bg-white text-black hover:bg-zinc-200' 
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                Get Started
              </button>
            </motion.div>
          ))}
        </div>
        
        <p className="text-center text-zinc-600 text-sm mt-8">
          All plans include a 14-day money-back guarantee
        </p>
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
      q: "What types of videos can I analyze?",
      a: "Any product video, UGC ad, or promotional content. We support MP4, MOV, WebM and most common formats up to 500MB. The AI is trained specifically on ecommerce and DTC ad formats."
    },
    {
      q: "How is this different from hiring a creative strategist?",
      a: "A good creative strategist costs $5-10k/month and can only review so many ads. ViralAudit gives you the same level of analysis instantly, for a fraction of the cost, on every single creative you make."
    },
    {
      q: "Is my video content secure?",
      a: "Yes. Videos are processed in real-time and deleted immediately after analysis. We never store your creative assets or use them for any other purpose."
    },
    {
      q: "What if I'm not satisfied?",
      a: "We offer a 14-day money-back guarantee on all paid plans. If ViralAudit doesn't help improve your creative workflow, we'll refund your payment—no questions asked."
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. All plans are month-to-month with no long-term commitment. Cancel from your dashboard and retain access until your billing period ends."
    }
  ];

  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-3xl font-semibold text-white text-center mb-12">
          Frequently asked questions
        </h2>
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border-b border-white/5"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full py-5 text-left flex justify-between items-center hover:text-white transition-colors"
              >
                <span className="text-white font-medium pr-4">{faq.q}</span>
                <i className={`fa-solid fa-plus text-zinc-600 transition-transform ${openIndex === idx ? 'rotate-45' : ''}`}></i>
              </button>
              {openIndex === idx && (
                <div className="pb-5">
                  <p className="text-zinc-500 text-sm leading-relaxed">{faq.a}</p>
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
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-semibold text-white mb-4">
          Ready to stop wasting ad spend?
        </h2>
        <p className="text-zinc-400 text-lg mb-8">
          Get your first 3 video audits free. No credit card required.
        </p>
        <button
          onClick={() => navigate(user ? '/audit/new' : '/auth?mode=signup')}
          className="bg-white text-black px-8 py-4 rounded-xl font-medium text-lg hover:bg-zinc-100 transition-colors inline-flex items-center gap-2"
        >
          Start Your Free Audit
          <i className="fa-solid fa-arrow-right text-sm"></i>
        </button>
      </div>
    </section>
  );
};

// ==========================================
// FOOTER
// ==========================================
const Footer = () => (
  <footer className="py-12 border-t border-white/5">
    <div className="max-w-6xl mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-zinc-600 text-sm">
          © 2025 ViralAudit. All rights reserved.
        </div>
        <div className="flex gap-8">
          <a href="#" className="text-zinc-600 text-sm hover:text-white transition-colors">Privacy</a>
          <a href="#" className="text-zinc-600 text-sm hover:text-white transition-colors">Terms</a>
          <a href="mailto:support@viralauditai.com" className="text-zinc-600 text-sm hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </div>
  </footer>
);

// ==========================================
// LANDING PAGE
// ==========================================
const LandingPage = () => {
  return (
    <div className="min-h-screen text-white font-sans antialiased">
      <Background />
      <Navbar />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <SocialProof />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
