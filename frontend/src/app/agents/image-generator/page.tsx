'use client';

import { useState, useEffect } from 'react';
import { Download, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

const STYLES = [
  { value: 'photorealistic', label: 'Photorealistic', icon: '📷' },
  { value: 'illustration',   label: 'Illustration',   icon: '🎨' },
  { value: 'minimalist',     label: 'Minimalist',     icon: '◻️' },
  { value: 'cinematic',      label: 'Cinematic',      icon: '🎬' },
  { value: 'cartoon',        label: 'Cartoon',        icon: '✏️' },
  { value: 'abstract',       label: 'Abstract',       icon: '🌀' },
] as const;

const PLATFORMS = [
  { value: 'general',            label: 'General',            size: '1024×1024', icon: '🖼️' },
  { value: 'instagram_square',   label: 'Instagram Square',   size: '1080×1080', icon: '📸' },
  { value: 'instagram_portrait', label: 'Instagram Portrait', size: '864×1080',  icon: '📱' },
  { value: 'twitter',            label: 'Twitter / X',        size: '1200×675',  icon: '🐦' },
  { value: 'linkedin',           label: 'LinkedIn',           size: '1200×627',  icon: '💼' },
  { value: 'tiktok',             label: 'TikTok',             size: '1080×1920', icon: '🎵' },
  { value: 'youtube',            label: 'YouTube Thumbnail',  size: '1280×720',  icon: '▶️' },
] as const;

type Style    = typeof STYLES[number]['value'];
type Platform = typeof PLATFORMS[number]['value'];

const MOODS = ['professional', 'energetic', 'calm', 'bold', 'playful', 'luxury', 'dark', 'bright'];

interface GeneratorResult {
  image_url: string;
  prompt_used: string;
  width: number;
  height: number;
  platform: string;
}

export default function ImageGeneratorPage() {
  const { settings, loaded: settingsLoaded } = useSettings();

  const [description, setDescription] = useState('');
  const [style, setStyle]             = useState<Style>('photorealistic');
  const [platform, setPlatform]       = useState<Platform>('general');
  const [mood, setMood]               = useState('professional');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<GeneratorResult | null>(null);
  const [error, setError]             = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  async function handleGenerate() {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await apiClient.post('/api/v1/agents/image-generator', {
        description,
        style,
        platform,
        mood,
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

  async function handleDownload() {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.image_url;
    a.download = `paavox-image-${Date.now()}.jpg`;
    a.click();
  }

  async function copyPrompt() {
    if (!result) return;
    await navigator.clipboard.writeText(result.prompt_used);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  const selectedPlatform = PLATFORMS.find(p => p.value === platform)!;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-xl">🖼️</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Image Generator</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create platform-optimised visuals from a text description</p>
          </div>
          {settingsLoaded && settings.niche && (
            <span className="ml-auto text-xs bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 px-2.5 py-1 rounded-full font-medium">
              ✓ Niche applied
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">

        {/* ── LEFT: Controls ── */}
        <div className="space-y-5 lg:sticky lg:top-0 self-start">

          {/* Description */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Describe your image
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`E.g. "A person working on a laptop in a cozy café with warm lighting and plants around them"`}
              rows={4}
              className="w-full text-sm text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-white dark:bg-gray-800"
            />
          </div>

          {/* Style */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Style</label>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
                    style === s.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform + Mood */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">Platform / size</label>
              <div className="space-y-1.5">
                {PLATFORMS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                      platform === p.value
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                        : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      <span className="font-medium">{p.label}</span>
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{p.size}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block font-medium">Mood / vibe</label>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map(m => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      mood === m
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
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
                Generate Image
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT: Output ── */}
        <div className="space-y-4">
          {!result && !loading && !error && (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center text-3xl mb-4">🖼️</div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your image will appear here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Describe what you want and hit Generate</p>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Generating your image…</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This takes 10–30 seconds</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Image display */}
              <div className="card overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.image_url}
                    alt={description}
                    className="w-full h-auto"
                  />
                </div>

                {(
                  <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{selectedPlatform.icon} {selectedPlatform.label}</span>
                      <span>·</span>
                      <span>{result.width}×{result.height}px</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleGenerate}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Regenerate
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt used */}
              {(
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Prompt used</p>
                    <button
                      onClick={copyPrompt}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {promptCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {promptCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{result.prompt_used}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
