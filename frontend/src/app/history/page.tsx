'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, X, FileText, Play } from 'lucide-react';
import apiClient from '@/lib/apiClient';

/* ─── constants ─────────────────────────────────────────────────────────── */

const PLATFORMS = [
  { value: 'all',       label: 'All',       icon: '🌐' },
  { value: 'instagram', label: 'Instagram',  icon: '📸' },
  { value: 'facebook',  label: 'Facebook',   icon: '👥' },
  { value: 'linkedin',  label: 'LinkedIn',   icon: '💼' },
  { value: 'twitter',   label: 'Twitter/X',  icon: '🐦' },
  { value: 'tiktok',    label: 'TikTok',     icon: '🎵' },
  { value: 'youtube',   label: 'YouTube',    icon: '▶️' },
];

const PLATFORM_ICONS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map(p => [p.value, p.icon])
);

const PLATFORM_BADGES: Record<string, string> = {
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  facebook:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  linkedin:  'bg-sky-100  text-sky-700  dark:bg-sky-900/40  dark:text-sky-300',
  twitter:   'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  tiktok:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  youtube:   'bg-red-100  text-red-700   dark:bg-red-900/40  dark:text-red-300',
};

/* ─── types ──────────────────────────────────────────────────────────────── */

interface PostedItem {
  id: string;
  platform: string;
  content: string;
  hashtags: string[];
  media_url?: string;
  posted_at?: string;
  scheduled_at: string;
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(items: PostedItem[]): [string, PostedItem[]][] {
  const now      = new Date();
  const todayStr = now.toDateString();
  const yestStr  = new Date(now.getTime() - 86_400_000).toDateString();
  const groups: Record<string, PostedItem[]> = {};
  for (const item of items) {
    const ts = item.posted_at ?? item.scheduled_at;
    const ds = new Date(ts).toDateString();
    const label = ds === todayStr ? 'Today' : ds === yestStr ? 'Yesterday'
      : new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    (groups[label] ??= []).push(item);
  }
  return Object.entries(groups);
}

function getMediaUrls(media_url?: string): string[] {
  if (!media_url) return [];
  try { const p = JSON.parse(media_url); return Array.isArray(p) ? p : [media_url]; }
  catch { return [media_url]; }
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
}

/* ─── thumbnail ──────────────────────────────────────────────────────────── */

function Thumbnail({ item, onClick }: { item: PostedItem; onClick: () => void }) {
  const ts        = item.posted_at ?? item.scheduled_at;
  const mediaUrls = getMediaUrls(item.media_url);
  const thumb     = mediaUrls[0] ?? null;
  const isVideo   = thumb ? isVideoUrl(thumb) : false;
  const badgeCls  = PLATFORM_BADGES[item.platform] ?? 'bg-gray-100 text-gray-600';

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg transition-all duration-200 text-left w-full"
    >
      {/* Media preview */}
      {thumb && !isVideo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={thumb}
          alt="post"
          className="w-full aspect-square object-cover"
        />
      )}

      {thumb && isVideo && (
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video
            src={thumb + '#t=0.1'}
            className="w-full h-full object-cover opacity-80"
            preload="metadata"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 text-gray-900 ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      )}

      {!thumb && (
        <div className="w-full aspect-square p-4 flex flex-col justify-between bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-5">
            {item.content}
          </p>
          {item.hashtags?.length > 0 && (
            <p className="text-xs text-brand-500 dark:text-brand-400 truncate mt-2">
              #{item.hashtags.slice(0, 3).join(' #')}
            </p>
          )}
        </div>
      )}

