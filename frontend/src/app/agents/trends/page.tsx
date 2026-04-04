'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, TrendingUp, Save, Check, Globe, MapPin, Flame } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'twitter',   label: 'Twitter / X', icon: '🐦' },
  { value: 'linkedin',  label: 'LinkedIn', icon: '💼' },
  { value: 'tiktok',    label: 'TikTok', icon: '🎵' },
  { value: 'youtube',   label: 'YouTube', icon: '▶️' },
  { value: 'facebook',  label: 'Facebook', icon: '👥' },
];

const TIMEFRAMES = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  if (score >= 6) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
};

interface TrendTopic {
  topic: string;
  score: number;
  trend_type: string;
  platforms: string[];
  content_ideas: string[];
  hashtags: string[];
}

interface TrendResult {
  trends: TrendTopic[];
  niche: string;
}

export default function TrendAgentPage() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const [niche, setNiche]               = useState('');
  const [timeframe, setTimeframe]       = useState('7d');
  const [platforms, setPlatforms]       = useState<string[]>(['instagram', 'twitter', 'linkedin', 'tiktok']);
  const [includeViral, setIncludeViral] = useState(false);
  const [locationScope, setLocationScope] = useState<'brand' | 'global'>('global');
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<TrendResult | null>(null);
  const [error, setError]               = useState('');
  const [expanded, setExpanded]         = useState<number | null>(0);
  const [savedIndexes, setSavedIndexes] = useState<number[]>([]);

  const hasLocation = !!(settings.location?.trim());

  // Pre-fill from settings
  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.niche) setNiche(settings.niche);
    if (settings.active_platforms.length > 0) setPlatforms(settings.active_platforms);
    // Default to brand scope if a location is saved
    if (settings.location?.trim()) setLocationScope('brand');
  }, [settingsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlatform(value: string) {
    setPlatforms(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    );
  }

  async function handleSearch() {
    if (!niche.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setExpanded(0);
    setSavedIndexes([]);
    try {
      const { data } = await apiClient.post('/api/v1/agents/trends', {
        niche,
        timeframe,
        platforms: platforms.length > 0 ? platforms : null,
        brand_voice: settings.brand_voice || undefined,
        bio: settings.bio || undefined,
        location: settings.location || undefined,
        include_viral: includeViral,
        location_scope: locationScope,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTrend(trend: TrendTopic, index: number) {
    if (!result) return;
    try {
      await apiClient.post('/api/v1/agents/trends/save', {
        topic: trend.topic,
        score: trend.score,
        content_ideas: trend.content_ideas,
        hashtags: trend.hashtags,
        niche: result.niche,
        platform: trend.platforms[0] ?? 'instagram',
      });
      setSavedIndexes(prev => [...prev, index]);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Failed to save.');
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl">📈</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trend Agent</h1>
          <p className="text-sm text-gray-500">Discover trending topics and viral content ideas for your niche</p>
        </div>
        {settingsLoaded && settings.niche && (
          <span className="ml-auto text-xs bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 px-2.5 py-1 rounded-full font-medium">
            ✓ Brand settings applied
          </span>
        )}
      </div>

      <div className="card p-6 mb-6">
        {/* Row 1: niche + timeframe + search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Your niche</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. fitness, personal finance, travel"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Timeframe</label>
            <div className="relative">
              <select
                value={timeframe}
                onChange={e => setTimeframe(e.target.value)}
                className="w-full appearance-none text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800"
              >
                {TIMEFRAMES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading || !niche.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Researching…
                </>
              ) : (
                <><Sparkles className="w-4 h-4" />Find Trends</>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: platforms + toggles */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Filter by platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => togglePlatform(p.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    platforms.includes(p.value)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: viral toggle + location scope */}
          <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-gray-100 dark:border-gray-700">

            {/* Viral toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIncludeViral(!includeViral)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                  includeViral ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  includeViral ? 'translate-x-4' : 'translate-x-1'
                }`} />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Flame className={`w-3.5 h-3.5 ${includeViral ? 'text-orange-500' : 'text-gray-400'}`} />
                  Include what's going viral
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Mix in cross-niche viral moments you can adapt</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

            {/* Location scope */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Trend scope:</span>
              <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <button
                  onClick={() => setLocationScope('brand')}
                  disabled={!hasLocation}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    locationScope === 'brand' && hasLocation
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                  title={!hasLocation ? 'Set your location in Brand Settings to use this option' : ''}
                >
                  <MapPin className="w-3 h-3" />
                  {hasLocation ? settings.location : 'Brand Location'}
                </button>
                <button
                  onClick={() => setLocationScope('global')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    locationScope === 'global'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  Global
                </button>
              </div>
              {!hasLocation && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  (add location in <a href="/settings" className="underline text-brand-500">Settings</a> for local trends)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 mb-6">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p>
        </div>
      )}

      {loading && (
        <div className="card p-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {includeViral ? 'Researching niche trends + viral moments…' : 'Researching trends…'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Searching the web and analysing viral content</p>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-3xl mb-4">📈</div>
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Enter your niche to discover trends</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">We'll search the web and surface the top 5 trending opportunities</p>
        </div>
      )}

      {result && !loading && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Top 5 trends for <span className="text-green-600">"{result.niche}"</span>
            </p>
            {includeViral && (
              <span className="ml-1 flex items-center gap-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                <Flame className="w-3 h-3" /> Viral moments included
              </span>
            )}
            {locationScope === 'brand' && hasLocation && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                <MapPin className="w-3 h-3" /> {settings.location}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {result.trends.map((trend, i) => {
              const isViral = trend.trend_type === 'viral';
              return (
                <div key={i} className={`card overflow-hidden ${isViral ? 'ring-1 ring-orange-200 dark:ring-orange-800' : ''}`}>
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isViral
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                      {isViral ? <Flame className="w-4 h-4" /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white">{trend.topic}</p>
                        {isViral && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                            🔥 Going Viral
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {trend.platforms.slice(0, 3).map(p => (
                          <span key={p} className="text-xs text-gray-400 dark:text-gray-500">
                            {PLATFORMS.find(pl => pl.value === p)?.icon} {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${SCORE_COLOR(trend.score)}`}>
                        {trend.score}/10
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${expanded === i ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {expanded === i && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-4">
                      {isViral && (
                        <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2">
                          <Flame className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          <span>This is a cross-niche viral moment — the content ideas below show how you can adapt it to your {result.niche} audience.</span>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">💡 Content Ideas</p>
                        <ul className="space-y-2">
                          {trend.content_ideas.map((idea, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <span className="text-green-500 mt-0.5 flex-shrink-0">→</span>
                              {idea}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {trend.hashtags.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"># Hashtags</p>
                          <div className="flex flex-wrap gap-1.5">
                            {trend.hashtags.map(tag => (
                              <span
                                key={tag}
                                className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 cursor-pointer hover:bg-brand-100 transition-colors"
                                onClick={() => navigator.clipboard.writeText(`#${tag}`)}
                                title="Click to copy"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <a
                          href={`/agents/caption?topic=${encodeURIComponent(trend.topic)}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate caption for this trend →
                        </a>
                        <button
                          onClick={() => handleSaveTrend(trend, i)}
                          disabled={savedIndexes.includes(i)}
                          className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 disabled:opacity-50"
                        >
                          {savedIndexes.includes(i)
                            ? <><Check className="w-3.5 h-3.5 text-green-500" /> Saved</>
                            : <><Save className="w-3.5 h-3.5" /> Save trend</>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
