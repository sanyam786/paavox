'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Copy, CheckCircle2, Users, Target, Lightbulb } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'tiktok',    label: 'TikTok',    icon: '🎵' },
  { value: 'youtube',   label: 'YouTube',   icon: '▶️' },
  { value: 'twitter',   label: 'Twitter/X', icon: '🐦' },
  { value: 'linkedin',  label: 'LinkedIn',  icon: '💼' },
];

const FOLLOWER_RANGES = [
  { value: '1K–10K',    label: 'Nano (1K–10K)' },
  { value: '10K–100K',  label: 'Micro (10K–100K)' },
  { value: '100K–1M',   label: 'Macro (100K–1M)' },
  { value: '1M+',       label: 'Mega (1M+)' },
];

const ENGAGEMENT_BADGE: Record<string, string> = {
  high:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-500',
};

interface Influencer {
  name: string;
  estimated_followers: string;
  content_style: string;
  why_fit: string;
  engagement_level: 'high' | 'medium' | 'low';
  outreach_dm: string;
}

interface InfluencerResult {
  influencers: Influencer[];
  campaign_brief: string;
  tips: string[];
}

export default function InfluencerAgentPage() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const [niche, setNiche]               = useState('');

  useEffect(() => {
    if (settingsLoaded && settings.niche) setNiche(settings.niche);
  }, [settingsLoaded]); // eslint-disable-line
  const [platform, setPlatform]         = useState('instagram');
  const [followerRange, setFollowerRange] = useState('10K–100K');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<InfluencerResult | null>(null);
  const [error, setError]               = useState('');
  const [copied, setCopied]             = useState<string | null>(null);
  const [expanded, setExpanded]         = useState<number | null>(null);

  async function handleFind() {
    if (!niche.trim() || !campaignGoal.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await apiClient.post('/api/v1/influencer/find', {
        niche,
        platform,
        follower_range: followerRange,
        campaign_goal: campaignGoal,
        brand_name: settings.niche || '',
        location: settings.location || '',
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Something went wrong.');
    } finally { setLoading(false); }
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-xl">🌟</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Influencer Manager</h1>
          <p className="text-sm text-gray-500">Find the right influencers and get personalised outreach messages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Inputs */}
        <div className="space-y-5">
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Your niche</label>
            <input
              type="text"
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. sustainable fashion"
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {settingsLoaded && settings.niche && niche !== settings.niche && (
              <button
                onClick={() => setNiche(settings.niche)}
                className="mt-1 text-xs text-brand-600 hover:underline"
              >
                ↩ Reset to brand profile
              </button>
            )}
          </div>

          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Platform</label>
            <div className="space-y-1.5">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    platform === p.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Influencer size</label>
            <div className="space-y-1.5">
              {FOLLOWER_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setFollowerRange(r.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    followerRange === r.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Campaign goal</label>
            <textarea
              value={campaignGoal}
              onChange={e => setCampaignGoal(e.target.value)}
              placeholder="e.g. Promote our new eco-friendly product launch and drive Instagram followers"
              rows={3}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          <button
            onClick={handleFind}
            disabled={loading || !niche.trim() || !campaignGoal.trim()}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Searching…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Find Influencers</>
            )}
          </button>
        </div>

        {/* RIGHT: Results */}
        <div className="lg:col-span-2 space-y-4">
          {!result && !loading && !error && (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center text-3xl mb-4">🌟</div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Influencer matches will appear here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Fill in your niche, platform, and campaign goal</p>
            </div>
          )}

          {error && <div className="card p-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950"><p className="text-sm text-red-600 dark:text-red-400">⚠️ {error}</p></div>}

          {loading && (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-10 h-10 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500">Finding the best influencer matches…</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Campaign brief */}
              <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3.5 h-3.5 text-yellow-700 dark:text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Campaign Brief</span>
                </div>
                <p className="text-sm text-yellow-900 dark:text-yellow-300">{result.campaign_brief}</p>
              </div>

              {/* Influencer cards */}
              <div className="space-y-3">
                {result.influencers.map((inf, i) => (
                  <div key={i} className="card p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-gray-900 dark:text-white">{inf.name}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ENGAGEMENT_BADGE[inf.engagement_level]}`}>
                            {inf.engagement_level} engagement
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                          <Users className="w-3 h-3" />
                          {inf.estimated_followers} followers
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-1"><span className="font-medium text-gray-600 dark:text-gray-400">Style:</span> {inf.content_style}</p>
                    <p className="text-xs text-gray-500 mb-3"><span className="font-medium text-gray-600 dark:text-gray-400">Why they fit:</span> {inf.why_fit}</p>

                    {/* DM */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Outreach DM</span>
                        <button
                          onClick={() => copyText(inf.outreach_dm, `dm-${i}`)}
                          className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-brand-600 transition-colors"
                        >
                          {copied === `dm-${i}`
                            ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Copied</>
                            : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                        </button>
                      </div>
                      <p className={`text-sm text-gray-700 dark:text-gray-300 ${expanded === i ? '' : 'line-clamp-3'}`}>
                        {inf.outreach_dm}
                      </p>
                      <button
                        onClick={() => setExpanded(expanded === i ? null : i)}
                        className="text-xs text-brand-600 mt-1 hover:underline"
                      >
                        {expanded === i ? 'Show less' : 'Show full DM'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              {result.tips?.length > 0 && (
                <div className="card p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Lightbulb className="w-4 h-4 text-brand-500" />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Pro Tips</span>
                  </div>
                  <ul className="space-y-1.5">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-brand-500 font-bold flex-shrink-0">·</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
