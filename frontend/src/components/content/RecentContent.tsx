'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const PLATFORM_META: Record<string, { label: string; icon: string; dot: string }> = {
  instagram: { label: 'Instagram', icon: '📸', dot: 'bg-pink-500' },
  facebook:  { label: 'Facebook',  icon: '👥', dot: 'bg-blue-500' },
  linkedin:  { label: 'LinkedIn',  icon: '💼', dot: 'bg-sky-500' },
  twitter:   { label: 'Twitter/X', icon: '🐦', dot: 'bg-slate-500' },
  tiktok:    { label: 'TikTok',    icon: '🎵', dot: 'bg-purple-500' },
  youtube:   { label: 'YouTube',   icon: '▶️', dot: 'bg-red-500' },
};

interface ContentItem {
  id: string;
  platform: string;
  type: string;
  content: string;
  hashtags: string[];
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RecentContent() {
  const [items, setItems]   = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/v1/content/recent?limit=5')
      .then(res => setItems(res.data?.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => (
          <div key={i} className="card h-16 shimmer" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-3xl mb-3">✍️</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No content yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Generate your first caption to get started.</p>
        <Link href="/agents/caption" className="btn-primary text-sm py-2">
          Generate a caption →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const meta = PLATFORM_META[item.platform];
        return (
          <div
            key={item.id}
            className="card p-3.5 flex items-center gap-3 hover:border-gray-200 dark:hover:border-white/10 group transition-all duration-150"
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] flex items-center justify-center flex-shrink-0 text-lg">
              {meta?.icon ?? '📝'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} flex-shrink-0`} />}
                  {meta?.label ?? item.platform}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 ml-auto">
                  <Clock className="w-3 h-3" />
                  {timeAgo(item.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.content}</p>
              {item.hashtags?.length > 0 && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5 truncate opacity-70">
                  {item.hashtags.slice(0, 4).map(h => `#${h.replace(/^#/, '')}`).join(' ')}
                  {item.hashtags.length > 4 && ` +${item.hashtags.length - 4}`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
