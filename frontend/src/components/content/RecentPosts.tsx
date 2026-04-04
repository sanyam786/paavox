'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, ImageIcon, FileText, Layers } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const PLATFORM_META: Record<string, { label: string; icon: string; dot: string }> = {
  instagram: { label: 'Instagram', icon: '📸', dot: 'bg-pink-500' },
  facebook:  { label: 'Facebook',  icon: '👥', dot: 'bg-blue-500' },
  linkedin:  { label: 'LinkedIn',  icon: '💼', dot: 'bg-sky-500' },
  twitter:   { label: 'Twitter/X', icon: '🐦', dot: 'bg-slate-500' },
  tiktok:    { label: 'TikTok',    icon: '🎵', dot: 'bg-purple-500' },
  youtube:   { label: 'YouTube',   icon: '▶️', dot: 'bg-red-500' },
};

interface PostedItem {
  id: string;
  platform: string;
  content: string;
  media_url?: string;
  posted_at?: string;
  scheduled_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RecentPosts() {
  const [posts, setPosts]     = useState<PostedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/v1/schedule/posted')
      .then(({ data }) => setPosts((data.posts ?? []).slice(0, 5)))
      .catch(() => {})
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

  if (posts.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-3xl mb-3">🚀</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nothing posted yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Use the Schedule Agent to publish content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map(post => {
        const meta = PLATFORM_META[post.platform];
        const postedAt = post.posted_at ?? post.scheduled_at;

        const mediaUrls: string[] = (() => {
          if (!post.media_url) return [];
          try {
            const parsed = JSON.parse(post.media_url);
            return Array.isArray(parsed) ? parsed : [post.media_url];
          } catch { return [post.media_url]; }
        })();
        const thumbUrl   = mediaUrls[0] ?? null;
        const isCarousel = mediaUrls.length > 1;

        return (
          <div
            key={post.id}
            className="card p-3.5 flex items-center gap-3 hover:border-gray-200 dark:hover:border-white/10 transition-all duration-150"
          >
            {/* Thumbnail */}
            {thumbUrl ? (
              <div className="relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl}
                  alt="post media"
                  className="w-10 h-10 rounded-lg object-cover border border-gray-100 dark:border-white/[0.06]"
                />
                {isCarousel && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Layers className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} flex-shrink-0`} />}
                  {meta?.label ?? post.platform}
                </span>
                {thumbUrl && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <ImageIcon className="w-2.5 h-2.5" />
                    {isCarousel ? `${mediaUrls.length}` : 'Photo'}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 ml-auto">
                  <Clock className="w-3 h-3" />
                  {timeAgo(postedAt)}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{post.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
