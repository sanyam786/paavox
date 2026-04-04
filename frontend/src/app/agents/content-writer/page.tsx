'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, Check, Sparkles, ChevronDown, FileText } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

const FORMATS = [
  { value: 'tiktok_script',  label: 'TikTok Script',   icon: '🎵', desc: 'Hook, scenes, on-screen text, caption' },
  { value: 'reels_script',   label: 'Reels Script',    icon: '📱', desc: 'Scene-by-scene, visuals, audio, caption' },
  { value: 'youtube_script', label: 'YouTube Script',  icon: '▶️', desc: 'Title, thumbnail, chapters, full script' },
  { value: 'tweet_thread',   label: 'Tweet Thread',    icon: '🧵', desc: 'Twitter / X' },
  { value: 'linkedin_post',  label: 'LinkedIn Post',   icon: '💼', desc: 'Thought leadership' },
  { value: 'blog_post',      label: 'Blog Post',       icon: '📝', desc: 'Long-form article' },
  { value: 'carousel',       label: 'Carousel',        icon: '🎠', desc: 'Instagram / LinkedIn slides' },
  { value: 'newsletter',     label: 'Newsletter',      icon: '📧', desc: 'Email edition' },
] as const;

type ContentFormat = typeof FORMATS[number]['value'];

const TONES = ['engaging', 'professional', 'casual', 'educational', 'inspirational', 'funny'];

interface WriterResult {
  title: string;
  body: string;
  content_format: ContentFormat;
  word_count: number;
}

export default function ContentWriterPage() {
  const searchParams = useSearchParams();
  const { settings, loaded: settingsLoaded } = useSettings();

  const [topic, setTopic]           = useState('');
  const [format, setFormat]         = useState<ContentFormat>('tiktok_script');
  const [tone, setTone]             = useState('engaging');
  const [audience, setAudience]     = useState('');
  const [extraCtx, setExtraCtx]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<WriterResult | null>(null);
  const [error, setError]           = useState('');
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.default_tone) setTone(settings.default_tone);
  }, [settingsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = searchParams.get('topic');
    if (t) setTopic(t);
  }, [searchParams]);

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await apiClient.post('/api/v1/agents/content-writer', {
        topic,
        content_format: format,
        tone,
        audience,
        extra_context: extraCtx,
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
    await navigator.clipboard.writeText(`${result.title}\n\n${result.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedFormat = FORMATS.find(f => f.value === format)!;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl">✏️</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Content Writer</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Write full content — scripts, threads, posts, blogs & more</p>
          </div>
          {settingsLoaded && (settings.brand_voice || settings.niche) && (
            <span className="ml-auto text-xs bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 px-2.5 py-1 rounded-full font-medium">
              ✓ Brand settings applied
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">

        {/* ── LEFT: Inputs ── */}
        <div className="space-y-5 lg:sticky lg:top-0 self-start">

          {/* Format picker */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Content format</label>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                    format === f.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">{f.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold leading-tight ${format === f.value ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {f.label}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{f.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Topic / idea
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder={`E.g. "5 productivity habits that changed my life as a remote worker"`}
              rows={4}
              className="w-full text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800"
            />
          </div>

          {/* Options */}
          <div className="card p-5 space-y-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Options</label>

            {/* Tone */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Tone</label>
              <div className="relative">
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  className="w-full appearance-none text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  {TONES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Target audience */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Target audience <span className="text-gray-300 dark:text-gray-600">(optional)</span></label>
              <input
                type="text"
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="E.g. early-career founders, fitness beginners"
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>

            {/* Extra context */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Extra context <span className="text-gray-300 dark:text-gray-600">(optional)</span></label>
              <textarea
                value={extraCtx}
                onChange={e => setExtraCtx(e.target.value)}
                placeholder="E.g. include a personal story, reference this stat, avoid mentioning competitors"
                rows={2}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Writing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Write {selectedFormat.label}
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="space-y-5">
          {!result && !loading && !error && (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-3xl mb-4">✏️</div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your content will appear here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Pick a format, describe your topic, and hit Write</p>
            </div>
          )}

          {error && (
            <div className="card p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p>
            </div>
          )}

          {loading && (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Writing your {selectedFormat.label.toLowerCase()}…</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This may take a few seconds</p>
            </div>
          )}

          {result && !loading && (
            <>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedFormat.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{result.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{result.word_count} words · {selectedFormat.label}</p>
                    </div>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 max-h-[600px] overflow-y-auto">
                  <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {result.body}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Regenerate
                </button>
                <a
                  href={`/agents/caption?topic=${encodeURIComponent(result.title)}`}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Generate caption →
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
