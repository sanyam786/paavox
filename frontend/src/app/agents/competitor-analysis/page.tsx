'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, ShieldAlert, Zap, Target, ChevronDown, ChevronUp } from 'lucide-react';
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

const PRIORITY_CONFIG = {
  high:   { label: 'High Priority', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500' },
  medium: { label: 'Medium',        color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', dot: 'bg-yellow-500' },
  low:    { label: 'Low',           color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', dot: 'bg-gray-400' },
};

interface GapItem {
  gap: string;
  opportunity: string;
  priority: string;
}

interface AnalysisResult {
  competitor_name: string;
  competitor_overview: string;
  competitor_niche: string;
  their_content_strategy: string[];
  their_strengths: string[];
  their_weaknesses: string[];
  content_gaps: GapItem[];
  your_advantages: string[];
  recommendations: string[];
}

export default function CompetitorAnalysisPage() {
  const { settings, loaded: settingsLoaded } = useSettings();

  const [competitor, setCompetitor] = useState('');
  const [platforms, setPlatforms]   = useState<string[]>(['instagram', 'tiktok', 'youtube', 'linkedin']);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [error, setError]           = useState('');
  const [expandedGap, setExpandedGap] = useState<number | null>(null);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.active_platforms.length > 0) setPlatforms(settings.active_platforms);
  }, [settingsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlatform(v: string) {
    setPlatforms(prev => prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]);
  }

  async function handleAnalyze() {
    if (!competitor.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setExpandedGap(null);
    try {
      const { data } = await apiClient.post('/api/v1/agents/competitor-analysis', {
        competitor_name: competitor,
        platforms,
        niche: settings.niche || undefined,
        brand_voice: settings.brand_voice || undefined,
        bio: settings.bio || undefined,
        location: settings.location || undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  }

  const highGaps   = result?.content_gaps.filter(g => g.priority === 'high') ?? [];
  const mediumGaps = result?.content_gaps.filter(g => g.priority === 'medium') ?? [];
  const lowGaps    = result?.content_gaps.filter(g => g.priority === 'low') ?? [];
  const orderedGaps = [...highGaps, ...mediumGaps, ...lowGaps];

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-xl">🔍</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Competitor Analysis</h1>
          <p className="text-sm text-gray-500">Analyse any competitor's content strategy and find gaps you can win</p>
        </div>
        {settingsLoaded && (settings.niche || settings.brand_voice) && (
          <span className="ml-auto text-xs bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 px-2.5 py-1 rounded-full font-medium">
            ✓ Your brand context applied
          </span>
        )}
      </div>

      {/* Input card */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Competitor brand, handle, or URL
            </label>
            <input
              type="text"
              value={competitor}
              onChange={e => setCompetitor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="e.g. Gary Vaynerchuk, @hubspot, MrBeast, Nike..."
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white dark:bg-gray-800"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={loading || !competitor.trim()}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm whitespace-nowrap"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Analysing…
                </>
              ) : (
                <><Search className="w-4 h-4" /> Analyse Competitor</>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Platforms to analyse</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.value}
                onClick={() => togglePlatform(p.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  platforms.includes(p.value)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-5 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 mb-6">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">⚠️ {error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Researching {competitor}…</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Searching across platforms and analysing their strategy</p>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-3xl mb-4">🔍</div>
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Enter a competitor to get started</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">
            Enter any brand name, creator handle, or URL. We'll research their content strategy and show you exactly where to beat them.
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">

          {/* Overview */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-2xl flex-shrink-0">🏢</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{result.competitor_name}</h2>
                  {result.competitor_niche && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-0.5 rounded-full">{result.competitor_niche}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{result.competitor_overview}</p>
              </div>
            </div>
          </div>

          {/* Strategy + Strengths + Weaknesses — 3-col grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Content Strategy */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Their Content Strategy</h3>
              </div>
              <ul className="space-y-2.5">
                {result.their_content_strategy.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Strengths */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Their Strengths</h3>
              </div>
              <ul className="space-y-2.5">
                {result.their_strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Their Weaknesses</h3>
              </div>
              <ul className="space-y-2.5">
                {result.their_weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Content Gaps — the main value */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Content Gaps — Where You Can Win</h3>
              <span className="ml-auto text-xs text-gray-400">Click to see the opportunity</span>
            </div>
            <div className="space-y-2">
              {orderedGaps.map((gap, i) => {
                const pc = PRIORITY_CONFIG[gap.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
                const isOpen = expandedGap === i;
                return (
                  <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedGap(isOpen ? null : i)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pc.dot}`} />
                      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{gap.gap}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${pc.color}`}>
                        {pc.label}
                      </span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      }
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide mb-1.5">Your Opportunity</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{gap.opportunity}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Your Advantages + Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Your Advantages */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Your Advantages</h3>
              </div>
              <ul className="space-y-2.5">
                {result.your_advantages.map((adv, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-brand-500 mt-0.5 flex-shrink-0">✓</span>
                    {adv}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Recommended Actions</h3>
              </div>
              <ol className="space-y-2.5">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ol>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
