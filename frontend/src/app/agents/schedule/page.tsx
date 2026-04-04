'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Clock, Plus, Trash2, CheckCircle2, Calendar, Send, Flag } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useSettings } from '@/lib/useSettings';

// postNow: 'full' | 'text-only' | 'paid' | 'soon'
const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: '📸', postNow: 'full' },
  { value: 'facebook',  label: 'Facebook',  icon: '👥', postNow: 'full' },
  { value: 'linkedin',  label: 'LinkedIn',  icon: '💼', postNow: 'full' },
  { value: 'twitter',   label: 'Twitter/X', icon: '🐦', postNow: 'soon' },
  { value: 'tiktok',    label: 'TikTok',    icon: '🎵', postNow: 'soon' },
  { value: 'youtube',   label: 'YouTube',   icon: '▶️', postNow: 'soon' },
];

const POST_NOW_BADGE: Record<string, { label: string; cls: string }> = {
  'full':      { label: 'Post Now ✓',   cls: 'bg-green-100 text-green-700' },
  'text-only': { label: 'Text only',    cls: 'bg-yellow-100 text-yellow-700' },
  'soon':      { label: 'Coming soon',  cls: 'bg-gray-100 text-gray-400' },
};

const FREQUENCIES = ['daily', '3x per week', 'weekly'];
const SCORE_COLOR = (s: number) =>
  s >= 8.5 ? 'bg-green-100 text-green-700' : s >= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';

const DAYS_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

interface Slot { day: string; time: string; score: number; reason: string; }
interface PlatformRec { platform: string; slots: Slot[]; }
interface ScheduleResult { recommendations: PlatformRec[]; summary: string; }
interface QueuePost { id: string; platform: string; content: string; hashtags: string[]; scheduled_at: string; status: string; media_url?: string; }