      {/* Carousel badge */}
      {mediaUrls.length > 1 && (
        <span className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          1/{mediaUrls.length}
        </span>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-black/20 transition-colors" />

      {/* Bottom info bar */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{PLATFORM_ICONS[item.platform] ?? '📝'}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeCls}`}>
              {item.platform.charAt(0).toUpperCase() + item.platform.slice(1)}
            </span>
          </div>
          <span className="text-[10px] text-white/80">{formatDate(ts)}</span>
        </div>
      </div>
    </button>
  );
}

/* ─── detail modal ───────────────────────────────────────────────────────── */

function DetailModal({ item, onClose }: { item: PostedItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const ts        = item.posted_at ?? item.scheduled_at;
  const mediaUrls = getMediaUrls(item.media_url);
  const thumb     = mediaUrls[0] ?? null;
  const isVideo   = thumb ? isVideoUrl(thumb) : false;
  const hasMedia  = !!thumb;
  const badgeCls  = PLATFORM_BADGES[item.platform] ?? 'bg-gray-100 text-gray-600';

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleCopy() {
    const text = item.hashtags?.length
      ? `${item.content}\n\n${item.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}`
      : item.content;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-h-[90vh] ${hasMedia ? 'max-w-4xl' : 'max-w-xl'}`}>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Left: media */}
        {hasMedia && !isVideo && (
          <div className="md:w-1/2 bg-black flex items-center justify-center min-h-64 md:min-h-0">
            {mediaUrls.length === 1 ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={mediaUrls[0]} alt="Post media" className="w-full h-full object-contain max-h-[70vh]" />
            ) : (
              <div className="grid grid-cols-2 gap-1 p-2 w-full overflow-y-auto max-h-[70vh]">
                {mediaUrls.map((u, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={i} src={u} alt={`Slide ${i + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            )}
          </div>
        )}

        {hasMedia && isVideo && (
          <div className="md:w-1/2 bg-black flex items-center justify-center min-h-64">
            <video
              src={thumb!}
              controls
              autoPlay
              className="w-full max-h-[70vh] object-contain"
            />
          </div>
        )}

        {/* Right: details */}
        <div className={`flex flex-col p-6 overflow-y-auto ${hasMedia ? 'md:w-1/2' : 'w-full'}`}>

          {/* Platform + posted badge */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xl">{PLATFORM_ICONS[item.platform] ?? '📝'}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
              {item.platform.charAt(0).toUpperCase() + item.platform.slice(1)}
            </span>
            <span className="text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
              ✅ Posted
            </span>
          </div>

          {/* Caption */}
          <div className="flex-1 mb-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Caption</p>
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
              {item.content || '—'}
            </p>
          </div>

          {/* Hashtags */}
          {item.hashtags?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {item.hashtags.map((tag, i) => (
                  <span key={i} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800">
                    #{tag.replace(/^#/, '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Posted at */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
            Posted {formatDateTime(ts)}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
            >
              {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Caption</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── skeleton ───────────────────────────────────────────────────────────── */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────────────── */

export default function PostedHistoryPage() {
  const [posts,    setPosts]   = useState<PostedItem[]>([]);
  const [loading,  setLoading] = useState(true);
  const [platform, setPlatform]= useState('all');
  const [selected, setSelected]= useState<PostedItem | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient.get('/api/v1/schedule/posted')
      .then(r => setPosts(r.data.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = platform === 'all' ? posts : posts.filter(p => p.platform === platform);
  const groups   = groupByDate(filtered);

  const platformCounts = PLATFORMS.slice(1).reduce<Record<string, number>>((acc, p) => {
    acc[p.value] = posts.filter(post => post.platform === p.value).length;
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl">✅</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posted History</h1>
          <p className="text-sm text-gray-500">All content you've published across platforms</p>
        </div>
        <span className="ml-auto text-sm font-medium text-gray-500">
          {posts.length} post{posts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Platform filter */}
      <div className="flex items-center gap-1.5 mb-8 flex-wrap">
        {PLATFORMS.map(p => {
          const count = p.value === 'all' ? posts.length : (platformCounts[p.value] ?? 0);
          if (p.value !== 'all' && count === 0) return null;
          return (
            <button
              key={p.value}
              onClick={() => setPlatform(p.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                platform === p.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span>{p.icon}</span>
              {p.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                platform === p.value ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* States */}
      {loading && <SkeletonGrid />}

      {!loading && filtered.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-4xl mb-4">📭</p>
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No posts yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Content you post via the Schedule Agent will appear here.
          </p>
        </div>
      )}

      {/* Grouped grid */}
      {!loading && groups.length > 0 && (
        <div className="space-y-10">
          {groups.map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{items.length}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map(post => (
                  <Thumbnail
                    key={post.id}
                    item={post}
                    onClick={() => setSelected(post)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <DetailModal
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
