'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, Check, Sparkles, ChevronDown, RotateCcw } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';
import type { Platform, CaptionOutput } from '@/types';

const PLATFORMS: { value: Platform; label: string; icon: string; limit: number; color: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: '📸', limit: 2200,  color: 'rgb(236,72,153)' },
  { value: 'twitter',   label: 'Twitter/X', icon: '🐦', limit: 280,   color: 'rgb(100,116,139)' },
  { value: 'linkedin',  label: 'LinkedIn',  icon: '💼', limit: 3000,  color: 'rgb(14,165,233)' },
  { value: 'tiktok',    label: 'TikTok',    icon: '🎵', limit: 2200,  color: 'rgb(168,85,247)' },
  { value: 'youtube',   label: 'YouTube',   icon: '▶️', limit: 5000,  color: 'rgb(239,68,68)' },
  { value: 'facebook',  label: 'Facebook',  icon: '👥', limit: 63206, color: 'rgb(59,130,246)' },
];

const TONES = ['engaging', 'professional', 'casual', 'funny', 'inspirational', 'educational'];

export default function CaptionAgentPage() {
  const searchParams = useSearchParams();
  const { settings, loaded: settingsLoaded } = useSettings();
  const [content, setContent]             = useState('');
  const [platform, setPlatform]           = useState<Platform>('instagram');
  const [tone, setTone]                   = useState('engaging');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis]     = useState(true);
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState<CaptionOutput | null>(null);
  const [error, setError]                 = useState('');
  const [copied, setCopied]               = useState(false);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.default_tone) setTone(settings.default_tone);
    if (settings.active_platforms.length > 0) {
      const first = settings.active_platforms[0] as Platform;
      if (PLATFORMS.find(p => p.value === first)) setPlatform(first);
    }
  }, [settingsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic) setContent(`Create content about this trending topic: ${topic}`);
  }, [searchParams]);

  const selectedPlatform = PLATFORMS.find(p => p.value === platform)!;

  async function handleGenerate() {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await apiClient.post('/api/v1/agents/caption', {
        content,
        platform,
        tone,
        include_hashtags: includeHashtags,
        include_emojis: includeEmojis,
        brand_voice: settings.brand_voice || undefined,
        niche: settings.niche || undefined,
        location: settings.location || undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!result) return;
    const text = result.hashtags.length
      ? `${result.caption}\n\n${result.hashtags.map(h => `#${h}`).join(' ')}`
      : result.caption;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const charPercent = result
    ? Math.min((result.characterCount / selectedPlatform.limit) * 100, 100)
    : 0;

  return (
    <div className="max-w-6xl">

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.08))', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          ✍️
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Caption Agent</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Generate platform-optimised captions with hashtags</p>
        </div>
        {settingsLoaded && (settings.brand_voice || settings.niche) && (
          <span className="ml-auto hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.1)', color: 'rgb(99,102,241)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Brand settings applied
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

        {/* ── LEFT: Inputs ── */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">

          {/* Platform picker */}
          <div className="card p-5">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all duration-150 ${
                    platform === p.value
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-100 dark:border-white/[0.06] text-gray-500 dark:text-gray-500 hover:border-gray-200 dark:hover:border-white/10 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  style={platform === p.value ? {
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))',
                  } : undefined}
                >
                  <span className="text-lg">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content input */}
          <div className="card p-5">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Your content
            </label>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Describe what you're posting about</p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`E.g. "I just launched my new online course on productivity for remote workers…"`}
              rows={5}
              className="w-full text-sm placeholder-gray-300 dark:placeholder-gray-600 border border-gray-200 dark:border-white/[0.08] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50 resize-none transition-all bg-white dark:bg-white/[0.02] text-gray-800 dark:text-gray-100"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{content.length} characters</p>
          </div>

          {/* Options */}
          <div className="card p-5 space-y-4">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Options</label>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Tone</label>
              <div className="relative">
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="w-full appearance-none text-sm border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/50 transition-all bg-white dark:bg-white/[0.02] text-gray-700 dark:text-gray-300"
                >
                  {TONES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Include hashtags', value: includeHashtags, set: setIncludeHashtags },
                { label: 'Include emojis',   value: includeEmojis,   set: setIncludeEmojis },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                  <button
                    onClick={() => set(!value)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ${
                      value ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-white/10'
                    }`}
                    style={value ? { boxShadow: '0 0 10px rgba(99,102,241,0.4)' } : undefined}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      value ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={loading || !content.trim()}
            className="w-full btn-primary py-3 text-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Caption
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="space-y-4">
          {!result && !loading && !error && (
            <div className="card p-10 flex flex-col items-center justify-center text-center min-h-[320px]">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(168,85,247,0.06))', border: '1px solid rgba(139,92,246,0.15)' }}
              >
                ✍️
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Your caption will appear here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Fill in the form and hit Generate</p>
            </div>
          )}

          {error && (
            <div className="card p-4 border-red-200 dark:border-red-900/50"
              style={{ background: 'rgba(239,68,68,0.04)' }}>
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p>
            </div>
          )}

          {loading && (
            <div className="card p-10 flex flex-col items-center justify-center min-h-[320px]">
              <div className="relative w-12 h-12 mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/40" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Writing your caption…</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This usually takes a few seconds</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Caption output */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedPlatform.icon}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedPlatform.label} Caption</span>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 hover:-translate-y-px
                      border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy all'}
                  </button>
                </div>

                <div
                  className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed rounded-xl p-4"
                  style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <span className="dark:hidden">{result.caption}</span>
                  <span className="hidden dark:block" style={{ color: 'rgb(243,244,246)' }}>{result.caption}</span>
                </div>

                {/* Character bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                    <span>{result.characterCount} characters</span>
                    <span>Limit: {selectedPlatform.limit.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${charPercent}%`,
                        background: charPercent > 90
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : charPercent > 70
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : 'linear-gradient(90deg, #10b981, #059669)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Hashtags */}
              {result.hashtags.length > 0 && (
                <div className="card p-5">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Hashtags</p>
                  <div className="flex flex-wrap gap-2">
                    {result.hashtags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all hover:-translate-y-px"
                        style={{
                          background: 'rgba(99,102,241,0.08)',
                          color: 'rgb(99,102,241)',
                          border: '1px solid rgba(99,102,241,0.2)',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Regenerate */}
              <button
                onClick={handleGenerate}
                className="w-full btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
