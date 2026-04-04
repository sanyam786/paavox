'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Sparkles, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  twitter: '🐦',
  linkedin: '💼',
  tiktok: '🎵',
  youtube: '▶️',
  facebook: '👥',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return 'bg-green-100 text-green-700';
  if (score >= 6) return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
};

interface TrendItem {
  id: string;
  platform: string;
  content: string;
  hashtags: string[];
  original_content: string; // niche
  created_at: string;
}

interface ParsedTrend {
  id: string;
  topic: string;
  score: number | null;
  content_ideas: string[];
  hashtags: string[];
  platform: string;
  niche: string;
  created_at: string;
}

function parseTrendItem(item: TrendItem): ParsedTrend {
  // content format: "Trend: {topic}\n\nContent Ideas:\n• {idea1}\n• {idea2}"
  const lines = item.content.split('\n');
  const topic = lines[0]?.replace(/^Trend:\s*/i, '').trim() ?? 'Unknown trend';
  const ideasStart = lines.findIndex(l => l.toLowerCase().includes('content ideas'));
  const ideas = ideasStart >= 0
    ? lines.slice(ideasStart + 1).filter(l => l.trim()).map(l => l.replace(/^[•\-]\s*/, '').trim()).filter(Boolean)
    : [];

  return {
    id: item.id,
    topic,
    score: null,
    content_ideas: ideas,
    hashtags: item.hashtags ?? [],
    platform: item.platform,
    niche: item.original_content ?? '',
    created_at: item.created_at,
  };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TrendsPage() {
  const [items, setItems] = useState<ParsedTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [nicheFilter, setNicheFilter] = useState<string>('');

  useEffect(() => {
    apiClient.get('/api/v1/content/', { params: { type: 'trend-based' } })
      .then(r => setItems((r.data.items as TrendItem[]).map(parseTrendItem)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/v1/content/${id}`);
      setItems(prev => prev.filter(t => t.id !== id));
    } catch {}
    setDeletingId(null);
  }

  const niches = Array.from(new Set(items.map(t => t.niche).filter(Boolean)));
  const filtered = nicheFilter ? items.filter(t => t.niche === nicheFilter) : items;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded w-1/3 animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-50 dark:bg-gray-800/50" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl">📈</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trending Topics</h1>
            <p className="text-sm text-gray-500">Your saved trend research and content ideas</p>
          </div>
        </div>
        <Link
          href="/agents/trends"
          className="flex items-center gap-2 btn-primary text-sm py-2 px-4"
        >
          <Sparkles className="w-4 h-4" />
          Discover new trends
        </Link>
      </div>

      {/* Niche filter pills */}
      {niches.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setNicheFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !nicheFilter
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            All niches
          </button>
          {niches.map(n => (
            <button
              key={n}
              onClick={() => setNicheFilter(n === nicheFilter ? '' : n)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                nicheFilter === n
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-3xl mb-4">📈</div>
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No saved trends yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
            Use the Trend Agent to discover trending topics and save the ones you want to act on.
          </p>
          <Link href="/agents/trends" className="btn-primary text-sm py-2 px-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Discover trends
          </Link>
        </div>
      )}

      {/* Trend cards */}
      <div className="space-y-3">
        {filtered.map(trend => (
          <div key={trend.id} className="card overflow-hidden">
            <div className="flex items-center gap-4 p-5">
              <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-lg flex-shrink-0">
                📈
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{trend.topic}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {trend.niche && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">#{trend.niche}</span>
                  )}
                  <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {PLATFORM_ICONS[trend.platform] ?? '🌐'} {trend.platform}
                  </span>
                  <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(trend.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setExpanded(expanded === trend.id ? null : trend.id)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {expanded === trend.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {trend.content_ideas.length} ideas
                </button>
                <button
                  onClick={() => handleDelete(trend.id)}
                  disabled={deletingId === trend.id}
                  className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors disabled:opacity-40"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expanded === trend.id && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-4 bg-gray-50/50 dark:bg-gray-800/50">
                {trend.content_ideas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">💡 Content Ideas</p>
                    <ul className="space-y-2">
                      {trend.content_ideas.map((idea, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">→</span>
                          {idea}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {trend.hashtags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"># Hashtags</p>
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

                <div className="flex items-center gap-4 pt-1">
                  <Link
                    href={`/agents/caption?topic=${encodeURIComponent(trend.topic)}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate caption →
                  </Link>
                  <Link
                    href={`/agents/schedule?topic=${encodeURIComponent(trend.topic)}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    🗓️ Schedule content →
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">
          {filtered.length} saved trend{filtered.length !== 1 ? 's' : ''}
          {nicheFilter ? ` in "${nicheFilter}"` : ''}
        </p>
      )}
    </div>
  );
}