// Next occurrence of a given day name from today
function nextDate(dayName: string, time: string): string {
  const days = DAYS_ORDER;
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // 0=Mon
  const targetIdx = days.indexOf(dayName);
  let diff = targetIdx - todayIdx;
  if (diff <= 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  const [h, m] = time.split(':');
  d.setHours(parseInt(h), parseInt(m), 0, 0);
  return d.toISOString();
}

function formatScheduledAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ScheduleAgentPageInner() {
  const { settings, loaded: settingsLoaded } = useSettings();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [content, setContent]       = useState('');
  const [platforms, setPlatforms]   = useState<string[]>([]);
  const [frequency, setFrequency]   = useState('daily');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<ScheduleResult | null>(null);
  const [error, setError]           = useState('');
  const [queue, setQueue]           = useState<QueuePost[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queuing, setQueuing]       = useState<string | null>(null);
  const [queued, setQueued]         = useState<Set<string>>(new Set());
  const [mediaUrl, setMediaUrl]     = useState('');
  const [isVideo, setIsVideo]       = useState(false);
  const [carouselUrls, setCarouselUrls] = useState<string[]>([]); // all images when from a carousel pipeline
  const [uploading, setUploading]   = useState(false);
  const [posting, setPosting]       = useState<string | null>(null);
  const [posted, setPosted]         = useState<Set<string>>(new Set());
  const [postingAll, setPostingAll]         = useState(false);
  const [postedPlatforms, setPostedPlatforms] = useState<Set<string>>(new Set());
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [completingPipeline, setCompletingPipeline] = useState(false);
  const [pipelineCompleted, setPipelineCompleted]   = useState(false);

  const TEXT_POSTING_SUPPORTED = ['twitter', 'linkedin', 'facebook'];
  const MEDIA_POSTING_SUPPORTED = ['instagram'];
  const ALL_POST_NOW_SUPPORTED = [...TEXT_POSTING_SUPPORTED, ...MEDIA_POSTING_SUPPORTED];
  const instagramSelected = platforms.includes('instagram');
  const anyPostNowPlatform = platforms.some(p => ALL_POST_NOW_SUPPORTED.includes(p));
  const supportedSelected = platforms.filter(p => ALL_POST_NOW_SUPPORTED.includes(p));
  const allPosted = supportedSelected.length > 0 && supportedSelected.every(p => postedPlatforms.has(p));

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.active_platforms.length > 0) setPlatforms(settings.active_platforms);
    if (settings.posting_frequency) setFrequency(settings.posting_frequency);
  }, [settingsLoaded]); // eslint-disable-line

  // Pre-fill from pipeline if navigated from pipeline wizard
  useEffect(() => {
    const pipelineId = searchParams.get('pipelineId');
    if (!pipelineId) return;
    setPipelineId(pipelineId);
    apiClient.get(`/api/v1/pipeline/${pipelineId}`).then(({ data }) => {
      // Unwrap content_body if the LLM stored it as a JSON object {title, body}.
      // Handles both valid JSON and invalid JSON with unescaped newlines in string values.
      const unwrap = (raw: string): string => {
        if (!raw?.trim().startsWith('{')) return raw;
        // 1. Try valid JSON first
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return parsed.body || parsed.content || parsed.text ||
              Object.values(parsed).filter((v): v is string => typeof v === 'string' && v.length > 20).join('\n\n') || raw;
          }
        } catch { /* invalid JSON — fall through to string extraction */ }
        // 2. Regex fallback: find "body": "..." even with unescaped newlines
        const bodyKey = raw.indexOf('"body":');
        if (bodyKey !== -1) {
          const openQ = raw.indexOf('"', bodyKey + 7);
          if (openQ !== -1) {
            // The body value ends at the last quote before the closing brace
            const closeB = raw.lastIndexOf('}');
            const closeQ = raw.lastIndexOf('"', closeB - 1);
            if (closeQ > openQ) {
              return raw.slice(openQ + 1, closeQ)
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\t/g, '\t');
            }
          }
        }
        return raw;
      };

      // For text-native formats (LinkedIn, Twitter, blog, newsletter) use the full content body.
      // For visual-first formats (Instagram, TikTok, etc.) use the caption.
      const TEXT_NATIVE_FORMATS = ['linkedin_post', 'tweet_thread', 'blog_post', 'newsletter'];
      const useContentBody = TEXT_NATIVE_FORMATS.includes(data.content_format);
      if (useContentBody && data.content_body) {
        setContent(unwrap(data.content_body));
      } else if (data.caption) {
        const hashtagStr = data.hashtags?.length ? '\n\n' + data.hashtags.map((h: string) => `#${h}`).join(' ') : '';
        setContent(data.caption + hashtagStr);
      } else if (data.content_body) {
        setContent(data.content_body);
      }
      // Derive platform from content_format if not explicitly saved
      const FORMAT_PLATFORM: Record<string, string> = {
        linkedin_post: 'linkedin', tweet_thread: 'twitter',
        tiktok_script: 'tiktok',  youtube_script: 'youtube',
        reels_script: 'instagram', carousel: 'instagram',
      };
      const platform = data.platform || FORMAT_PLATFORM[data.content_format];
      if (platform) setPlatforms([platform]);
      if (data.video_url) {
        // Pipeline has a video — use it as media and pre-select video-friendly platforms
        setMediaUrl(data.video_url);
        setIsVideo(true);
        setPlatforms(['instagram', 'facebook', 'linkedin']);
      } else if (data.image_url) {
        // image_url may be a JSON array (carousel) — show first for preview, keep all for posting
        try {
          const parsed = JSON.parse(data.image_url);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMediaUrl(parsed[0]);
            if (parsed.length > 1) setCarouselUrls(parsed);
          } else {
            setMediaUrl(data.image_url);
          }
        } catch {
          setMediaUrl(data.image_url);
        }
      }
    }).catch(() => {/* silent - just don't pre-fill */});
  }, []); // eslint-disable-line

  useEffect(() => { loadQueue(); }, []);

  async function loadQueue() {
    setQueueLoading(true);
    try {
      const { data } = await apiClient.get('/api/v1/schedule/queue?status=scheduled');
      setQueue(data.posts ?? []);
    } catch { /* silent */ }
    finally { setQueueLoading(false); }
  }

  function togglePlatform(v: string) {
    setPlatforms(prev => prev.includes(v) ? prev.filter(p => p !== v) : [...prev, v]);
  }

  async function completePipeline() {
    if (!pipelineId || pipelineCompleted) return;
    setCompletingPipeline(true);
    try {
      await apiClient.patch(`/api/v1/pipeline/${pipelineId}`, { status: 'completed', posted: true });
      setPipelineCompleted(true);
    } catch { /* non-blocking — don't fail the post if this errors */ }
    finally { setCompletingPipeline(false); }
  }

  // If the image is a local base64 data URL, upload it to get a public HTTP URL
  // (required by Instagram and other platforms that fetch the image server-side)
  async function ensurePublicUrl(url: string): Promise<string> {
    if (!url || !url.startsWith('data:')) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    const mimeType = blob.type || 'image/jpeg';
    const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
    const file = new File([blob], `upload.${ext}`, { type: mimeType });
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/api/v1/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  }

  async function handleGenerate() {
    if (!content.trim() || platforms.length === 0) return;
    setLoading(true); setError(''); setResult(null); setQueued(new Set());
    try {
      const { data } = await apiClient.post('/api/v1/schedule/suggest', {
        content,
        platforms,
        niche: settings.niche || undefined,
        location: settings.location || undefined,
        frequency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Something went wrong.');
    } finally { setLoading(false); }
  }

  async function handleQueueSlot(platform: string, slot: Slot) {
    const key = `${platform}-${slot.day}-${slot.time}`;
    setQueuing(key);
    try {
      // For carousel posts, upload all images now so the queue has public URLs ready to post
      let queueMediaUrl: string | null = null;
      if (carouselUrls.length > 1) {
        const publicUrls = await Promise.all(carouselUrls.map(u => ensurePublicUrl(u)));
        queueMediaUrl = JSON.stringify(publicUrls);
      } else if (mediaUrl.trim()) {
        queueMediaUrl = await ensurePublicUrl(mediaUrl.trim());
      }
      await apiClient.post('/api/v1/schedule/queue', {
        content,
        platform,
        hashtags: [],
        scheduled_at: nextDate(slot.day, slot.time),
        media_url: queueMediaUrl,
      });
      setQueued(prev => new Set([...prev, key]));
      loadQueue();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to queue post.');
    } finally { setQueuing(null); }
  }

  async function handleDeleteQueue(id: string) {
    try {
      await apiClient.delete(`/api/v1/schedule/queue/${id}`);
      setQueue(prev => prev.filter(p => p.id !== id));
    } catch { /* silent */ }
  }

  async function handlePostNow(platform: string, postContent: string, key: string, postId?: string, postMediaUrl?: string) {
    setPosting(key);
    try {
      // Resolve data: URLs to public HTTP URLs before posting (required by Instagram)
      let resolvedMedia = postMediaUrl ?? null;
      if (resolvedMedia) resolvedMedia = await ensurePublicUrl(resolvedMedia);
      await apiClient.post('/api/v1/schedule/post-now', {
        platform,
        content: postContent,
        post_id: postId ?? null,
        media_url: resolvedMedia,
      });
      setPosted(prev => new Set([...prev, key]));
      if (postId) setTimeout(() => setQueue(prev => prev.filter(p => p.id !== postId)), 2500);
      completePipeline();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to post.');
    } finally { setPosting(null); }
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post('/api/v1/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMediaUrl(data.url);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Image upload failed.');
    } finally { setUploading(false); }
  }

  async function handlePostNowAll() {
    if (!content.trim() || platforms.length === 0) return;
    setPostingAll(true); setError('');
    const supportedPlatforms = platforms.filter(p => ALL_POST_NOW_SUPPORTED.includes(p));
    // Resolve data: URLs to public HTTP URLs before posting (required by Instagram)
    let resolvedMediaUrl: string | null = mediaUrl.trim() || null;
    try {
      if (carouselUrls.length > 1) {
        // Upload all carousel images and encode as JSON array for the backend
        const publicUrls = await Promise.all(carouselUrls.map(u => ensurePublicUrl(u)));
        resolvedMediaUrl = JSON.stringify(publicUrls);
      } else if (resolvedMediaUrl) {
        resolvedMediaUrl = await ensurePublicUrl(resolvedMediaUrl);
      }
    } catch {
      setError('Failed to upload image(s). Please try uploading manually.');
      setPostingAll(false);
      return;
    }
    const results = await Promise.allSettled(
      supportedPlatforms.map(platform =>
        apiClient.post('/api/v1/schedule/post-now', {
          platform,
          content,
          post_id: null,
          media_url: resolvedMediaUrl,
        })
      )
    );
    const failures = results
      .map((r, i) => r.status === 'rejected' ? `${supportedPlatforms[i]}: ${(r.reason as any)?.response?.data?.detail ?? r.reason?.message ?? 'failed'}` : null)
      .filter(Boolean);
    if (failures.length) setError(failures.join(' · '));
    const successPlatforms = supportedPlatforms.filter((_, i) => results[i].status === 'fulfilled');
    if (successPlatforms.length > 0) {
      setPostedPlatforms(prev => new Set([...prev, ...successPlatforms]));
      completePipeline();
    }
    setPostingAll(false);
  }

  const platformIcon = (id: string) => PLATFORMS.find(p => p.value === id)?.icon ?? '📝';
  const platformLabel = (id: string) => PLATFORMS.find(p => p.value === id)?.label ?? id;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xl">🗓️</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posting Schedule Agent</h1>
          <p className="text-sm text-gray-500">Get AI-optimised posting times and build your content queue</p>
        </div>
        {settingsLoaded && settings.niche && !pipelineId && (
          <span className="ml-auto text-xs bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800 px-2.5 py-1 rounded-full font-medium">
            ✓ Brand settings applied
          </span>
        )}
      </div>

      {/* Pipeline context banner */}
      {pipelineId && (
        <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border ${
          pipelineCompleted
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800'
        }`}>
          <Flag className={`w-4 h-4 flex-shrink-0 ${pipelineCompleted ? 'text-green-600 dark:text-green-400' : 'text-brand-600 dark:text-brand-400'}`} />
          <p className={`text-sm flex-1 ${pipelineCompleted ? 'text-green-700 dark:text-green-300' : 'text-brand-700 dark:text-brand-300'}`}>
            {pipelineCompleted
              ? 'Pipeline completed! Content posted and marked as done.'
              : 'Opened from a pipeline — post to automatically complete it, or mark it done manually.'}
          </p>
          {pipelineCompleted ? (
            <button
              onClick={() => router.push('/pipeline')}
              className="flex-shrink-0 text-xs font-medium text-green-700 dark:text-green-300 underline underline-offset-2"
            >
              View pipelines →
            </button>
          ) : (
            <button
              onClick={completePipeline}
              disabled={completingPipeline}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {completingPipeline
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <CheckCircle2 className="w-3.5 h-3.5" />}
              Complete Pipeline
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">

        {/* ── LEFT: Input ── */}
        <div className="space-y-5 lg:sticky lg:top-0 self-start">

          {/* Content */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Content to schedule</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste the content you want to schedule. The agent will suggest the best times to post it for maximum reach."
              rows={5}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          {/* Media — optional image/video for all platforms */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {isVideo ? '🎬 Video' : '📸 Image'}
              {instagramSelected && !isVideo
                ? <><span className="text-red-500 ml-1">*</span><span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">(required for Instagram, optional for others)</span></>
                : <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">(optional)</span>
              }
            </label>

              {/* Preview / Upload area */}
              {isVideo && mediaUrl ? (
                <div className="mb-3 rounded-xl overflow-hidden bg-black">
                  <video src={mediaUrl} controls className="w-full max-h-40 object-contain" />
                  <button
                    onClick={() => { setMediaUrl(''); setIsVideo(false); }}
                    className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 py-1.5 text-center transition-colors"
                  >
                    ✕ Remove video
                  </button>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors mb-3 ${
                    uploading ? 'border-brand-300 bg-brand-50' : 'border-gray-200 dark:border-gray-700 hover:border-brand-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-xs text-brand-600">Uploading…</span>
                    </>
                  ) : mediaUrl ? (
                    <div className="relative w-full h-24">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaUrl} alt="preview" className="h-24 w-full object-cover rounded-xl pointer-events-none" />
                      {carouselUrls.length > 1 && (
                        <span className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                          🎠 {carouselUrls.length} slides
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl mb-1">🖼️</span>
                      <span className="text-xs text-gray-500">Click to upload image</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">JPEG, PNG, WebP, GIF · max 10 MB</span>
                    </>
                  )}
                </label>
              )}

              {/* Or paste URL */}
              {!isVideo && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400 dark:text-gray-500">or paste URL</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  {mediaUrl && (
                    <button onClick={() => setMediaUrl('')} className="mt-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500">
                      ✕ Clear
                    </button>
                  )}
                </>
              )}
            </div>

          {/* Platforms */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Platforms</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => {
                const badge = POST_NOW_BADGE[p.postNow];
                return (
                  <button
                    key={p.value}
                    onClick={() => togglePlatform(p.value)}
                    className={`flex flex-col items-center gap-1 py-3 px-1 rounded-xl border-2 text-xs font-medium transition-all ${
                      platforms.includes(p.value)
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <span>{p.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {platforms.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">Select at least one platform.</p>
            )}
          </div>

          {/* Frequency */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Posting frequency</label>
            <div className="flex gap-2">
              {FREQUENCIES.map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    frequency === f
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {/* Per-platform post status chips */}
            {supportedSelected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {supportedSelected.map(p => {
                  const pl = PLATFORMS.find(x => x.value === p);
                  const isPosted = postedPlatforms.has(p);
                  const isPosting = postingAll && !isPosted;
                  return (
                    <span
                      key={p}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        isPosted
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                          : isPosting
                          ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {isPosting
                        ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : isPosted
                        ? <CheckCircle2 className="w-3 h-3" />
                        : <Send className="w-3 h-3" />
                      }
                      {pl?.icon} {pl?.label}
                      {isPosted && <span className="ml-0.5">✓</span>}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
            <button
              onClick={handlePostNowAll}
              disabled={allPosted || postingAll || loading || !content.trim() || !anyPostNowPlatform || (instagramSelected && !isVideo && !mediaUrl.trim())}
              title={instagramSelected && !isVideo && !mediaUrl.trim() ? 'Add an image for Instagram' : undefined}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border-2 transition-all disabled:cursor-not-allowed ${
                allPosted
                  ? 'border-green-500 bg-green-500 text-white opacity-80 cursor-not-allowed'
                  : 'border-gray-800 dark:border-gray-300 text-gray-800 dark:text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-300 hover:text-white dark:hover:text-gray-900 disabled:opacity-40'
              }`}
            >
              {allPosted ? (
                <><CheckCircle2 className="w-4 h-4" /> Posted!</>
              ) : postingAll ? (
                <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Posting…</>
              ) : (
                <><Send className="w-4 h-4" /> Post Now</>
              )}
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !content.trim() || platforms.length === 0}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 text-sm"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analysing…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Suggest Schedule</>
              )}
            </button>
          </div>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="space-y-4">
          {!result && !loading && !error && (
            <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-3xl mb-4">🗓️</div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your schedule will appear here</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Add content, pick platforms, and hit generate</p>
            </div>
          )}

          {error && (
            <div className="card p-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
              <p className="text-sm text-red-600 dark:text-red-400">⚠️ {error}</p>
            </div>
          )}

          {loading && (
            <div className="card p-8 flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-500">Analysing optimal posting times…</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Summary */}
              <div className="card p-4 bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Strategy Summary
                </p>
                <p className="text-sm text-orange-800 dark:text-orange-300">{result.summary}</p>
              </div>

              {/* Per-platform slots */}
              {result.recommendations.map(rec => (
                <div key={rec.platform} className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{platformIcon(rec.platform)}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{platformLabel(rec.platform)}</span>
                  </div>

                  <div className="space-y-3">
                    {rec.slots.map((slot, i) => {
                      const key = `${rec.platform}-${slot.day}-${slot.time}`;
                      const isQueued = queued.has(key);
                      const isQueuing = queuing === key;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{slot.day} · {slot.time}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SCORE_COLOR(slot.score)}`}>
                                {slot.score}/10
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{slot.reason}</p>
                          </div>
                          <button
                            onClick={() => handleQueueSlot(rec.platform, slot)}
                            disabled={isQueued || isQueuing}
                            className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              isQueued
                                ? 'bg-green-50 text-green-600 border border-green-200'
                                : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
                            }`}
                          >
                            {isQueued ? (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> Queued</>
                            ) : isQueuing ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <><Plus className="w-3.5 h-3.5" /> Queue</>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Post Queue ── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Upcoming Queue</h2>
          {queue.length > 0 && (
            <span className="text-xs bg-brand-100 text-brand-700 font-medium px-2 py-0.5 rounded-full">
              {queue.length} scheduled
            </span>
          )}
        </div>

        {queueLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
          </div>
        ) : queue.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">No posts scheduled yet. Generate a schedule above and queue your best slots.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map(post => {
              const qKey = `queue-${post.id}`;
              const isPosting = posting === qKey;
              const isPosted = posted.has(qKey);
              const platformMeta = PLATFORMS.find(p => p.value === post.platform);
              const postNowStatus = platformMeta?.postNow ?? 'soon';
              const canPostNow = postNowStatus === 'full' || postNowStatus === 'text-only';
              const needsMedia = MEDIA_POSTING_SUPPORTED.includes(post.platform);
              const missingMedia = needsMedia && !post.media_url;
              const postNowTitle = postNowStatus === 'soon' ? 'Coming soon'
                : missingMedia ? 'No image URL stored with this post'
                : undefined;
              return (
                <div key={post.id} className="card p-4 flex items-center gap-4">
                  <span className="text-2xl flex-shrink-0">{platformIcon(post.platform)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 capitalize">{platformLabel(post.platform)}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
                      <span className="text-xs text-brand-600 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatScheduledAt(post.scheduled_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{post.content}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => canPostNow && !missingMedia && handlePostNow(post.platform, post.content, qKey, post.id, post.media_url)}
                      disabled={isPosted || isPosting || !!posting || !canPostNow || missingMedia}
                      title={postNowTitle}
                      className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        isPosted
                          ? 'bg-green-50 text-green-600 border border-green-200'
                          : !canPostNow || missingMedia
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-40'
                      }`}
                    >
                      {isPosted ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Posted</>
                      ) : isPosting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : !canPostNow ? (
                        <>🔜 Soon</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Post Now</>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteQueue(post.id)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScheduleAgentPage() {
  return (
    <Suspense>
      <ScheduleAgentPageInner />
    </Suspense>
  );
}
