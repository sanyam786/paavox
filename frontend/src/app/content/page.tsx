'use client';

import { useEffect, useState, useCallback } from 'react';
import { Copy, Check, Trash2, Download, X, Play, FileText, ImageIcon, VideoIcon, Layers, Hash } from 'lucide-react';
import apiClient from '@/lib/apiClient';

/* ─── constants ─────────────────────────────────────────────────────────── */

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', twitter: '🐦', linkedin: '💼',
  tiktok: '🎵', youtube: '▶️', facebook: '👥', general: '🌐',
};

// Map legacy content_format values stored as platform → proper platform
const PLATFORM_NORMALISE: Record<string, string> = {
  linkedin_post: 'linkedin', tiktok_script: 'tiktok', reels_script: 'instagram',
  youtube_script: 'youtube', tweet_thread: 'twitter', blog_post: 'general',
  newsletter: 'general', carousel: 'instagram', written: 'general',
};

function normalisePlatform(p: string) { return PLATFORM_NORMALISE[p] ?? p; }

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  caption:        { label: 'Caption',    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', dot: 'bg-purple-400' },
  written:        { label: 'Written',    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', dot: 'bg-indigo-400' },
  image:          { label: 'Image',      color: 'bg-pink-100   text-pink-700   dark:bg-pink-900/40   dark:text-pink-300',   dot: 'bg-pink-400'   },
  video:          { label: 'Video',      color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', dot: 'bg-violet-400' },
  youtube_short:  { label: 'YT Short',   color: 'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300',    dot: 'bg-red-400'    },
  repurposed:     { label: 'Repurposed', color: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300',   dot: 'bg-blue-400'   },
  pipeline:       { label: 'Pipeline',   color: 'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300',  dot: 'bg-green-400'  },
  'trend-based':  { label: 'Trend',      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-400' },
};

const TYPE_TABS = [
  { value: 'all',           label: 'All',        emoji: '◻' },
  { value: 'video',         label: 'Video',      emoji: '🎬' },
  { value: 'youtube_short', label: 'YT Shorts',  emoji: '▶️' },
  { value: 'image',         label: 'Image',      emoji: '🖼️' },
  { value: 'written',       label: 'Written',    emoji: '✏️' },
  { value: 'caption',       label: 'Caption',    emoji: '✍️' },
  { value: 'repurposed',    label: 'Repurposed', emoji: '🔄' },
  { value: 'pipeline',      label: 'Pipeline',   emoji: '🔀' },
  { value: 'trend-based',   label: 'Trend',      emoji: '📈' },
];

const PLATFORM_TABS = ['all', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube', 'facebook'];

/* ─── types ──────────────────────────────────────────────────────────────── */

interface ContentItem {
  id: string;
  platform: string;
  type: string;
  content: string;
  hashtags: string[];
  original_content: string;
  created_at: string;
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function groupByDate(items: ContentItem[]): [string, ContentItem[]][] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yestStr  = new Date(now.getTime() - 86_400_000).toDateString();
  const groups: Record<string, ContentItem[]> = {};
  for (const item of items) {
    const ds = new Date(item.created_at).toDateString();
    const label = ds === todayStr ? 'Today' : ds === yestStr ? 'Yesterday'
      : new Date(item.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    (groups[label] ??= []).push(item);
  }
  return Object.entries(groups);
}

function parseVideoMeta(s: string) { try { return JSON.parse(s); } catch { return {}; } }

function getImageUrls(content: string): string[] {
  try { const p = JSON.parse(content); return Array.isArray(p) ? p : [content]; }
  catch { return [content]; }
}

/* ─── thumbnail ──────────────────────────────────────────────────────────── */

function Thumbnail({ item, onClick }: { item: ContentItem; onClick: () => void }) {
  const platform = normalisePlatform(item.platform);
  const tc = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.caption;
  const isImage = item.type === 'image';
  const isVideo = item.type === 'video' || item.type === 'youtube_short';

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg transition-all duration-200 text-left w-full"
    >
      {/* Media preview */}
      {isImage && (() => {
        const urls = getImageUrls(item.content);
        return (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={urls[0]}
            alt="Content"
            className="w-full aspect-square object-cover"
          />
        );
      })()}

      {isVideo && (
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video
            src={item.content + '#t=0.1'}
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

      {!isImage && !isVideo && (
        <div className="w-full aspect-square p-4 flex flex-col justify-between bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750">
          <div className="flex-1 overflow-hidden">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-5">
              {item.content}
            </p>
          </div>
          {item.hashtags?.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Hash className="w-3 h-3 text-brand-400 flex-shrink-0" />
              <p className="text-xs text-brand-500 dark:text-brand-400 truncate">
                {item.hashtags.slice(0, 3).join(' #')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-black/20 transition-colors" />

      {/* Bottom info bar */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{PLATFORM_ICONS[platform] ?? '📝'}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tc.color}`}>
              {tc.label}
            </span>
          </div>
          <span className="text-[10px] text-white/80">{formatDate(item.created_at)}</span>
        </div>
      </div>
    </button>
  );
}

/* ─── detail modal ───────────────────────────────────────────────────────── */

function DetailModal({ item, onClose, onDelete }: {
  item: ContentItem;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied]       = useState(false);
  const [downloading, setDl]      = useState(false);
  const platform = normalisePlatform(item.platform);
  const tc   = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.caption;
  const meta = parseVideoMeta(item.original_content);
  const isImage = item.type === 'image';
  const isVideo = item.type === 'video' || item.type === 'youtube_short';
  const isShort = item.type === 'youtube_short';
  const hasMedia = isImage || isVideo;

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleCopy() {
    const text = item.hashtags?.length
      ? `${item.content}\n\n${item.hashtags.map(h => `#${h}`).join(' ')}`
      : item.content;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload() {
    setDl(true);
    try {
      const resp    = await fetch(item.content);
      const blob    = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href        = blobUrl;
      a.download    = `content-${Date.now()}.${isShort || isVideo ? 'mp4' : 'jpg'}`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } finally { setDl(false); }
  }

  function handleDeleteClick() {
    if (!confirm('Delete this content item?')) return;
    onDelete();
    onClose();
  }

  const imageUrls = isImage ? getImageUrls(item.content) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row w-full max-h-[90vh] ${hasMedia ? 'max-w-4xl' : 'max-w-xl'}`}>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Left: media */}
        {isImage && (
          <div className="md:w-1/2 bg-black flex items-center justify-center min-h-64 md:min-h-0">
            {imageUrls.length === 1 ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={imageUrls[0]} alt="Generated" className="w-full h-full object-contain max-h-[70vh]" />
            ) : (
              <div className="grid grid-cols-2 gap-1 p-2 w-full">
                {imageUrls.map((u, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img key={i} src={u} alt={`Slide ${i + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            )}
          </div>
        )}

        {isVideo && (
          <div className="md:w-1/2 bg-black flex items-center justify-center min-h-64">
            <video
              src={item.content}
              controls
              autoPlay
              className="w-full max-h-[70vh] object-contain"
            />
          </div>
        )}

        {/* Right (or full-width for text): details */}
        <div className={`flex flex-col p-6 overflow-y-auto ${hasMedia ? 'md:w-1/2' : 'w-full'}`}>

          {/* Meta row */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{PLATFORM_ICONS[platform] ?? '📝'}</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize">{platform}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tc.color}`}>{tc.label}</span>
          </div>

          {/* Video meta tags */}
          {isVideo && !isShort && (meta.style || meta.aspect_ratio || meta.duration) && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {meta.style      && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full capitalize text-gray-600 dark:text-gray-300">{meta.style}</span>}
              {meta.aspect_ratio && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">{meta.aspect_ratio}</span>}
              {meta.duration   && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">{meta.duration}s</span>}
            </div>
          )}

          {/* YouTube Short meta */}
          {isShort && (
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {meta.duration && <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">{meta.duration}s</span>}
                <span className="text-xs bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">9:16 Vertical</span>
              </div>
              {meta.source_url && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  Source: <a href={meta.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-500">{meta.source_url}</a>
                </p>
              )}
              <p className="text-xs text-amber-600 dark:text-amber-400">⏳ Auto-deleted after 10 days</p>
            </div>
          )}

          {/* Content / caption */}
          {!isImage && !isShort && (
            <div className="flex-1 mb-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                {isVideo ? 'Topic' : 'Content'}
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                {isVideo ? (meta.topic || item.original_content || '—') : item.content}
              </p>
            </div>
          )}

          {/* Image description */}
          {isImage && item.original_content && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">{item.original_content}</p>
            </div>
          )}

          {/* Hashtags */}
          {item.hashtags?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {item.hashtags.map(tag => (
                  <span key={tag} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Date */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">{formatDateTime(item.created_at)}</p>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            {!isImage && !isVideo && (
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            )}
            {(isImage || isVideo) && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Downloading…' : 'Download'}
              </button>
            )}
            {isVideo && (
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm transition-colors"
                title="Copy video URL"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleDeleteClick}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-100 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950 text-red-500 text-sm transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── skeleton grid ──────────────────────────────────────────────────────── */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────────────────── */

export default function ContentPage() {
  const [items,          setItems]   = useState<ContentItem[]>([]);
  const [loading,        setLoading] = useState(true);
  const [fetchError,     setFetchError] = useState('');
  const [typeFilter,     setType]    = useState('all');
  const [platformFilter, setPlatform]= useState('all');
  const [selected,       setSelected]= useState<ContentItem | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter     !== 'all') params.set('type',     typeFilter);
    if (platformFilter !== 'all') params.set('platform', platformFilter);
    const url = `/api/v1/content/${params.toString() ? '?' + params.toString() : ''}`;
    setLoading(true);
    setFetchError('');
    apiClient.get(url)
      .then(r => setItems(r.data?.items ?? []))
      .catch(() => setFetchError('Failed to load content — please refresh.'))
      .finally(() => setLoading(false));
  }, [typeFilter, platformFilter]);

  const handleDelete = useCallback(async (id: string) => {
    await apiClient.delete(`/api/v1/content/${id}`);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const groups = groupByDate(items);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">My Content</h1>
        <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {TYPE_TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === t.value
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Platform filter */}
      <div className="flex gap-1.5 mb-8 flex-wrap">
        {PLATFORM_TABS.map(p => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              platformFilter === p
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            {p === 'all' ? 'All Platforms' : `${PLATFORM_ICONS[p]} ${p.charAt(0).toUpperCase() + p.slice(1)}`}
          </button>
        ))}
      </div>

      {/* States */}
      {fetchError && !loading && (
        <div className="card p-6 text-center border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">⚠️ {fetchError}</p>
          <button
            onClick={() => { setFetchError(''); setLoading(true); apiClient.get(`/api/v1/content/`).then(r => setItems(r.data?.items ?? [])).catch(() => setFetchError('Failed to load content — please refresh.')).finally(() => setLoading(false)); }}
            className="text-xs text-red-500 underline"
          >
            Try again
          </button>
        </div>
      )}
      {loading && <SkeletonGrid />}

      {!loading && items.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-4xl mb-4">📭</p>
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No content yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Generate content with any agent — captions, images, videos, or written content — and it will appear here.
          </p>
        </div>
      )}

      {/* Grouped grid */}
      {!loading && groups.length > 0 && (
        <div className="space-y-10">
          {groups.map(([dateLabel, groupItems]) => (
            <div key={dateLabel}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">
                  {dateLabel}
                </span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{groupItems.length}</span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {groupItems.map(item => (
                  <Thumbnail
                    key={item.id}
                    item={item}
                    onClick={() => setSelected(item)}
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
          onDelete={() => handleDelete(selected.id)}
        />
      )}
    </div>
  );
}
