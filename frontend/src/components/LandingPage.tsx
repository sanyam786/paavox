'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ─── data ─────────────────────────────────────────────────────────────────── */

const TYPEWRITER_WORDS = [
  'video scripts',
  'tweet threads',
  'Instagram captions',
  'YouTube Shorts',
  'newsletters',
  'blog posts',
  'carousels',
];

const AGENTS = [
  { icon: '📈', name: 'Trend Agent' },
  { icon: '🔍', name: 'Competitor Analysis' },
  { icon: '✏️', name: 'Content Writer' },
  { icon: '✍️', name: 'Caption Agent' },
  { icon: '🖼️', name: 'Image Generator' },
  { icon: '🎬', name: 'Video Creator' },
  { icon: '🔄', name: 'Repurposing Agent' },
  { icon: '✂️', name: 'YouTube Shorts' },
  { icon: '🗓️', name: 'Schedule Agent' },
  { icon: '📊', name: 'Analytics Agent' },
  { icon: '💬', name: 'Comment Reply' },
  { icon: '🌟', name: 'Influencer Manager' },
  { icon: '🤝', name: 'Collab & Outreach' },
];

const FEATURES = [
  {
    icon: '📈', title: 'Trend Discovery',
    desc: 'Spot viral moments before they peak. Niche-specific trends with local and global scope.',
    accent: '#22c55e', border: 'hover:border-green-500/40', glow: 'rgba(34,197,94,0.08)',
  },
  {
    icon: '✏️', title: 'AI Content Writer',
    desc: 'Scripts, threads, carousels, newsletters — written in your brand voice, for any platform.',
    accent: '#818cf8', border: 'hover:border-indigo-500/40', glow: 'rgba(99,102,241,0.08)',
  },
  {
    icon: '🖼️', title: 'Visual Generation',
    desc: 'Platform-optimised images in 6 styles. Every size. Every platform. In seconds.',
    accent: '#ec4899', border: 'hover:border-pink-500/40', glow: 'rgba(236,72,153,0.08)',
  },
  {
    icon: '🎬', title: 'Video & Shorts',
    desc: 'Generate AI videos or clip viral moments from any YouTube video as Shorts.',
    accent: '#a78bfa', border: 'hover:border-violet-500/40', glow: 'rgba(139,92,246,0.08)',
  },
  {
    icon: '🔄', title: 'Smart Repurposing',
    desc: 'One piece of content, every platform — adapted for tone, format, and character limits.',
    accent: '#38bdf8', border: 'hover:border-sky-500/40', glow: 'rgba(56,189,248,0.08)',
  },
  {
    icon: '📊', title: 'Analytics & Growth',
    desc: 'Understand what performs. Get AI strategy recommendations. Outpace competitors.',
    accent: '#fb923c', border: 'hover:border-orange-500/40', glow: 'rgba(251,146,60,0.08)',
  },
];

const STEPS = [
  {
    num: '01', icon: '⚡',
    title: 'Connect your brand',
    desc: 'Set your niche, brand voice, and social accounts. Takes 2 minutes.',
  },
  {
    num: '02', icon: '🤖',
    title: 'Pick an agent',
    desc: 'Choose from 13 specialised AI agents — each built for a specific content task.',
  },
  {
    num: '03', icon: '🚀',
    title: 'Publish & grow',
    desc: 'Review, schedule, and post. Watch your audience grow on autopilot.',
  },
];

const STATS = [
  { value: '13', label: 'AI Agents' },
  { value: '6', label: 'Platforms' },
  { value: '8', label: 'Content Formats' },
  { value: '10×', label: 'Faster Output' },
];

/* ─── typewriter hook ───────────────────────────────────────────────────────── */

function useTypewriter(words: string[], speed = 80, pause = 1800) {
  const [text, setText]       = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    const current = words[wordIndex];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(current.slice(0, text.length + 1));
        if (text.length + 1 === current.length) {
          setTimeout(() => setDeleting(true), pause);
        }
      } else {
        setText(current.slice(0, text.length - 1));
        if (text.length - 1 === 0) {
          setDeleting(false);
          setWordIndex((i) => (i + 1) % words.length);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [text, deleting, wordIndex, words, speed, pause]);

  return text;
}

