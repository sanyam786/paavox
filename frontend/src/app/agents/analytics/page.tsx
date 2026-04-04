'use client';

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, BarChart2, CheckCircle2, Lightbulb, Star, ImageIcon, FileText, Users, Handshake } from 'lucide-react';
import apiClient from '@/lib/apiClient';

interface Overview {
  total_content: number;
  total_scheduled: number;
  total_posted: number;
  total_agent_runs: number;
  platform_breakdown: Record<string, number>;
  posted_platform_breakdown: Record<string, number>;
  posts_with_image: number;
  posts_text_only: number;
  agent_breakdown: Record<string, number>;
  weekly_activity: { week: string; count: number }[];
  weekly_posted: { week: string; count: number }[];
  influencer_stats: {
    total_runs: number;
    top_niches: { niche: string; count: number }[];
    top_platforms: { platform: string; count: number }[];
  };
  collab_stats: {
    total_runs: number;
    top_collab_types: { type: string; count: number }[];
    top_platforms: { platform: string; count: number }[];
    top_niches: { niche: string; count: number }[];
  };
}

interface Recommendation { title: string; detail: string; priority: 'high' | 'medium' | 'low'; }
interface Insights {
  summary: string;
  strengths: string[];
  opportunities: string[];
  recommendations: Recommendation[];
  top_platform: string;
  content_score: number;
}

const PRIORITY_STYLE = {
  high:   'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  low:    'bg-gray-50 text-gray-600 border-gray-100',
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', twitter: '🐦', linkedin: '💼',
  facebook: '👥', tiktok: '🎵', youtube: '▶️',
};

const COLLAB_TYPE_LABELS: Record<string, string> = {
  podcast_guest:  'Podcast Guest',
  cross_promotion: 'Cross Promotion',
  co_created:     'Co-created Content',
  newsletter_swap: 'Newsletter Swap',
  ig_takeover:    'IG Takeover',
  joint_webinar:  'Joint Webinar',
  affiliate:      'Affiliate',
  brand_collab:   'Brand Collab',
};

const AGENT_LABELS: Record<string, string> = {
  caption:       'Caption',
  repurpose:     'Repurposing',
  trend:         'Trend',
  schedule:      'Schedule',
  analytics:     'Analytics',
  comment_reply:  'Comment Reply',
  influencer:     'Influencer',
  content_writer:   'Content Writer',
  image_generator:  'Image Generator',
  persona_builder:  'Persona Builder',
  collab:        'Collab & Outreach',
};

const BAR_MAX_PX = 96;