/* ─── main component ────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const typed = useTypewriter(TYPEWRITER_WORDS);
  const doubleAgents = [...AGENTS, ...AGENTS]; // duplicate for seamless marquee

  return (
    <div className="min-h-screen bg-[#030712] text-white font-sans overflow-x-hidden">

      {/* ── Sticky Nav ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5"
           style={{ background: 'rgba(3,7,18,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold">
              C
            </div>
            <span className="font-bold text-white tracking-tight">Paavox</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in"
              className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
              Sign in
            </Link>
            <Link href="/auth/sign-in"
              className="relative text-sm font-semibold px-4 py-2 rounded-lg overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <span className="relative z-10">Get started free</span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                   style={{ background: 'linear-gradient(135deg, #4338ca, #6d28d9)' }} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-14 overflow-hidden">

        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-orb-drift absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="animate-orb-drift-2 absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15"
               style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', filter: 'blur(80px)' }} />
          <div className="animate-orb-drift absolute top-1/2 right-1/3 w-64 h-64 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(60px)', animationDelay: '8s' }} />
        </div>

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none"
             style={{
               backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
               backgroundSize: '40px 40px',
             }} />

        {/* Radial fade over grid */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 20%, #030712 80%)' }} />

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 animate-fade-up"
               style={{ animationDelay: '0.1s', opacity: 0 }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-gray-300">13 AI agents · One platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 animate-fade-up"
              style={{ animationDelay: '0.2s', opacity: 0 }}>
            <span className="text-white">Your AI team</span>
            <br />
            <span className="text-white">that creates </span>
            <span className="gradient-text">{typed}</span>
            <span className="text-indigo-400 animate-pulse ml-0.5">|</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-up"
             style={{ animationDelay: '0.35s', opacity: 0 }}>
            Paavox automates your entire content workflow — from discovering viral trends to writing,
            designing, publishing, and analysing. One platform. Zero burnout.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
               style={{ animationDelay: '0.5s', opacity: 0 }}>
            <Link href="/auth/sign-in"
              className="relative group w-full sm:w-auto text-center font-semibold text-base px-8 py-4 rounded-xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 40px rgba(99,102,241,0.3)' }}>
              <span className="relative z-10 flex items-center justify-center gap-2">
                Start for free
                <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                   style={{ background: 'linear-gradient(135deg, #4338ca, #6d28d9)' }} />
            </Link>
            <Link href="/agents"
              className="w-full sm:w-auto text-center font-medium text-base px-8 py-4 rounded-xl glass glass-hover text-gray-300 hover:text-white">
              Explore agents ↗
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-6 text-xs text-gray-500 animate-fade-up" style={{ animationDelay: '0.65s', opacity: 0 }}>
            Free to start · No credit card required
          </p>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 py-10"
               style={{ background: 'rgba(99,102,241,0.03)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-4xl font-extrabold gradient-text mb-1">{s.value}</p>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agents marquee ─────────────────────────────────────────────────── */}
      <section className="py-12 overflow-hidden">
        <p className="text-center text-xs font-semibold text-gray-600 uppercase tracking-widest mb-6">
          Every agent you need
        </p>
        <div className="flex gap-3 animate-marquee whitespace-nowrap" style={{ width: 'max-content' }}>
          {doubleAgents.map((a, i) => (
            <span key={i}
              className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-gray-300 font-medium flex-shrink-0 hover:text-white hover:border-indigo-500/40 transition-all">
              <span>{a.icon}</span>
              {a.name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">What Paavox does</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Everything. In one place.
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Follow the workflow — discover, create, publish, analyse, grow.
            Each step powered by a dedicated AI agent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`glass glass-hover rounded-2xl p-6 group cursor-default ${f.border} transition-all duration-300`}
              style={{
                animationDelay: `${i * 0.1}s`,
                background: `linear-gradient(135deg, ${f.glow} 0%, rgba(255,255,255,0.02) 60%)`,
              }}
            >
              {/* Icon with glow */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 relative"
                   style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}20` }}>
                {f.icon}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                     style={{ background: `radial-gradient(circle, ${f.accent}20 0%, transparent 70%)` }} />
              </div>

              {/* Top accent line */}
              <div className="w-8 h-0.5 rounded-full mb-4 opacity-60"
                   style={{ background: f.accent }} />

              <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse 100% 80% at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%)' }} />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              Up and running in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-px"
                 style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), rgba(99,102,241,0.4), transparent)' }} />

            {STEPS.map((step, i) => (
              <div key={step.num} className="relative text-center group">
                {/* Step number circle */}
                <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-2xl relative animate-border-glow"
                     style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  {step.icon}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                       style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    {i + 1}
                  </div>
                </div>

                <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-8 mb-16">
        <div className="relative rounded-3xl overflow-hidden px-8 py-16 text-center"
             style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #1e1b4b 100%)' }}>

          {/* Glow orbs inside banner */}
          <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full opacity-30 pointer-events-none"
               style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-30 pointer-events-none"
               style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(40px)' }} />

          {/* Border */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none"
               style={{ border: '1px solid rgba(99,102,241,0.3)' }} />

          <div className="relative z-10">
            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-4">
              Ready to grow?
            </p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              10× your content output.
              <br />
              <span className="gradient-text">Starting today.</span>
            </h2>
            <p className="text-gray-300 mb-10 max-w-md mx-auto">
              Join creators and brands automating their entire content workflow with Paavox.
            </p>
            <Link href="/auth/sign-in"
              className="inline-flex items-center gap-2 font-semibold text-base px-10 py-4 rounded-xl text-white group relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 60px rgba(99,102,241,0.4)' }}>
              <span>Get started free</span>
              <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                   style={{ background: 'linear-gradient(135deg, #4338ca, #6d28d9)' }} />
            </Link>
            <p className="mt-4 text-xs text-indigo-300/60">No credit card required</p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
              C
            </div>
            <span>© 2026 Paavox. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