function BarChart({ data, color = 'bg-brand-500' }: { data: { week: string; count: number }[]; color?: string }) {
  const max = Math.max(...data.map(w => w.count), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: `${BAR_MAX_PX + 20}px` }}>
      {data.map((w, i) => (
        <div key={i} className="flex-1 flex flex-col items-end gap-1">
          <div
            className={`w-full ${color} rounded-t-sm transition-all`}
            style={{
              height: `${Math.max((w.count / max) * BAR_MAX_PX, w.count > 0 ? 6 : 2)}px`,
              opacity: w.count === 0 ? 0.15 : 1,
            }}
          />
          <span className="text-gray-400 dark:text-gray-500 whitespace-nowrap w-full text-center" style={{ fontSize: '9px' }}>{w.week}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressList({ items, max }: { items: { label: string; count: number; icon?: string }[]; max: number }) {
  return (
    <div className="space-y-2.5">
      {items.map(({ label, count, icon }) => (
        <div key={label} className="flex items-center gap-2">
          {icon && <span className="text-base w-5">{icon}</span>}
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{label}</span>
              <span className="text-gray-400 dark:text-gray-500">{count}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsAgentPage() {
  const [overview, setOverview]     = useState<Overview | null>(null);
  const [insights, setInsights]     = useState<Insights | null>(null);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => { loadOverview(); }, []);

  async function loadOverview() {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/api/v1/analytics/overview');
      setOverview(data);
    } catch { setError('Failed to load analytics.'); }
    finally { setLoading(false); }
  }

  async function handleGenerateInsights() {
    setGenerating(true); setError('');
    try {
      const { data } = await apiClient.post('/api/v1/analytics/insights');
      setInsights(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to generate insights.');
    } finally { setGenerating(false); }
  }

  const maxPlatform       = Math.max(...Object.values(overview?.platform_breakdown ?? {}), 1);
  const maxPostedPlatform = Math.max(...Object.values(overview?.posted_platform_breakdown ?? {}), 1);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl">📊</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Insights Agent</h1>
          <p className="text-sm text-gray-500">Understand your content performance and get AI-powered recommendations</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : overview && (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Content Generated', value: overview.total_content,    icon: '✍️', color: 'bg-purple-50 text-purple-600' },
              { label: 'Posts Scheduled',   value: overview.total_scheduled,  icon: '🗓️', color: 'bg-orange-50 text-orange-600' },
              { label: 'Posts Published',   value: overview.total_posted,     icon: '🚀', color: 'bg-green-50 text-green-600' },
              { label: 'Agent Runs',        value: overview.total_agent_runs, icon: '🤖', color: 'bg-blue-50 text-blue-600' },
            ].map(stat => (
              <div key={stat.label} className="card p-5">
                <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center text-lg mb-3`}>{stat.icon}</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* ── Weekly charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Content Created — Last 8 Weeks</h3>
              </div>
              <BarChart data={overview.weekly_activity} color="bg-brand-500" />
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Content Posted — Last 8 Weeks</h3>
              </div>
              <BarChart data={overview.weekly_posted} color="bg-green-500" />
            </div>
          </div>

          {/* ── Platform breakdowns ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Content Generated by Platform</h3>
              </div>
              {Object.keys(overview.platform_breakdown).length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">No content yet</p>
              ) : (
                <ProgressList
                  items={Object.entries(overview.platform_breakdown).sort((a,b)=>b[1]-a[1]).map(([p,c])=>({ label: p, count: c, icon: PLATFORM_ICONS[p] }))}
                  max={maxPlatform}
                />
              )}
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Content Posted by Platform</h3>
              </div>
              {Object.keys(overview.posted_platform_breakdown).length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center mt-8">No posts published yet</p>
              ) : (
                <>
                  <ProgressList
                    items={Object.entries(overview.posted_platform_breakdown).sort((a,b)=>b[1]-a[1]).map(([p,c])=>({ label: p, count: c, icon: PLATFORM_ICONS[p] }))}
                    max={maxPostedPlatform}
                  />
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                      <span>{overview.posts_with_image} with image</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                      <span>{overview.posts_text_only} text only</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Influencer & Collab stats ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Influencer Manager */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-yellow-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">AI Influencer Manager</h3>
                <span className="ml-auto text-xs bg-yellow-50 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">
                  {overview.influencer_stats.total_runs} searches
                </span>
              </div>
              {overview.influencer_stats.total_runs === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No influencer searches yet</p>
              ) : (
                <div className="space-y-4">
                  {overview.influencer_stats.top_niches.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Niches Searched</p>
                      <div className="flex flex-wrap gap-1.5">
                        {overview.influencer_stats.top_niches.map(({ niche, count }) => (
                          <span key={niche} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded-full font-medium">
                            {niche} <span className="opacity-60">×{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {overview.influencer_stats.top_platforms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platforms Searched</p>
                      <div className="flex flex-wrap gap-1.5">
                        {overview.influencer_stats.top_platforms.map(({ platform, count }) => (
                          <span key={platform} className="text-xs bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-full font-medium">
                            {PLATFORM_ICONS[platform]} {platform} <span className="opacity-60">×{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Collab & Outreach */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Handshake className="w-4 h-4 text-teal-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Collab & Outreach</h3>
                <span className="ml-auto text-xs bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-full">
                  {overview.collab_stats.total_runs} searches
                </span>
              </div>
              {overview.collab_stats.total_runs === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No collab searches yet</p>
              ) : (
                <div className="space-y-4">
                  {overview.collab_stats.top_collab_types.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Collab Types</p>
                      <div className="flex flex-wrap gap-1.5">
                        {overview.collab_stats.top_collab_types.map(({ type, count }) => (
                          <span key={type} className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full font-medium">
                            {COLLAB_TYPE_LABELS[type] ?? type} <span className="opacity-60">×{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {overview.collab_stats.top_niches.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Niches</p>
                      <div className="flex flex-wrap gap-1.5">
                        {overview.collab_stats.top_niches.map(({ niche, count }) => (
                          <span key={niche} className="text-xs bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-full font-medium">
                            {niche} <span className="opacity-60">×{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {overview.collab_stats.top_platforms.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platforms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {overview.collab_stats.top_platforms.map(({ platform, count }) => (
                          <span key={platform} className="text-xs bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-full font-medium">
                            {PLATFORM_ICONS[platform]} {platform} <span className="opacity-60">×{count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Agent usage ── */}
          {Object.keys(overview.agent_breakdown).length > 0 && (
            <div className="card p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">Agent Usage</h3>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(overview.agent_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([agent, count]) => (
                    <div key={agent} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2">
                      <span className="text-sm font-semibold text-brand-600">{count}×</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{AGENT_LABELS[agent] ?? agent} Agent</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── AI Insights ── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI Strategy Insights</h2>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={generating || loading}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            {generating ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analysing…</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Generate Insights</>
            )}
          </button>
        </div>

        {error && <p className="text-sm text-red-500 mb-4">⚠️ {error}</p>}

        {!insights && !generating && (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-2xl mx-auto mb-3">💡</div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Get personalised strategy insights</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">AI will analyse your content patterns and recommend improvements</p>
          </div>
        )}

        {insights && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <div className="flex-shrink-0 text-center">
                <div className="text-3xl font-bold text-indigo-600">{insights.content_score}</div>
                <div className="text-xs text-indigo-400">/10</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(insights.content_score / 2) ? 'text-indigo-500 fill-indigo-500' : 'text-indigo-200'}`} />
                  ))}
                </div>
                <p className="text-sm text-indigo-800 dark:text-indigo-200">{insights.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Strengths</h4>
                <div className="space-y-2">
                  {insights.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Opportunities</h4>
                <div className="space-y-2">
                  {insights.opportunities.map((o, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">{o}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recommendations</h4>
              <div className="space-y-3">
                {insights.recommendations.map((rec, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${PRIORITY_STYLE[rec.priority]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide">{rec.priority}</span>
                      <span className="font-semibold text-sm">{rec.title}</span>
                    </div>
                    <p className="text-sm opacity-80">{rec.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {insights.top_platform && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                🎯 Focus platform: <span className="font-semibold text-gray-600 dark:text-gray-400 capitalize">{insights.top_platform}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
